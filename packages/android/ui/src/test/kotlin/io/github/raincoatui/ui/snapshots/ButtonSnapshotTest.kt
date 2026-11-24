package io.github.raincoatui.ui.snapshots

import io.github.raincoatui.ui.components.RaincoatButton
import io.github.raincoatui.ui.generated.ButtonExampleProperties
import io.github.raincoatui.ui.generated.buttonExamples

/** The Button in every snapshot of the matrix: specs/components/button. */
internal class ButtonSnapshotTest(theme: String, snapshot: String) : SnapshotTest<ButtonExampleProperties>(
    theme,
    snapshot,
    component = "button",
    examples = buttonExamples,
    draw = { button, text ->
        RaincoatButton(
            text = text("label"),
            onClick = {},
            variant = button.variant,
            size = button.size,
            enabled = !button.disabled,
            loading = button.loading,
            fullWidth = button.fullWidth,
        )
    },
)
