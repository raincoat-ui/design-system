package io.github.raincoatui.theme.base

import io.github.raincoatui.tokens.ColorMode
import io.github.raincoatui.tokens.Density
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotEquals
import kotlin.test.assertTrue

// The contract test for Android. The values compiled into the theme must equal what the token
// source resolves to, for every token in every color mode and density. The expected values in
// generated/ExpectedBaseTokens.kt are produced by a separate code path in the token build.
class BaseThemeTest {
    @Test
    fun `every token matches the token source in every mode and density`() {
        for (mode in ColorMode.entries) {
            for (density in Density.entries) {
                val key = "${mode.id}/${density.id}"
                val expected = expectedBaseTokens.getValue(key)
                val actual = BaseTheme.tokens(mode, density).flattened()

                assertEquals(expected.keys, actual.keys, "the token sets differ for $key")
                for ((id, value) in expected) {
                    assertEquals(value, actual[id], "$id in $key")
                }
            }
        }
    }

    @Test
    fun `the source covers every mode and density`() {
        assertEquals(ColorMode.entries.size * Density.entries.size, expectedBaseTokens.size)
        assertTrue(expectedBaseTokens.getValue("light/comfortable").size > 80)
    }

    @Test
    fun `modes and densities actually differ`() {
        val light = BaseTheme.tokens(ColorMode.Light, Density.Comfortable)
        val dark = BaseTheme.tokens(ColorMode.Dark, Density.Comfortable)
        val compact = BaseTheme.tokens(ColorMode.Light, Density.Compact)

        assertNotEquals(light.color.bg.canvas, dark.color.bg.canvas)
        assertEquals(light.button.primary.fg, dark.button.primary.fg)
        assertTrue(light.size.control.md > compact.size.control.md)
        assertEquals(light.color, compact.color)
    }

    @Test
    fun `the base theme has its id`() {
        assertEquals("base", BaseTheme.id)
    }
}
