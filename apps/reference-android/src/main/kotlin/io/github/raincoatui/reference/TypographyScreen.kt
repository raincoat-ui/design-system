package io.github.raincoatui.reference

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import io.github.raincoatui.tokens.HeadingColor
import io.github.raincoatui.tokens.HeadingVariant
import io.github.raincoatui.tokens.TextColor
import io.github.raincoatui.tokens.TextVariant
import io.github.raincoatui.ui.LocalRaincoatTokens
import io.github.raincoatui.ui.RaincoatTheme
import io.github.raincoatui.ui.components.RaincoatHeading
import io.github.raincoatui.ui.components.RaincoatText

internal const val PARAGRAPH =
    "Your files are kept on this device and in the cloud. Changes made on one device reach the others " +
        "the next time they connect, usually within a minute."
internal const val LONG_HEADING = "Notifications for comments, mentions, and changes to shared documents"

/** An Arabic name, as a person would write it. */
internal const val NAME = "مريم الحسيني"

/** Typography's screen, in the theme the app was built with. Its test opens it. */
class TypographyActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            RaincoatTheme(theme = appTheme) {
                TypographyScreen()
            }
        }
    }
}

/**
 * Text and headings in the states of the Typography spec, as a settings screen sets them: a
 * title, sections, running text, and short facts. The outline has one level 1 heading and skips
 * no level.
 */
@Composable
fun TypographyScreen() {
    val tokens = LocalRaincoatTokens.current

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(tokens.color.bg.canvas.argb))
            .safeDrawingPadding()
            .verticalScroll(rememberScrollState())
            .padding(tokens.space._6.dp),
        verticalArrangement = Arrangement.spacedBy(tokens.space._4.dp),
    ) {
        RaincoatHeading("Settings", level = 1)
        RaincoatText(
            "Choose how this app keeps your files, and what it tells you about them.",
            variant = TextVariant.BodyLg,
        )

        RaincoatHeading("Text styles", level = 2)
        for (variant in TextVariant.entries) {
            RaincoatText("Synced 2 minutes ago, in ${variant.id}", variant = variant)
        }

        RaincoatHeading("Colors", level = 2)
        RaincoatText("Your files are up to date.")
        RaincoatText("Last checked at 9:41.", color = TextColor.Muted)
        RaincoatText("This file could not be opened.", color = TextColor.Danger)

        RaincoatHeading("Headings", level = 2)
        for (level in 3..6) {
            RaincoatHeading("Level $level", level = level)
        }
        RaincoatHeading("Recent files", level = 3, variant = HeadingVariant.HeadingSm)
        RaincoatHeading("Shared with you", level = 3, color = HeadingColor.Muted)

        RaincoatHeading("Long text", level = 2)
        RaincoatHeading(LONG_HEADING, level = 3)
        RaincoatText(PARAGRAPH, Modifier.testTag("max-lines"), maxLines = 2)
        RaincoatText("Message from $NAME, 2 minutes ago")
    }
}
