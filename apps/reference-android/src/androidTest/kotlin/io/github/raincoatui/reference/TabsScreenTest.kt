package io.github.raincoatui.reference

import android.view.accessibility.AccessibilityNodeInfo
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.SemanticsNodeInteraction
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsNotSelected
import androidx.compose.ui.test.assertIsSelected
import androidx.compose.ui.test.assertTextEquals
import androidx.compose.ui.test.assertTouchHeightIsEqualTo
import androidx.compose.ui.test.getUnclippedBoundsInRoot
import androidx.compose.ui.test.hasContentDescription
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.accessibility.enableAccessibilityChecks
import androidx.compose.ui.test.junit4.v2.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performTouchInput
import androidx.compose.ui.test.swipe
import androidx.compose.ui.test.tryPerformAccessibilityChecks
import androidx.compose.ui.unit.dp
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * The Tabs on an emulator, checked against specs/components/tabs/spec.yaml: what an
 * accessibility service is given, Google's accessibility checks, touches, and scrolling.
 */
@RunWith(AndroidJUnit4::class)
class TabsScreenTest {
    @get:Rule
    val compose = createAndroidComposeRule<TabsActivity>()

    /** The platform's minimum touch target, which is larger than the token's. */
    private val target = 48

    private val isTab = SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Tab)
    private val isGroup = SemanticsMatcher.keyIsDefined(SemanticsProperties.SelectableGroup)

    private fun tab(name: String): SemanticsNodeInteraction =
        compose.onNode(isTab and (hasText(name) or hasContentDescription(name)))

    /** Every node a service is given, as the service sees it now. */
    private fun serviceTree(): List<AccessibilityNodeInfo> {
        val automation = InstrumentationRegistry.getInstrumentation().uiAutomation
        return automation.rootInActiveWindow?.let(::withDescendants).orEmpty()
    }

    /**
     * The node an accessibility service, such as TalkBack, stops on for a tab: the one it can
     * focus that carries the name, as its own text or description or a child's. A tab that is
     * already selected is not offered a click, so the node is found by focus, not by click.
     */
    private fun serviceNode(name: String, tree: List<AccessibilityNodeInfo>): AccessibilityNodeInfo? =
        tree.firstOrNull { node ->
            node.isScreenReaderFocusable &&
                (listOf(node) + children(node)).any { it.text?.toString() == name || it.contentDescription?.toString() == name }
        }

    /** One line per node: what a service reads of it, and its state. */
    private fun describe(tree: List<AccessibilityNodeInfo>): String = tree.joinToString("\n") { node ->
        val role = node.extras.getCharSequence("AccessibilityNodeInfo.roleDescription")
        "${node.className} text=${node.text} description=${node.contentDescription} role=$role " +
            "selected=${node.isSelected} clickable=${node.isClickable} " +
            "screenReaderFocusable=${node.isScreenReaderFocusable}"
    }

    /**
     * Waits until the service is given the tab [name] in the state [check] describes. Compose
     * tells a service of a change a moment after it happens. If it never is, the failure lists
     * every node the service is given.
     */
    private fun assertService(name: String, state: String, check: (AccessibilityNodeInfo) -> Boolean) {
        compose.waitForIdle()
        var tree = emptyList<AccessibilityNodeInfo>()
        repeat(50) {
            tree = serviceTree()
            if (serviceNode(name, tree)?.let(check) == true) return
            Thread.sleep(100)
        }
        throw AssertionError("a service is not given the tab \"$name\" $state. It is given:\n${describe(tree)}")
    }

    private fun children(node: AccessibilityNodeInfo): List<AccessibilityNodeInfo> =
        (0 until node.childCount).mapNotNull(node::getChild)

    /** A node and everything under it. Compose does not answer a search by text, so walk the tree. */
    private fun withDescendants(node: AccessibilityNodeInfo): List<AccessibilityNodeInfo> {
        // A node can be one the service cached before the last change.
        node.refresh()
        return listOf(node) + children(node).flatMap(::withDescendants)
    }

    @Test
    fun eachRowIsASelectableGroupOfTabsNamedByTheirLabels() {
        val rows = listOf(
            listOf("Details", "Reviews", "Shipping"),
            listOf("Photos", "Videos", "Files"),
            // An icon alone has no name; these are given by the app.
            listOf("List", "Grid"),
        )
        for (row in rows) {
            for ((index, name) in row.withIndex()) {
                val node = tab(name).performScrollTo()
                if (index == 0) node.assertIsSelected() else node.assertIsNotSelected()
            }
        }
        assertEquals(4, compose.onAllNodes(isGroup).fetchSemanticsNodes().size)
    }

    @Test
    fun aServiceIsGivenEachTabWithItsSelectedState() {
        assertService("Details", "as selected") { it.isSelected }
        // A tab that is not selected can be activated by the service.
        assertService("Reviews", "as not selected, and activatable") { !it.isSelected && it.isClickable }
        tab("Reviews").performClick()
        assertService("Reviews", "as selected") { it.isSelected }
        assertService("Details", "as not selected, and activatable") { !it.isSelected && it.isClickable }
    }

    @Test
    fun aTouchSelectsATabAndShowsOnlyItsPanel() {
        compose.onNodeWithTag("selected").assertTextEquals("Selected: details")
        compose.onNodeWithText(PRODUCT_PANELS.getValue("details")).assertIsDisplayed()
        tab("Reviews").performClick()
        compose.onNodeWithTag("selected").assertTextEquals("Selected: reviews")
        tab("Reviews").assertIsSelected()
        compose.onNodeWithText(PRODUCT_PANELS.getValue("reviews")).assertIsDisplayed()
        compose.onNodeWithText(PRODUCT_PANELS.getValue("details")).assertDoesNotExist()
    }

    /** A row that does not fit scrolls sideways, so its last tab can be reached by a swipe. */
    @Test
    fun theLastTabOfTheOverflowingTranslatedRowCanBeReached() {
        val row = compose.onNodeWithTag("translated").performScrollTo()
        val last = tab(TRANSLATED.last())
        fun lastIsShown(): Boolean {
            val visible = row.getUnclippedBoundsInRoot()
            val bounds = last.getUnclippedBoundsInRoot()
            return bounds.left >= visible.left && bounds.right <= visible.right
        }
        assertFalse(lastIsShown())
        // Swipes across the row of tabs, from right to left, until the last tab is in view.
        repeat(TRANSLATED.size) {
            if (!lastIsShown()) {
                row.performTouchInput { swipe(Offset(width - 10f, 20f), Offset(10f, 20f)) }
            }
            compose.waitForIdle()
        }
        assertTrue(lastIsShown())
        last.performClick().assertIsSelected()
        compose.onNodeWithText("Đang xem: ${TRANSLATED.last()}").assertIsDisplayed()

        // Each label is on one line, at its full width: every tab is as tall as the others.
        val heights = TRANSLATED.map { tab(it).getUnclippedBoundsInRoot().let { box -> box.bottom - box.top } }.toSet()
        assertEquals(1, heights.size)
    }

    @Test
    fun everyTabsTouchTargetIsAtLeastTheMinimum() {
        for (name in listOf("Details", "Reviews", "Shipping", "Photos", "List", "Grid")) {
            tab(name).performScrollTo().assertTouchHeightIsEqualTo(target.dp)
        }
    }

    /** Google's Accessibility Test Framework: names, touch targets, contrast, clickable spans. */
    @Test
    fun theScreenPassesGooglesAccessibilityChecks() {
        compose.enableAccessibilityChecks()
        compose.onRoot().tryPerformAccessibilityChecks()
        // The rest of the screen, once it is scrolled into view.
        compose.onNodeWithTag("translated").performScrollTo()
        compose.onRoot().tryPerformAccessibilityChecks()
    }
}
