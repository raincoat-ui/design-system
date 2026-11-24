package io.github.raincoatui.ui.components

import io.github.raincoatui.tokens.RaincoatTokenSet.TabsTokens
import io.github.raincoatui.tokens.TokenColor
import io.github.raincoatui.tokens.TokenTextStyle

// What a tab looks like when it is selected or not, and in each state, taken from the Tabs
// tokens. Nothing here touches Compose.

/**
 * How a tab is being interacted with: the states of the Tabs spec that change its colors.
 * Selection is separate: a selected tab can also be hovered or pressed.
 */
internal enum class TabInteraction {
    Rest,
    Hover,
    Pressed,
    ;

    companion object {
        /** Pressed wins over hover. */
        fun of(pressed: Boolean, hovered: Boolean): TabInteraction = when {
            pressed -> Pressed
            hovered -> Hover
            else -> Rest
        }
    }
}

/**
 * The colors of a tab.
 *
 * @property fill Fill of the tab. Null when there is none, as at rest.
 * @property foreground Color of the label and the icon.
 * @property indicator The bar under the tab. Null unless the tab is selected.
 */
internal data class TabColors(val fill: TokenColor?, val foreground: TokenColor, val indicator: TokenColor?) {
    companion object {
        fun of(tokens: TabsTokens, selected: Boolean, interaction: TabInteraction): TabColors {
            val indicator = if (selected) tokens.indicator.color else null
            return when (interaction) {
                TabInteraction.Rest -> TabColors(
                    fill = null,
                    foreground = if (selected) tokens.fg.selected else tokens.fg.default,
                    indicator = indicator,
                )
                TabInteraction.Hover -> TabColors(tokens.bg.hover, tokens.fg.hover, indicator)
                TabInteraction.Pressed -> TabColors(tokens.bg.pressed, tokens.fg.hover, indicator)
            }
        }
    }
}

/**
 * The measurements of a tab. There is one size; density sets its height.
 *
 * @property height Height of the tab when its label is at the default font size.
 * @property targetMinimum The smallest area that takes touches, whatever the visible height.
 */
internal data class TabMeasurements(
    val height: Double,
    val paddingInline: Double,
    val gap: Double,
    val iconSize: Double,
    val label: TokenTextStyle,
    val targetMinimum: Double,
) {
    companion object {
        fun of(tokens: TabsTokens): TabMeasurements = TabMeasurements(
            height = tokens.height,
            paddingInline = tokens.paddingInline,
            gap = tokens.gap,
            iconSize = tokens.iconSize,
            label = tokens.label,
            targetMinimum = tokens.targetMinimum,
        )
    }
}
