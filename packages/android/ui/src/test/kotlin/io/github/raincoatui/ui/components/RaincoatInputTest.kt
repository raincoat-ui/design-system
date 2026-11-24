package io.github.raincoatui.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PixelMap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.painter.Painter
import androidx.compose.ui.graphics.toPixelMap
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.semantics.getOrNull
import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.SemanticsNodeInteraction
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.assertHeightIsEqualTo
import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.assertIsFocused
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.assertIsNotFocused
import androidx.compose.ui.test.assertTouchHeightIsEqualTo
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.click
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performKeyInput
import androidx.compose.ui.test.performMouseInput
import androidx.compose.ui.test.performTextInput
import androidx.compose.ui.test.performTouchInput
import androidx.compose.ui.test.pressKey
import androidx.compose.ui.test.requestFocus
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import io.github.raincoatui.tokens.ColorMode
import io.github.raincoatui.tokens.Density
import io.github.raincoatui.tokens.InputSize
import io.github.raincoatui.tokens.InputType
import io.github.raincoatui.tokens.RaincoatTokenSet
import io.github.raincoatui.tokens.TokenColor
import io.github.raincoatui.tokens.TokenFormat
import io.github.raincoatui.ui.RaincoatTheme
import io.github.raincoatui.ui.generated.allThemes
import io.github.raincoatui.ui.toColor
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.ParameterizedRobolectricTestRunner
import org.robolectric.annotation.Config

/**
 * The Input, tested against specs/components/input/spec.yaml.
 *
 * The tests run on the JVM. They read what assistive technology is told (the semantics), type
 * into the field, drive it with touch, a mouse, and keys, and draw it and read the pixels back.
 * The screen is one pixel per dp, so a measurement in pixels is a measurement in dp.
 */
@RunWith(ParameterizedRobolectricTestRunner::class)
@Config(qualifiers = "w480dp-h800dp-mdpi")
@OptIn(ExperimentalTestApi::class)
class RaincoatInputTest(themeId: String) {
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
    private val fieldTag = "field"
    private val stagePadding = 24
    private val error = "Enter an email address, like name@example.com"

    private fun tokens(mode: ColorMode = ColorMode.Light, density: Density = Density.Comfortable): RaincoatTokenSet =
        theme.tokens(mode, density)

    // The test rule takes content once, so the content is a state that a test can replace.
    private var scene by mutableStateOf<(@Composable () -> Unit)?>(null)
    private var scenes = 0

    /** The color behind the content of the current scene. */
    private var canvas: TokenColor = tokens().color.bg.canvas

    /**
     * Shows [content] in a theme, on a stage painted with the theme's canvas color and padded to
     * leave room around the content, 300dp wide. Each call starts from fresh state.
     */
    private fun show(
        mode: ColorMode = ColorMode.Light,
        density: Density = Density.Comfortable,
        direction: LayoutDirection = LayoutDirection.Ltr,
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
                    CompositionLocalProvider(LocalLayoutDirection provides direction) {
                        Box(Modifier.testTag(stage).background(canvas.toColor()).padding(stagePadding.dp)) {
                            Box(Modifier.width(300.dp)) { content() }
                        }
                    }
                }
            }
        }
        if (number == 1) compose.setContent { scene?.invoke() }
        compose.waitForIdle()
    }

    /** A field whose value the test holds, as an app does. */
    @Composable
    private fun Field(
        label: String = "Email",
        initial: String = "",
        type: InputType = InputType.Text,
        size: InputSize = InputSize.Md,
        description: String? = null,
        invalid: Boolean = false,
        multiline: Boolean = false,
        enabled: Boolean = true,
        readOnly: Boolean = false,
        labelHidden: Boolean = false,
        leadingIcon: Painter? = null,
    ) {
        var value by remember { mutableStateOf(initial) }
        RaincoatInput(
            value = value,
            onValueChange = { value = it },
            label = label,
            modifier = Modifier.testTag(fieldTag),
            type = type,
            size = size,
            description = description,
            invalid = invalid,
            error = error,
            multiline = multiline,
            enabled = enabled,
            readOnly = readOnly,
            labelHidden = labelHidden,
            leadingIcon = leadingIcon,
        )
    }

    /** The text field, with everything it carries for assistive technology. */
    private fun field(): SemanticsNodeInteraction = compose.onNodeWithTag(fieldTag)

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

    private fun PixelMap.isClear(x: Int, y: Int): Boolean = has(canvas, x, y)

    /**
     * The columns inside the outline in which a color fills at least [rows] pixels. The outline
     * may be the color of the value, as ink on white is.
     */
    private fun PixelMap.columnsFilledWith(color: TokenColor, rows: Int): List<Int> =
        (1 until width - 1).filter { x -> (1 until height - 1).count { y -> has(color, x, y) } >= rows }

    private fun case(content: @Composable () -> Unit, fill: TokenColor, border: TokenColor) =
        Triple(content, fill, border)

    private fun height(input: RaincoatTokenSet.InputTokens, size: InputSize): Int = when (size) {
        InputSize.Sm -> input.height.sm
        InputSize.Md -> input.height.md
        InputSize.Lg -> input.height.lg
    }.toInt()

    /** A painter that fills its bounds: an icon that is easy to find in a drawing. */
    private object Block : Painter() {
        override val intrinsicSize: Size = Size.Unspecified

        override fun DrawScope.onDraw() {
            drawRect(Color.Black)
        }
    }

    private fun texts(node: SemanticsNodeInteraction): List<String> =
        node.fetchSemanticsNode().config.getOrNull(SemanticsProperties.Text).orEmpty().map { it.text }

    // Semantics

    @Test
    fun `is a text field named by its label, and takes typing`() {
        show { Field(label = "Full name") }
        val node = field()
        assertEquals(listOf("Full name"), texts(node))
        node.assertIsEnabled().performTextInput("Ana")
        node.assert(hasText("Ana"))
        assertNull(node.fetchSemanticsNode().config.getOrNull(SemanticsProperties.Error))
    }

    @Test
    fun `the description follows the name, and an invalid field carries its error`() {
        show { Field(description = "We send the receipt here.") }
        assertEquals(listOf("Email", "We send the receipt here."), texts(field()))
        assertNull(field().fetchSemanticsNode().config.getOrNull(SemanticsProperties.Error))

        show { Field(description = "We send the receipt here.", invalid = true) }
        val config = field().fetchSemanticsNode().config
        assertEquals(error, config.getOrNull(SemanticsProperties.Error))
        // The message is said once, as the error; the description stays.
        assertEquals(listOf("Email", "We send the receipt here."), texts(field()))
    }

    @Test
    fun `a hidden label is still the name, and takes no room`() {
        show { Field(label = "Search", labelHidden = true, type = InputType.Search) }
        assertEquals(listOf("Search"), texts(field()))
        field().assertHeightIsEqualTo(height(tokens().input, InputSize.Md).dp)
    }

    @Test
    fun `a disabled field cannot be focused or changed`() {
        show { Field(enabled = false, initial = "ana") }
        val node = field().assertIsNotEnabled()
        node.performClick()
        node.assertIsNotFocused()
    }

    @Test
    fun `a read-only field can be focused, but not changed`() {
        show { Field(label = "Account number", initial = "DE89 3704 0044", readOnly = true) }
        val node = field()
        node.requestFocus().assertIsFocused()
        node.performKeyInput { pressKey(Key.A) }
        compose.waitForIdle()
        node.assert(hasText("DE89 3704 0044"))
    }

    @Test
    fun `a multi-line field starts three lines tall and grows with its content`() {
        val input = tokens().input
        val line = input.value.md.lineHeight * input.value.md.size
        show { Field(label = "Message", labelHidden = true, multiline = true) }
        val node = field()
        val start = node.pixels().height
        assertTrue("height $start", start >= input.height.md + 2 * line - 2)
        node.performTextInput("One\nTwo\nThree\nFour\nFive")
        compose.waitForIdle()
        val grown = node.pixels().height
        assertTrue("height $grown", grown >= start + 2 * line - 2)
    }

    // Colors

    @Test
    fun `each state of a field is painted with its tokens`() {
        for (mode in ColorMode.entries) {
            val input = tokens(mode).input
            val cases = mapOf(
                "rest" to case({ Field(labelHidden = true) }, input.bg.default, input.border.default),
                "invalid" to case({ Field(labelHidden = true, invalid = true) }, input.bg.default, input.border.invalid),
                "read-only" to case(
                    { Field(labelHidden = true, readOnly = true, initial = "ana") },
                    input.bg.readOnly,
                    input.border.readOnly,
                ),
                "disabled" to case(
                    { Field(labelHidden = true, enabled = false, invalid = true) },
                    input.bg.disabled,
                    input.border.disabled,
                ),
            )
            for ((state, case) in cases) {
                val (content, fill, border) = case
                val where = "$state in ${mode.id}"
                show(mode, content = content)
                val pixels = compose.onNodeWithTag(stage).pixels()
                val middle = stagePadding + height(input, InputSize.Md) / 2
                assertPainted("$where, fill", fill, pixels, stagePadding + 3, middle)
                assertPainted("$where, outline", border, pixels, stagePadding, middle)
            }
        }
    }

    @Test
    fun `the focus ring is drawn whenever the field has focus, with a gap`() {
        val input = tokens().input
        show { Field(labelHidden = true) }
        val left = stagePadding
        val middle = stagePadding + height(input, InputSize.Md) / 2
        val gap = input.focusRing.offset.toInt()
        val width = input.focusRing.width.toInt()

        val before = compose.onNodeWithTag(stage).pixels()
        assertTrue(before.isClear(left - gap - 1, middle))

        // A touch focuses a field, and the ring is drawn: the field has focus only to be typed in.
        field().performClick().assertIsFocused()
        val focused = compose.onNodeWithTag(stage).pixels()
        assertTrue(focused.isClear(left - 1, middle))
        assertTrue(focused.has(input.focusRing.color, left - gap - 1, middle))
        assertTrue(focused.has(input.focusRing.color, left - gap - width, middle))
        assertTrue(focused.isClear(left - gap - width - 1, middle))
    }

    // Measurements

    @Test
    fun `a field is as tall as its token and takes no more room than it shows`() {
        for (density in Density.entries) {
            val input = tokens(density = density).input
            for (size in InputSize.entries) {
                val visible = height(input, size)
                show(density = density) { Field(labelHidden = true, size = size) }
                field().assertHeightIsEqualTo(visible.dp)
            }
        }
    }

    @Test
    fun `the label, the description, the field, and the error are stacked the gap apart`() {
        val input = tokens().input
        show { Field(description = "We send the receipt here.", invalid = true) }
        val total = field().pixels().height
        val label = input.label.md.lineHeight * input.label.md.size
        val small = input.description.type.lineHeight * input.description.type.size
        val expected = label + small + input.height.md + small + 3 * input.gap
        assertTrue("height $total, expected $expected", kotlin.math.abs(total - expected) <= 2)
    }

    // Touch target

    /** The platform's minimum touch target, which is larger than the token's. */
    private val target = 48

    @Test
    fun `a small field takes touches across the minimum target, and a mouse only on the field`() {
        val side = height(tokens().input, InputSize.Sm)
        val reach = (target - side) / 2f
        assertTrue("the small field is shorter than the target", reach >= 2)

        show { Field(labelHidden = true, size = InputSize.Sm) }
        val node = field()
        // This is the area that assistive technology is given, too.
        node.assertTouchHeightIsEqualTo(target.dp)

        node.performMouseInput { click(Offset(centerX, -2f)) }
        node.assertIsNotFocused()
        node.performTouchInput { click(Offset(centerX, -reach + 1)) }
        node.assertIsFocused()
    }

    // Layout

    @Test
    fun `the leading icon is on the side where reading starts, and an email field stays left-to-right`() {
        val input = tokens().input
        val icon = input.iconSize.md.toInt()
        val cases = listOf(
            Triple(LayoutDirection.Ltr, InputType.Text, true),
            Triple(LayoutDirection.Rtl, InputType.Text, false),
            Triple(LayoutDirection.Rtl, InputType.Email, true),
        )
        for ((direction, type, onTheLeft) in cases) {
            show(direction = direction) { Field(labelHidden = true, type = type, leadingIcon = Block) }
            val pixels = field().pixels()
            val columns = pixels.columnsFilledWith(input.fg.default, rows = icon)
            val where = "$type in $direction"
            assertEquals(where, icon, columns.size)
            if (onTheLeft) {
                assertTrue(where, columns.last() < pixels.width / 2)
            } else {
                assertTrue(where, columns.first() > pixels.width / 2)
            }
        }
    }
}
