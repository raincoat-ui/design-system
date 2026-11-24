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
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.dp
import io.github.raincoatui.tokens.ButtonVariant
import io.github.raincoatui.tokens.SheetEdge
import io.github.raincoatui.tokens.TextColor
import io.github.raincoatui.ui.LocalRaincoatTokens
import io.github.raincoatui.ui.RaincoatTheme
import io.github.raincoatui.ui.components.RaincoatAlertDialog
import io.github.raincoatui.ui.components.RaincoatButton
import io.github.raincoatui.ui.components.RaincoatDialog
import io.github.raincoatui.ui.components.RaincoatHeading
import io.github.raincoatui.ui.components.RaincoatSheet
import io.github.raincoatui.ui.components.RaincoatText

internal const val TERMS =
    "You keep the rights to everything you upload. We store it so that you can reach it from your devices, and " +
        "share it only with the people you choose. You can delete your account at any time, and everything in it " +
        "is deleted within thirty days."

/** The Dialog's screen, in the theme the app was built with. Its test opens it. */
class DialogActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            RaincoatTheme(theme = appTheme) {
                DialogScreen()
            }
        }
    }
}

/**
 * The dialog, the alert dialog, and the sheet as an app uses them, from the Dialog spec: a dialog
 * with a short form, which starts in its field; a dialog with content longer than the screen; an
 * alert dialog that confirms a deletion; a bottom sheet; and an end sheet. What each did is
 * written at the bottom of the screen.
 */
@Composable
fun DialogScreen() {
    val tokens = LocalRaincoatTokens.current
    var name by remember { mutableStateOf("Quarterly report") }
    var status by remember { mutableStateOf("Nothing yet.") }
    var renaming by remember { mutableStateOf(false) }
    var reading by remember { mutableStateOf(false) }
    var confirming by remember { mutableStateOf(false) }
    var sharing by remember { mutableStateOf(false) }
    var filtering by remember { mutableStateOf(false) }
    val field = remember { FocusRequester() }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(tokens.color.bg.canvas.argb))
            .safeDrawingPadding()
            .verticalScroll(rememberScrollState())
            .padding(tokens.space._6.dp),
        verticalArrangement = Arrangement.spacedBy(tokens.space._4.dp),
    ) {
        RaincoatHeading("Files", level = 1)
        RaincoatText("$name, shared with 3 people.")
        RaincoatButton("Rename file", onClick = { renaming = true })
        RaincoatButton("Terms of use", onClick = { reading = true })
        RaincoatButton("Delete address", onClick = { confirming = true }, variant = ButtonVariant.Danger)
        RaincoatButton("Share", onClick = { sharing = true })
        RaincoatButton("Filters", onClick = { filtering = true })
        RaincoatText(status, Modifier.testTag("status"), color = TextColor.Muted)
    }

    RaincoatDialog(
        open = renaming,
        onDismissRequest = { renaming = false },
        title = "Rename file",
        titleLevel = 2,
        description = "Everyone the file is shared with sees the new name.",
        initialFocus = field,
        actions = {
            RaincoatButton("Cancel", onClick = { renaming = false })
            RaincoatButton(
                "Rename",
                onClick = {
                    status = "Renamed to $name."
                    renaming = false
                },
                variant = ButtonVariant.Primary,
            )
        },
    ) {
        BasicTextField(
            value = name,
            onValueChange = { name = it },
            textStyle = TextStyle(color = Color(tokens.color.fg.default.argb)),
            modifier = Modifier
                .focusRequester(field)
                .semantics { contentDescription = "Name" },
        )
    }

    RaincoatDialog(
        open = reading,
        onDismissRequest = { reading = false },
        title = "Terms of use",
        titleLevel = 2,
        closeLabel = "Close",
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(tokens.space._4.dp)) {
            repeat(12) { RaincoatText(TERMS) }
        }
    }

    RaincoatAlertDialog(
        open = confirming,
        onCancel = {
            status = "Kept the address."
            confirming = false
        },
        onConfirm = {
            status = "Deleted the address."
            confirming = false
        },
        title = "Delete this address?",
        titleLevel = 2,
        confirmLabel = "Delete address",
        cancelLabel = "Cancel",
        description = "It is removed from your account. This cannot be undone.",
        destructive = true,
    )

    RaincoatSheet(
        open = sharing,
        onDismissRequest = { sharing = false },
        title = "Share file",
        titleLevel = 2,
        description = "People with the link can view the file.",
        actions = {
            RaincoatButton("Cancel", onClick = { sharing = false })
            RaincoatButton(
                "Copy link",
                onClick = {
                    status = "Copied the link."
                    sharing = false
                },
                variant = ButtonVariant.Primary,
            )
        },
    )

    RaincoatSheet(
        open = filtering,
        onDismissRequest = { filtering = false },
        title = "Filters",
        titleLevel = 2,
        edge = SheetEdge.End,
        closeLabel = "Close",
    ) {
        RaincoatText("Show files shared with you in the last 30 days.")
    }
}
