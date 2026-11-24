package io.github.raincoatui.ui.snapshots

import io.github.raincoatui.ui.components.RaincoatToast
import io.github.raincoatui.ui.generated.ToastExampleProperties
import io.github.raincoatui.ui.generated.toastExamples

/**
 * The Toast in every snapshot of the matrix: specs/components/toast. Each toast is drawn on its
 * own, standing still, as on the web: what RaincoatToastHost shows, without the timer or the
 * motion.
 */
internal class ToastSnapshotTest(theme: String, snapshot: String) : SnapshotTest<ToastExampleProperties>(
    theme,
    snapshot,
    component = "toast",
    examples = toastExamples,
    draw = { toast, text ->
        if (toast.action) {
            RaincoatToast(
                message = text("message"),
                actionLabel = text("action-label"),
                onAction = {},
                closeLabel = text("close-label"),
                onClose = {},
            )
        } else {
            RaincoatToast(message = text("message"))
        }
    },
)
