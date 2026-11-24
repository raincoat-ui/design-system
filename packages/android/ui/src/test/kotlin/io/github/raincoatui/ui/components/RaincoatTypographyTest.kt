package io.github.raincoatui.ui.components

import android.content.res.Configuration
import android.text.BidiFormatter
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.PixelMap
import androidx.compose.ui.graphics.toPixelMap
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.SemanticsNodeInteraction
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.assertTextEquals
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performSemanticsAction
import androidx.compose.ui.text.TextLayoutResult
import androidx.compose.ui.text.style.ResolvedTextDirection
import androidx.compose.ui.unit.Density as ComposeDensity
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.github.raincoatui.tokens.ColorMode
import io.github.raincoatui.tokens.Density
import io.github.raincoatui.tokens.HeadingColor
import io.github.raincoatui.tokens.HeadingVariant
import io.github.raincoatui.tokens.RaincoatTokenSet
import io.github.raincoatui.tokens.TextColor
import io.github.raincoatui.tokens.TextVariant
import io.github.raincoatui.tokens.TokenColor
import io.github.raincoatui.tokens.TokenTextStyle
import io.github.raincoatui.ui.RaincoatTheme
import io.github.raincoatui.ui.generated.allThemes
import io.github.raincoatui.ui.toColor
import kotlin.math.abs
import kotlin.math.ceil
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.ParameterizedRobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

/**
 * Text and Heading, tested against specs/components/typography/spec.yaml.
 *
 * The tests run on the JVM. They read what assistive technology is told (the semantics), and
 * draw the text and read the pixels back. The screen is one pixel per dp, so a measurement in
 * pixels is a measurement in dp.
 */
@RunWith(ParameterizedRobolectricTestRunner::class)
@Config(qualifiers = "w480dp-h800dp-mdpi")
class RaincoatTypographyTest(themeId: String) {
    companion object {
        /** Every test runs in every theme. The token build generates the list. */
        @JvmStatic
        @ParameterizedRobolectricTestRunner.Parameters(name = "{0}")
        fun themes(): List<Array<Any>> = allThemes.map { arrayOf(it.id) }
    }

    private val theme = allThemes.first { it.id == themeId }

    @get:Rule
    val compose = createComposeRule()

    private val paragraph =
        "Your files are kept on this device and in the cloud. Changes made on one device reach the others " +
            "the next time they connect."
    private val longHeading = "Notifications for comments, mentions, and changes to shared documents"

    private fun tokens(mode: ColorMode = ColorMode.Light): RaincoatTokenSet = theme.tokens(mode, Density.Comfortable)

    // The test rule takes content once, so the content is a state that a test can replace.
    private var scene by mutableStateOf<(@Composable () -> Unit)?>(null)
    private var scenes = 0

    /** Shows [content] in a theme, on a stage painted with the theme's canvas color. */
    private fun show(
        mode: ColorMode = ColorMode.Light,
        direction: LayoutDirection = LayoutDirection.Ltr,
        content: @Composable () -> Unit,
    ) {
        canvas = tokens(mode).color.bg.canvas
        val number = ++scenes
        scene = {
            key(number) {
                RaincoatTheme(
                    theme = this.theme,
                    darkTheme = mode == ColorMode.Dark || mode == ColorMode.DarkHighContrast,
                    increasedContrast = mode == ColorMode.LightHighContrast || mode == ColorMode.DarkHighContrast,
                ) {
                    CompositionLocalProvider(LocalLayoutDirection provides direction) {
                        Box(Modifier.testTag("stage").background(canvas.toColor()).padding(24.dp)) {
                            content()
                        }
                    }
                }
            }
        }
        if (number == 1) compose.setContent { scene?.invoke() }
        compose.waitForIdle()
    }

    /** The color behind the content of the current scene. */
    private var canvas: TokenColor = tokens().color.bg.canvas

    private fun SemanticsNodeInteraction.pixels(): PixelMap = captureToImage().toPixelMap()

    private fun SemanticsNodeInteraction.height(): Int = fetchSemanticsNode().size.height

    private fun PixelMap.has(color: TokenColor, x: Int, y: Int): Boolean {
        val pixel = this[x, y]
        val channels = listOf(pixel.red, pixel.green, pixel.blue, pixel.alpha).map { (it * 255).toInt() }
        val wanted = listOf(color.red, color.green, color.blue, color.alpha)
        return channels.zip(wanted).all { (actual, expected) -> abs(actual - expected) <= 1 }
    }

    /** Whether this color appears anywhere. */
    private fun PixelMap.contains(color: TokenColor): Boolean =
        (0 until width).any { x -> (0 until height).any { y -> has(color, x, y) } }

    /** The height of one line of a style at the default font size, in dp. */
    private fun line(style: TokenTextStyle): Double = style.lineHeight * style.size

    private val isHeading = SemanticsMatcher.keyIsDefined(SemanticsProperties.Heading)
    private val isNotHeading = SemanticsMatcher.keyNotDefined(SemanticsProperties.Heading)

    // Semantics

    @Test
    fun `a heading is a heading to assistive technology, and text is text`() {
        show {
            Column {
                RaincoatHeading("Settings", level = 1)
                RaincoatText("Synced 2 minutes ago", variant = TextVariant.Caption, color = TextColor.Muted)
            }
        }
        compose.onNodeWithText("Settings").assert(isHeading)
        compose.onNodeWithText("Synced 2 minutes ago").assert(isNotHeading)
    }

    @Test
    fun `every level is a heading, in the look its level gives unless a variant is given`() {
        val heading = tokens().type.heading
        val looks = listOf(heading.xl, heading.lg, heading.md, heading.sm, heading.sm, heading.sm)
        for ((index, style) in looks.withIndex()) {
            val level = index + 1
            show { RaincoatHeading("Notifications", level = level) }
            val node = compose.onNodeWithText("Notifications").assert(isHeading)
            assertEquals("level $level", line(style), node.height().toDouble(), 1.0)
        }
        show { RaincoatHeading("Recent files", level = 1, variant = HeadingVariant.HeadingSm) }
        val node = compose.onNodeWithText("Recent files").assert(isHeading)
        assertEquals("level 1 in heading-sm", line(heading.sm), node.height().toDouble(), 1.0)
    }

    // Text styles and colors

    @Test
    fun `one line of each text style is as tall as its line height`() {
        val type = tokens().type
        val styles = mapOf(
            TextVariant.BodyLg to type.body.lg,
            TextVariant.BodyMd to type.body.md,
            TextVariant.BodySm to type.body.sm,
            TextVariant.LabelLg to type.label.lg,
            TextVariant.LabelMd to type.label.md,
            TextVariant.LabelSm to type.label.sm,
            TextVariant.Caption to type.caption,
        )
        assertEquals(TextVariant.entries.toSet(), styles.keys)
        for ((variant, style) in styles) {
            show { RaincoatText("Synced 2 minutes ago", variant = variant) }
            val node = compose.onNodeWithText("Synced 2 minutes ago")
            assertEquals("$variant", line(style), node.height().toDouble(), 1.0)
        }
    }

    @Test
    fun `each color is painted with its text role`() {
        for (mode in ColorMode.entries) {
            val fg = tokens(mode).color.fg
            val colors = mapOf(TextColor.Default to fg.default, TextColor.Muted to fg.muted, TextColor.Danger to fg.danger)
            for ((color, token) in colors) {
                show(mode) { RaincoatText("Settings", variant = TextVariant.LabelLg, color = color) }
                assertTrue("$color in ${mode.id}", compose.onNodeWithText("Settings").pixels().contains(token))
            }
            val headings = mapOf(HeadingColor.Default to fg.default, HeadingColor.Muted to fg.muted)
            for ((color, token) in headings) {
                show(mode) { RaincoatHeading("Settings", level = 2, color = color) }
                assertTrue("heading in $color, ${mode.id}", compose.onNodeWithText("Settings").pixels().contains(token))
            }
        }
    }

    // Long text and truncation

    @Test
    fun `max lines cuts text short after that many lines, and it is read in full`() {
        val md = tokens().type.body.md
        show {
            Column(Modifier.width(220.dp)) {
                RaincoatText(paragraph, Modifier.testTag("two"), maxLines = 2)
                RaincoatText(paragraph, Modifier.testTag("whole"))
            }
        }
        assertEquals("two lines", 2 * line(md), compose.onNodeWithTag("two").height().toDouble(), 2.0)
        val whole = compose.onNodeWithTag("whole").height()
        assertTrue("the whole text is $whole high", whole > 3 * line(md))
        // Assistive technology is given the whole text.
        compose.onNodeWithTag("two").assertTextEquals(paragraph)
    }

    @Test
    fun `a long heading wraps and is never cut short`() {
        val xl = tokens().type.heading.xl
        show { Box(Modifier.width(240.dp)) { RaincoatHeading(longHeading, level = 1) } }
        val node = compose.onNodeWithText(longHeading).assert(isHeading)
        assertTrue("height ${node.height()}", node.height() > 2.5 * xl.lineHeight * xl.size)
        val width = node.fetchSemanticsNode().size.width
        assertTrue("the heading is $width wide", width <= 240)
    }

    @Test
    fun `text and headings grow with the font size setting, and wrap rather than overflow`() {
        val type = tokens().type
        RuntimeEnvironment.setFontScale(2f)
        show {
            Column(Modifier.width(300.dp)) {
                RaincoatHeading(longHeading, level = 1)
                RaincoatText("Synced 2 minutes ago", variant = TextVariant.Caption)
            }
        }
        // Android's font scaling is not linear: at 2.0 it doubles small text and enlarges large
        // text by less, as the spec says (a 32sp heading becomes about 40dp). So ask it for the
        // sizes. The line height stays a multiple of the font size.
        val (scaledHeading, scaledCaption) = with(compose.density) {
            type.heading.xl.lineHeight * type.heading.xl.size.sp.toPx() to
                type.caption.lineHeight * type.caption.size.sp.toPx()
        }
        val headingGrowth = scaledHeading / line(type.heading.xl)
        val captionGrowth = scaledCaption / line(type.caption)
        assertTrue("the heading's line grows by $headingGrowth", headingGrowth > 1.1)
        assertTrue("the caption's line grows by $captionGrowth", captionGrowth > 1.5)
        assertTrue(
            "a large heading grows less than a caption: $headingGrowth and $captionGrowth",
            headingGrowth < captionGrowth,
        )

        // One line of the caption, at its scaled line height.
        val caption = compose.onNodeWithText("Synced 2 minutes ago")
        assertEquals("caption height", ceil(scaledCaption), caption.height().toDouble(), 1.0)
        // The heading wraps: whole lines, more than two of them, inside the width.
        val heading = compose.onNodeWithText(longHeading)
        val lines = heading.height() / scaledHeading
        assertTrue("the heading has $lines lines", lines > 2.5)
        assertEquals("the heading has $lines lines", Math.round(lines).toDouble(), lines, 0.05)
        val width = heading.fetchSemanticsNode().size.width
        assertTrue("the heading is $width wide", width <= 300)
    }

    /** How the text of a node was laid out, as assistive technology can ask for it. */
    private fun layoutOf(text: String): TextLayoutResult {
        val results = mutableListOf<TextLayoutResult>()
        compose.onNodeWithText(text).performSemanticsAction(SemanticsActions.GetTextLayoutResult) { it(results) }
        return results.single()
    }

    @Test
    fun `text starts on the side where reading starts`() {
        // English in a left-to-right layout, and Arabic in a right-to-left one.
        val cases = mapOf(LayoutDirection.Ltr to "Settings", LayoutDirection.Rtl to "الإعدادات")
        for ((direction, words) in cases) {
            show(direction = direction) {
                Box(Modifier.width(300.dp)) {
                    RaincoatText(words, Modifier.fillMaxWidth(), variant = TextVariant.LabelLg)
                }
            }
            val layout = layoutOf(words)
            if (direction == LayoutDirection.Ltr) {
                assertEquals("$words", ResolvedTextDirection.Ltr, layout.getParagraphDirection(0))
                assertEquals("$words starts at", 0f, layout.getLineLeft(0), 1f)
                assertTrue("$words ends at ${layout.getLineRight(0)}", layout.getLineRight(0) < 150f)
            } else {
                assertEquals("$words", ResolvedTextDirection.Rtl, layout.getParagraphDirection(0))
                assertEquals("$words starts at", 300f, layout.getLineRight(0), 1f)
                assertTrue("$words ends at ${layout.getLineLeft(0)}", layout.getLineLeft(0) > 150f)
            }
        }
    }

    @Test
    fun `text from a person takes its direction from its first strong character`() {
        val name = "مريم الحسيني"
        show {
            Column {
                RaincoatText(name)
                RaincoatText("Message from $name")
            }
        }
        // In a left-to-right layout, a name in Arabic is a right-to-left paragraph, and a
        // sentence in English with the name in it stays left to right.
        assertEquals("the name", ResolvedTextDirection.Rtl, layoutOf(name).getParagraphDirection(0))
        assertEquals(
            "the sentence",
            ResolvedTextDirection.Ltr,
            layoutOf("Message from $name").getParagraphDirection(0),
        )
    }

    @Test
    fun `a name inside a sentence keeps its own direction only when the app isolates it`() {
        val name = "مريم الحسيني"
        // As an app builds it with stringResource(R.string.message_from, name), and with the name
        // between U+2068 FIRST STRONG ISOLATE and U+2069 POP DIRECTIONAL ISOLATE, as the
        // guidelines ask.
        val joined = "Message from $name, 2 minutes ago"
        val isolated = "Message from ⁨$name⁩, 2 minutes ago"
        val wrapped = "Message from ${BidiFormatter.getInstance().unicodeWrap(name)}, 2 minutes ago"
        show {
            Column {
                RaincoatText(joined)
                RaincoatText(isolated)
                RaincoatText(wrapped)
            }
        }
        /** Where the name and the number after it are drawn, from the left. */
        fun positions(text: String): Pair<ClosedFloatingPointRange<Float>, Float> {
            val layout = layoutOf(text)
            val start = text.indexOf(name)
            val boxes = (start until start + name.length).map(layout::getBoundingBox)
            val number = layout.getBoundingBox(text.indexOf('2'))
            return boxes.minOf { it.left }..boxes.maxOf { it.right } to number.left
        }
        // Joined, the comma and the number take the direction of the name before them, and the
        // number is drawn on the name's left: "Message from 2 ,<name> minutes ago".
        val (joinedName, joinedNumber) = positions(joined)
        assertTrue("joined: the 2 at $joinedNumber, the name at $joinedName", joinedNumber < joinedName.start)
        // Isolated, or wrapped by BidiFormatter, the sentence reads in order.
        for ((how, text) in listOf("isolated" to isolated, "wrapped" to wrapped)) {
            val (namePosition, number) = positions(text)
            assertTrue("$how: the 2 at $number, the name at $namePosition", number > namePosition.endInclusive)
        }
    }

    @Test
    fun `a Korean heading breaks only between whole words`() {
        RuntimeEnvironment.setQualifiers("+b+ko")
        val heading = "댓글, 멘션 및 공유 문서 변경 사항에 대한 알림"
        // At every width, each line ends at a space: no word is split.
        for (width in 120..320 step 25) {
            show { Box(Modifier.width(width.dp)) { RaincoatHeading(heading, level = 2) } }
            val layout = layoutOf(heading)
            assertTrue("the heading wraps at $width", layout.lineCount > 1)
            for (line in 0 until layout.lineCount - 1) {
                val end = layout.getLineEnd(line)
                assertTrue(
                    "line ${line + 1} of ${layout.lineCount} at $width ends with \"${heading.substring(0, end)}\"",
                    heading[end - 1] == ' ',
                )
            }
        }
    }

    @Test
    fun `a heading is never smaller than the heading one level below it, at any font scale`() {
        // Android enlarges large text less than small text, on a curve of its own. Each font
        // scale is drawn with the density a device at that setting has, curve included.
        val context = RuntimeEnvironment.getApplication()
        for (scale in listOf(1f, 1.15f, 1.3f, 1.5f, 1.8f, 2f)) {
            val configuration = Configuration(context.resources.configuration).apply { fontScale = scale }
            val density = ComposeDensity(context.createConfigurationContext(configuration))
            show {
                CompositionLocalProvider(LocalDensity provides density) {
                    Column {
                        for (level in 1..4) RaincoatHeading("Aa", level = level, modifier = Modifier.testTag("level $level"))
                    }
                }
            }
            val heights = (1..4).map { compose.onNodeWithTag("level $it").height() }
            for ((index, pair) in heights.zipWithNext().withIndex()) {
                assertTrue(
                    "at font scale $scale, level ${index + 1} and ${index + 2} are ${pair.first} and ${pair.second} high",
                    pair.first >= pair.second,
                )
            }
        }
    }
}
