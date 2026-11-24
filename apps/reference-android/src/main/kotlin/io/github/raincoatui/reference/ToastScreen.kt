package io.github.raincoatui.reference

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.text.BasicText
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.github.raincoatui.tokens.ButtonVariant
import io.github.raincoatui.tokens.TokenColor
import io.github.raincoatui.ui.LocalRaincoatTokens
import io.github.raincoatui.ui.components.RaincoatButton
import io.github.raincoatui.ui.components.RaincoatToastHost
import io.github.raincoatui.ui.components.RaincoatToastHostState
import io.github.raincoatui.ui.components.RaincoatToastResult
import kotlinx.coroutines.launch

/**
 * The Toast in the states of its spec, shown the way an app shows them: from buttons, with a
 * toast host over the screen's content, above a bar of the app's own at the bottom. A search field
 * brings up the keyboard. An action writes its name in the line at the top, which is how the tests
 * see that it ran.
 */
@Composable
fun ToastScreen() {
    val tokens = LocalRaincoatTokens.current
    var lastAction by rememberSaveable { mutableStateOf("Nothing yet") }
    var search by remember { mutableStateOf("") }
    val toasts = remember { RaincoatToastHostState() }
    val scope = rememberCoroutineScope()
    val body = TextStyle(color = tokens.color.fg.default.compose(), fontSize = tokens.type.body.md.size.sp)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(tokens.color.bg.canvas.compose())
            .safeDrawingPadding(),
    ) {
        Box(Modifier.weight(1f).fillMaxWidth()) {
            Column(
                modifier = Modifier.padding(tokens.space._6.dp),
                verticalArrangement = Arrangement.spacedBy(tokens.space._3.dp),
            ) {
                BasicText("Last action: $lastAction", Modifier.testTag("last-action"), style = body)
                RaincoatButton(
                    "Archive message",
                    { scope.launch { toasts.show("Message archived") } },
                    variant = ButtonVariant.Secondary,
                )
                RaincoatButton(
                    "Delete address",
                    {
                        scope.launch {
                            val result = toasts.show("Address deleted", actionLabel = "Undo", closeLabel = "Close")
                            if (result == RaincoatToastResult.ActionPerformed) lastAction = "Undo"
                        }
                    },
                    variant = ButtonVariant.Secondary,
                )
                RaincoatButton(
                    "Copy two links",
                    {
                        scope.launch { toasts.show("First link copied", closeLabel = "Close") }
                        scope.launch { toasts.show("Second link copied", closeLabel = "Close") }
                    },
                    variant = ButtonVariant.Secondary,
                )
                BasicTextField(
                    value = search,
                    onValueChange = { search = it },
                    modifier = Modifier
                        .testTag("search")
                        .semantics { contentDescription = "Search" }
                        .fillMaxWidth()
                        .border(tokens.borderWidth.thin.dp, tokens.color.border.control.compose())
                        .padding(tokens.space._3.dp),
                    textStyle = body,
                )
            }
            // Over the content, at the bottom, above the app's bar.
            RaincoatToastHost(toasts, Modifier.align(Alignment.BottomCenter))
        }
        Row(
            modifier = Modifier
                .testTag("bottom-bar")
                .fillMaxWidth()
                .background(tokens.color.bg.surface.compose())
                .padding(tokens.space._4.dp),
            horizontalArrangement = Arrangement.spacedBy(tokens.space._6.dp),
        ) {
            BasicText("Button", style = body)
            BasicText("Toast", style = body)
        }
    }
}

private fun TokenColor.compose(): Color = Color(argb)
