package io.github.raincoatui.ui.snapshots

import io.github.raincoatui.ui.components.RaincoatHeading
import io.github.raincoatui.ui.components.RaincoatText
import io.github.raincoatui.ui.generated.HeadingExampleProperties
import io.github.raincoatui.ui.generated.SpecExample
import io.github.raincoatui.ui.generated.TextExampleProperties
import io.github.raincoatui.ui.generated.TypographyExampleProperties
import io.github.raincoatui.ui.generated.typographyExamples
import java.text.Normalizer

/** Text and Heading in every snapshot of the matrix: specs/components/typography. */
internal class TypographySnapshotTest(theme: String, snapshot: String) : SnapshotTest<TypographyInstance>(
    theme,
    snapshot,
    component = "typography",
    examples = typographyInstances,
    draw = { instance, text ->
        when (val part = instance.part) {
            is TextExampleProperties -> RaincoatText(
                text = content(instance, text),
                variant = part.variant,
                color = part.color,
                maxLines = part.maxLines ?: Int.MAX_VALUE,
            )
            is HeadingExampleProperties -> RaincoatHeading(
                text = content(instance, text),
                level = part.level,
                variant = part.variant,
                color = part.color,
            )
        }
    },
)

/** One Text or Heading of an example, and whether its text is decomposed (NFD). */
internal data class TypographyInstance(val part: TypographyExampleProperties, val decomposed: Boolean = false)

/**
 * The examples, with the long heading drawn twice, as on the web: composed (NFC), as
 * strings.yaml has it, and decomposed (NFD), as some input methods write Vietnamese. The two must
 * look the same, and stacked diacritics on its second line must not touch the first.
 */
private val typographyInstances: List<SpecExample<TypographyInstance>> = typographyExamples.map { example ->
    val instances = example.instances.map { TypographyInstance(it) }
    SpecExample(
        id = example.id,
        instances = if (example.id == "long-heading") {
            instances.flatMap { listOf(it, it.copy(decomposed = true)) }
        } else {
            instances
        },
        text = example.text,
    )
}

/**
 * The text of an instance. In person-name, the name goes where {name} marks it, between the
 * first strong isolate (U+2068) and the pop directional isolate (U+2069): the name takes its
 * direction from its first strong character, as `dir="auto"` gives it on the web.
 */
private fun content(instance: TypographyInstance, text: Text): String {
    val value = text("text").let { if (instance.decomposed) Normalizer.normalize(it, Normalizer.Form.NFD) else it }
    val parts = value.split(Regex("""\{[^}]*\}"""), limit = 2)
    if (parts.size < 2) return value
    return parts[0] + "⁨" + text("name") + "⁩" + parts[1]
}
