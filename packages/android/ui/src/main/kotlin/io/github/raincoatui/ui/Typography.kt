package io.github.raincoatui.ui

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.LineHeightStyle
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import io.github.raincoatui.tokens.TokenColor
import io.github.raincoatui.tokens.TokenTextStyle

/** A token color as a Compose color. */
internal fun TokenColor.toColor(): Color = Color(argb)

/**
 * A token text style as a Compose text style.
 *
 * Sizes are in sp, so text follows the person's font size setting. Every line is exactly the
 * token's line height, with the text centered in it, as on the web.
 */
internal fun TokenTextStyle.toTextStyle(): TextStyle = TextStyle(
    fontFamily = fontFamily(),
    fontSize = size.sp,
    fontWeight = FontWeight(weight),
    letterSpacing = letterSpacing.sp,
    // A multiple of the font size, which is how the token defines it. It keeps its proportion
    // when Android enlarges big text by less than small text.
    lineHeight = lineHeight.em,
    lineHeightStyle = LineHeightStyle(
        alignment = LineHeightStyle.Alignment.Center,
        trim = LineHeightStyle.Trim.None,
    ),
)

// Theme font files are not bundled yet, so a style uses the system font that its font stack
// ends in. A named family joins when themes ship their fonts.
private fun TokenTextStyle.fontFamily(): FontFamily = when {
    "monospace" in families || "ui-monospace" in families -> FontFamily.Monospace
    "serif" in families || "ui-serif" in families -> FontFamily.Serif
    else -> FontFamily.SansSerif
}
