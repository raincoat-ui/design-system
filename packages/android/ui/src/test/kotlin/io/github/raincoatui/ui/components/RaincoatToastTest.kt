package io.github.raincoatui.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.requiredWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.PixelMap
import androidx.compose.ui.graphics.RectangleShape
import androidx.compose.ui.graphics.toPixelMap
import androidx.compose.ui.input.InputMode
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.platform.AccessibilityManager
import androidx.compose.ui.platform.LocalAccessibilityManager
import androidx.compose.ui.platform.LocalInputModeManager
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.SemanticsNodeInteraction
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.assertHasClickAction
import androidx.compose.ui.test.assertIsFocused
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.getUnclippedBoundsInRoot
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performKeyInput
import androidx.compose.ui.test.performMouseInput
import androidx.compose.ui.test.performSemanticsAction
import androidx.compose.ui.test.performTouchInput
import androidx.compose.ui.test.pressKey
import androidx.compose.ui.test.requestFocus
import androidx.compose.ui.test.swipeDown
import androidx.compose.ui.text.TextLayoutResult
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LifecycleRegistry
import androidx.lifecycle.compose.LocalLifecycleOwner
import io.github.raincoatui.tokens.ColorMode
import io.github.raincoatui.tokens.Density
import io.github.raincoatui.tokens.RaincoatTokenSet
import io.github.raincoatui.tokens.TokenColor
import io.github.raincoatui.tokens.TokenFormat
import io.github.raincoatui.tokens.TokenShadow
import io.github.raincoatui.tokens.TokenShadowLayer
import io.github.raincoatui.ui.RaincoatTheme
import io.github.raincoatui.ui.generated.allThemes
import io.github.raincoatui.ui.raincoatShadow
import io.github.raincoatui.ui.toColor
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.ParameterizedRobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

/**
 * The Toast, tested against specs/components/toast/spec.yaml.
 *
 * The tests run on the JVM. They read what assistive technology is told, drive the toast with
 * touch, mouse, and keys, run its timer on the test's clock, and draw it and read the pixels back.
 * The screen is one pixel per dp, so a measurement in pixels is a measurement in dp.
 */
@RunWith(ParameterizedRobolectricTestRunner::class)
@Config(qualifiers = "w480dp-h800dp-mdpi")
@OptIn(ExperimentalTestApi::class)
class RaincoatToastTest(themeId: String) {
    companion object {
        /** Every test runs in every theme. The token build generates the list. */
        @JvmStatic
        @ParameterizedRobolectricTestRunner.Parameters(name = "{0}")
        fun themes(): List<Array<Any>> = allThemes.map { arrayOf(it.id) }
    }

    private val theme = allThemes.first { it.id == themeId }

    @get:Rule
    val compose = createComposeRule()

    private val stage = "stage"
    private val longMessage = "Messages older than one year were moved from Archive to the Deleted folder"

    private fun tokens(mode: ColorMode = ColorMode.Light, density: Density = Density.Comfortable): RaincoatTokenSet =
        theme.tokens(mode, density)

    // The test rule takes content once, so the content is a state that a test can replace.
    private var scene by mutableStateOf<(@Composable () -> Unit)?>(null)
    private var scenes = 0

    /** Shows [content] in a theme, on a stage painted with the theme's canvas color. */
    private fun show(
        mode: ColorMode = ColorMode.Light,
        density: Density = Density.Comfortable,
        direction: LayoutDirection = LayoutDirection.Ltr,
        keyboard: Boolean = false,
        content: @Composable () -> Unit,
    ) {
        val number = ++scenes
        scene = {
            key(number) {
                RaincoatTheme(
                    theme = this.theme,
                    darkTheme = mode == ColorMode.Dark || mode == ColorMode.DarkHighContrast,
                    increasedContrast = mode == ColorMode.LightHighContrast || mode == ColorMode.DarkHighContrast,
                    density = density,
                ) {
                    val inputMode = LocalInputModeManager.current
                    SideEffect { inputMode.requestInputMode(if (keyboard) InputMode.Keyboard else InputMode.Touch) }
                    CompositionLocalProvider(LocalLayoutDirection provides direction) {
                        Box(Modifier.testTag(stage).background(tokens(mode).color.bg.canvas.toColor())) {
                            content()
                        }
                    }
                }
            }
        }
        if (number == 1) compose.setContent { scene?.invoke() }
        compose.waitForIdle()
    }

    private lateinit var scope: CoroutineScope

    /** A screen with a toast host at its bottom, and the scope that calls `show`. */
    private fun host(
        state: RaincoatToastHostState,
        keyboard: Boolean = false,
        around: @Composable (@Composable () -> Unit) -> Unit = { it() },
    ) {
        show(keyboard = keyboard) {
            scope = rememberCoroutineScope()
            around {
                Box(Modifier.size(480.dp, 640.dp)) {
                    // Somewhere else on the screen for keyboard focus to go.
                    Box(Modifier.testTag("elsewhere").size(48.dp).focusable())
                    RaincoatToastHost(state, Modifier.align(Alignment.BottomCenter))
                }
            }
        }
    }

    /** The result of a `show` call, once the toast has closed. */
    private class Shown {
        var result: RaincoatToastResult? = null
    }

    private fun showToast(state: RaincoatToastHostState, message: String, closeLabel: String? = null): Shown {
        val shown = Shown()
        scope.launch { shown.result = state.show(message, closeLabel) }
        compose.mainClock.advanceTimeByFrame()
        compose.waitForIdle()
        return shown
    }

    private fun showToastWithUndo(state: RaincoatToastHostState, message: String = "Message archived"): Shown {
        val shown = Shown()
        scope.launch { shown.result = state.show(message, actionLabel = "Undo", closeLabel = "Close") }
        compose.mainClock.advanceTimeByFrame()
        compose.waitForIdle()
        return shown
    }

    private fun advance(milliseconds: Long) {
        compose.mainClock.advanceTimeBy(milliseconds)
        compose.waitForIdle()
    }

    /**
     * Runs a few frames. A pause starts or ends a frame or two after the input that causes it: the
     * toast composes the change, then tells its host. The test clock runs frames only at the end
     * of a long advance, where a screen runs them all along.
     */
    private fun frames() {
        repeat(3) { compose.mainClock.advanceTimeByFrame() }
        compose.waitForIdle()
    }

    private val isButton = SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Button)
    private val isToast = SemanticsMatcher.keyIsDefined(SemanticsActions.Dismiss)
    private fun toast(): SemanticsNodeInteraction = compose.onNode(isToast)
    private fun isShown(message: String) = compose.onAllNodes(hasText(message)).fetchSemanticsNodes().isNotEmpty()

    // Semantics and activation

    @Test
    fun `a toast shows its message as a polite live region, and show waits until it closes`() {
        val state = RaincoatToastHostState()
        host(state)
        val shown = showToastWithUndo(state)
        compose.onNodeWithText("Message archived")
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.LiveRegion, LiveRegionMode.Polite))
        compose.onNode(isButton and hasText("Undo")).assertHasClickAction()
        compose.onNodeWithContentDescription("Close").assert(isButton).assertHasClickAction()
        assertNull(shown.result)

        compose.onNodeWithText("Undo").performClick()
        compose.waitForIdle()
        assertEquals(RaincoatToastResult.ActionPerformed, shown.result)
    }

    @Test
    fun `the close button, and TalkBack's dismiss action, close the toast`() {
        val state = RaincoatToastHostState()
        host(state)
        val first = showToastWithUndo(state)
        compose.onNodeWithContentDescription("Close").performClick()
        compose.waitForIdle()
        assertEquals(RaincoatToastResult.Closed, first.result)

        val second = showToast(state, "Link copied")
        toast().performSemanticsAction(SemanticsActions.Dismiss)
        compose.waitForIdle()
        assertEquals(RaincoatToastResult.Closed, second.result)
    }

    @Test
    fun `Escape closes the toast while keyboard focus is in it`() {
        val state = RaincoatToastHostState()
        host(state, keyboard = true)
        val shown = showToastWithUndo(state)
        compose.onNodeWithContentDescription("Close").requestFocus().assertIsFocused()
            .performKeyInput { pressKey(Key.Escape) }
        compose.waitForIdle()
        assertEquals(RaincoatToastResult.Closed, shown.result)
    }

    @Test
    fun `a toast without an action or a close label has no buttons`() {
        val state = RaincoatToastHostState()
        host(state)
        showToast(state, "Message archived")
        assertTrue(compose.onAllNodes(isButton).fetchSemanticsNodes().isEmpty())
    }

    @Test
    fun `toasts are shown one at a time, in order`() {
        val state = RaincoatToastHostState()
        host(state)
        val first = showToast(state, "First", closeLabel = "Close")
        val second = showToast(state, "Second", closeLabel = "Close")
        assertTrue(isShown("First"))
        assertTrue(!isShown("Second"))

        compose.onNodeWithContentDescription("Close").performClick()
        compose.waitForIdle()
        assertEquals(RaincoatToastResult.Closed, first.result)
        assertNull(second.result)
        // Once the first has left the screen, the second is shown.
        advance(2000)
        assertTrue(!isShown("First"))
        assertTrue(isShown("Second"))
    }

    // The timer, on the test's clock

    @Test
    fun `without an action, a toast closes after 6 seconds`() {
        compose.mainClock.autoAdvance = false
        val state = RaincoatToastHostState()
        host(state)
        val shown = showToast(state, "Message archived")
        advance(5800)
        assertNull(shown.result)
        advance(400)
        assertEquals(RaincoatToastResult.Closed, shown.result)
    }

    @Test
    fun `with an action, a toast stays until it is used or closed`() {
        compose.mainClock.autoAdvance = false
        val state = RaincoatToastHostState()
        host(state)
        val shown = showToastWithUndo(state)
        advance(10 * 60 * 1000)
        assertNull(shown.result)
        assertTrue(isShown("Message archived"))
    }

    @Test
    fun `the timer pauses while a mouse pointer is over the toast, and goes on from where it stopped`() {
        compose.mainClock.autoAdvance = false
        val state = RaincoatToastHostState()
        host(state)
        val shown = showToast(state, "Message archived")
        advance(1000)
        toast().performMouseInput { enter(center) }
        frames()
        advance(60 * 1000)
        assertNull(shown.result)

        toast().performMouseInput { exit(Offset(-100f, -100f)) }
        frames()
        advance(4500)
        assertNull(shown.result)
        advance(1000)
        assertEquals(RaincoatToastResult.Closed, shown.result)
    }

    @Test
    fun `the timer pauses while keyboard focus is in the toast`() {
        compose.mainClock.autoAdvance = false
        val state = RaincoatToastHostState()
        host(state, keyboard = true)
        val shown = showToast(state, "Link copied", closeLabel = "Close")
        compose.onNodeWithContentDescription("Close").requestFocus().assertIsFocused()
        frames()
        advance(60 * 1000)
        assertNull(shown.result)

        compose.onNodeWithTag("elsewhere").requestFocus().assertIsFocused()
        frames()
        advance(6500)
        assertEquals(RaincoatToastResult.Closed, shown.result)
    }

    /** A lifecycle the test moves between the foreground and the background. */
    private class TestLifecycle : LifecycleOwner {
        val registry = LifecycleRegistry.createUnsafe(this).apply { currentState = Lifecycle.State.RESUMED }
        override val lifecycle: Lifecycle get() = registry
    }

    @Test
    fun `the timer pauses while the app is in the background`() {
        compose.mainClock.autoAdvance = false
        val app = TestLifecycle()
        val state = RaincoatToastHostState()
        host(state) { content -> CompositionLocalProvider(LocalLifecycleOwner provides app) { content() } }
        val shown = showToast(state, "Message archived")
        advance(1000)
        compose.runOnIdle { app.registry.currentState = Lifecycle.State.CREATED }
        frames()
        advance(60 * 1000)
        assertNull(shown.result)

        compose.runOnIdle { app.registry.currentState = Lifecycle.State.RESUMED }
        frames()
        advance(4500)
        assertNull(shown.result)
        advance(1000)
        assertEquals(RaincoatToastResult.Closed, shown.result)
    }

    /** An accessibility manager whose recommended timeout is [timeout], whatever is asked. */
    private class Recommending(private val timeout: Long) : AccessibilityManager {
        var asked: Long? = null

        override fun calculateRecommendedTimeoutMillis(
            originalTimeoutMillis: Long,
            containsIcons: Boolean,
            containsText: Boolean,
            containsControls: Boolean,
        ): Long {
            asked = originalTimeoutMillis
            return timeout
        }
    }

    @Test
    fun `the person's accessibility timeout replaces the 6 seconds when it is longer`() {
        compose.mainClock.autoAdvance = false
        val longer = Recommending(20_000)
        val state = RaincoatToastHostState()
        host(state) { content -> CompositionLocalProvider(LocalAccessibilityManager provides longer) { content() } }
        val shown = showToast(state, "Message archived")
        assertEquals(TOAST_DURATION_MILLIS, longer.asked)
        advance(19_800)
        assertNull(shown.result)
        advance(400)
        assertEquals(RaincoatToastResult.Closed, shown.result)
    }

    @Test
    fun `a shorter accessibility timeout does not shorten the 6 seconds`() {
        compose.mainClock.autoAdvance = false
        val shorter = Recommending(3_000)
        val state = RaincoatToastHostState()
        host(state) { content -> CompositionLocalProvider(LocalAccessibilityManager provides shorter) { content() } }
        val shown = showToast(state, "Message archived")
        advance(5800)
        assertNull(shown.result)
        advance(400)
        assertEquals(RaincoatToastResult.Closed, shown.result)
    }

    // Touch

    @Test
    fun `a swipe down closes the toast`() {
        val state = RaincoatToastHostState()
        host(state)
        val shown = showToastWithUndo(state)
        toast().performTouchInput { swipeDown(startY = top + 4f, endY = top + 4f + 120f) }
        compose.waitForIdle()
        assertEquals(RaincoatToastResult.Closed, shown.result)
    }

    @Test
    fun `a short swipe lets the toast go back`() {
        val state = RaincoatToastHostState()
        host(state)
        val shown = showToastWithUndo(state)
        val before = toast().getUnclippedBoundsInRoot()
        toast().performTouchInput { swipeDown(startY = top + 4f, endY = top + 14f) }
        compose.waitForIdle()
        assertNull(shown.result)
        assertEquals(before, toast().getUnclippedBoundsInRoot())
    }

    // Colors and measurements, drawn on its own

    private fun SemanticsNodeInteraction.pixels(): PixelMap = captureToImage().toPixelMap()

    private fun PixelMap.has(color: TokenColor, x: Int, y: Int): Boolean {
        val pixel = this[x, y]
        val channels = listOf(pixel.red, pixel.green, pixel.blue, pixel.alpha).map { (it * 255).toInt() }
        val wanted = listOf(color.red, color.green, color.blue, color.alpha)
        return channels.zip(wanted).all { (actual, expected) -> kotlin.math.abs(actual - expected) <= 1 }
    }

    private fun assertPainted(where: String, expected: TokenColor, pixels: PixelMap, x: Int, y: Int) {
        val found = pixels[x, y].let { listOf(it.red, it.green, it.blue).map { channel -> (channel * 255).toInt() } }
        assertTrue("$where: expected ${TokenFormat.color(expected)} at ($x, $y), found rgb$found", pixels.has(expected, x, y))
    }

    @Test
    fun `a toast is painted with its tokens in every color mode`() {
        for (mode in ColorMode.entries) {
            val toast = tokens(mode).toast
            show(mode) {
                RaincoatToast(
                    "Message archived",
                    actionLabel = "Undo",
                    onAction = {},
                    closeLabel = "Close",
                    onClose = {},
                    modifier = Modifier.testTag("toast"),
                )
            }
            val pixels = compose.onNodeWithTag("toast").pixels()
            val middle = pixels.height / 2
            assertPainted("${mode.id}, outline", toast.border.color, pixels, 0, middle)
            assertPainted("${mode.id}, fill", toast.bg, pixels, toast.border.width.toInt() + 1, middle)
            val text = (0 until pixels.width).any { x -> (0 until pixels.height).any { y -> pixels.has(toast.fg, x, y) } }
            assertTrue("${mode.id}: the message is drawn in toast.fg", text)
        }
    }

    @Test
    fun `a one-line toast is as tall as a small button and its padding`() {
        for (density in Density.entries) {
            val set = tokens(density = density)
            val expected = (set.button.height.sm + 2 * (set.toast.paddingBlock + set.toast.border.width)).toInt()
            val cases = listOf<@Composable () -> Unit>(
                { RaincoatToast("Message archived", Modifier.testTag("toast")) },
                { RaincoatToast("Link copied", Modifier.testTag("toast"), closeLabel = "Close") },
                {
                    RaincoatToast(
                        "Message archived",
                        actionLabel = "Undo",
                        onAction = {},
                        closeLabel = "Close",
                        onClose = {},
                        modifier = Modifier.testTag("toast"),
                    )
                },
            )
            for (case in cases) {
                show(density = density, content = case)
                assertEquals(density.id, expected, compose.onNodeWithTag("toast").pixels().height)
            }
        }
    }

    @Test
    fun `the message's first line is centered on the buttons, and the action and close button follow it`() {
        show {
            RaincoatToast("Message archived", actionLabel = "Undo", onAction = {}, closeLabel = "Close", onClose = {})
        }
        val message = compose.onNodeWithText("Message archived").getUnclippedBoundsInRoot()
        val action = compose.onNodeWithText("Undo").getUnclippedBoundsInRoot()
        val close = compose.onNodeWithContentDescription("Close").getUnclippedBoundsInRoot()
        assertEquals((action.top + action.bottom).value / 2, (message.top + message.bottom).value / 2, 1f)
        assertTrue(message.right <= action.left)
        assertTrue(action.right <= close.left)
    }

    @Test
    fun `a long message wraps, and the action moves below it, at the end`() {
        val toast = tokens().toast
        show {
            Box(Modifier.width(360.dp)) {
                RaincoatToast(longMessage, actionLabel = "Undo", onAction = {}, closeLabel = "Close", onClose = {})
            }
        }
        val message = compose.onNodeWithText(longMessage).getUnclippedBoundsInRoot()
        val action = compose.onNodeWithText("Undo").getUnclippedBoundsInRoot()
        val close = compose.onNodeWithContentDescription("Close").getUnclippedBoundsInRoot()
        val line = toast.message.lineHeight * toast.message.size
        // At least two lines, then the action below them, at the end of the message's column; the
        // close button stays at the end of the first line.
        val height = (message.bottom - message.top).value
        assertTrue("message height $height", height >= 2 * line)
        assertTrue(action.top >= message.bottom)
        assertEquals(message.right.value, action.right.value, 1f)
        assertTrue(close.top < message.top + line.dp)
        assertTrue(close.left >= message.right)
    }

    /** How the text of a message was laid out. */
    private fun layoutOf(text: String): TextLayoutResult {
        val results = mutableListOf<TextLayoutResult>()
        compose.onNodeWithText(text, useUnmergedTree = true)
            .performSemanticsAction(SemanticsActions.GetTextLayoutResult) { it(results) }
        return results.single()
    }

    @Test
    fun `a korean message breaks only between whole words`() {
        RuntimeEnvironment.setQualifiers("+b+ko")
        // The long message in Korean, as specs/components/toast/strings.yaml has it.
        val message = "1년이 지난 메시지를 보관함에서 휴지통 폴더로 옮겼습니다"
        // At every width, each line ends at a space: no word is split.
        for (width in 160..400 step 20) {
            show { Box(Modifier.width(width.dp)) { RaincoatToast(message) } }
            val layout = layoutOf(message)
            assertTrue("the message wraps at $width", layout.lineCount > 1)
            for (line in 0 until layout.lineCount - 1) {
                val end = layout.getLineEnd(line)
                assertTrue(
                    "line ${line + 1} of ${layout.lineCount} at $width ends with \"${message.substring(0, end)}\"",
                    message[end - 1] == ' ',
                )
            }
        }
    }

    @Test
    fun `a toast is never wider than the panel width`() {
        val toast = tokens().toast
        show {
            Box(Modifier.requiredWidth(2000.dp)) {
                RaincoatToast("$longMessage. $longMessage", Modifier.testTag("toast"))
            }
        }
        val bounds = compose.onNodeWithTag("toast").getUnclippedBoundsInRoot()
        assertEquals(toast.maxWidth.toFloat(), (bounds.right - bounds.left).value, 0.5f)
    }

    @Test
    fun `in right-to-left, the action and the close button are on the left`() {
        show(direction = LayoutDirection.Rtl) {
            RaincoatToast("Message archived", actionLabel = "Undo", onAction = {}, closeLabel = "Close", onClose = {})
        }
        val message = compose.onNodeWithText("Message archived").getUnclippedBoundsInRoot()
        val action = compose.onNodeWithText("Undo").getUnclippedBoundsInRoot()
        val close = compose.onNodeWithContentDescription("Close").getUnclippedBoundsInRoot()
        assertTrue(action.right <= message.left)
        assertTrue(close.right <= action.left)
    }

    @Test
    fun `the host sits at the bottom center, its margin from the edge`() {
        val state = RaincoatToastHostState()
        host(state)
        showToast(state, "Message archived")
        advance(1000)
        val margin = tokens().toast.margin.toFloat()
        val bounds = toast().getUnclippedBoundsInRoot()
        assertEquals(640f - margin, bounds.bottom.value, 1f)
        assertEquals(240f, (bounds.left + bounds.right).value / 2, 1f)
    }

    // The shadow helper

    private val ink = TokenColor(0xFF000000)
    private val paper = TokenColor(0xFFFFFFFF)

    private fun layer(offsetY: Double, inset: Boolean = false, alpha: Long = 0xFF) =
        TokenShadowLayer(TokenColor((alpha shl 24) or 0x000000), 0.0, offsetY, 0.0, 0.0, inset)

    /** A 40dp square of paper with a shadow, on 20dp of the stage around it. */
    private fun square(shadow: TokenShadow): PixelMap {
        show {
            Box(Modifier.padding(20.dp)) {
                Box(Modifier.size(40.dp).raincoatShadow(shadow, RectangleShape, paper.toColor()))
            }
        }
        return compose.onNodeWithTag(stage).pixels()
    }

    @Test
    fun `an outer shadow is drawn behind the shape, moved by its offset`() {
        val canvas = tokens().color.bg.canvas
        val pixels = square(TokenShadow(listOf(layer(offsetY = 10.0))))
        assertPainted("below the square", ink, pixels, 40, 65)
        assertPainted("above the square", canvas, pixels, 40, 15)
        assertPainted("the square", paper, pixels, 40, 40)
    }

    @Test
    fun `an inset shadow is drawn inside the shape`() {
        val canvas = tokens().color.bg.canvas
        val pixels = square(TokenShadow(listOf(layer(offsetY = 10.0, inset = true))))
        assertPainted("along the top edge, inside", ink, pixels, 40, 23)
        assertPainted("the rest of the square", paper, pixels, 40, 45)
        assertPainted("below the square", canvas, pixels, 40, 65)
    }

    @Test
    fun `a shadow of transparent layers draws nothing`() {
        val canvas = tokens().color.bg.canvas
        val none = tokens().shadow.overlay
        val transparent = TokenShadow(listOf(layer(offsetY = 10.0, alpha = 0)))
        assertTrue(transparent.visibleLayers.isEmpty())
        for (shadow in listOf(none, transparent)) {
            val pixels = square(shadow)
            assertPainted("below the square", canvas, pixels, 40, 65)
        }
    }
}
