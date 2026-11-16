package io.github.raincoatui.tokens

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotEquals

class ValuesTest {
    @Test
    fun `a color unpacks its channels`() {
        val color = TokenColor(0xFFF7D22A)
        assertEquals(listOf(0xFF, 0xF7, 0xD2, 0x2A), listOf(color.alpha, color.red, color.green, color.blue))
    }

    @Test
    fun `a color formats back to hex, with alpha only when translucent`() {
        assertEquals("#f7d22a", TokenFormat.color(TokenColor(0xFFF7D22A)))
        assertEquals("#000000", TokenFormat.color(TokenColor(0xFF000000)))
        assertEquals("#ffffff80", TokenFormat.color(TokenColor(0x80FFFFFF)))
    }

    @Test
    fun `numbers format with four decimals whatever the locale`() {
        val previous = java.util.Locale.getDefault()
        try {
            java.util.Locale.setDefault(java.util.Locale.GERMANY)
            assertEquals("16.0000", TokenFormat.number(16.0))
            assertEquals("0.1000", TokenFormat.milliseconds(100))
            assertEquals("500", TokenFormat.integer(500))
        } finally {
            java.util.Locale.setDefault(previous)
        }
    }

    @Test
    fun `composite values format field by field`() {
        val style = TokenTextStyle(listOf("Be Vietnam Pro", "system-ui"), 16.0, 500, 0.0, 1.4)
        assertEquals("Be Vietnam Pro, system-ui|16.0000|500|0.0000|1.4000", TokenFormat.textStyle(style))
        assertEquals("0.2000,0.0000,0.0000,1.0000", TokenFormat.easing(TokenEasing(0.2, 0.0, 0.0, 1.0)))
    }

    @Test
    fun `the color mode follows the scheme and contrast setting`() {
        assertEquals(ColorMode.Light, ColorMode.of(isDark = false, increasedContrast = false))
        assertEquals(ColorMode.Dark, ColorMode.of(isDark = true, increasedContrast = false))
        assertEquals(ColorMode.LightHighContrast, ColorMode.of(isDark = false, increasedContrast = true))
        assertEquals(ColorMode.DarkHighContrast, ColorMode.of(isDark = true, increasedContrast = true))
    }

    @Test
    fun `mode and density ids match the token source`() {
        assertEquals(listOf("light", "dark", "light-hc", "dark-hc"), ColorMode.entries.map { it.id })
        assertEquals(listOf("comfortable", "compact"), Density.entries.map { it.id })
    }

    @Test
    fun `themes are compared by id`() {
        val unresolved = { _: ColorMode, _: Density -> error("not resolved in this test") }
        assertEquals(RaincoatTheme("one", unresolved), RaincoatTheme("one", unresolved))
        assertNotEquals(RaincoatTheme("one", unresolved), RaincoatTheme("two", unresolved))
    }
}
