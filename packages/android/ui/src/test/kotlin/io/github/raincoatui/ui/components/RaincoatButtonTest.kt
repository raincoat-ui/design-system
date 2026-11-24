package io.github.raincoatui.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PixelMap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.painter.Painter
import androidx.compose.ui.graphics.toPixelMap
import androidx.compose.ui.input.InputMode
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.platform.LocalInputModeManager
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.ViewConfiguration
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.ProgressBarRangeInfo
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.semantics.getOrNull
import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.SemanticsNodeInteraction
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.assertHasClickAction
import androidx.compose.ui.test.assertHeightIsEqualTo
import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.assertIsFocused
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.assertTouchHeightIsEqualTo
import androidx.compose.ui.test.assertTouchWidthIsEqualTo
import androidx.compose.ui.test.assertWidthIsEqualTo
import androidx.compose.ui.test.click
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performKeyInput
import androidx.compose.ui.test.performMouseInput
import androidx.compose.ui.test.performTouchInput
import androidx.compose.ui.test.pressKey
import androidx.compose.ui.test.requestFocus
import androidx.compose.ui.text.TextLayoutResult
import androidx.compose.ui.text.style.LineBreak
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.github.raincoatui.tokens.ButtonSize
import io.github.raincoatui.tokens.ButtonVariant
import io.github.raincoatui.tokens.ColorMode
import io.github.raincoatui.tokens.Density
import io.github.raincoatui.tokens.RaincoatTokenSet
import io.github.raincoatui.tokens.TokenColor
import io.github.raincoatui.tokens.TokenFormat
import io.github.raincoatui.ui.RaincoatTheme
import io.github.raincoatui.ui.generated.allThemes
import io.github.raincoatui.ui.toColor
import kotlin.math.ceil
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.ParameterizedRobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

/**
 * The Button, tested against specs/components/button/spec.yaml.
 *
 * The tests run on the JVM. They read what assistive technology is told (the semantics), drive
 * the button with touch, mouse, and keys, and draw it and read the pixels back. The screen is
 * one pixel per dp, so a measurement in pixels is a measurement in dp.
 */
@RunWith(ParameterizedRobolectricTestRunner::class)
@Config(qualifiers = "w480dp-h800dp-mdpi")
@OptIn(ExperimentalTestApi::class)
class RaincoatButtonTest(themeId: String) {
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
    private val stagePadding = 24
    private val longLabel = "Save all of these changes and send the updated version to every reviewer"

    private fun tokens(mode: ColorMode = ColorMode.Light, density: Density = Density.Comfortable): RaincoatTokenSet =
        theme.tokens(mode, density)

    // The test rule takes content once, so the content is a state that a test can replace.
    private var scene by mutableStateOf<(@Composable () -> Unit)?>(null)
    private var scenes = 0

    /**
     * Shows [content] in a theme, on a stage painted with the theme's canvas color and padded to
     * leave room around the content. Each call starts from fresh state.
     */
    private fun show(
        mode: ColorMode = ColorMode.Light,
        density: Density = Density.Comfortable,
        direction: LayoutDirection = LayoutDirection.Ltr,
        keyboard: Boolean = false,
        content: @Composable () -> Unit,
    ) {
        canvas = tokens(mode).color.bg.canvas
        val number = ++scenes
        scene = {
            key(number) {
                RaincoatTheme(
                    theme = this.theme,
                    darkTheme = mode == ColorMode.Dark || mode == ColorMode.DarkHighContrast,
                    increasedContrast = mode == ColorMode.LightHighContrast || mode == ColorMode.DarkHighContrast,
                    density = density,
                ) {
                    // Focus is only shown, and only taken by a click target, when a keyboard is
                    // in use.
                    val inputMode = LocalInputModeManager.current
                    SideEffect { inputMode.requestInputMode(if (keyboard) InputMode.Keyboard else InputMode.Touch) }
                    CompositionLocalProvider(LocalLayoutDirection provides direction) {
                        Box(Modifier.testTag(stage).background(canvas.toColor()).padding(stagePadding.dp)) {
                            content()
                        }
                    }
                }
            }
        }
        if (number == 1) compose.setContent { scene?.invoke() }
        compose.waitForIdle()
    }

    /** The color behind the content of the current scene. */
    private var canvas: TokenColor = tokens().color.bg.canvas

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

    /** Whether nothing is drawn here: the stage's canvas color shows. */
    private fun PixelMap.isClear(x: Int, y: Int): Boolean = has(canvas, x, y)

    /**
     * The rows of a column from the first that has paint to the last, as the SwiftUI tests
     * measure them. A theme may draw a button's label or icon in the canvas color, such as white
     * on a black button on a white page, so the paint is measured from edge to edge, not counted.
     */
    private fun PixelMap.paintedRows(x: Int): IntRange = (0 until height).filter { !isClear(x, it) }.span()

    /** The columns of a row from the first that has paint to the last. */
    private fun PixelMap.paintedColumns(y: Int): IntRange = (0 until width).filter { !isClear(it, y) }.span()

    private fun List<Int>.span(): IntRange = if (isEmpty()) IntRange.EMPTY else first()..last()

    /** The columns in which a color fills at least [rows] pixels. */
    private fun PixelMap.columnsFilledWith(color: TokenColor, rows: Int): List<Int> =
        (0 until width).filter { x -> (0 until height).count { y -> has(color, x, y) } >= rows }

    private fun height(button: RaincoatTokenSet.ButtonTokens, size: ButtonSize): Int = when (size) {
        ButtonSize.Sm -> button.height.sm
        ButtonSize.Md -> button.height.md
        ButtonSize.Lg -> button.height.lg
    }.toInt()

    /** A painter that fills its bounds: an icon that is easy to find in a drawing. */
    private object Block : Painter() {
        override val intrinsicSize: Size = Size.Unspecified

        override fun DrawScope.onDraw() {
            drawRect(Color.Black)
        }
    }

    private val isButton = SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Button)
    private val isBusy =
        SemanticsMatcher.expectValue(SemanticsProperties.ProgressBarRangeInfo, ProgressBarRangeInfo.Indeterminate)

    // Semantics and activation

    @Test
    fun `is a button named by its label, and a click activates it`() {
        var clicks = 0
        show { RaincoatButton("Save changes", onClick = { clicks++ }) }
        compose.onNodeWithText("Save changes").assert(isButton).assertHasClickAction().assertIsEnabled().performClick()
        assertEquals(1, clicks)
    }

    @Test
    fun `takes keyboard focus and is activated by Enter`() {
        var clicks = 0
        show(keyboard = true) { RaincoatButton("Save", onClick = { clicks++ }) }
        val button = compose.onNodeWithText("Save")
        button.requestFocus().assertIsFocused()
        button.performKeyInput { pressKey(Key.Enter) }
        assertEquals(1, clicks)
    }

    @Test
    fun `when disabled, cannot be activated or focused`() {
        var clicks = 0
        show(keyboard = true) { RaincoatButton("Save", onClick = { clicks++ }, enabled = false) }
        val button = compose.onNodeWithText("Save")
        button.assert(isButton).assertIsNotEnabled().performClick()
        assertEquals(0, clicks)
        assertNull(button.fetchSemanticsNode().config.getOrNull(SemanticsProperties.Focused))
    }

    @Test
    fun `when loading, is busy, keeps its label and focus, and ignores activation`() {
        var clicks = 0
        show(keyboard = true) { RaincoatButton("Save", onClick = { clicks++ }, loading = true) }
        val button = compose.onNodeWithText("Save")
        button.assert(isButton).assert(isBusy).assertIsEnabled()
        button.requestFocus().assertIsFocused()
        button.performClick()
        button.performKeyInput { pressKey(Key.Enter) }
        assertEquals(0, clicks)
    }

    @Test
    fun `a disabled button is not also busy`() {
        show { RaincoatButton("Save", onClick = {}, enabled = false, loading = true) }
        val config = compose.onNodeWithText("Save").assertIsNotEnabled().fetchSemanticsNode().config
        assertNull(config.getOrNull(SemanticsProperties.ProgressBarRangeInfo))
    }

    @Test
    fun `an icon-only button is named by its description, and icons beside a label are not named`() {
        show {
            RaincoatButton(icon = Block, contentDescription = "Delete page", onClick = {})
        }
        compose.onNodeWithContentDescription("Delete page").assert(isButton).assertHasClickAction()

        show { RaincoatButton("Next", onClick = {}, leadingIcon = Block, trailingIcon = Block) }
        val config = compose.onNodeWithText("Next").fetchSemanticsNode().config
        assertNull(config.getOrNull(SemanticsProperties.ContentDescription))
    }

    // Colors

    @Test
    fun `each variant is painted with its tokens, at rest, pressed, and hovered`() {
        for (mode in ColorMode.entries) {
            val button = tokens(mode).button
            for (variant in ButtonVariant.entries) {
                val where = "$variant in ${mode.id}"
                val colors = { state: ButtonInteraction -> ButtonColors.of(button, variant, state) }
                show(mode) { RaincoatButton("Save", onClick = {}, variant = variant) }
                val node = compose.onNodeWithText("Save")
                val middle = node.pixels().height / 2

                // Just inside the left edge, and on the edge itself.
                val rest = node.pixels()
                when (val fill = colors(ButtonInteraction.Rest).fill) {
                    null -> assertTrue(where, rest.isClear(3, middle))
                    else -> assertPainted("$where, at rest", fill, rest, 3, middle)
                }
                when (val border = colors(ButtonInteraction.Rest).border) {
                    null -> assertEquals(where, rest[3, middle], rest[0, middle])
                    else -> assertPainted("$where, outline", border, rest, 0, middle)
                }
                assertTrue(where, rest.columnsFilledWith(colors(ButtonInteraction.Rest).foreground, rows = 1).isNotEmpty())

                node.performTouchInput { down(center) }
                compose.mainClock.advanceTimeBy(500)
                assertPainted("$where, pressed", colors(ButtonInteraction.Pressed).fill!!, node.pixels(), 3, middle)
                node.performTouchInput { up() }

                node.performMouseInput { enter(center) }
                compose.mainClock.advanceTimeBy(500)
                assertPainted("$where, hovered", colors(ButtonInteraction.Hover).fill!!, node.pixels(), 3, middle)
                // Leave by moving well away, or the next button would appear under the pointer
                // and be hovered from the start.
                node.performMouseInput { exit(Offset(-100f, -100f)) }
            }
        }
    }

    @Test
    fun `every variant is painted the same when disabled`() {
        for (mode in ColorMode.entries) {
            val disabled = tokens(mode).button.disabled
            for (variant in ButtonVariant.entries) {
                show(mode) { RaincoatButton("Save", onClick = {}, variant = variant, enabled = false) }
                val pixels = compose.onNodeWithText("Save").pixels()
                assertTrue("$variant in ${mode.id}", pixels.has(disabled.bg, 3, pixels.height / 2))
                assertTrue("$variant in ${mode.id}", pixels.has(disabled.border, 0, pixels.height / 2))
            }
        }
    }

    @Test
    fun `a loading button does not react to the pointer`() {
        val button = tokens().button
        show { RaincoatButton("Save", onClick = {}, variant = ButtonVariant.Primary, loading = true) }
        val node = compose.onNodeWithText("Save")
        node.performTouchInput { down(center) }
        compose.mainClock.advanceTimeBy(500)
        val pixels = node.pixels()
        assertTrue(pixels.has(button.primary.bg.default, 3, pixels.height / 2))
    }

    @Test
    fun `keyboard focus draws the focus ring around the button, with a gap`() {
        val button = tokens().button
        show(keyboard = true) { RaincoatButton("Save", onClick = {}, variant = ButtonVariant.Primary) }
        val left = stagePadding
        val middle = compose.onNodeWithTag(stage).pixels().height / 2
        val gap = button.focusRing.offset.toInt()
        val width = button.focusRing.width.toInt()

        val before = compose.onNodeWithTag(stage).pixels()
        assertTrue(before.isClear(left - gap - 1, middle))

        compose.onNodeWithText("Save").requestFocus().assertIsFocused()
        val focused = compose.onNodeWithTag(stage).pixels()
        // From the button's edge outward: the gap, then the ring, then nothing.
        assertTrue(focused.has(button.primary.bg.default, left + 3, middle))
        assertTrue(focused.isClear(left - 1, middle))
        assertTrue(focused.has(button.focusRing.color, left - gap - 1, middle))
        assertTrue(focused.has(button.focusRing.color, left - gap - width, middle))
        assertTrue(focused.isClear(left - gap - width - 1, middle))
    }

    // Measurements

    @Test
    fun `a button is as tall as its token and takes no more room than it shows`() {
        for (density in Density.entries) {
            val button = tokens(density = density).button
            for (size in ButtonSize.entries) {
                val where = "$size at ${density.id}"
                val visible = height(button, size)
                show(density = density) {
                    RaincoatButton("Save", onClick = {}, variant = ButtonVariant.Primary, size = size)
                }
                val node = compose.onNodeWithText("Save")
                node.assertHeightIsEqualTo(visible.dp)
                // The fill covers the whole height. (A quarter of the way along is clear of the
                // round corners.)
                val pixels = node.pixels()
                assertEquals(where, visible, pixels.height)
                assertEquals(where, 0 until visible, pixels.paintedRows(pixels.width / 4))
            }
        }
    }

    @Test
    fun `an icon-only button is square, with the icon at its token size`() {
        for (density in Density.entries) {
            val button = tokens(density = density).button
            for (size in ButtonSize.entries) {
                val where = "$size at ${density.id}"
                val side = height(button, size)
                show(density = density) {
                    RaincoatButton(
                        icon = Block,
                        contentDescription = "Delete page",
                        onClick = {},
                        variant = ButtonVariant.Primary,
                        size = size,
                    )
                }
                val node = compose.onNodeWithContentDescription("Delete page")
                node.assertWidthIsEqualTo(side.dp).assertHeightIsEqualTo(side.dp)
                val pixels = node.pixels()
                assertEquals(where, 0 until side, pixels.paintedRows(side / 2))
                assertEquals(where, 0 until side, pixels.paintedColumns(side / 2))

                val iconSize = when (size) {
                    ButtonSize.Sm -> button.iconSize.sm
                    ButtonSize.Md -> button.iconSize.md
                    ButtonSize.Lg -> button.iconSize.lg
                }.toInt()
                assertEquals(where, iconSize, pixels.columnsFilledWith(button.primary.fg, rows = iconSize).size)
            }
        }
    }

    // Touch target

    /** The platform's minimum touch target, which is larger than the token's. */
    private val target = 48

    @Test
    fun `the touch target is at least the minimum, whatever the visible size`() {
        for (density in Density.entries) {
            val button = tokens(density = density).button
            for (size in ButtonSize.entries) {
                val side = height(button, size)
                show(density = density) {
                    RaincoatButton(icon = Block, contentDescription = "Delete page", onClick = {}, size = size)
                }
                // This is the area that assistive technology is given, too.
                compose.onNodeWithContentDescription("Delete page")
                    .assertTouchWidthIsEqualTo(maxOf(side, target).dp)
                    .assertTouchHeightIsEqualTo(maxOf(side, target).dp)
            }
        }
    }

    @Test
    fun `a small button takes touches that land just outside it, as far as the minimum target`() {
        val side = height(tokens().button, ButtonSize.Sm)
        val reach = (target - side) / 2f
        assertTrue("the small button is smaller than the target", reach >= 2)
        var clicks = 0
        show {
            RaincoatButton(
                icon = Block,
                contentDescription = "Delete page",
                onClick = { clicks++ },
                size = ButtonSize.Sm,
            )
        }
        val node = compose.onNodeWithContentDescription("Delete page")
        val middle = side / 2f

        // One pixel inside the edge of the target, on each side.
        val inside = listOf(
            Offset(middle, -reach + 1),
            Offset(middle, side + reach - 1),
            Offset(-reach + 1, middle),
            Offset(side + reach - 1, middle),
        )
        for ((index, point) in inside.withIndex()) {
            node.performTouchInput { click(point) }
            assertEquals("a touch at $point", index + 1, clicks)
        }

        // Two pixels outside it.
        val outside = listOf(
            Offset(middle, -reach - 2),
            Offset(middle, side + reach + 2),
            Offset(-reach - 2, middle),
            Offset(side + reach + 2, middle),
        )
        for (point in outside) {
            node.performTouchInput { click(point) }
            assertEquals("a touch at $point", inside.size, clicks)
        }
    }

    @Test
    fun `a mouse has to be on the button itself`() {
        val side = height(tokens().button, ButtonSize.Sm)
        var clicks = 0
        show {
            RaincoatButton(
                icon = Block,
                contentDescription = "Delete page",
                onClick = { clicks++ },
                size = ButtonSize.Sm,
            )
        }
        val node = compose.onNodeWithContentDescription("Delete page")
        node.performMouseInput { click(Offset(side / 2f, -2f)) }
        assertEquals(0, clicks)
        node.performMouseInput { click(Offset(side / 2f, 2f)) }
        assertEquals(1, clicks)
    }

    @Test
    fun `a touch between two small buttons goes to the nearer one`() {
        val side = height(tokens().button, ButtonSize.Sm)
        val gap = 4
        val clicked = mutableListOf<String>()
        show {
            Column(verticalArrangement = Arrangement.spacedBy(gap.dp)) {
                RaincoatButton("First", onClick = { clicked += "First" }, size = ButtonSize.Sm)
                RaincoatButton("Second", onClick = { clicked += "Second" }, size = ButtonSize.Sm)
            }
        }
        // Both targets cover the gap. Positions are measured from the first button.
        val first = compose.onNodeWithText("First")
        first.performTouchInput { click(Offset(centerX, side + 1f)) }
        first.performTouchInput { click(Offset(centerX, side + gap - 1f)) }
        assertEquals(listOf("First", "Second"), clicked)
    }

    @Test
    fun `the larger of the platform's minimum target and the token's is used`() {
        fun configuration(target: Int) = object : ViewConfiguration {
            override val longPressTimeoutMillis = 400L
            override val doubleTapTimeoutMillis = 300L
            override val doubleTapMinTimeMillis = 40L
            override val touchSlop = 7f
            override val minimumTouchTargetSize = DpSize(target.dp, target.dp)
        }

        val platformIsLarger = configuration(48)
        assertTrue(platformIsLarger.withMinimumTouchTarget(44.dp) === platformIsLarger)

        val tokenIsLarger = configuration(40).withMinimumTouchTarget(44.dp)
        assertEquals(DpSize(44.dp, 44.dp), tokenIsLarger.minimumTouchTargetSize)
        // Everything else is the platform's.
        assertEquals(7f, tokenIsLarger.touchSlop)
        assertEquals(400L, tokenIsLarger.longPressTimeoutMillis)
    }

    @Test
    fun `a long label wraps and the button grows taller`() {
        val button = tokens().button
        show {
            Box(Modifier.width(220.dp)) {
                RaincoatButton(longLabel, onClick = {}, variant = ButtonVariant.Primary)
            }
        }
        val pixels = compose.onNodeWithText(longLabel).pixels()
        val lineHeight = button.label.md.lineHeight * button.label.md.size
        assertEquals(220, pixels.width)
        // At least three lines: the font decides exactly how many.
        assertTrue("height ${pixels.height}", pixels.height >= 3 * lineHeight)
        // All of it is inside the fill. (The middle column is measured: the corners are round.)
        assertEquals(0 until pixels.height, pixels.paintedRows(pixels.width / 2))
    }

    @Test
    fun `the button grows with the font size setting`() {
        val button = tokens().button
        RuntimeEnvironment.setFontScale(2f)
        show { RaincoatButton("Save", onClick = {}, variant = ButtonVariant.Primary, leadingIcon = Block) }
        val pixels = compose.onNodeWithText("Save").pixels()
        val line = button.label.md.lineHeight * button.label.md.size
        // Android enlarges big text by less than the setting says, so ask it for the sizes. The
        // line height stays a multiple of the font size.
        val (scaledLine, scaledIcon) = with(compose.density) {
            ceil(button.label.md.lineHeight * button.label.md.size.sp.toPx()).toInt() to
                button.iconSize.md.sp.roundToPx()
        }
        assertTrue(scaledLine > 1.5 * line)
        // The line is taller, and the space above and below it is what it was.
        val padding = (button.height.md.toInt() - ceil(line).toInt()) / 2
        assertEquals(scaledLine + 2 * padding, pixels.height)
        // The icon grows with the text.
        assertTrue(scaledIcon > button.iconSize.md)
        assertEquals(scaledIcon, pixels.columnsFilledWith(button.primary.fg, rows = scaledIcon).size)
    }

    @Test
    fun `an icon-only button grows with the font size setting, stays square, and keeps the space around its icon`() {
        val button = tokens().button
        RuntimeEnvironment.setFontScale(2f)
        show {
            RaincoatButton(icon = Block, contentDescription = "Delete page", onClick = {}, variant = ButtonVariant.Primary)
        }
        val pixels = compose.onNodeWithContentDescription("Delete page").pixels()
        val scaledIcon = with(compose.density) { button.iconSize.md.sp.roundToPx() }
        // What centers the icon in the height at the default font size.
        val space = (button.height.md.toInt() - button.iconSize.md.toInt()) / 2
        assertTrue(scaledIcon > button.iconSize.md)
        assertEquals(scaledIcon, pixels.columnsFilledWith(button.primary.fg, rows = scaledIcon).size)
        assertEquals(scaledIcon + 2 * space, pixels.width)
        assertEquals(scaledIcon + 2 * space, pixels.height)
    }

    /** How a text was laid out, as the text's own node reports it. */
    private fun textLayout(text: String): TextLayoutResult {
        val results = mutableListOf<TextLayoutResult>()
        compose.onNodeWithText(text, useUnmergedTree = true)
            .fetchSemanticsNode()
            .config[SemanticsActions.GetTextLayoutResult]
            .action
            ?.invoke(results)
        return results.single()
    }

    @Test
    fun `a Japanese label never starts a line with a small kana or a prolonged sound mark`() {
        // The long label of the spec's examples, in Japanese.
        val label = "これらの変更をすべて保存し、更新版をすべてのレビュー担当者に送信"
        val noLineStart = "ぁぃぅぇぉっゃゅょゎゕゖァィゥェォッャュョヮヵヶー、。"
        val later = mutableListOf<String>()
        // At widths a few pixels apart, so that a line ends at every place it can.
        for (width in 120..400 step 4) {
            show {
                Box(Modifier.width(width.dp)) { RaincoatButton(label, onClick = {}, variant = ButtonVariant.Primary) }
            }
            val layout = textLayout(label)
            assertEquals(LineBreak.Strictness.Strict, layout.layoutInput.style.lineBreak.strictness)
            for (line in 1 until layout.lineCount) later += label.substring(layout.getLineStart(line))
        }
        assertTrue("the label wraps", later.isNotEmpty())
        assertEquals(emptyList<String>(), later.filter { it.first() in noLineStart })
    }

    @Test
    fun `a Korean label wraps only between whole words`() {
        // The language is the person's, as on a device: set before anything is drawn.
        RuntimeEnvironment.setQualifiers("+b+ko")
        // The long label of the spec's examples, in Korean.
        val label = "변경 사항을 모두 저장하고 업데이트된 버전을 모든 검토자에게 보내기"
        val split = mutableListOf<String>()
        var wrapped = false
        // At widths a few pixels apart, so that a line ends at every place it can.
        for (width in 120..400 step 4) {
            show {
                Box(Modifier.width(width.dp)) { RaincoatButton(label, onClick = {}, variant = ButtonVariant.Primary) }
            }
            val layout = textLayout(label)
            assertEquals("at $width", LineBreak.WordBreak.Phrase, layout.layoutInput.style.lineBreak.wordBreak)
            for (line in 0 until layout.lineCount - 1) {
                wrapped = true
                val end = layout.getLineEnd(line)
                if (label[end - 1] != ' ') split += "at $width: ${label.substring(0, end)}|"
            }
        }
        assertTrue("the label wraps", wrapped)
        assertEquals("lines that end inside a word", emptyList<String>(), split)
    }

    @Test
    fun `a full-width button fills the width it is offered`() {
        show { Box(Modifier.width(300.dp)) { RaincoatButton("Save", onClick = {}) } }
        assertTrue(compose.onNodeWithText("Save").pixels().width < 300)

        show {
            Box(Modifier.width(300.dp)) {
                RaincoatButton("Save", onClick = {}, variant = ButtonVariant.Primary, fullWidth = true)
            }
        }
        val pixels = compose.onNodeWithText("Save").pixels()
        assertEquals(300, pixels.width)
        assertEquals(0 until 300, pixels.paintedColumns(pixels.height / 2))
    }

    @Test
    fun `the leading icon is on the side where reading starts`() {
        val button = tokens().button
        val icon = button.iconSize.md.toInt()
        for (direction in LayoutDirection.entries) {
            show(direction = direction) {
                RaincoatButton("Next", onClick = {}, variant = ButtonVariant.Primary, leadingIcon = Block)
            }
            val pixels = compose.onNodeWithText("Next").pixels()
            val columns = pixels.columnsFilledWith(button.primary.fg, rows = icon)
            assertEquals("$direction", icon, columns.size)
            if (direction == LayoutDirection.Ltr) {
                assertTrue(columns.last() < pixels.width / 2)
            } else {
                assertTrue(columns.first() > pixels.width / 2)
            }
        }
    }

    @Test
    fun `a loading button shows a spinner in place of the leading icon`() {
        val button = tokens().button
        val icon = button.iconSize.md.toInt()
        val widths = mutableMapOf<String, Int>()
        val blocks = mutableMapOf<String, Int>()
        val cases = mapOf<String, @Composable () -> Unit>(
            "plain" to { RaincoatButton("Save", onClick = {}, variant = ButtonVariant.Primary) },
            "icon" to { RaincoatButton("Save", onClick = {}, variant = ButtonVariant.Primary, leadingIcon = Block) },
            "loading" to {
                RaincoatButton("Save", onClick = {}, variant = ButtonVariant.Primary, leadingIcon = Block, loading = true)
            },
            "loading, no icon" to { RaincoatButton("Save", onClick = {}, variant = ButtonVariant.Primary, loading = true) },
        )
        for ((name, content) in cases) {
            show(content = content)
            val pixels = compose.onNodeWithText("Save").pixels()
            widths[name] = pixels.width
            blocks[name] = pixels.columnsFilledWith(button.primary.fg, rows = icon).size
        }
        // The spinner takes the icon's place: same width with or without an icon, and wider
        // than the plain button by one icon and one gap.
        assertEquals(icon, blocks["icon"])
        assertEquals(0, blocks["loading"])
        assertEquals(widths["icon"], widths["loading"])
        assertEquals(widths["icon"], widths["loading, no icon"])
        assertEquals(widths.getValue("plain") + icon + button.gap.toInt(), widths["loading"])
        assertFalse(widths["plain"] == widths["loading"])
    }
}
