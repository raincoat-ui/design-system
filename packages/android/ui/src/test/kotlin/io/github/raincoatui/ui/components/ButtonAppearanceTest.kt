package io.github.raincoatui.ui.components

import io.github.raincoatui.theme.base.BaseTheme
import io.github.raincoatui.tokens.ButtonSize
import io.github.raincoatui.tokens.ButtonVariant
import io.github.raincoatui.tokens.ColorMode
import io.github.raincoatui.tokens.Density
import io.github.raincoatui.tokens.TokenColor
import io.github.raincoatui.tokens.TokenFormat
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test

/**
 * The mapping from a button's variant, size, and state to its tokens. Expected values are looked
 * up by token id, built from the variant's and size's ids in the spec, so these tests do not
 * repeat the `when` expressions they check.
 */
class ButtonAppearanceTest {
    private fun canonical(color: TokenColor?): String? = color?.let(TokenFormat::color)

    @Test
    fun `disabled wins, then loading, then pressed, then hover`() {
        fun state(enabled: Boolean, loading: Boolean, pressed: Boolean, hovered: Boolean) =
            ButtonInteraction.of(enabled, loading, pressed, hovered)
        assertEquals(ButtonInteraction.Rest, state(enabled = true, loading = false, pressed = false, hovered = false))
        assertEquals(ButtonInteraction.Hover, state(enabled = true, loading = false, pressed = false, hovered = true))
        assertEquals(ButtonInteraction.Pressed, state(enabled = true, loading = false, pressed = true, hovered = true))
        // A loading button ignores the pointer.
        assertEquals(ButtonInteraction.Rest, state(enabled = true, loading = true, pressed = true, hovered = true))
        assertEquals(ButtonInteraction.Disabled, state(enabled = false, loading = true, pressed = true, hovered = true))
    }

    @Test
    fun `each variant takes its colors from its tokens`() {
        for (mode in ColorMode.entries) {
            val set = BaseTheme.tokens(mode, Density.Comfortable)
            val source = set.flattened()
            for (variant in ButtonVariant.entries) {
                val where = "$variant in ${mode.id}"
                val rest = ButtonColors.of(set.button, variant, ButtonInteraction.Rest)
                val hover = ButtonColors.of(set.button, variant, ButtonInteraction.Hover)
                val pressed = ButtonColors.of(set.button, variant, ButtonInteraction.Pressed)

                // A ghost button has no fill at rest, and no token for one.
                assertEquals(where, source["button.${variant.id}.bg.default"], canonical(rest.fill))
                assertEquals(where, variant == ButtonVariant.Ghost, rest.fill == null)
                assertNotNull(where, hover.fill)
                assertEquals(where, source["button.${variant.id}.bg.hover"], canonical(hover.fill))
                assertNotNull(where, pressed.fill)
                assertEquals(where, source["button.${variant.id}.bg.pressed"], canonical(pressed.fill))

                for (colors in listOf(rest, hover, pressed)) {
                    assertEquals(where, source["button.${variant.id}.fg"], canonical(colors.foreground))
                    // Only the secondary button has an outline, and a token for one.
                    assertEquals(where, source["button.${variant.id}.border"], canonical(colors.border))
                    assertEquals(where, variant == ButtonVariant.Secondary, colors.border != null)
                }
            }
        }
    }

    @Test
    fun `every variant looks the same when disabled`() {
        for (mode in ColorMode.entries) {
            val set = BaseTheme.tokens(mode, Density.Comfortable)
            val source = set.flattened()
            for (variant in ButtonVariant.entries) {
                val colors = ButtonColors.of(set.button, variant, ButtonInteraction.Disabled)
                assertEquals(source["button.disabled.bg"], canonical(colors.fill))
                assertEquals(source["button.disabled.fg"], canonical(colors.foreground))
                assertEquals(source["button.disabled.border"], canonical(colors.border))
            }
        }
    }

    @Test
    fun `each size takes its measurements from its tokens`() {
        for (density in Density.entries) {
            val set = BaseTheme.tokens(ColorMode.Light, density)
            val source = set.flattened()
            for (size in ButtonSize.entries) {
                val measurements = ButtonMeasurements.of(set.button, size)
                assertEquals(source["button.height.${size.id}"], TokenFormat.number(measurements.height))
                assertEquals(source["button.padding-inline.${size.id}"], TokenFormat.number(measurements.paddingInline))
                assertEquals(source["button.icon-size.${size.id}"], TokenFormat.number(measurements.iconSize))
                assertEquals(source["button.label.${size.id}"], TokenFormat.textStyle(measurements.label))
            }
        }
    }
}
