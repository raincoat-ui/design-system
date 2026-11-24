package io.github.raincoatui.ui.snapshots

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import io.github.raincoatui.ui.components.RaincoatTab
import io.github.raincoatui.ui.components.RaincoatTabs
import io.github.raincoatui.ui.components.RaincoatText
import io.github.raincoatui.ui.generated.SpecExample
import io.github.raincoatui.ui.generated.TabsExampleProperties
import io.github.raincoatui.ui.generated.tabsExamples

/**
 * Tabs in every snapshot of the matrix: specs/components/tabs. An example is a row of tabs, and
 * its text gives one line per tab, as on the web. Compose Tabs have no activation mode and always
 * compose only the selected panel, so those properties draw nothing here.
 */
internal class TabsSnapshotTest(theme: String, snapshot: String) : SnapshotTest<TabsInstance>(
    theme,
    snapshot,
    component = "tabs",
    examples = tabsInstances,
    draw = { instance, text ->
        val example = instance.example
        val iconOnly = example == "icon-only"
        val icons = example == "icons" || iconOnly
        val lines = text(if (iconOnly) "accessible-name" else "label").split("\n")
        val tabs = lines.mapIndexed { index, line ->
            if (iconOnly) {
                RaincoatTab(value = index, icon = ShapeIcon(index), contentDescription = line)
            } else {
                RaincoatTab(value = index, text = line, icon = if (icons) ShapeIcon(index) else null)
            }
        }
        RaincoatTabs(
            tabs = tabs,
            modifier = Modifier.fillMaxWidth(),
            // The overflowing row selects its last tab, so it is drawn scrolled to the end.
            initialSelection = if (example == "overflow") lines.lastIndex else 0,
            panel = {
                if (example == "labels") RaincoatText(text("panel"), Modifier.padding(vertical = 16.dp))
            },
        )
    },
)

/** One Tabs, and the example it is in: the examples differ in their content, not their properties. */
internal data class TabsInstance(val properties: TabsExampleProperties, val example: String)

private val tabsInstances: List<SpecExample<TabsInstance>> = tabsExamples.map { example ->
    SpecExample(example.id, example.instances.map { TabsInstance(it, example.id) }, example.text)
}
