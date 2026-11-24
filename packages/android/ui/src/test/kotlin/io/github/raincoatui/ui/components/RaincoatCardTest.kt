package io.github.raincoatui.ui.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PixelMap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.painter.Painter
import androidx.compose.ui.graphics.toPixelMap
import androidx.compose.ui.input.InputMode
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalInputModeManager
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.semantics.getOrNull
import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.SemanticsNodeInteraction
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.assertIsFocused
import androidx.compose.ui.test.assertWidthIsEqualTo
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.click
import androidx.compose.ui.test.getUnclippedBoundsInRoot
import androidx.compose.ui.test.hasClickAction
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performKeyInput
import androidx.compose.ui.test.performMouseInput
import androidx.compose.ui.test.performTouchInput
import androidx.compose.ui.test.pressKey
import androidx.compose.ui.test.requestFocus
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import io.github.raincoatui.tokens.ColorMode
import io.github.raincoatui.tokens.Density
import io.github.raincoatui.tokens.RaincoatTokenSet
import io.github.raincoatui.tokens.TokenColor
import io.github.raincoatui.tokens.TokenFormat
import io.github.raincoatui.ui.RaincoatTheme
import io.github.raincoatui.ui.generated.allThemes
import io.github.raincoatui.ui.toColor
import kotlin.math.abs
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.ParameterizedRobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

/**
 * The Card, tested against specs/components/card/spec.yaml.
 *
 * The tests run on the JVM. They read what assistive technology is told (the semantics), drive
 * the card with touch, mouse, and keys, and draw it and read the pixels back. The screen is one
 * pixel per dp, so a measurement in pixels is a measurement in dp.
 */
@RunWith(ParameterizedRobolectricTestRunner::class)
@Config(qualifiers = "w480dp-h800dp-mdpi")
@OptIn(ExperimentalTestApi::class)
class RaincoatCardTest(themeId: String) {
    companion object {
        /** Every test runs in every theme. The token build generates the list. */
        @JvmStatic
        @ParameterizedRobolectricTestRunner.Parameters(name = "{0}")
        fun themes(): List<Array<Any>> = allThemes.map { arrayOf(it.id) }
    }

    private val theme = allThemes.first { it.id == themeId }

    @get:Rule
    val compose = createComposeRule()

    private val stage = "stage"
    private val tag = "card"
    private val stagePadding = 24
    private val longTitle = "Your order of three linen shirts and a wool scarf is on its way"

    private fun tokens(mode: ColorMode = ColorMode.Light): RaincoatTokenSet = theme.tokens(mode, Density.Comfortable)

    // The test rule takes content once, so the content is a state that a test can replace.
    private var scene by mutableStateOf<(@Composable () -> Unit)?>(null)
    private var scenes = 0

    /**
     * Shows [content] in a theme, on a stage painted with the theme's canvas color and padded to
     * leave room around the content. Each call starts from fresh state.
     */
    private fun show(
        mode: ColorMode = ColorMode.Light,
        direction: LayoutDirection = LayoutDirection.Ltr,
        keyboard: Boolean = false,
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
                    // Focus is only shown, and only taken by a click target, when a keyboard is
                    // in use.
                    val inputMode = LocalInputModeManager.current
                    SideEffect { inputMode.requestInputMode(if (keyboard) InputMode.Keyboard else InputMode.Touch) }
                    CompositionLocalProvider(LocalLayoutDirection provides direction) {
                        Box(Modifier.testTag(stage).background(canvas.toColor()).padding(stagePadding.dp)) {
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

    private fun PixelMap.has(color: TokenColor, x: Int, y: Int): Boolean {
        val pixel = this[x, y]
        val channels = listOf(pixel.red, pixel.green, pixel.blue, pixel.alpha).map { (it * 255).toInt() }
        val wanted = listOf(color.red, color.green, color.blue, color.alpha)
        return channels.zip(wanted).all { (actual, expected) -> abs(actual - expected) <= 1 }
    }

    private fun assertPainted(where: String, expected: TokenColor, pixels: PixelMap, x: Int, y: Int) {
        val found = pixels[x, y].let { listOf(it.red, it.green, it.blue).map { channel -> (channel * 255).toInt() } }
        assertTrue("$where: expected ${TokenFormat.color(expected)} at ($x, $y), found rgb$found", pixels.has(expected, x, y))
    }

    /** Whether nothing is drawn here: the stage's canvas color shows. */
    private fun PixelMap.isClear(x: Int, y: Int): Boolean = has(canvas, x, y)

    /** A painter in one color that fills its bounds: a picture that is easy to find in a drawing. */
    private class Block(private val color: Color) : Painter() {
        override val intrinsicSize: Size = Size.Unspecified

        override fun DrawScope.onDraw() {
            drawRect(color)
        }
    }

    private val magenta = TokenColor(0xFFFF00FF)

    private val isButton = SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Button)
    private val isHeading = SemanticsMatcher.keyIsDefined(SemanticsProperties.Heading)

    /** A static card with a title and a body. */
    @Composable
    private fun Storage(modifier: Modifier = Modifier, footer: (@Composable () -> Unit)? = null) {
        RaincoatCard("Storage", level = 3, modifier = modifier.testTag(tag), footer = footer) {
            RaincoatText("4.2 GB of 15 GB used", color = io.github.raincoatui.tokens.TextColor.Muted)
        }
    }

    /** An interactive card with media, a title, and a body. */
    @Composable
    private fun Order(onClick: () -> Unit, title: String = "Order 1042") {
        RaincoatCard(
            title = title,
            level = 3,
            modifier = Modifier.testTag(tag),
            onClick = onClick,
            media = {
                Image(
                    Block(magenta.toColor()),
                    contentDescription = "A parcel at a front door",
                    modifier = Modifier.fillMaxWidth().height(40.dp),
                    contentScale = ContentScale.FillBounds,
                )
            },
        ) {
            RaincoatText("Delivered on Monday")
        }
    }

    // Semantics and activation

    @Test
    fun `a static card takes no clicks, and its title is a heading read before the rest`() {
        show { Storage() }
        compose.onNodeWithText("Storage").assert(isHeading)
        compose.onAllNodes(hasClickAction()).assertCountEquals(0)
        val card = compose.onNodeWithTag(tag).fetchSemanticsNode().config
        assertEquals("the card's parts are read together", true, card.getOrNull(SemanticsProperties.IsTraversalGroup))
        val title = compose.onNodeWithText("Storage").fetchSemanticsNode().config
        assertEquals("the title is read first", -1f, title.getOrNull(SemanticsProperties.TraversalIndex))
    }

    @Test
    fun `an interactive card is one button named by its title, with the rest read after it`() {
        show { Order(onClick = {}) }
        compose.onAllNodes(hasClickAction()).assertCountEquals(1)
        val card = compose.onNode(hasClickAction()).assert(isButton).fetchSemanticsNode().config
        assertEquals(
            "the title first, then the body",
            listOf("Order 1042", "Delivered on Monday"),
            card.getOrNull(SemanticsProperties.Text)?.map { it.text },
        )
        assertEquals(
            "the media's description, from the app",
            listOf("A parcel at a front door"),
            card.getOrNull(SemanticsProperties.ContentDescription),
        )
        // The title is still a heading inside it.
        compose.onNodeWithText("Order 1042", useUnmergedTree = true).assert(isHeading)
    }

    @Test
    fun `a touch anywhere on an interactive card, Enter, and Space activate it`() {
        var clicks = 0
        show(keyboard = true) { Order(onClick = { clicks++ }) }
        val node = compose.onNodeWithTag(tag)
        val size = node.fetchSemanticsNode().size
        // On the media, on the body, and in the corner of the padding.
        val points = listOf(
            Offset(size.width / 2f, 20f),
            Offset(size.width / 2f, size.height - 20f),
            Offset(size.width - 3f, size.height - 3f),
        )
        for ((index, point) in points.withIndex()) {
            node.performTouchInput { click(point) }
            assertEquals("a touch at $point", index + 1, clicks)
        }
        node.requestFocus().assertIsFocused()
        node.performKeyInput { pressKey(Key.Enter) }
        assertEquals("Enter", points.size + 1, clicks)
        node.performKeyInput { pressKey(Key.Spacebar) }
        assertEquals("Space", points.size + 2, clicks)
    }

    // Colors

    @Test
    fun `a static card is painted with its tokens, and does not respond to a touch or a pointer`() {
        for (mode in ColorMode.entries) {
            val card = tokens(mode).card
            show(mode) { Storage() }
            val node = compose.onNodeWithTag(tag)
            val middle = node.pixels().height / 2
            val rest = node.pixels()
            assertPainted("outline in ${mode.id}", card.border.default, rest, 0, middle)
            assertPainted("fill in ${mode.id}", card.bg.default, rest, 3, middle)

            node.performTouchInput { down(Offset(3f, middle.toFloat())) }
            compose.mainClock.advanceTimeBy(500)
            assertPainted("fill when touched, in ${mode.id}", card.bg.default, node.pixels(), 3, middle)
            node.performTouchInput { up() }
            node.performMouseInput { enter(Offset(3f, middle.toFloat())) }
            compose.mainClock.advanceTimeBy(500)
            assertPainted("outline under a pointer, in ${mode.id}", card.border.default, node.pixels(), 0, middle)
            node.performMouseInput { exit(Offset(-100f, -100f)) }
        }
    }

    @Test
    fun `an interactive card is painted with its tokens at rest, pressed, and hovered`() {
        for (mode in ColorMode.entries) {
            val card = tokens(mode).card
            show(mode) { Order(onClick = {}) }
            val node = compose.onNodeWithTag(tag)
            val pixels = node.pixels()
            // In the body, below the media, beside the outline.
            val y = pixels.height - 10
            val where = "in ${mode.id}"
            assertPainted("outline at rest, $where", card.border.default, pixels, 0, y)
            assertPainted("fill at rest, $where", card.bg.default, pixels, 3, y)

            node.performTouchInput { down(Offset(3f, y.toFloat())) }
            compose.mainClock.advanceTimeBy(500)
            assertPainted("outline when pressed, $where", card.border.hover, node.pixels(), 0, y)
            assertPainted("fill when pressed, $where", card.bg.pressed, node.pixels(), 3, y)
            node.performTouchInput { up() }

            node.performMouseInput { enter(Offset(3f, y.toFloat())) }
            compose.mainClock.advanceTimeBy(500)
            assertPainted("outline under a pointer, $where", card.border.hover, node.pixels(), 0, y)
            assertPainted("fill under a pointer, $where", card.bg.default, node.pixels(), 3, y)
            // Leave by moving well away, or the next card would appear under the pointer and be
            // hovered from the start.
            node.performMouseInput { exit(Offset(-100f, -100f)) }
        }
    }

    @Test
    fun `keyboard focus draws the focus ring around the whole card, with a gap`() {
        val card = tokens().card
        show(keyboard = true) { Order(onClick = {}) }
        val left = stagePadding
        val middle = compose.onNodeWithTag(stage).pixels().height / 2
        val gap = card.focusRing.offset.toInt()
        val width = card.focusRing.width.toInt()

        val before = compose.onNodeWithTag(stage).pixels()
        assertTrue("no ring before focus", before.isClear(left - gap - 1, middle))

        compose.onNodeWithTag(tag).requestFocus().assertIsFocused()
        val focused = compose.onNodeWithTag(stage).pixels()
        // From the card's edge outward: the gap, then the ring, then nothing.
        assertTrue("the gap", focused.isClear(left - 1, middle))
        assertTrue("the ring", focused.has(card.focusRing.color, left - gap - 1, middle))
        assertTrue("the ring", focused.has(card.focusRing.color, left - gap - width, middle))
        assertTrue("past the ring", focused.isClear(left - gap - width - 1, middle))
    }

    // Layout

    @Test
    fun `a card fills the width it is given, with its parts inside the padding, the gap apart`() {
        val card = tokens().card
        show { Box(Modifier.width(300.dp)) { Storage() } }
        compose.onNodeWithTag(tag).assertWidthIsEqualTo(300.dp)
        val box = compose.onNodeWithTag(tag).getUnclippedBoundsInRoot()
        val title = compose.onNodeWithText("Storage").getUnclippedBoundsInRoot()
        val body = compose.onNodeWithText("4.2 GB of 15 GB used").getUnclippedBoundsInRoot()
        // The padding is inside the outline.
        val inset = card.border.width + card.padding
        assertEquals("title from the top", inset, (title.top - box.top).value.toDouble(), 0.5)
        assertEquals("title from the start", inset, (title.left - box.left).value.toDouble(), 0.5)
        assertEquals("body below the title", card.gap, (body.top - title.bottom).value.toDouble(), 0.5)
        assertEquals("padding below the body", inset, (box.bottom - body.bottom).value.toDouble(), 0.5)
    }

    @Test
    fun `the media is at the top, edge to edge inside the outline, and the title the gap below it`() {
        val card = tokens().card
        show { Box(Modifier.width(300.dp)) { Order(onClick = {}) } }
        val pixels = compose.onNodeWithTag(tag).pixels()
        val border = card.border.width.toInt()
        val across = (0 until pixels.width).filter { pixels.has(magenta, it, 20) }
        assertEquals("from the start outline", border, across.first())
        assertEquals("to the end outline", pixels.width - 1 - border, across.last())
        val down = (0 until pixels.height).filter { pixels.has(magenta, pixels.width / 2, it) }
        assertEquals("from the top outline", border, down.first())
        assertEquals("40 tall", 39, down.last())

        val box = compose.onNodeWithTag(tag).getUnclippedBoundsInRoot()
        val title = compose.onNodeWithText("Order 1042", useUnmergedTree = true).getUnclippedBoundsInRoot()
        assertEquals("the title, the gap below the media", 40 + card.gap, (title.top - box.top).value.toDouble(), 0.5)
    }

    @Test
    fun `a long title wraps and the card grows taller`() {
        val sm = tokens().type.heading.sm
        show { Box(Modifier.width(220.dp)) { Order(onClick = {}) } }
        val short = compose.onNodeWithTag(tag).fetchSemanticsNode().size.height
        show { Box(Modifier.width(220.dp)) { Order(onClick = {}, title = longTitle) } }
        val long = compose.onNodeWithTag(tag).fetchSemanticsNode().size.height
        assertTrue("$long against $short", long - short > 1.5 * sm.lineHeight * sm.size)
        compose.onNodeWithTag(tag).assertWidthIsEqualTo(220.dp)
    }

    @Test
    fun `footer actions sit at the end edge, and move to another row when they do not fit`() {
        val card = tokens().card
        val inset = (card.border.width + card.padding).toFloat()
        for (direction in LayoutDirection.entries) {
            show(direction = direction) {
                Box(Modifier.width(300.dp)) {
                    Storage(footer = { Box(Modifier.size(40.dp, 20.dp).testTag("action")) })
                }
            }
            val box = compose.onNodeWithTag(tag).getUnclippedBoundsInRoot()
            val action = compose.onNodeWithTag("action").getUnclippedBoundsInRoot()
            if (direction == LayoutDirection.Ltr) {
                assertEquals("on the right", inset, (box.right - action.right).value, 0.5f)
            } else {
                assertEquals("on the left", inset, (action.left - box.left).value, 0.5f)
            }
        }

        show {
            Box(Modifier.width(220.dp)) {
                Storage(
                    footer = {
                        Box(Modifier.size(120.dp, 20.dp).testTag("first"))
                        Box(Modifier.size(120.dp, 20.dp).testTag("second"))
                    },
                )
            }
        }
        val first = compose.onNodeWithTag("first").getUnclippedBoundsInRoot()
        val second = compose.onNodeWithTag("second").getUnclippedBoundsInRoot()
        assertEquals("one under the other, the gap apart", card.gap, (second.top - first.bottom).value.toDouble(), 0.5)
    }

    @Test
    fun `the card grows with the font size setting`() {
        val set = tokens()
        RuntimeEnvironment.setFontScale(2f)
        show { Storage() }
        val height = compose.onNodeWithTag(tag).fetchSemanticsNode().size.height
        // The padding and the gap stay as they are, and the lines of text grow.
        val lines = set.type.heading.sm.let { it.lineHeight * it.size } + set.type.body.md.let { it.lineHeight * it.size }
        val fixed = 2 * (set.card.border.width + set.card.padding) + set.card.gap
        assertTrue("height $height", height > fixed + 1.5 * lines)
        // Nothing is cut off: the title and the body are inside the card.
        val box = compose.onNodeWithTag(tag).getUnclippedBoundsInRoot()
        for (text in listOf("Storage", "4.2 GB of 15 GB used")) {
            val bounds = compose.onAllNodesWithText(text)[0].getUnclippedBoundsInRoot()
            assertTrue("$text inside the card", bounds.bottom <= box.bottom && bounds.top >= box.top)
        }
    }
}
