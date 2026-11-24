package io.github.raincoatui.ui.components

import io.github.raincoatui.tokens.HeadingColor
import io.github.raincoatui.tokens.HeadingVariant
import io.github.raincoatui.tokens.RaincoatTokenSet
import io.github.raincoatui.tokens.TextColor
import io.github.raincoatui.tokens.TextVariant
import io.github.raincoatui.tokens.TokenColor
import io.github.raincoatui.tokens.TokenTextStyle

// What Text and Heading look like for a variant and a color, taken from the semantic text styles
// and text colors. Nothing here touches Compose.

/** The text style and color of a piece of text. */
internal data class TextAppearance(val style: TokenTextStyle, val color: TokenColor) {
    companion object {
        // The `when` expressions are exhaustive on purpose: a variant or color added to the spec
        // does not compile until it is given its tokens here.

        fun of(tokens: RaincoatTokenSet, variant: TextVariant, color: TextColor): TextAppearance = TextAppearance(
            style = when (variant) {
                TextVariant.BodyLg -> tokens.type.body.lg
                TextVariant.BodyMd -> tokens.type.body.md
                TextVariant.BodySm -> tokens.type.body.sm
                TextVariant.LabelLg -> tokens.type.label.lg
                TextVariant.LabelMd -> tokens.type.label.md
                TextVariant.LabelSm -> tokens.type.label.sm
                TextVariant.Caption -> tokens.type.caption
            },
            color = when (color) {
                TextColor.Default -> tokens.color.fg.default
                TextColor.Muted -> tokens.color.fg.muted
                TextColor.Danger -> tokens.color.fg.danger
            },
        )

        fun of(tokens: RaincoatTokenSet, variant: HeadingVariant, color: HeadingColor): TextAppearance = TextAppearance(
            style = when (variant) {
                HeadingVariant.HeadingXl -> tokens.type.heading.xl
                HeadingVariant.HeadingLg -> tokens.type.heading.lg
                HeadingVariant.HeadingMd -> tokens.type.heading.md
                HeadingVariant.HeadingSm -> tokens.type.heading.sm
            },
            color = when (color) {
                HeadingColor.Default -> tokens.color.fg.default
                HeadingColor.Muted -> tokens.color.fg.muted
            },
        )
    }
}

/**
 * How a heading of [level] looks unless it is told otherwise, as the spec says: 1 is
 * [HeadingVariant.HeadingXl], 2 [HeadingVariant.HeadingLg], 3 [HeadingVariant.HeadingMd], and
 * 4 to 6 [HeadingVariant.HeadingSm].
 *
 * @throws IllegalArgumentException when [level] is not from 1 to 6.
 */
internal fun headingVariantFor(level: Int): HeadingVariant =
    requireNotNull(HeadingVariant.StandardByLevel[level]) {
        "A heading's level is a whole number from 1 to 6, not $level."
    }
