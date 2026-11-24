package io.github.raincoatui.ui.components

import io.github.raincoatui.tokens.RaincoatTokenSet.CardTokens
import io.github.raincoatui.tokens.TokenColor

// What a Card looks like in each state, taken from the Card tokens. Nothing here touches Compose.

/**
 * How an interactive card is being interacted with: the states of the Card spec that change its
 * colors. A static card is always at rest. Keyboard focus draws the focus ring, which changes no
 * color of the card itself.
 */
internal enum class CardState {
    Rest,
    Hover,
    Pressed,
    ;

    companion object {
        /** Pressed wins over hover. */
        fun of(pressed: Boolean, hovered: Boolean): CardState = when {
            pressed -> Pressed
            hovered -> Hover
            else -> Rest
        }
    }
}

/**
 * The colors of a card's container.
 *
 * @property fill Fill of the container.
 * @property border Outline of the container.
 */
internal data class CardColors(val fill: TokenColor, val border: TokenColor) {
    companion object {
        // The `when` is exhaustive on purpose: a state added to the spec does not compile until it
        // is given colors here.
        fun of(tokens: CardTokens, state: CardState): CardColors = when (state) {
            CardState.Rest -> CardColors(fill = tokens.bg.default, border = tokens.border.default)
            CardState.Hover -> CardColors(fill = tokens.bg.default, border = tokens.border.hover)
            CardState.Pressed -> CardColors(fill = tokens.bg.pressed, border = tokens.border.hover)
        }
    }
}
