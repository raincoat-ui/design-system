package io.github.raincoatui.ui.components

import io.github.raincoatui.tokens.ButtonSize
import io.github.raincoatui.tokens.ButtonVariant
import io.github.raincoatui.tokens.RaincoatTokenSet.ButtonTokens
import io.github.raincoatui.tokens.TokenColor
import io.github.raincoatui.tokens.TokenTextStyle

// What a Button looks like for a variant, a size, and a state, taken from the Button tokens.
// Nothing here touches Compose.

/** How a button is being interacted with: the states of the Button spec that change its colors. */
internal enum class ButtonInteraction {
    Rest,
    Hover,
    Pressed,
    Disabled,
    ;

    companion object {
        /**
         * Disabled wins over everything else. A loading button ignores the pointer, so it stays
         * at rest. Pressed wins over hover.
         */
        fun of(enabled: Boolean, loading: Boolean, pressed: Boolean, hovered: Boolean): ButtonInteraction = when {
            !enabled -> Disabled
            loading -> Rest
            pressed -> Pressed
            hovered -> Hover
            else -> Rest
        }
    }
}

/**
 * The colors of a button.
 *
 * @property fill Fill of the container. Null when there is none, as for a ghost button at rest.
 * @property foreground Color of the label, the icons, and the spinner.
 * @property border Outline of the container. Null when there is none.
 */
internal data class ButtonColors(val fill: TokenColor?, val foreground: TokenColor, val border: TokenColor?) {
    companion object {
        // The `when` expressions are exhaustive on purpose: a variant added to the spec does not
        // compile until it is given colors here.
        fun of(tokens: ButtonTokens, variant: ButtonVariant, interaction: ButtonInteraction): ButtonColors {
            // Every variant looks the same when disabled.
            if (interaction == ButtonInteraction.Disabled) {
                return ButtonColors(tokens.disabled.bg, tokens.disabled.fg, tokens.disabled.border)
            }
            return when (variant) {
                ButtonVariant.Primary -> ButtonColors(
                    fill = when (interaction) {
                        ButtonInteraction.Hover -> tokens.primary.bg.hover
                        ButtonInteraction.Pressed -> tokens.primary.bg.pressed
                        ButtonInteraction.Rest, ButtonInteraction.Disabled -> tokens.primary.bg.default
                    },
                    foreground = tokens.primary.fg,
                    border = null,
                )
                ButtonVariant.Secondary -> ButtonColors(
                    fill = when (interaction) {
                        ButtonInteraction.Hover -> tokens.secondary.bg.hover
                        ButtonInteraction.Pressed -> tokens.secondary.bg.pressed
                        ButtonInteraction.Rest, ButtonInteraction.Disabled -> tokens.secondary.bg.default
                    },
                    foreground = tokens.secondary.fg,
                    border = tokens.secondary.border,
                )
                ButtonVariant.Ghost -> ButtonColors(
                    fill = when (interaction) {
                        ButtonInteraction.Hover -> tokens.ghost.bg.hover
                        ButtonInteraction.Pressed -> tokens.ghost.bg.pressed
                        ButtonInteraction.Rest, ButtonInteraction.Disabled -> null
                    },
                    foreground = tokens.ghost.fg,
                    border = null,
                )
                ButtonVariant.Danger -> ButtonColors(
                    fill = when (interaction) {
                        ButtonInteraction.Hover -> tokens.danger.bg.hover
                        ButtonInteraction.Pressed -> tokens.danger.bg.pressed
                        ButtonInteraction.Rest, ButtonInteraction.Disabled -> tokens.danger.bg.default
                    },
                    foreground = tokens.danger.fg,
                    border = null,
                )
            }
        }
    }
}

/**
 * The measurements of a button of one size.
 *
 * @property height Height of the visible container when the label is on one line.
 */
internal data class ButtonMeasurements(
    val height: Double,
    val paddingInline: Double,
    val iconSize: Double,
    val label: TokenTextStyle,
) {
    companion object {
        fun of(tokens: ButtonTokens, size: ButtonSize): ButtonMeasurements = when (size) {
            ButtonSize.Sm -> ButtonMeasurements(
                tokens.height.sm, tokens.paddingInline.sm, tokens.iconSize.sm, tokens.label.sm,
            )
            ButtonSize.Md -> ButtonMeasurements(
                tokens.height.md, tokens.paddingInline.md, tokens.iconSize.md, tokens.label.md,
            )
            ButtonSize.Lg -> ButtonMeasurements(
                tokens.height.lg, tokens.paddingInline.lg, tokens.iconSize.lg, tokens.label.lg,
            )
        }
    }
}
