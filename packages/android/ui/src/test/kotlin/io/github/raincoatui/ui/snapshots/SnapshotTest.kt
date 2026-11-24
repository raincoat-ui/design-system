package io.github.raincoatui.ui.snapshots

import android.view.View
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import io.github.raincoatui.tokens.ColorMode
import io.github.raincoatui.tokens.Density
import io.github.raincoatui.tokens.RaincoatTokenSet
import io.github.raincoatui.ui.LocalRaincoatTokens
import io.github.raincoatui.ui.RaincoatTheme
import io.github.raincoatui.ui.captureRedrawn
import io.github.raincoatui.ui.generated.SpecExample
import io.github.raincoatui.ui.generated.VisualSnapshot
import io.github.raincoatui.ui.generated.allSnapshots
import io.github.raincoatui.ui.generated.allThemes
import io.github.raincoatui.ui.toColor
import java.util.Locale
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.ParameterizedRobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

/** The text an example shows, by the content it fills: text("label"). */
internal typealias Text = (content: String) -> String

/** The text of content that only some examples have, such as a description: null where it has none. */
internal fun Text.optional(content: String): String? = runCatching { this(content) }.getOrNull()

/**
 * The visual snapshots of a component: each snapshot of specs/snapshots.yaml, in each theme. A
 * snapshot shows every example of the component's spec together, as a specimen, in the
 * snapshot's color mode, layout direction, locale, and font scale. The examples and their text in
 * each locale are generated from the spec and its strings.yaml (generated/Snapshots.kt).
 *
 * To add a component, write <Component>SnapshotTest.kt beside this file: a subclass that passes
 * the component's spec id, its generated examples, and a function that draws one instance of
 * them. SnapshotCoverageTest fails while a spec with an Android implementation has none. A
 * component that opens a window of its own, such as a dialog, also overrides [drawSpecimen].
 *
 * In CI each snapshot is compared with its baseline,
 * src/test/__screenshots__/<theme>/<component>/<snapshot>.png. A missing or different baseline
 * fails the test, and what was drawn is written to build/snapshots/actual/, laid out as the
 * baselines are, with the difference in build/snapshots/diff/. CI uploads both. Anywhere else
 * nothing is compared and no baseline is ever written: the images go to build/snapshots/local/,
 * to look at. Baselines are recorded in CI only; CONTRIBUTING.md says how to accept them.
 *
 * The screen is one pixel per dp, and tall, because a capture shows nothing below the screen.
 * Text is set in the fonts that Robolectric's native graphics ship with: Roboto, and Noto for
 * Arabic, Chinese, Japanese, and Korean (docs/adr/0019-visual-snapshots.md).
 */
@RunWith(ParameterizedRobolectricTestRunner::class)
@Config(qualifiers = "w1024dp-h4096dp-mdpi")
internal abstract class SnapshotTest<Properties>(
    themeId: String,
    snapshotId: String,
    /** The component's spec id: specs/components/<component>. */
    private val component: String,
    protected val examples: List<SpecExample<Properties>>,
    /** Draws one instance of an example, with the example's text. */
    protected val draw: @Composable (instance: Properties, text: Text) -> Unit,
) {
    companion object {
        /** Every snapshot of the matrix, in every theme. The token build generates both lists. */
        @JvmStatic
        @ParameterizedRobolectricTestRunner.Parameters(name = "{0}/{1}")
        fun snapshots(): List<Array<Any>> =
            allThemes.flatMap { theme -> allSnapshots.map { snapshot -> arrayOf(theme.id, snapshot.id) } }

        /** A fixed width, so that long text wraps the same way in every run. As on the web. */
        const val WIDTH = 480
        const val PADDING = 24
        const val GAP = 16
        private const val SPECIMEN = "specimen"
    }

    private val theme = allThemes.first { it.id == themeId }
    protected val snapshot: VisualSnapshot = allSnapshots.first { it.id == snapshotId }

    /** The tokens of the snapshot's theme and color mode. */
    protected val tokens: RaincoatTokenSet get() = theme.tokens(snapshot.mode, Density.Comfortable)

    @get:Rule
    val compose = createComposeRule()

    /** The window the specimen is drawn in. */
    private var window: View? = null

    @Test
    fun `matches its baseline`() {
        // The locale and the font scale are set as the system sets them, before anything is
        // drawn: text is shaped, broken into lines, and given a fallback font for the locale,
        // and grows by the font scale as it does on a device.
        RuntimeEnvironment.setQualifiers("+b+" + snapshot.locale.replace('-', '+'))
        RuntimeEnvironment.setFontScale(snapshot.textSize.fontScale)
        assertEquals("the locale", snapshot.locale, Locale.getDefault().toLanguageTag())

        val name = "${theme.id}/$component/${snapshot.id}"
        val drawn = drawSpecimen(name)

        val files = SnapshotFiles.fromSystem()
        if (!files.compare) {
            drawn.writePng(files.local(name))
            return
        }
        val actual = files.actual(name)
        val diff = files.diff(name)
        actual.delete()
        diff.delete()
        val baseline = files.baseline(name)
        if (!baseline.isFile) {
            drawn.writePng(actual)
            throw AssertionError(
                "$name has no baseline. What was drawn is in $actual. CONTRIBUTING.md says how to accept it.",
            )
        }
        val difference = Pixels.readPng(baseline).compareWith(drawn)
        if (difference.pixels > 0) {
            drawn.writePng(actual)
            difference.image.writePng(diff)
            throw AssertionError(
                "$name: ${difference.pixels} pixels differ from the baseline. What was drawn is in $actual, " +
                    "and $diff marks the difference. CONTRIBUTING.md says how to accept it.",
            )
        }
    }

    /**
     * Draws every example of the spec, one row each, on the theme's canvas color, and returns
     * the pixels. [name] names the snapshot in a failure.
     */
    protected open fun drawSpecimen(name: String): Pixels {
        compose.setContent {
            val view = LocalView.current
            SideEffect { window = view.rootView }
            Themed {
                Column(
                    modifier = Modifier
                        .testTag(SPECIMEN)
                        .width(WIDTH.dp)
                        .background(LocalRaincoatTokens.current.color.bg.canvas.toColor())
                        .padding(PADDING.dp),
                    verticalArrangement = Arrangement.spacedBy(GAP.dp),
                ) {
                    for (example in examples) {
                        val text = textOf(example)
                        // The instances of an example side by side, wrapping onto more rows.
                        FlowRow(
                            horizontalArrangement = Arrangement.spacedBy(GAP.dp),
                            verticalArrangement = Arrangement.spacedBy(GAP.dp),
                        ) {
                            for (instance in example.instances) draw(instance, text)
                        }
                    }
                }
            }
        }
        compose.waitForIdle()

        // From a frame drawn now, so that no skipped frame is ever taken for the specimen (Capture.kt).
        val image = compose.onNodeWithTag(SPECIMEN).captureRedrawn(compose)
        // The content is as tall as it needs, up to the window. A capture shows nothing below it.
        val height = checkNotNull(window).height
        if (image.height >= height) {
            throw AssertionError("$name: the specimen is as tall as the window, $height px, so a capture cuts it off")
        }
        return image.toPixels()
    }

    /** [content] in the snapshot's theme, color mode, and layout direction. */
    @Composable
    protected fun Themed(content: @Composable () -> Unit) {
        val mode = snapshot.mode
        RaincoatTheme(
            theme = theme,
            darkTheme = mode == ColorMode.Dark || mode == ColorMode.DarkHighContrast,
            increasedContrast = mode == ColorMode.LightHighContrast || mode == ColorMode.DarkHighContrast,
            density = Density.Comfortable,
        ) {
            val direction = if (snapshot.rightToLeft) LayoutDirection.Rtl else LayoutDirection.Ltr
            CompositionLocalProvider(LocalLayoutDirection provides direction, content = content)
        }
    }

    /** The text of [example] in the snapshot's locale. */
    protected fun textOf(example: SpecExample<Properties>): Text = { content ->
        example.text[snapshot.locale]?.get(content) ?: error("${example.id}: no $content in ${snapshot.locale}")
    }

    protected fun ImageBitmap.toPixels(): Pixels =
        Pixels(width, height, IntArray(width * height)).also { readPixels(it.argb) }
}
