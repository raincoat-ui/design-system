package io.github.raincoatui.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.text.BasicText
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
import androidx.compose.ui.test.assertHeightIsEqualTo
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsFocused
import androidx.compose.ui.test.assertIsNotSelected
import androidx.compose.ui.test.assertIsSelected
import androidx.compose.ui.test.assertTouchHeightIsEqualTo
import androidx.compose.ui.test.click
import androidx.compose.ui.test.getUnclippedBoundsInRoot
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performKeyInput
import androidx.compose.ui.test.performMouseInput
import androidx.compose.ui.test.performTouchInput
import androidx.compose.ui.test.pressKey
import androidx.compose.ui.test.requestFocus
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.github.raincoatui.tokens.ColorMode
import io.github.raincoatui.tokens.Density
import io.github.raincoatui.tokens.RaincoatTokenSet
import io.github.raincoatui.tokens.TokenColor
import io.github.raincoatui.tokens.TokenFormat
import io.github.raincoatui.ui.RaincoatTheme
import io.github.raincoatui.ui.captureRedrawn
import io.github.raincoatui.ui.generated.allThemes
import io.github.raincoatui.ui.toColor
import kotlin.math.ceil
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.ParameterizedRobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

/**
 * The Tabs, tested against specs/components/tabs/spec.yaml.
 *
 * The tests run on the JVM. They read what assistive technology is told (the semantics), drive
 * the tabs with touch, mouse, and keys, and draw them and read the pixels back. The screen is
 * one pixel per dp, so a measurement in pixels is a measurement in dp.
 */
@RunWith(ParameterizedRobolectricTestRunner::class)
@Config(qualifiers = "w480dp-h800dp-mdpi")
@OptIn(ExperimentalTestApi::class)
class RaincoatTabsTest(themeId: String) {
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
    private val row = "tabs"
    private val stagePadding = 24

    private fun tokens(mode: ColorMode = ColorMode.Light, density: Density = Density.Comfortable): RaincoatTokenSet =
        theme.tokens(mode, density)

    // The test rule takes content once, so the content is a state that a test can replace.
    private var scene by mutableStateOf<(@Composable () -> Unit)?>(null)
    private var scenes = 0

    /**
     * Shows [content] in a theme, on a stage painted with the theme's canvas color and padded to
     * leave room around the content. Each call starts from fresh state.
     */
    private fun show(
        mode: ColorMode = ColorMode.Light,
        density: Density = Density.Comfortable,
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
                    density = density,
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

    private fun SemanticsNodeInteraction.pixels(): PixelMap = captureRedrawn(compose).toPixelMap()

    private fun PixelMap.has(color: TokenColor, x: Int, y: Int): Boolean {
        val pixel = this[x, y]
        val channels = listOf(pixel.red, pixel.green, pixel.blue, pixel.alpha).map { (it * 255).toInt() }
        val wanted = listOf(color.red, color.green, color.blue, color.alpha)
        return channels.zip(wanted).all { (actual, expected) -> kotlin.math.abs(actual - expected) <= 1 }
    }

    private fun assertPainted(where: String, expected: TokenColor, pixels: PixelMap, x: Int, y: Int) {
        val found = pixels[x, y].let { listOf(it.red, it.green, it.blue).map { channel -> (channel * 255).toInt() } }
        assertTrue("$where: expected ${TokenFormat.color(expected)} at ($x, $y), found rgb$found", pixels.has(expected, x, y))
    }

    /** Whether nothing is drawn here: the stage's canvas color shows. */
    private fun PixelMap.isClear(x: Int, y: Int): Boolean = has(canvas, x, y)

    /** The columns in which a color fills at least [rows] pixels. */
    private fun PixelMap.columnsFilledWith(color: TokenColor, rows: Int): List<Int> =
        (0 until width).filter { x -> (0 until height).count { y -> has(color, x, y) } >= rows }

    /** A painter that fills its bounds: an icon that is easy to find in a drawing. */
    private object Block : Painter() {
        override val intrinsicSize: Size = Size.Unspecified

        override fun DrawScope.onDraw() {
            drawRect(Color.Black)
        }
    }

    private val isTab = SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Tab)
    private val isGroup = SemanticsMatcher.keyIsDefined(SemanticsProperties.SelectableGroup)

    private val product = listOf(
        RaincoatTab("details", "Details"),
        RaincoatTab("reviews", "Reviews"),
        RaincoatTab("shipping", "Shipping"),
    )
    private val panels = mapOf(
        "details" to "Made of waxed cotton.",
        "reviews" to "Rated 4 of 5.",
        "shipping" to "Ships in two days.",
    )

    /** The product's tabs, keeping their own selection, with a panel of text. */
    @Composable
    private fun Product(initialSelection: String = "details", onSelect: (String) -> Unit = {}) {
        RaincoatTabs(
            tabs = product,
            modifier = Modifier.testTag(row),
            initialSelection = initialSelection,
            onSelect = onSelect,
        ) { section -> BasicText(panels.getValue(section)) }
    }

    private fun tab(name: String): SemanticsNodeInteraction = compose.onNodeWithText(name)

    /** The width a node is laid out at, including any part scrolled out of view. */
    private fun widthOf(node: SemanticsNodeInteraction): Dp = node.getUnclippedBoundsInRoot().let { it.right - it.left }

    // Semantics and selection

    @Test
    fun `each tab is a tab named by its label in a selectable group, and the selected one is selected`() {
        show { Product() }
        tab("Details").assert(isTab).assertIsSelected()
        tab("Reviews").assert(isTab).assertIsNotSelected()
        tab("Shipping").assert(isTab).assertIsNotSelected()
        // The row is the group the tabs are selected in.
        val group = compose.onNode(isGroup).fetchSemanticsNode()
        val names = group.children.mapNotNull { it.config.getOrNull(SemanticsProperties.Text)?.joinToString() }
        assertEquals(listOf("Details", "Reviews", "Shipping"), names)
    }

    @Test
    fun `a click selects a tab and shows its panel in place of the other`() {
        val selected = mutableListOf<String>()
        show { Product(onSelect = { selected += it }) }
        compose.onNodeWithText("Made of waxed cotton.").assertIsDisplayed()
        tab("Reviews").performClick()
        tab("Reviews").assertIsSelected()
        tab("Details").assertIsNotSelected()
        compose.onNodeWithText("Rated 4 of 5.").assertIsDisplayed()
        compose.onNodeWithText("Made of waxed cotton.").assertDoesNotExist()
        assertEquals(listOf("reviews"), selected)
    }

    @Test
    fun `the app can control the selection`() {
        var selected by mutableStateOf("reviews")
        val asked = mutableListOf<String>()
        show {
            RaincoatTabs(product, selected = selected, onSelect = { asked += it }) { section ->
                BasicText(panels.getValue(section))
            }
        }
        tab("Shipping").performClick()
        assertEquals(listOf("shipping"), asked)
        // The app has not changed its selection, so the tab stays as it was.
        tab("Reviews").assertIsSelected()
        selected = "shipping"
        compose.waitForIdle()
        tab("Shipping").assertIsSelected()
        compose.onNodeWithText("Ships in two days.").assertIsDisplayed()
    }

    @Test
    fun `a tab with only an icon is named by its description, and an icon beside a label is not named`() {
        show {
            RaincoatTabs(
                listOf(
                    RaincoatTab("list", Block, contentDescription = "List"),
                    RaincoatTab("grid", "Grid", icon = Block),
                ),
            ) { }
        }
        compose.onNodeWithContentDescription("List").assert(isTab).assertIsSelected()
        val config = tab("Grid").fetchSemanticsNode().config
        assertNull(config.getOrNull(SemanticsProperties.ContentDescription))
    }

    @Test
    fun `a keyboard moves focus with Tab, and Enter or Space selects`() {
        show(keyboard = true) { Product() }
        tab("Details").requestFocus().assertIsFocused()
        tab("Details").performKeyInput { pressKey(Key.Tab) }
        tab("Reviews").assertIsFocused().assertIsNotSelected()
        tab("Reviews").performKeyInput { pressKey(Key.Enter) }
        tab("Reviews").assertIsSelected()
        tab("Reviews").performKeyInput { pressKey(Key.Tab) }
        tab("Shipping").assertIsFocused()
        tab("Shipping").performKeyInput { pressKey(Key.Spacebar) }
        tab("Shipping").assertIsSelected()
        compose.onNodeWithText("Ships in two days.").assertIsDisplayed()
    }

    // Colors

    @Test
    fun `a tab is painted with its tokens, at rest, selected, pressed, and hovered`() {
        for (mode in ColorMode.entries) {
            val tabs = tokens(mode).tabs
            val where = mode.id
            show(mode) { Product() }

            val details = tab("Details").pixels()
            val reviews = tab("Reviews").pixels()
            val middle = reviews.height / 2
            // At rest a tab has no fill; the selected one has the indicator along its bottom edge.
            assertTrue(where, reviews.isClear(3, middle))
            // Under a tab that is not selected, the row's hairline shows.
            assertPainted("$where, hairline", tabs.divider.color, reviews, 3, reviews.height - 1)
            assertTrue(where, details.isClear(3, middle))
            for (y in details.height - tabs.indicator.width.toInt() until details.height) {
                assertPainted("$where, indicator", tabs.indicator.color, details, 3, y)
            }
            assertTrue(where, details.isClear(3, details.height - tabs.indicator.width.toInt() - 1))
            // The labels, in the selected color and the color at rest.
            assertTrue(where, details.columnsFilledWith(tabs.fg.selected, rows = 1).isNotEmpty())
            assertTrue(where, reviews.columnsFilledWith(tabs.fg.default, rows = 1).isNotEmpty())

            val node = tab("Reviews")
            node.performTouchInput { down(center) }
            compose.mainClock.advanceTimeBy(500)
            assertPainted("$where, pressed", tabs.bg.pressed, node.pixels(), 3, middle)
            node.performTouchInput { up() }

            node.performMouseInput { enter(center) }
            compose.mainClock.advanceTimeBy(500)
            assertPainted("$where, hovered", tabs.bg.hover, node.pixels(), 3, middle)
            node.performMouseInput { exit(Offset(-100f, -100f)) }
        }
    }

    @Test
    fun `the hairline runs under the whole row, beyond the last tab`() {
        for (mode in ColorMode.entries) {
            val tabs = tokens(mode).tabs
            show(mode) { RaincoatTabs(product, modifier = Modifier.testTag(row)) { } }
            val pixels = compose.onNodeWithTag(row).pixels()
            val line = tabs.divider.width.toInt()
            val right = pixels.width - 2
            for (y in pixels.height - line until pixels.height) {
                assertPainted("${mode.id}, hairline", tabs.divider.color, pixels, right, y)
            }
            assertTrue(mode.id, pixels.isClear(right, pixels.height - line - 1))
        }
    }

    @Test
    fun `keyboard focus draws the focus ring inside the tab's edge`() {
        val tabs = tokens().tabs
        show(keyboard = true) { Product() }
        val before = tab("Reviews").pixels()
        val middle = before.height / 2
        assertTrue(before.isClear(0, middle))

        tab("Reviews").requestFocus().assertIsFocused()
        val focused = tab("Reviews").pixels()
        val width = tabs.focusRing.width.toInt()
        // From the tab's edge inward: the ring, then nothing.
        assertPainted("left edge", tabs.focusRing.color, focused, 0, middle)
        assertPainted("inside the left edge", tabs.focusRing.color, focused, width - 1, middle)
        assertPainted("right edge", tabs.focusRing.color, focused, focused.width - 1, middle)
        assertPainted("top edge", tabs.focusRing.color, focused, focused.width / 2, 0)
        assertTrue(focused.isClear(width, middle))
    }

    // Measurements

    @Test
    fun `a tab is as tall as its token, and the row takes no more room than its tabs`() {
        for (density in Density.entries) {
            val height = tokens(density = density).tabs.height.toInt()
            show(density = density) {
                RaincoatTabs(product, modifier = Modifier.testTag(row)) { }
            }
            tab("Details").assertHeightIsEqualTo(height.dp)
            compose.onNodeWithTag(row).assertHeightIsEqualTo(height.dp)
        }
    }

    @Test
    fun `an icon is drawn at its token size`() {
        val tabs = tokens().tabs
        show { RaincoatTabs(listOf(RaincoatTab("photos", "Photos", icon = Block), RaincoatTab("files", "Files"))) { } }
        val icon = tabs.iconSize.toInt()
        // The selected tab's icon is in the selected label color.
        assertEquals(icon, tab("Photos").pixels().columnsFilledWith(tabs.fg.selected, rows = icon).size)
    }

    @Test
    fun `selecting a tab does not change its width`() {
        show { Product() }
        val before = widthOf(tab("Reviews"))
        tab("Reviews").performClick()
        tab("Reviews").assertIsSelected()
        assertEquals(before, widthOf(tab("Reviews")))
    }

    // Touch target

    /** The platform's minimum touch target, which is larger than the token's. */
    private val target = 48

    @Test
    fun `the touch target is at least the minimum, whatever the visible height`() {
        for (density in Density.entries) {
            val height = tokens(density = density).tabs.height.toInt()
            show(density = density) { Product() }
            // This is the area that assistive technology is given, too.
            tab("Reviews").assertTouchHeightIsEqualTo(maxOf(height, target).dp)
        }
    }

    @Test
    fun `a compact tab takes touches just above it, and a mouse has to be on it`() {
        val height = tokens(density = Density.Compact).tabs.height.toInt()
        val reach = (target - height) / 2f
        assertTrue("the compact tab is shorter than the target", reach >= 2)
        show(density = Density.Compact) { Product() }
        tab("Reviews").performMouseInput {
            click(Offset(centerX, -2f))
            // Away from where any later test draws a tab, so that none starts out hovered.
            exit(Offset(-100f, -100f))
        }
        tab("Reviews").assertIsNotSelected()
        tab("Reviews").performTouchInput { click(Offset(centerX, -reach + 1)) }
        tab("Reviews").assertIsSelected()
    }

    // Long text, overflow, and direction

    @Test
    fun `a long label stays on one line, and the row scrolls sideways instead`() {
        val height = tokens().tabs.height.toInt()
        val long = "Questions and answers from other buyers"
        show {
            Box(Modifier.width(240.dp)) {
                RaincoatTabs(
                    listOf(RaincoatTab("questions", long), RaincoatTab("shipping", "Shipping and returns")),
                    modifier = Modifier.testTag(row),
                ) { }
            }
        }
        tab(long).assertHeightIsEqualTo(height.dp)
        compose.onNodeWithTag(row).assertHeightIsEqualTo(height.dp)
        // The label is laid out at its full width, wider than the row.
        assertTrue(widthOf(tab(long)) > 240.dp)
    }

    @Test
    fun `a selected tab out of view is scrolled into view`() {
        val labels = listOf("Overview", "Specifications", "Reviews", "Questions", "Shipping", "Returns")
        for (direction in LayoutDirection.entries) {
            show(direction = direction) {
                Box(Modifier.width(240.dp)) {
                    RaincoatTabs(
                        labels.map { RaincoatTab(it, it) },
                        modifier = Modifier.testTag(row),
                        initialSelection = "Returns",
                    ) { }
                }
            }
            compose.mainClock.advanceTimeBy(1000)
            compose.waitForIdle()
            val visible = compose.onNodeWithTag(row).getUnclippedBoundsInRoot()
            val last = tab("Returns").getUnclippedBoundsInRoot()
            assertTrue("$direction: $last in $visible", last.left >= visible.left && last.right <= visible.right)
            val first = tab("Overview").getUnclippedBoundsInRoot()
            assertFalse("$direction: $first in $visible", first.left >= visible.left && first.right <= visible.right)
        }
    }

    @Test
    fun `the first tab and an icon are on the side where reading starts`() {
        for (direction in LayoutDirection.entries) {
            show(direction = direction) {
                RaincoatTabs(listOf(RaincoatTab("photos", "Photos", icon = Block), RaincoatTab("files", "Files"))) { }
            }
            val first = tab("Photos").getUnclippedBoundsInRoot()
            val second = tab("Files").getUnclippedBoundsInRoot()
            val icon = tokens().tabs.iconSize.toInt()
            val columns = tab("Photos").pixels().columnsFilledWith(tokens().tabs.fg.selected, rows = icon)
            val width = tab("Photos").pixels().width
            if (direction == LayoutDirection.Ltr) {
                assertTrue(first.right <= second.left)
                assertTrue(columns.last() < width / 2)
            } else {
                assertTrue(first.left >= second.right)
                assertTrue(columns.first() > width / 2)
            }
        }
    }

    @Test
    fun `a tab grows with the font size setting`() {
        val tabs = tokens().tabs
        RuntimeEnvironment.setFontScale(2f)
        show { Product() }
        val line = tabs.label.lineHeight * tabs.label.size
        val scaledLine = with(compose.density) { ceil(tabs.label.lineHeight * tabs.label.size.sp.toPx()).toInt() }
        assertTrue(scaledLine > 1.5 * line)
        // The line is taller, and the space above and below it is what it was.
        val padding = (tabs.height.toInt() - ceil(line).toInt()) / 2
        assertEquals(scaledLine + 2 * padding, tab("Details").pixels().height)
    }
}
