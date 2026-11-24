package io.github.raincoatui.ui.snapshots

import io.github.raincoatui.ui.generated.allSnapshots
import io.github.raincoatui.ui.generated.allThemes
import java.io.File
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Every component with an Android implementation has its snapshots, and every baseline belongs
 * to a snapshot that is still drawn. A baseline that is missing fails the snapshot itself.
 */
class SnapshotCoverageTest {
    private val specs = File(property("raincoat.specs"))
    private val baselines = File(property("raincoat.snapshots.baselines"))

    /** The ids of the component specs that name an Android implementation. */
    private val components: List<String> = specs.listFiles().orEmpty()
        .filter { File(it, "spec.yaml").isFile && hasAndroidImplementation(File(it, "spec.yaml")) }
        .map { it.name }
        .sorted()

    @Test
    fun `every component with an Android implementation has a snapshot test`() {
        val missing = components.filter { snapshotTest(it) == null }.map { component ->
            "specs/components/$component has an Android implementation and no snapshot test: add " +
                "src/test/kotlin/io/github/raincoatui/ui/snapshots/${className(component)}.kt"
        }
        assertTrue(missing.joinToString("\n"), missing.isEmpty())
    }

    @Test
    fun `every baseline belongs to a theme, a component, and a snapshot`() {
        val themes = allThemes.map { it.id }
        val snapshots = allSnapshots.map { "${it.id}.png" }
        val stray = mutableListOf<String>()
        for (theme in baselines.listFiles().orEmpty().sortedBy { it.name }) {
            if (theme.name !in themes) {
                stray += "${theme.name}/ holds the baselines of no theme; delete it"
                continue
            }
            for (component in theme.listFiles().orEmpty().sortedBy { it.name }) {
                for (file in component.listFiles().orEmpty().sortedBy { it.name }) {
                    if (component.name !in components || file.name !in snapshots) {
                        stray += "${theme.name}/${component.name}/${file.name} is the baseline of no snapshot; delete it"
                    }
                }
            }
        }
        assertTrue(stray.joinToString("\n"), stray.isEmpty())
    }

    private fun snapshotTest(component: String): Class<*>? {
        val name = SnapshotTest::class.java.name.substringBeforeLast('.') + "." + className(component)
        val found = runCatching { Class.forName(name, false, javaClass.classLoader) }.getOrNull()
        return found?.takeIf { SnapshotTest::class.java.isAssignableFrom(it) }
    }

    private companion object {
        /** The snapshot test of a component: ButtonSnapshotTest for button. */
        fun className(component: String): String =
            component.split('-').joinToString("") { part -> part.replaceFirstChar { it.uppercase() } } + "SnapshotTest"

        /**
         * Whether a spec has an `android` entry under its top-level `implementations`. The specs
         * are written in YAML's block style, which the spec linter's schema keeps to this shape.
         */
        fun hasAndroidImplementation(spec: File): Boolean {
            var inImplementations = false
            for (line in spec.readLines()) {
                val content = line.substringBefore('#').trimEnd()
                if (content.isBlank()) continue
                if (!content[0].isWhitespace()) {
                    inImplementations = content == "implementations:"
                } else if (inImplementations && content.trimStart().startsWith("android:")) {
                    return true
                }
            }
            return false
        }

        fun property(name: String): String =
            System.getProperty(name) ?: error("$name is not set: run the tests with Gradle")
    }
}
