package io.github.raincoatui.ui.snapshots

import io.github.raincoatui.ui.components.RaincoatInput
import io.github.raincoatui.ui.generated.InputExampleProperties
import io.github.raincoatui.ui.generated.inputExamples

/**
 * The Input in every snapshot of the matrix: specs/components/input. Android has no required
 * state, so `required` draws nothing here.
 */
internal class InputSnapshotTest(theme: String, snapshot: String) : SnapshotTest<InputExampleProperties>(
    theme,
    snapshot,
    component = "input",
    examples = inputExamples,
    draw = { input, text ->
        RaincoatInput(
            value = text.optional("value") ?: "",
            onValueChange = {},
            label = text("label"),
            type = input.type,
            size = input.size,
            description = text.optional("description"),
            placeholder = text.optional("placeholder"),
            invalid = input.invalid,
            error = text.optional("error"),
            multiline = input.multiline,
            enabled = !input.disabled,
            readOnly = input.readOnly,
        )
    },
)
