package io.github.raincoatui.ui.components

import io.github.raincoatui.tokens.ColorMode
import io.github.raincoatui.tokens.Density
import io.github.raincoatui.tokens.TokenColor
import io.github.raincoatui.tokens.TokenFormat
import io.github.raincoatui.ui.generated.allThemes
import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * The mapping from a card's state to its tokens. Expected values are looked up by token id, so
 * these tests do not repeat the `when` expression they check. Each mapping is checked in every
 * theme and color mode.
 */
class CardAppearanceTest {
    private fun canonical(color: TokenColor): String = TokenFormat.color(color)

    @Test
    fun `pressed wins over hover`() {
        assertEquals("nothing", CardState.Rest, CardState.of(pressed = false, hovered = false))
        assertEquals("a pointer over it", CardState.Hover, CardState.of(pressed = false, hovered = true))
        assertEquals("pressed under a pointer", CardState.Pressed, CardState.of(pressed = true, hovered = true))
        assertEquals("pressed by touch", CardState.Pressed, CardState.of(pressed = true, hovered = false))
    }

    @Test
    fun `each state takes its colors from the card tokens`() {
        for (theme in allThemes) for (mode in ColorMode.entries) {
            val set = theme.tokens(mode, Density.Comfortable)
            val source = set.flattened()
            val where = "${mode.id}, ${theme.id}"
            val rest = CardColors.of(set.card, CardState.Rest)
            val hover = CardColors.of(set.card, CardState.Hover)
            val pressed = CardColors.of(set.card, CardState.Pressed)

            // At rest, as a static card.
            assertEquals("fill at rest, $where", source["card.bg.default"], canonical(rest.fill))
            assertEquals("outline at rest, $where", source["card.border.default"], canonical(rest.border))
            // Hovered: the outline steps to strong, and the fill stays.
            assertEquals("fill under a pointer, $where", source["card.bg.default"], canonical(hover.fill))
            assertEquals("outline under a pointer, $where", source["card.border.hover"], canonical(hover.border))
            // Pressed: the fill steps to the pressed fill, and the outline is strong.
            assertEquals("fill when pressed, $where", source["card.bg.pressed"], canonical(pressed.fill))
            assertEquals("outline when pressed, $where", source["card.border.hover"], canonical(pressed.border))
        }
    }

    @Test
    fun `the card tokens are the roles the RFC gives them`() {
        for (theme in allThemes) for (mode in ColorMode.entries) {
            val set = theme.tokens(mode, Density.Comfortable)
            val where = "${mode.id}, ${theme.id}"
            assertEquals("fill, $where", set.color.bg.raised, set.card.bg.default)
            assertEquals("pressed fill, $where", set.color.control.hover, set.card.bg.pressed)
            assertEquals("strong outline, $where", set.color.border.strong, set.card.border.hover)
        }
    }
}
