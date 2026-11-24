package io.github.raincoatui.reference

import android.view.accessibility.AccessibilityNodeInfo
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
import androidx.compose.ui.test.swipeLeft
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

    /**
     * The node an accessibility service, such as TalkBack, stops on for a tab: the one that
     * takes clicks and carries the name, as its own text or description or a child's.
     */
    private fun serviceNode(name: String): AccessibilityNodeInfo {
        compose.waitForIdle()
        val automation = InstrumentationRegistry.getInstrumentation().uiAutomation
        var seen = emptyList<AccessibilityNodeInfo>()
        // The tree is built once a service is listening, which takes a moment.
        repeat(50) {
            seen = automation.rootInActiveWindow?.let(::withDescendants).orEmpty()
            val found = seen.firstOrNull { node ->
                node.isClickable && (listOf(node) + children(node)).any { it.text?.toString() == name || it.contentDescription?.toString() == name }
            }
            if (found != null) return found
            Thread.sleep(100)
        }
        val tree = seen.joinToString("\n") { "${it.className} text=${it.text} description=${it.contentDescription}" }
        throw AssertionError("no tab named \"$name\" among the ${seen.size} nodes a service is given:\n$tree")
    }

    private fun children(node: AccessibilityNodeInfo): List<AccessibilityNodeInfo> =
        (0 until node.childCount).mapNotNull(node::getChild)

    /** A node and everything under it. Compose does not answer a search by text, so walk the tree. */
    private fun withDescendants(node: AccessibilityNodeInfo): List<AccessibilityNodeInfo> =
        listOf(node) + children(node).flatMap(::withDescendants)

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
        assertTrue(serviceNode("Details").isSelected)
        assertFalse(serviceNode("Reviews").isSelected)
        tab("Reviews").performClick()
        assertTrue(serviceNode("Reviews").isSelected)
        assertFalse(serviceNode("Details").isSelected)
        for (name in listOf("Details", "Reviews")) {
            assertTrue(name, serviceNode(name).isScreenReaderFocusable)
        }
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
        repeat(TRANSLATED.size) {
            if (!lastIsShown()) tab(TRANSLATED.first()).performTouchInput { swipeLeft() }
            compose.waitForIdle()
        }
        assertTrue(lastIsShown())
        last.performClick().assertIsSelected()
        compose.onNodeWithText("Đang xem: ${TRANSLATED.last()}").assertIsDisplayed()

        // Each label is on one line, at its full width: every tab is as tall as the others.
        val heights = TRANSLATED.map { tab(it).getUnclippedBoundsInRoot().height }.toSet()
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
