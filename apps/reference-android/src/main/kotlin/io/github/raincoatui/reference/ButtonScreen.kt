package io.github.raincoatui.reference

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.BasicText
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.painter.Painter
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.github.raincoatui.tokens.ButtonSize
import io.github.raincoatui.tokens.ButtonVariant
import io.github.raincoatui.tokens.TokenColor
import io.github.raincoatui.ui.LocalRaincoatTokens
import io.github.raincoatui.ui.components.RaincoatButton

internal const val LONG_LABEL = "Save all of these changes and send the updated version to every reviewer"

/**
 * The Button in the states of its spec. Activating a button writes its name in the line at the
 * top, which is how the tests see that an action ran.
 */
@Composable
fun ButtonScreen() {
    val tokens = LocalRaincoatTokens.current
    var lastAction by rememberSaveable { mutableStateOf("Nothing yet") }
    val body = TextStyle(color = tokens.color.fg.default.compose(), fontSize = tokens.type.body.md.size.sp)
    val caption = TextStyle(color = tokens.color.fg.muted.compose(), fontSize = tokens.type.body.sm.size.sp)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(tokens.color.bg.canvas.compose())
            .safeDrawingPadding()
            .verticalScroll(rememberScrollState())
            .padding(tokens.space._6.dp),
        verticalArrangement = Arrangement.spacedBy(tokens.space._6.dp),
    ) {
        BasicText("Last action: $lastAction", Modifier.testTag("last-action"), style = body)
        // PLANTED, to be reverted: a clickable picture with no name. The accessibility checks
        // must fail on it.
        Image(
            painter = PlaceholderIcon,
            contentDescription = null,
            modifier = Modifier.size(tokens.size.target.minimum.dp).clickable { lastAction = "Planted" },
        )

        Section("Variants", caption) {
            Column(verticalArrangement = Arrangement.spacedBy(tokens.space._3.dp)) {
                RaincoatButton("Save changes", { lastAction = "Save changes" }, variant = ButtonVariant.Primary)
                RaincoatButton("Cancel", { lastAction = "Cancel" }, variant = ButtonVariant.Secondary)
                RaincoatButton("Show details", { lastAction = "Show details" }, variant = ButtonVariant.Ghost)
                RaincoatButton("Delete project", { lastAction = "Delete project" }, variant = ButtonVariant.Danger)
            }
        }

        Section("Sizes", caption) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(tokens.space._4.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                RaincoatButton("Small", { lastAction = "Small" }, variant = ButtonVariant.Primary, size = ButtonSize.Sm)
                RaincoatButton("Medium", { lastAction = "Medium" }, variant = ButtonVariant.Primary, size = ButtonSize.Md)
                RaincoatButton("Large", { lastAction = "Large" }, variant = ButtonVariant.Primary, size = ButtonSize.Lg)
            }
        }

        Section("Disabled and loading", caption) {
            Column(verticalArrangement = Arrangement.spacedBy(tokens.space._3.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(tokens.space._4.dp)) {
                    RaincoatButton(
                        "Publish",
                        { lastAction = "Publish" },
                        variant = ButtonVariant.Primary,
                        enabled = false,
                    )
                    RaincoatButton(
                        "Send invite",
                        { lastAction = "Send invite" },
                        variant = ButtonVariant.Primary,
                        loading = true,
                    )
                }
                // Disabled wins: this button is not also in progress.
                RaincoatButton(
                    "Archive",
                    { lastAction = "Archive" },
                    variant = ButtonVariant.Secondary,
                    enabled = false,
                    loading = true,
                )
            }
        }

        // The lines directly above and below the small button show how much room it takes: the
        // tests measure the distance between them.
        Section("Icon only", caption) {
            Column {
                BasicText("Above the small button", Modifier.testTag("small-above"), style = body)
                RaincoatButton(
                    icon = PlaceholderIcon,
                    contentDescription = "Delete page",
                    onClick = { lastAction = "Delete page" },
                    variant = ButtonVariant.Secondary,
                    size = ButtonSize.Sm,
                )
                BasicText("Below the small button", Modifier.testTag("small-below"), style = body)
            }
        }

        Section("Full width and a long label", caption) {
            Column(verticalArrangement = Arrangement.spacedBy(tokens.space._3.dp)) {
                RaincoatButton(
                    "Continue",
                    { lastAction = "Continue" },
                    variant = ButtonVariant.Primary,
                    fullWidth = true,
                )
                RaincoatButton(LONG_LABEL, { lastAction = "Save all" }, variant = ButtonVariant.Secondary)
            }
        }
    }
}

@Composable
private fun Section(title: String, style: TextStyle, content: @Composable () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(LocalRaincoatTokens.current.space._2.dp)) {
        BasicText(title, Modifier.semantics { heading() }, style = style)
        content()
    }
}

private fun TokenColor.compose(): Color = Color(argb)

/** A plain outline that stands for an icon. An app brings its own icon set. */
private object PlaceholderIcon : Painter() {
    override val intrinsicSize: Size = Size.Unspecified

    override fun DrawScope.onDraw() {
        val stroke = size.minDimension / 8
        drawRoundRect(
            color = Color.Black,
            topLeft = Offset(stroke, stroke),
            size = Size(size.width - 2 * stroke, size.height - 2 * stroke),
            cornerRadius = CornerRadius(stroke),
            style = Stroke(stroke),
        )
    }
}
