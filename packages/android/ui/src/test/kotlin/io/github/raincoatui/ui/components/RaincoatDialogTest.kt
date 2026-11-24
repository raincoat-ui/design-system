package io.github.raincoatui.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.graphics.PixelMap
import androidx.compose.ui.graphics.toPixelMap
import androidx.compose.ui.input.InputMode
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.platform.LocalInputModeManager
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.semantics.getOrNull
import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.SemanticsNodeInteraction
import androidx.compose.ui.test.assertIsFocused
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.click
import androidx.compose.ui.test.hasScrollAction
import androidx.compose.ui.test.isDialog
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performKeyInput
import androidx.compose.ui.test.performTouchInput
import androidx.compose.ui.test.pressKey
import androidx.compose.ui.test.requestFocus
import androidx.compose.ui.test.swipeDown
import androidx.compose.ui.unit.LayoutDirection
import androidx.test.espresso.Espresso
import io.github.raincoatui.tokens.ButtonVariant
import io.github.raincoatui.tokens.ColorMode
import io.github.raincoatui.tokens.Density
import io.github.raincoatui.tokens.DialogSize
import io.github.raincoatui.tokens.RaincoatTokenSet
import io.github.raincoatui.tokens.SheetEdge
import io.github.raincoatui.tokens.TokenColor
import io.github.raincoatui.tokens.TokenFormat
import io.github.raincoatui.ui.RaincoatTheme
import io.github.raincoatui.ui.generated.allThemes
import io.github.raincoatui.ui.toColor
import kotlin.math.abs
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.ParameterizedRobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

/**
 * The Dialog, the alert dialog, and the Sheet, tested against specs/components/dialog/spec.yaml
 * and the Accessibility table of rfcs/0006-dialog-and-sheet.md.
 *
 * The tests run on the JVM. They read what TalkBack is told, drive the dialog with touch and
 * keys, and draw its window and read the pixels back. The screen is one pixel per dp, so a
 * measurement in pixels is a measurement in dp.
 */
@RunWith(ParameterizedRobolectricTestRunner::class)
@Config(qualifiers = "w800dp-h800dp-mdpi")
@OptIn(ExperimentalTestApi::class)
class RaincoatDialogTest(themeId: String) {
    companion object {
        /** Every test runs in every theme. The token build generates the list. */
        @JvmStatic
        @ParameterizedRobolectricTestRunner.Parameters(name = "{0}")
        fun themes(): List<Array<Any>> = allThemes.map { arrayOf(it.id) }
    }

    private val theme = allThemes.first { it.id == themeId }

    @get:Rule
    val compose = createComposeRule()

    private fun tokens(mode: ColorMode = ColorMode.Light, density: Density = Density.Comfortable): RaincoatTokenSet =
        theme.tokens(mode, density)

    private val paragraph = "Everyone the file is shared with sees the new name. Links to the file keep working."

    // The test rule takes content once, so the content is a state that a test can replace.
    private var scene by mutableStateOf<(@Composable () -> Unit)?>(null)
    private var scenes = 0

    /** Shows [content] on a screen painted with the theme's canvas color. */
    private fun show(
        mode: ColorMode = ColorMode.Light,
        direction: LayoutDirection = LayoutDirection.Ltr,
        keyboard: Boolean = false,
        content: @Composable () -> Unit,
    ) {
        val canvas = tokens(mode).color.bg.canvas
        val number = ++scenes
        scene = {
            key(number) {
                RaincoatTheme(
                    theme = this.theme,
                    darkTheme = mode == ColorMode.Dark || mode == ColorMode.DarkHighContrast,
                    increasedContrast = mode == ColorMode.LightHighContrast || mode == ColorMode.DarkHighContrast,
                ) {
                    val inputMode = LocalInputModeManager.current
                    SideEffect { inputMode.requestInputMode(if (keyboard) InputMode.Keyboard else InputMode.Touch) }
                    CompositionLocalProvider(LocalLayoutDirection provides direction) {
                        Box(Modifier.fillMaxSize().background(canvas.toColor())) { content() }
                    }
                }
            }
        }
        if (number == 1) compose.setContent { scene?.invoke() }
        compose.waitForIdle()
    }

    /** A dialog with a description, a body, and a footer of Cancel and Rename. */
    @Composable
    private fun RenameDialog(
        open: Boolean = true,
        onDismissRequest: () -> Unit = {},
        size: DialogSize = DialogSize.Standard,
        closeLabel: String? = null,
        footer: Boolean = true,
        initialFocus: FocusRequester? = null,
        body: @Composable () -> Unit = { RaincoatText(paragraph) },
    ) {
        RaincoatDialog(
            open = open,
            onDismissRequest = onDismissRequest,
            title = "Rename file",
            titleLevel = 2,
            size = size,
            description = "Everyone the file is shared with sees the new name.",
            closeLabel = closeLabel,
            initialFocus = initialFocus,
            actions = if (footer) {
                {
                    RaincoatButton("Cancel", onClick = onDismissRequest)
                    RaincoatButton("Rename", onClick = {}, variant = ButtonVariant.Primary)
                }
            } else {
                null
            },
            content = body,
        )
    }

    private val dialogWindow get() = compose.onNode(isDialog())

    private fun SemanticsNodeInteraction.pixels(): PixelMap = captureToImage().toPixelMap()

    private fun SemanticsNodeInteraction.bounds(): Rect = fetchSemanticsNode().boundsInWindow

    /** The panel: the node TalkBack is given the pane title on. */
    private fun panel(title: String) = compose.onNode(SemanticsMatcher.expectValue(SemanticsProperties.PaneTitle, title))

    private fun PixelMap.has(color: TokenColor, x: Int, y: Int): Boolean {
        val pixel = this[x, y]
        val channels = listOf(pixel.red, pixel.green, pixel.blue, pixel.alpha).map { (it * 255).toInt() }
        val wanted = listOf(color.red, color.green, color.blue, color.alpha)
        return channels.zip(wanted).all { (actual, expected) -> abs(actual - expected) <= 2 }
    }

    private fun assertPainted(where: String, expected: TokenColor, pixels: PixelMap, x: Int, y: Int) {
        val pixel = pixels[x, y]
        val found = listOf(pixel.red, pixel.green, pixel.blue, pixel.alpha).map { (it * 255).toInt() }
        assertTrue("$where: expected ${TokenFormat.color(expected)} at ($x, $y), found rgba$found", pixels.has(expected, x, y))
    }

    private fun assertClose(where: String, expected: Float, actual: Float) =
        assertTrue("$where: expected $expected, found $actual", abs(expected - actual) <= 1.5f)

    // What TalkBack is told

    @Test
    fun `a dialog is a window of its own, a pane named by its title, which is a heading`() {
        show { RenameDialog() }
        dialogWindow.assertExists()
        panel("Rename file").assertExists()
        val title = compose.onNodeWithText("Rename file").fetchSemanticsNode()
        assertTrue("the title is a heading", title.config.contains(SemanticsProperties.Heading))
        compose.onNodeWithText("Everyone the file is shared with sees the new name.").assertExists()
    }

    @Test
    fun `the close button is shown only with a close label, is named by it, and asks to close`() {
        var requests = 0
        show { RenameDialog(onDismissRequest = { requests++ }, footer = false, closeLabel = "Close") }
        compose.onNodeWithContentDescription("Close").performClick()
        assertEquals("the close button asks to close", 1, requests)

        show { RenameDialog() }
        assertTrue(
            "no close button without a label",
            compose.onAllNodes(SemanticsMatcher.keyIsDefined(SemanticsProperties.ContentDescription))
                .fetchSemanticsNodes().none { it.config.getOrNull(SemanticsProperties.ContentDescription) == listOf("Close") },
        )
    }

    // Closing

    @Test
    fun `Escape and a tap on the scrim ask to close a dialog`() {
        var requests = 0
        show(keyboard = true) { RenameDialog(onDismissRequest = { requests++ }) }
        compose.onNodeWithText("Rename").requestFocus().performKeyInput { pressKey(Key.Escape) }
        assertEquals("Escape", 1, requests)
        dialogWindow.performTouchInput { click(Offset(4f, 4f)) }
        assertEquals("the scrim", 2, requests)
    }

    @Test
    fun `back asks to close a dialog, and cancels an alert dialog`() {
        var requests = 0
        show { RenameDialog(onDismissRequest = { requests++ }) }
        Espresso.pressBackUnconditionally()
        compose.waitForIdle()
        assertEquals("back asks to close", 1, requests)

        var cancels = 0
        show {
            RaincoatAlertDialog(
                open = true, onCancel = { cancels++ }, onConfirm = {}, title = "Delete this address?", titleLevel = 2,
                confirmLabel = "Delete address", cancelLabel = "Cancel",
            )
        }
        Espresso.pressBackUnconditionally()
        compose.waitForIdle()
        assertEquals("back cancels", 1, cancels)
    }

    @Test
    fun `a dialog the app keeps open stays open, and one it closes leaves with the exit duration`() {
        var open by mutableStateOf(true)
        show { RenameDialog(open = open) }
        dialogWindow.performTouchInput { click(Offset(4f, 4f)) }
        compose.waitForIdle()
        panel("Rename file").assertExists()

        compose.mainClock.autoAdvance = false
        open = false
        compose.mainClock.advanceTimeByFrame()
        compose.mainClock.advanceTimeBy(tokens().dialog.exit.duration / 2L)
        panel("Rename file").assertExists()
        compose.mainClock.advanceTimeBy(tokens().dialog.exit.duration.toLong() + 64)
        compose.mainClock.autoAdvance = true
        compose.waitForIdle()
        panel("Rename file").assertDoesNotExist()
        dialogWindow.assertDoesNotExist()
    }

    @Test
    fun `an alert dialog cancels on Cancel and Escape, ignores the scrim, and confirms on its action`() {
        var cancels = 0
        var confirms = 0
        show(keyboard = true) {
            RaincoatAlertDialog(
                open = true,
                onCancel = { cancels++ },
                onConfirm = { confirms++ },
                title = "Delete this address?",
                titleLevel = 2,
                confirmLabel = "Delete address",
                cancelLabel = "Cancel",
                description = "It is removed from your account.",
                destructive = true,
            )
        }
        panel("Delete this address?").assertExists()
        // Focus starts on Cancel, the least destructive action.
        compose.onNodeWithText("Cancel").assertIsFocused()
        compose.onNodeWithText("Cancel").performKeyInput { pressKey(Key.Escape) }
        assertEquals("Escape cancels", 1, cancels)
        dialogWindow.performTouchInput { click(Offset(4f, 4f)) }
        assertEquals("the scrim does nothing", 1, cancels)
        compose.onNodeWithText("Cancel").performClick()
        assertEquals("Cancel cancels", 2, cancels)
        assertEquals("nothing was confirmed", 0, confirms)
        compose.onNodeWithText("Delete address").performClick()
        assertEquals("the action confirms", 1, confirms)
    }

    @Test
    fun `the confirming button of a destructive alert dialog is a danger button`() {
        show {
            RaincoatAlertDialog(
                open = true, onCancel = {}, onConfirm = {}, title = "Delete this address?", titleLevel = 2,
                confirmLabel = "Delete address", cancelLabel = "Cancel", destructive = true,
            )
        }
        val pixels = compose.onNodeWithText("Delete address").pixels()
        assertPainted("danger fill", tokens().button.danger.bg.default, pixels, 2, pixels.height / 2)
    }

    // Focus

    @Test
    fun `keyboard focus goes to the target the app names when the dialog opens`() {
        show(keyboard = true) {
            val field = remember { FocusRequester() }
            RenameDialog(initialFocus = field, body = {
                BasicTextField(value = "Quarterly report", onValueChange = {}, modifier = Modifier.focusRequester(field))
            })
        }
        compose.onNodeWithText("Quarterly report").assertIsFocused()
    }

    // Look

    @Test
    fun `the scrim and the panel take their colors, in every mode`() {
        for (mode in ColorMode.entries) {
            show(mode = mode) { RenameDialog() }
            val look = DialogAppearance.of(tokens(mode))
            val window = dialogWindow.pixels()
            assertPainted("scrim, ${mode.id}", look.scrim, window, 4, 4)
            val panel = panel("Rename file").bounds()
            val border = look.borderWidth.toInt()
            assertPainted("outline, ${mode.id}", look.border, window, panel.left.toInt() + border / 2, panel.center.y.toInt())
            assertPainted("fill, ${mode.id}", look.background, window, panel.left.toInt() + border + 2, panel.top.toInt() + border + 2)
        }
    }

    @Test
    fun `each size of dialog is as wide as its token, and centered`() {
        for (size in DialogSize.entries) {
            show { RenameDialog(size = size) }
            val panel = panel("Rename file").bounds()
            val window = dialogWindow.bounds()
            val width = DialogAppearance.of(tokens()).width(size).toFloat()
            assertClose("$size width", minOf(width, window.width - 2 * tokens().dialog.margin.toFloat()), panel.width)
            assertClose("$size centered", window.center.x, panel.center.x)
            assertClose("$size centered vertically", window.center.y, panel.center.y)
        }
    }

    @Test
    @Config(qualifiers = "w320dp-h640dp-mdpi")
    fun `on a narrow window a dialog spans the width less a margin`() {
        show { RenameDialog() }
        val margin = tokens().dialog.margin.toFloat()
        val panel = panel("Rename file").bounds()
        assertClose("width", 320 - 2 * margin, panel.width)
        assertClose("start", margin, panel.left)
    }

    @Test
    fun `the footer's buttons sit in a row at the end edge, the primary last, and at the left in right-to-left`() {
        for (direction in LayoutDirection.entries) {
            show(direction = direction) { RenameDialog() }
            val panel = panel("Rename file").bounds()
            val cancel = compose.onNodeWithText("Cancel").bounds()
            val rename = compose.onNodeWithText("Rename").bounds()
            val padding = tokens().dialog.padding.toFloat()
            assertClose("same line, $direction", cancel.top, rename.top)
            if (direction == LayoutDirection.Ltr) {
                assertClose("primary at the end, $direction", panel.right - padding, rename.right)
                assertTrue("Cancel before it, $direction", cancel.right < rename.left)
            } else {
                assertClose("primary at the end, $direction", panel.left + padding, rename.left)
                assertTrue("Cancel before it, $direction", cancel.left > rename.right)
            }
        }
    }

    @Test
    fun `the footer's buttons stack, the primary first and as wide as the panel, when they do not fit`() {
        show {
            RaincoatAlertDialog(
                open = true, onCancel = {}, onConfirm = {}, title = "Delete this address?", titleLevel = 2,
                confirmLabel = "Delete this address from my account and every order",
                cancelLabel = "Keep this address on my account for now", destructive = true,
            )
        }
        val panel = panel("Delete this address?").bounds()
        val cancel = compose.onNodeWithText("Keep this address on my account for now").bounds()
        val action = compose.onNodeWithText("Delete this address from my account and every order").bounds()
        assertTrue("the primary action first", action.bottom <= cancel.top)
        val padding = tokens().dialog.padding.toFloat()
        assertClose("as wide as the panel", panel.width - 2 * padding, action.width)
        assertClose("both", action.width, cancel.width)
    }

    @Test
    @Config(qualifiers = "w800dp-h480dp-mdpi")
    fun `a long body scrolls between the header and the footer`() {
        show { RenameDialog(body = { RaincoatText(List(20) { paragraph }.joinToString(" ")) }) }
        val window = dialogWindow.bounds()
        val panel = panel("Rename file").bounds()
        assertClose("as tall as the window lets it be", window.height - 2 * tokens().dialog.margin.toFloat(), panel.height)
        // The body scrolls, and the title and the buttons are outside it.
        val scrollable = compose.onNode(hasScrollAction()).bounds()
        val title = compose.onNodeWithText("Rename file").bounds()
        val rename = compose.onNodeWithText("Rename").bounds()
        assertTrue("the header is above the body", title.bottom <= scrollable.top)
        assertTrue("the footer is below the body", rename.top >= scrollable.bottom)
    }

    @Test
    @Config(qualifiers = "w480dp-h320dp-mdpi")
    fun `in a window too short for three lines of the body, the whole dialog scrolls`() {
        RuntimeEnvironment.setFontScale(2f)
        show { RenameDialog(body = { RaincoatText(List(10) { paragraph }.joinToString(" ")) }) }
        val scrollable = compose.onNode(hasScrollAction()).bounds()
        val title = compose.onNodeWithText("Rename file").bounds()
        assertTrue("the title scrolls with the rest", scrollable.contains(title.center))
    }

    // Sheets

    @Test
    fun `a bottom sheet touches the bottom edge, at most the medium panel wide, with a drag handle`() {
        show {
            RaincoatSheet(open = true, onDismissRequest = {}, title = "Filters", titleLevel = 2, closeLabel = "Close") {
                RaincoatText("Show files shared with you in the last 30 days.")
            }
        }
        val look = DialogAppearance.of(tokens())
        val window = dialogWindow.bounds()
        val sheet = panel("Filters").bounds()
        assertClose("at the bottom", window.bottom, sheet.bottom)
        assertClose("its width", look.bottomSheetMaxWidth.toFloat(), sheet.width)
        assertClose("centered", window.center.x, sheet.center.x)
        val pixels = dialogWindow.pixels()
        val handleY = (sheet.top + look.handle.offset + look.handle.height / 2).toInt()
        assertPainted("the handle", look.handle.color, pixels, sheet.center.x.toInt(), handleY)
    }

    @Test
    fun `dragging a bottom sheet down asks to close it, and it settles back when kept open`() {
        var requests = 0
        show {
            RaincoatSheet(open = true, onDismissRequest = { requests++ }, title = "Filters", titleLevel = 2, closeLabel = "Close") {
                RaincoatText("Show files shared with you in the last 30 days.")
            }
        }
        val before = panel("Filters").bounds()
        compose.onNodeWithText("Filters").performTouchInput { swipeDown(startY = top, endY = top + 600f) }
        compose.waitForIdle()
        assertEquals("a drag asks to close", 1, requests)
        assertClose("it settles back", before.top, panel("Filters").bounds().top)
    }

    @Test
    fun `an end sheet is as tall as the window at its end edge, the left in right-to-left`() {
        for (direction in LayoutDirection.entries) {
            show(direction = direction) {
                RaincoatSheet(open = true, onDismissRequest = {}, title = "Filters", titleLevel = 2, edge = SheetEdge.End, closeLabel = "Close")
            }
            val window = dialogWindow.bounds()
            val sheet = panel("Filters").bounds()
            assertClose("width, $direction", tokens().sheet.width.end.toFloat(), sheet.width)
            assertClose("height, $direction", window.height, sheet.height)
            if (direction == LayoutDirection.Ltr) {
                assertClose("at the right", window.right, sheet.right)
            } else {
                assertClose("at the left", window.left, sheet.left)
            }
        }
    }

    @Test
    @Config(qualifiers = "w600dp-h800dp-mdpi")
    fun `on a window less than twice its width, an end sheet comes from the bottom`() {
        show {
            RaincoatSheet(open = true, onDismissRequest = {}, title = "Filters", titleLevel = 2, edge = SheetEdge.End, closeLabel = "Close")
        }
        val window = dialogWindow.bounds()
        val sheet = panel("Filters").bounds()
        assertClose("at the bottom", window.bottom, sheet.bottom)
        assertTrue("not the full height", sheet.height < window.height)
    }
}
