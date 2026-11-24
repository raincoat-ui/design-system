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
import androidx.compose.foundation.text.BasicText
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.painter.Painter
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.github.raincoatui.ui.LocalRaincoatTokens
import io.github.raincoatui.ui.RaincoatTheme
import io.github.raincoatui.ui.components.RaincoatTab
import io.github.raincoatui.ui.components.RaincoatTabs

/** The labels of the overflowing row: more tabs than fit a phone, in Vietnamese. */
internal val TRANSLATED = listOf("Tổng quan", "Thông số kỹ thuật", "Đánh giá", "Câu hỏi thường gặp", "Vận chuyển", "Đổi trả")

/** The Tabs screen, in the theme the app was built with. The tests start it directly. */
class TabsActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            RaincoatTheme(theme = appTheme) {
                TabsScreen()
            }
        }
    }
}

/**
 * The Tabs in the states of their spec. The selected tab of the first row is written in the line
 * at the top, which is how the tests see the selection change.
 */
@Composable
fun TabsScreen() {
    val tokens = LocalRaincoatTokens.current
    var product by rememberSaveable { mutableStateOf("details") }
    val body = TextStyle(color = Color(tokens.color.fg.default.argb), fontSize = tokens.type.body.md.size.sp)
    val caption = TextStyle(color = Color(tokens.color.fg.muted.argb), fontSize = tokens.type.body.sm.size.sp)
    val panel = @Composable { text: String ->
        BasicText(text, Modifier.padding(vertical = tokens.space._4.dp), style = body)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(tokens.color.bg.canvas.argb))
            .safeDrawingPadding()
            .verticalScroll(rememberScrollState())
            .padding(tokens.space._6.dp),
        verticalArrangement = Arrangement.spacedBy(tokens.space._6.dp),
    ) {
        BasicText("Selected: $product", Modifier.testTag("selected"), style = body)

        Group("Labels", caption) {
            RaincoatTabs(
                tabs = listOf(
                    RaincoatTab("details", "Details"),
                    RaincoatTab("reviews", "Reviews"),
                    RaincoatTab("shipping", "Shipping"),
                ),
                selected = product,
                onSelect = { product = it },
            ) { section ->
                panel(PRODUCT_PANELS.getValue(section))
            }
        }

        Group("Icons", caption) {
            RaincoatTabs(
                listOf(
                    RaincoatTab(0, "Photos", icon = ShapeIcon(0)),
                    RaincoatTab(1, "Videos", icon = ShapeIcon(1)),
                    RaincoatTab(2, "Files", icon = ShapeIcon(2)),
                ),
            ) { section ->
                panel(listOf("No photos yet.", "No videos yet.", "No files yet.")[section])
            }
        }

        Group("Icon only", caption) {
            RaincoatTabs(
                listOf(
                    RaincoatTab(0, ShapeIcon(0), contentDescription = "List"),
                    RaincoatTab(1, ShapeIcon(1), contentDescription = "Grid"),
                ),
            ) { section ->
                panel(if (section == 0) "Shown as a list." else "Shown as a grid.")
            }
        }

        // More tabs than fit a phone, in a translation longer than the English, as an app ships
        // them in Vietnamese.
        Group("Overflowing, translated", caption) {
            RaincoatTabs(
                TRANSLATED.mapIndexed { index, label -> RaincoatTab(index, label) },
                modifier = Modifier.testTag("translated"),
            ) { section ->
                panel("Đang xem: ${TRANSLATED[section]}")
            }
        }
    }
}

internal val PRODUCT_PANELS = mapOf(
    "details" to "Made of waxed cotton, with taped seams.",
    "reviews" to "Rated 4 of 5 by 120 buyers.",
    "shipping" to "Ships in two days.",
)

@Composable
private fun Group(title: String, style: TextStyle, content: @Composable () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(LocalRaincoatTokens.current.space._2.dp)) {
        BasicText(title, Modifier.semantics { heading() }, style = style)
        content()
    }
}

/** A plain shape that stands for an icon: a circle, a square, or a triangle. An app brings its own icons. */
private class ShapeIcon(private val shape: Int) : Painter() {
    override val intrinsicSize: Size = Size.Unspecified

    override fun DrawScope.onDraw() {
        when (shape % 3) {
            0 -> drawCircle(Color.Black)
            1 -> drawRect(Color.Black, topLeft = Offset(size.width / 8, size.height / 8), size = size * 0.75f)
            else -> drawPath(
                androidx.compose.ui.graphics.Path().apply {
                    moveTo(size.width / 2, 0f)
                    lineTo(size.width, size.height)
                    lineTo(0f, size.height)
                    close()
                },
                Color.Black,
            )
        }
    }
}
