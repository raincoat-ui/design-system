package io.github.raincoatui.ui.components

import io.github.raincoatui.tokens.ColorMode
import io.github.raincoatui.tokens.Density
import io.github.raincoatui.tokens.HeadingColor
import io.github.raincoatui.tokens.HeadingVariant
import io.github.raincoatui.tokens.TextColor
import io.github.raincoatui.tokens.TextVariant
import io.github.raincoatui.tokens.TokenFormat
import io.github.raincoatui.ui.generated.allThemes
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test

/**
 * The mapping from a Text or Heading's variant and color to its tokens. Expected values are
 * looked up by token id, built from the variant's and color's ids in the spec, so these tests do
 * not repeat the `when` expressions they check. Each mapping is checked in every theme.
 */
class TypographyAppearanceTest {
    /** The id of a variant's text style: body-lg is type.body.lg, caption is type.caption. */
    private fun styleId(variant: String) = "type." + variant.replace("-", ".")

    @Test
    fun `each text variant and color takes its tokens`() {
        for (theme in allThemes) for (mode in ColorMode.entries) {
            val set = theme.tokens(mode, Density.Comfortable)
            val source = set.flattened()
            for (variant in TextVariant.entries) for (color in TextColor.entries) {
                val where = "$variant in $color, ${mode.id}, ${theme.id}"
                val appearance = TextAppearance.of(set, variant, color)
                assertEquals(where, source[styleId(variant.id)], TokenFormat.textStyle(appearance.style))
                assertEquals(where, source["color.fg.${color.id}"], TokenFormat.color(appearance.color))
            }
        }
    }

    @Test
    fun `each heading variant and color takes its tokens`() {
        for (theme in allThemes) for (mode in ColorMode.entries) {
            val set = theme.tokens(mode, Density.Comfortable)
            val source = set.flattened()
            for (variant in HeadingVariant.entries) for (color in HeadingColor.entries) {
                val where = "$variant in $color, ${mode.id}, ${theme.id}"
                val appearance = TextAppearance.of(set, variant, color)
                assertEquals(where, source[styleId(variant.id)], TokenFormat.textStyle(appearance.style))
                assertEquals(where, source["color.fg.${color.id}"], TokenFormat.color(appearance.color))
            }
        }
    }

    @Test
    fun `text styles do not change with density`() {
        val theme = allThemes.first()
        for (variant in TextVariant.entries) {
            assertEquals(
                TextAppearance.of(theme.tokens(ColorMode.Light, Density.Comfortable), variant, TextColor.Default),
                TextAppearance.of(theme.tokens(ColorMode.Light, Density.Compact), variant, TextColor.Default),
            )
        }
    }

    @Test
    fun `a heading looks as its level says unless it is told otherwise`() {
        // As the spec says: 1 is heading-xl, 2 heading-lg, 3 heading-md, and 4 to 6 heading-sm.
        assertEquals(
            listOf(
                HeadingVariant.HeadingXl,
                HeadingVariant.HeadingLg,
                HeadingVariant.HeadingMd,
                HeadingVariant.HeadingSm,
                HeadingVariant.HeadingSm,
                HeadingVariant.HeadingSm,
            ),
            (1..6).map(::headingVariantFor),
        )
        for (level in listOf(0, 7, -1)) {
            assertThrows(IllegalArgumentException::class.java) { headingVariantFor(level) }
        }
    }
}
