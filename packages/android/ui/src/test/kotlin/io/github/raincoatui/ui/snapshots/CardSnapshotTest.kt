package io.github.raincoatui.ui.snapshots

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import io.github.raincoatui.tokens.ButtonVariant
import io.github.raincoatui.tokens.TextColor
import io.github.raincoatui.ui.LocalRaincoatTokens
import io.github.raincoatui.ui.components.RaincoatButton
import io.github.raincoatui.ui.components.RaincoatCard
import io.github.raincoatui.ui.components.RaincoatText
import io.github.raincoatui.ui.generated.CardExampleProperties
import io.github.raincoatui.ui.generated.SpecExample
import io.github.raincoatui.ui.generated.cardExamples
import io.github.raincoatui.ui.toColor

/**
 * The Card in every snapshot of the matrix: specs/components/card. Each card has a title at level
 * 3 and its body in muted text; the media-and-footer example adds a picture and a primary
 * button, as on the web.
 */
internal class CardSnapshotTest(theme: String, snapshot: String) : SnapshotTest<CardInstance>(
    theme,
    snapshot,
    component = "card",
    examples = cardInstances,
    draw = { instance, text ->
        val withMedia = instance.example == "media-and-footer"
        RaincoatCard(
            title = text("title"),
            level = 3,
            onClick = if (instance.properties.interactive) ({}) else null,
            media = if (withMedia) ({ Picture(text("media")) }) else null,
            footer = if (withMedia) ({ RaincoatButton(text("footer"), onClick = {}, variant = ButtonVariant.Primary) }) else null,
        ) {
            RaincoatText(text("body"), color = TextColor.Muted)
        }
    },
)

/** One Card, and the example it is in, which says whether it has media and a footer. */
internal data class CardInstance(val properties: CardExampleProperties, val example: String)

private val cardInstances: List<SpecExample<CardInstance>> = cardExamples.map { example ->
    SpecExample(example.id, example.instances.map { CardInstance(it, example.id) }, example.text)
}

/**
 * The media: hills under a sky, in theme colors, 400 by 120 units stretched to the card's width,
 * as the web draws it.
 */
@Composable
private fun Picture(description: String) {
    val color = LocalRaincoatTokens.current.color
    val sky = color.bg.subtle.toColor()
    val hills = color.accent.default.toColor()
    Canvas(Modifier.fillMaxWidth().aspectRatio(400f / 120f).semantics { contentDescription = description }) {
        val x = size.width / 400f
        val y = size.height / 120f
        drawRect(sky)
        val path = Path().apply {
            moveTo(0f, 120 * y)
            lineTo(0f, 70 * y)
            quadraticTo(100 * x, 20 * y, 200 * x, 70 * y)
            // The web's smooth curve, "T400 60", mirrors the last control point about (200, 70).
            quadraticTo(300 * x, 120 * y, 400 * x, 60 * y)
            lineTo(400 * x, 120 * y)
            close()
        }
        drawPath(path, hills)
    }
}
