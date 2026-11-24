package io.github.raincoatui.ui.components

import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import io.github.raincoatui.tokens.HeadingColor
import io.github.raincoatui.tokens.HeadingVariant
import io.github.raincoatui.tokens.TextColor
import io.github.raincoatui.tokens.TextVariant
import io.github.raincoatui.ui.LocalRaincoatTokens
import io.github.raincoatui.ui.toColor
import io.github.raincoatui.ui.toTextStyle

/**
 * Running text and labels, in one of the theme's text styles. It follows the Text part of the
 * Raincoat Typography spec.
 *
 * The size, weight, line height, and color come from the theme given to
 * [RaincoatTheme][io.github.raincoatui.ui.RaincoatTheme]. The text grows with the person's font
 * size setting, aligns to the start edge, and takes its direction from its first strong
 * character, so a name or a message in another script reads the right way.
 *
 * @param text The text.
 * @param variant The text style.
 * @param color The color of the text, from the theme's text roles.
 * @param maxLines The most lines the text shows. Text beyond them ends in an ellipsis, and
 *   assistive technology still reads all of it. Use it only for text that is repeated elsewhere.
 *   By default the text wraps onto as many lines as it needs.
 */
@Composable
public fun RaincoatText(
    text: String,
    modifier: Modifier = Modifier,
    variant: TextVariant = TextVariant.Standard,
    color: TextColor = TextColor.Standard,
    maxLines: Int = Int.MAX_VALUE,
) {
    require(maxLines >= 1) { "maxLines is at least 1, not $maxLines." }
    TypographyText(
        text = text,
        appearance = TextAppearance.of(LocalRaincoatTokens.current, variant, color),
        modifier = modifier,
        maxLines = maxLines,
    )
}

/**
 * A heading of the screen's outline, in one of the theme's heading styles. It follows the
 * Heading part of the Raincoat Typography spec.
 *
 * Assistive technology is told that it is a heading, so people can move from heading to heading
 * with it. Android has no heading levels: [level] chooses the look, and keeps code the same on
 * every platform. The heading wraps and is never cut short.
 *
 * @param text The text of the heading.
 * @param level The heading's place in the outline of the screen, from 1 to 6. Choose it for that
 *   place, not for its size.
 * @param variant How the heading looks. Null, the default, follows the level: 1 is
 *   [HeadingVariant.HeadingXl], 2 [HeadingVariant.HeadingLg], 3 [HeadingVariant.HeadingMd], and
 *   4 to 6 [HeadingVariant.HeadingSm].
 * @param color The color of the heading, from the theme's text roles.
 * @throws IllegalArgumentException when [level] is not from 1 to 6.
 */
@Composable
public fun RaincoatHeading(
    text: String,
    level: Int,
    modifier: Modifier = Modifier,
    variant: HeadingVariant? = null,
    color: HeadingColor = HeadingColor.Standard,
) {
    // The level is checked even when the look is given.
    val standard = headingVariantFor(level)
    TypographyText(
        text = text,
        appearance = TextAppearance.of(LocalRaincoatTokens.current, variant ?: standard, color),
        modifier = modifier.semantics { heading() },
        maxLines = Int.MAX_VALUE,
    )
}

@Composable
private fun TypographyText(text: String, appearance: TextAppearance, modifier: Modifier, maxLines: Int) {
    BasicText(
        text = text,
        modifier = modifier,
        // Every line is exactly the token's line height. Start is the right in right-to-left
        // text; the direction of each paragraph comes from its first strong character.
        style = appearance.style.toTextStyle().copy(
            color = appearance.color.toColor(),
            textAlign = TextAlign.Start,
        ),
        // Only the drawing stops: the text is all still there for assistive technology.
        overflow = TextOverflow.Ellipsis,
        maxLines = maxLines,
    )
}
