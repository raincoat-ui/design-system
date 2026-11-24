package io.github.raincoatui.ui.components

import io.github.raincoatui.tokens.ColorMode
import io.github.raincoatui.tokens.Density
import io.github.raincoatui.tokens.TokenColor
import io.github.raincoatui.tokens.TokenFormat
import io.github.raincoatui.ui.generated.allThemes
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * The mapping from a tab's selection and state to its tokens. Expected values are looked up by
 * token id, so these tests do not repeat the `when` expression they check. Each mapping is
 * checked in every theme.
 */
class TabsAppearanceTest {
    private fun canonical(color: TokenColor?): String? = color?.let(TokenFormat::color)

    @Test
    fun `pressed wins over hover`() {
        assertEquals(TabInteraction.Rest, TabInteraction.of(pressed = false, hovered = false))
        assertEquals(TabInteraction.Hover, TabInteraction.of(pressed = false, hovered = true))
        assertEquals(TabInteraction.Pressed, TabInteraction.of(pressed = true, hovered = true))
        assertEquals(TabInteraction.Pressed, TabInteraction.of(pressed = true, hovered = false))
    }

    @Test
    fun `a tab takes its colors from its tokens`() {
        for (theme in allThemes) for (mode in ColorMode.entries) {
            val set = theme.tokens(mode, Density.Comfortable)
            val source = set.flattened()
            for (selected in listOf(false, true)) {
                val where = "selected $selected in ${mode.id}, ${theme.id}"
                val rest = TabColors.of(set.tabs, selected, TabInteraction.Rest)
                val hover = TabColors.of(set.tabs, selected, TabInteraction.Hover)
                val pressed = TabColors.of(set.tabs, selected, TabInteraction.Pressed)

                // No fill at rest, and no token for one.
                assertNull(where, rest.fill)
                assertEquals(where, source["tabs.bg.hover"], canonical(hover.fill))
                assertEquals(where, source["tabs.bg.pressed"], canonical(pressed.fill))

                val restLabel = if (selected) "tabs.fg.selected" else "tabs.fg.default"
                assertEquals(where, source[restLabel], canonical(rest.foreground))
                assertEquals(where, source["tabs.fg.hover"], canonical(hover.foreground))
                assertEquals(where, source["tabs.fg.hover"], canonical(pressed.foreground))

                // The indicator marks the selected tab in every state, and no other tab.
                for (colors in listOf(rest, hover, pressed)) {
                    val expected = if (selected) source["tabs.indicator.color"] else null
                    assertEquals(where, expected, canonical(colors.indicator))
                }
            }
        }
    }

    @Test
    fun `a tab takes its measurements from its tokens`() {
        for (theme in allThemes) for (density in Density.entries) {
            val set = theme.tokens(ColorMode.Light, density)
            val source = set.flattened()
            val measurements = TabMeasurements.of(set.tabs)
            assertEquals(source["tabs.height"], TokenFormat.number(measurements.height))
            assertEquals(source["tabs.padding-inline"], TokenFormat.number(measurements.paddingInline))
            assertEquals(source["tabs.gap"], TokenFormat.number(measurements.gap))
            assertEquals(source["tabs.icon-size"], TokenFormat.number(measurements.iconSize))
            assertEquals(source["tabs.label"], TokenFormat.textStyle(measurements.label))
            assertEquals(source["tabs.target-minimum"], TokenFormat.number(measurements.targetMinimum))
        }
    }

    @Test
    fun `compact density makes tabs shorter but not narrower`() {
        val comfortable = TabMeasurements.of(allThemes.first().tokens(ColorMode.Light, Density.Comfortable).tabs)
        val compact = TabMeasurements.of(allThemes.first().tokens(ColorMode.Light, Density.Compact).tabs)
        assertTrue(compact.height < comfortable.height)
        assertEquals(comfortable.paddingInline, compact.paddingInline, 0.0)
        assertEquals(comfortable.label, compact.label)
    }
}
