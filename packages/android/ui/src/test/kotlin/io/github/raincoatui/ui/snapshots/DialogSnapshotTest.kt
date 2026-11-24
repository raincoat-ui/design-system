package io.github.raincoatui.ui.snapshots

import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.isDialog
import io.github.raincoatui.tokens.ButtonVariant
import io.github.raincoatui.ui.captureRedrawn
import io.github.raincoatui.ui.components.RaincoatAlertDialog
import io.github.raincoatui.ui.components.RaincoatButton
import io.github.raincoatui.ui.components.RaincoatDialog
import io.github.raincoatui.ui.components.RaincoatSheet
import io.github.raincoatui.ui.components.RaincoatText
import io.github.raincoatui.ui.generated.AlertDialogExampleProperties
import io.github.raincoatui.ui.generated.DialogExampleProperties
import io.github.raincoatui.ui.generated.DialogPartExampleProperties
import io.github.raincoatui.ui.generated.SheetExampleProperties
import io.github.raincoatui.ui.generated.SpecExample
import io.github.raincoatui.ui.generated.dialogExamples
import kotlin.math.roundToInt
import org.robolectric.annotation.Config

/**
 * The dialog, the alert dialog, and the sheet in every snapshot of the matrix:
 * specs/components/dialog, drawn as the web draws them.
 *
 * Each opens a window of its own, so each is shown alone, open, and its window is captured. The
 * window is as wide as the specimen's content, 432dp, and tall enough for every dialog with room
 * to spare. What the snapshot keeps of it is the panel and the scrim around it: the dialog margin
 * above and below a centered panel, and above a sheet, down to the bottom of the window. The
 * windows are stacked into the specimen, on the canvas color, which shows through the scrim.
 */
@Config(qualifiers = "w432dp-h1600dp-mdpi")
internal class DialogSnapshotTest(theme: String, snapshot: String) : SnapshotTest<DialogInstance>(
    theme,
    snapshot,
    component = "dialog",
    examples = dialogInstances,
    draw = { instance, text ->
        when (val part = instance.part) {
            is AlertDialogExampleProperties -> RaincoatAlertDialog(
                open = true,
                onCancel = {},
                onConfirm = {},
                title = text("title"),
                titleLevel = 2,
                confirmLabel = text("action-label"),
                cancelLabel = text("cancel-label"),
                description = text("description"),
                destructive = part.destructive,
            )
            is SheetExampleProperties -> RaincoatSheet(
                open = true,
                onDismissRequest = {},
                title = text("title"),
                titleLevel = 2,
                edge = part.edge,
                closeLabel = text("close-label"),
                actions = { RaincoatButton(text("action-label"), onClick = {}, variant = ButtonVariant.Primary) },
                content = { RaincoatText(text("body")) },
            )
            is DialogExampleProperties -> {
                // The close-button example has a body and a close button and no footer; the others
                // have a footer.
                val informs = instance.example == "close-button"
                RaincoatDialog(
                    open = true,
                    onDismissRequest = {},
                    title = text("title"),
                    titleLevel = 2,
                    size = part.size,
                    description = if (instance.example == "dialog") text("description") else null,
                    closeLabel = if (informs) text("close-label") else null,
                    actions = if (informs) {
                        null
                    } else {
                        {
                            RaincoatButton(text("cancel-label"), onClick = {})
                            RaincoatButton(text("action-label"), onClick = {}, variant = ButtonVariant.Primary)
                        }
                    },
                    content = if (informs) ({ RaincoatText(text("body")) }) else null,
                )
            }
        }
    },
) {
    override fun drawSpecimen(name: String): Pixels {
        val instances = examples.flatMap { example -> example.instances.map { example to it } }
        var shown by mutableIntStateOf(0)
        compose.setContent {
            Themed {
                // A new key for each instance, so that the last one's window is gone.
                key(shown) {
                    val (example, instance) = instances[shown]
                    draw(instance, textOf(example))
                }
            }
        }
        val margin = tokens.dialog.margin.roundToInt()
        val windows = instances.indices.map { index ->
            shown = index
            compose.waitForIdle()
            val window = compose.onNode(isDialog())
            // From a frame drawn now, as every capture is (Capture.kt).
            val image = window.captureRedrawn(compose).toPixels()
            val origin = window.fetchSemanticsNode().boundsInWindow
            val panel = compose.onNode(SemanticsMatcher.keyIsDefined(SemanticsProperties.PaneTitle))
                .fetchSemanticsNode().boundsInWindow
            val top = (panel.top - origin.top).roundToInt() - margin
            val bottom = (panel.bottom - origin.top).roundToInt() + margin
            if (top < 0) {
                throw AssertionError("$name: ${instances[index].first.id} is too tall for its window, ${image.height} px")
            }
            image.rows(top, minOf(bottom, image.height))
        }
        return Pixels.stack(windows, WIDTH, PADDING, GAP, background = tokens.color.bg.canvas.argb.toInt())
    }
}

/** One part of an example, and the example it is in: the dialog's examples differ in what they show. */
internal data class DialogInstance(val part: DialogPartExampleProperties, val example: String)

private val dialogInstances: List<SpecExample<DialogInstance>> = dialogExamples.map { example ->
    SpecExample(example.id, example.instances.map { DialogInstance(it, example.id) }, example.text)
}
