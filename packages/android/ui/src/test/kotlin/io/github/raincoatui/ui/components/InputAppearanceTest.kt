package io.github.raincoatui.ui.components

import io.github.raincoatui.tokens.ColorMode
import io.github.raincoatui.tokens.Density
import io.github.raincoatui.tokens.InputSize
import io.github.raincoatui.tokens.InputType
import io.github.raincoatui.tokens.TokenColor
import io.github.raincoatui.tokens.TokenFormat
import io.github.raincoatui.ui.generated.allThemes
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * The mapping from an input's size, type, and state to its tokens. Expected values are looked up
 * by token id, built from the size's id in the spec, so these tests do not repeat the `when`
 * expressions they check. Each mapping is checked in every theme.
 */
class InputAppearanceTest {
    private fun canonical(color: TokenColor): String = TokenFormat.color(color)

    @Test
    fun `each state of a field takes its colors from its tokens`() {
        for (theme in allThemes) for (mode in ColorMode.entries) {
            val set = theme.tokens(mode, Density.Comfortable)
            val source = set.flattened()
            val where = "${mode.id}, ${theme.id}"
            fun colors(enabled: Boolean = true, invalid: Boolean = false, readOnly: Boolean = false) =
                InputColors.of(set.input, enabled, invalid, readOnly)

            val rest = colors()
            assertEquals(where, source["input.bg.default"], canonical(rest.fill))
            assertEquals(where, source["input.border.default"], canonical(rest.border))
            assertEquals(where, source["input.fg.default"], canonical(rest.foreground))
            assertEquals(where, source["input.placeholder"], canonical(rest.placeholder))

            val invalid = colors(invalid = true)
            assertEquals(where, source["input.bg.default"], canonical(invalid.fill))
            assertEquals(where, source["input.border.invalid"], canonical(invalid.border))

            val readOnly = colors(readOnly = true)
            assertEquals(where, source["input.bg.read-only"], canonical(readOnly.fill))
            assertEquals(where, source["input.border.read-only"], canonical(readOnly.border))
            assertEquals(where, source["input.fg.default"], canonical(readOnly.foreground))

            // An invalid read-only field keeps its fill and takes the danger outline.
            val both = colors(invalid = true, readOnly = true)
            assertEquals(where, source["input.bg.read-only"], canonical(both.fill))
            assertEquals(where, source["input.border.invalid"], canonical(both.border))

            // Disabled wins over everything else.
            for (disabled in listOf(colors(enabled = false), colors(enabled = false, invalid = true, readOnly = true))) {
                assertEquals(where, source["input.bg.disabled"], canonical(disabled.fill))
                assertEquals(where, source["input.border.disabled"], canonical(disabled.border))
                assertEquals(where, source["input.fg.disabled"], canonical(disabled.foreground))
                assertEquals(where, source["input.fg.disabled"], canonical(disabled.placeholder))
            }
        }
    }

    @Test
    fun `each size takes its measurements from its tokens`() {
        for (theme in allThemes) for (density in Density.entries) {
            val set = theme.tokens(ColorMode.Light, density)
            val source = set.flattened()
            for (size in InputSize.entries) {
                val measurements = InputMeasurements.of(set.input, size)
                assertEquals(source["input.height.${size.id}"], TokenFormat.number(measurements.height))
                assertEquals(source["input.padding-inline.${size.id}"], TokenFormat.number(measurements.paddingInline))
                assertEquals(source["input.icon-size.${size.id}"], TokenFormat.number(measurements.iconSize))
                assertEquals(source["input.label.${size.id}"], TokenFormat.textStyle(measurements.label))
                assertEquals(source["input.value.${size.id}"], TokenFormat.textStyle(measurements.value))
            }
        }
    }

    @Test
    fun `a field is as tall as a button of the same size`() {
        for (density in Density.entries) {
            val set = allThemes.first().tokens(ColorMode.Light, density)
            assertEquals(set.button.height.sm, InputMeasurements.of(set.input, InputSize.Sm).height, 0.0)
            assertEquals(set.button.height.md, InputMeasurements.of(set.input, InputSize.Md).height, 0.0)
            assertEquals(set.button.height.lg, InputMeasurements.of(set.input, InputSize.Lg).height, 0.0)
        }
    }

    @Test
    fun `each type chooses its keyboard, and addresses and numbers stay left-to-right`() {
        val keys = mapOf(
            InputType.Text to InputKeyboard.Keys.Text,
            InputType.Email to InputKeyboard.Keys.Email,
            InputType.Password to InputKeyboard.Keys.Password,
            InputType.Search to InputKeyboard.Keys.Search,
            InputType.Tel to InputKeyboard.Keys.Phone,
            InputType.Url to InputKeyboard.Keys.Url,
        )
        assertEquals(InputType.entries.toSet(), keys.keys)
        for ((type, expected) in keys) {
            val keyboard = InputKeyboard.of(type)
            assertEquals("$type", expected, keyboard.keys)
            assertEquals("$type", type == InputType.Password, keyboard.secure)
            val addressOrNumber = type in setOf(InputType.Email, InputType.Tel, InputType.Url)
            assertEquals("$type", addressOrNumber, keyboard.leftToRight)
            assertEquals("$type", type == InputType.Text || type == InputType.Search, keyboard.corrects)
        }
        assertTrue(InputKeyboard.of(InputType.Password).secure)
    }
}
