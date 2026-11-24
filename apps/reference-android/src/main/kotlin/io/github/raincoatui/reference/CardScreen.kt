package io.github.raincoatui.reference

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.painter.Painter
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.CollectionInfo
import androidx.compose.ui.semantics.CollectionItemInfo
import androidx.compose.ui.semantics.collectionInfo
import androidx.compose.ui.semantics.collectionItemInfo
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import io.github.raincoatui.tokens.ButtonVariant
import io.github.raincoatui.tokens.TextColor
import io.github.raincoatui.ui.LocalRaincoatTokens
import io.github.raincoatui.ui.RaincoatTheme
import io.github.raincoatui.ui.components.RaincoatButton
import io.github.raincoatui.ui.components.RaincoatCard
import io.github.raincoatui.ui.components.RaincoatHeading
import io.github.raincoatui.ui.components.RaincoatText

internal const val LONG_TITLE = "Your order of three linen shirts and a wool scarf is on its way"

/** The Card's screen, in the theme the app was built with. Its test opens it. */
class CardActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            RaincoatTheme(theme = appTheme) {
                CardScreen()
            }
        }
    }
}

/**
 * The Card in the states of its spec, as an orders screen sets cards: a list of cards that open
 * an order or start a return, and static cards that hold Buttons. Activating anything writes its
 * name in the line at the top, which is how the tests see that an action ran.
 */
@Composable
fun CardScreen() {
    val tokens = LocalRaincoatTokens.current
    var lastAction by rememberSaveable { mutableStateOf("Nothing yet") }
    val picture = Hills(sky = Color(tokens.color.bg.subtle.argb), hills = Color(tokens.color.accent.default.argb))
    val media = { description: String ->
        @Composable {
            Image(
                painter = picture,
                contentDescription = description,
                modifier = Modifier.fillMaxWidth().height(120.dp),
                contentScale = ContentScale.FillBounds,
            )
        }
    }
    val orders = listOf("Order 1042", LONG_TITLE, "Start a return")

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(tokens.color.bg.canvas.argb))
            .safeDrawingPadding()
            .verticalScroll(rememberScrollState())
            .padding(tokens.space._6.dp),
        verticalArrangement = Arrangement.spacedBy(tokens.space._4.dp),
    ) {
        RaincoatHeading("Orders", level = 1)
        RaincoatText("Last action: $lastAction", Modifier.testTag("last-action"))

        RaincoatHeading("Recent orders", level = 2)
        // A list, so that TalkBack says how many cards there are.
        Column(
            modifier = Modifier
                .testTag("orders")
                .semantics { collectionInfo = CollectionInfo(rowCount = orders.size, columnCount = 1) },
            verticalArrangement = Arrangement.spacedBy(tokens.space._4.dp),
        ) {
            val item = { index: Int ->
                Modifier.semantics { collectionItemInfo = CollectionItemInfo(index, 1, 0, 1) }
            }
            RaincoatCard(
                title = "Order 1042",
                level = 3,
                modifier = Modifier.testTag("order-1042").then(item(0)),
                onClick = { lastAction = "Order 1042" },
                media = media("A parcel at a front door"),
            ) {
                RaincoatText("Delivered on Monday", color = TextColor.Muted)
            }
            RaincoatCard(
                title = LONG_TITLE,
                level = 3,
                modifier = Modifier.testTag("order-1043").then(item(1)),
                onClick = { lastAction = "Order 1043" },
            ) {
                RaincoatText("Arrives on Thursday", color = TextColor.Muted)
            }
            RaincoatCard(
                title = "Start a return",
                level = 3,
                modifier = Modifier.testTag("return").then(item(2)),
                onClick = { lastAction = "Start a return" },
            ) {
                RaincoatText("Within 30 days of delivery", color = TextColor.Muted)
            }
        }

        RaincoatHeading("Your account", level = 2)
        RaincoatCard(
            title = "Storage",
            level = 3,
            footer = { RaincoatButton("Manage storage", onClick = { lastAction = "Manage storage" }) },
        ) {
            RaincoatText("4.2 GB of 15 GB used", color = TextColor.Muted)
        }
        RaincoatCard(
            title = "Summer trip",
            level = 3,
            modifier = Modifier.testTag("album"),
            media = media("A lake between hills covered in pine trees"),
            footer = {
                RaincoatButton("Share", onClick = { lastAction = "Share" }, variant = ButtonVariant.Ghost)
                RaincoatButton("Open album", onClick = { lastAction = "Open album" }, variant = ButtonVariant.Primary)
            },
        ) {
            RaincoatText("48 photos, shared with 3 people", color = TextColor.Muted)
        }
    }
}

/** A picture to stand for a photo: hills under a sky, in the theme's colors. */
private class Hills(private val sky: Color, private val hills: Color) : Painter() {
    override val intrinsicSize: Size = Size.Unspecified

    override fun DrawScope.onDraw() {
        drawRect(sky)
        val path = Path().apply {
            moveTo(0f, size.height)
            lineTo(0f, size.height * 0.6f)
            quadraticTo(size.width / 4, 0f, size.width / 2, size.height * 0.6f)
            quadraticTo(size.width * 3 / 4, size.height, size.width, size.height / 2)
            lineTo(size.width, size.height)
            close()
        }
        drawPath(path, hills)
    }
}
