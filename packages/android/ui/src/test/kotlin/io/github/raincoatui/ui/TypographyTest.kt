package io.github.raincoatui.ui

import androidx.compose.ui.text.intl.Locale
import androidx.compose.ui.text.style.LineBreak
import io.github.raincoatui.tokens.ColorMode
import io.github.raincoatui.tokens.Density
import io.github.raincoatui.ui.generated.allThemes
import java.text.Normalizer
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertSame
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment

/**
 * How a token text style becomes a Compose text style, for every component that sets text with
 * one. The locale is the system's, as on a device.
 */
@RunWith(RobolectricTestRunner::class)
class TypographyTest {
    private val styles = allThemes.flatMap { theme ->
        val type = theme.tokens(ColorMode.Light, Density.Comfortable).type
        listOf(type.body.md, type.label.sm, type.caption, type.heading.xl)
    }

    @Test
    fun `under a Korean locale, every text style breaks only between whole words`() {
        RuntimeEnvironment.setQualifiers("+b+ko")
        assertEquals("the locale", "ko", Locale.current.language)
        for (style in styles) {
            val lineBreak = style.toTextStyle().lineBreak
            assertEquals("Korean, size ${style.size}", LineBreak.WordBreak.Phrase, lineBreak.wordBreak)
            assertEquals("Korean, size ${style.size}", LineBreak.Strictness.Strict, lineBreak.strictness)
        }
    }

    @Test
    fun `under any other locale, every text style breaks by the strict rules and not by phrase`() {
        for (language in listOf("en", "ja", "zh", "vi", "ar")) {
            RuntimeEnvironment.setQualifiers("+b+$language")
            assertEquals("the locale", language, Locale.current.language)
            for (style in styles) {
                val lineBreak = style.toTextStyle().lineBreak
                assertEquals("$language, size ${style.size}", LineBreak.WordBreak.Default, lineBreak.wordBreak)
                assertEquals("$language, size ${style.size}", LineBreak.Strictness.Strict, lineBreak.strictness)
                assertEquals("$language, size ${style.size}", LineBreak.Strategy.Simple, lineBreak.strategy)
            }
        }
    }

    @Test
    fun `the rule for a language is the strict one, by phrase for Korean alone`() {
        assertEquals("Korean", LineBreak.WordBreak.Phrase, typographyLineBreak("ko").wordBreak)
        for (language in listOf("en", "ja", "zh", "vi", "ar", "")) {
            val lineBreak = typographyLineBreak(language)
            assertEquals("\"$language\"", LineBreak.WordBreak.Default, lineBreak.wordBreak)
            assertEquals("\"$language\"", LineBreak.Strictness.Strict, lineBreak.strictness)
        }
    }

    @Test
    fun `text to display is composed, and composed text is returned as it is`() {
        val composed = "대한 알림, Tiếp tục"
        assertSame(composed, composedForDisplay(composed))
        val decomposed = Normalizer.normalize(composed, Normalizer.Form.NFD)
        assertNotEquals(composed, decomposed)
        assertEquals(composed, composedForDisplay(decomposed))
    }
}
