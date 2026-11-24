package io.github.raincoatui.reference

import android.view.accessibility.AccessibilityNodeInfo
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.semantics.getOrNull
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.assertHasClickAction
import androidx.compose.ui.test.assertTextEquals
import androidx.compose.ui.test.click
import androidx.compose.ui.test.hasClickAction
import androidx.compose.ui.test.hasTestTag
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.isHeading
import androidx.compose.ui.test.junit4.accessibility.enableAccessibilityChecks
import androidx.compose.ui.test.junit4.v2.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performTouchInput
import androidx.compose.ui.test.tryPerformAccessibilityChecks
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * The Card on an emulator, checked against specs/components/card/spec.yaml: what an
 * accessibility service is given, touches, and Google's accessibility checks.
 */
@RunWith(AndroidJUnit4::class)
class CardScreenTest {
    @get:Rule
    val compose = createAndroidComposeRule<CardActivity>()

    private val isButton = SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Button)

    private fun assertLastAction(expected: String) {
        compose.onNodeWithTag("last-action").assertTextEquals("Last action: $expected")
    }

    /** Every node an accessibility service, such as TalkBack, is given. */
    private fun serviceNodes(): List<AccessibilityNodeInfo> {
        compose.waitForIdle()
        val automation = InstrumentationRegistry.getInstrumentation().uiAutomation
        return automation.rootInActiveWindow?.let(::withDescendants).orEmpty()
    }

    /** The first node a service is given that matches, once the tree has been built. */
    private fun serviceNode(matches: (AccessibilityNodeInfo) -> Boolean): AccessibilityNodeInfo {
        var seen = emptyList<AccessibilityNodeInfo>()
        // The tree is built once a service is listening, which takes a moment.
        repeat(50) {
            seen = serviceNodes()
            val found = seen.firstOrNull(matches)
            if (found != null) return found
            Thread.sleep(100)
        }
        val tree = seen.joinToString("\n") { "${it.className} text=${it.text} clickable=${it.isClickable}" }
        throw AssertionError("no such node among the ${seen.size} nodes a service is given:\n$tree")
    }

    /** The node a service stops on for an interactive card: the clickable one with its title in it. */
    private fun serviceCard(title: String): AccessibilityNodeInfo = serviceNode { node ->
        node.isClickable && withDescendants(node).any { it.text?.toString() == title }
    }

    private fun children(node: AccessibilityNodeInfo): List<AccessibilityNodeInfo> =
        (0 until node.childCount).mapNotNull(node::getChild)

    /** A node and everything under it. Compose does not answer a search by text, so walk the tree. */
    private fun withDescendants(node: AccessibilityNodeInfo): List<AccessibilityNodeInfo> =
        listOf(node) + children(node).flatMap(::withDescendants)

    @Test
    fun eachInteractiveCardIsOneButtonReadTitleFirst() {
        val cards = mapOf(
            "order-1042" to listOf("Order 1042", "Delivered on Monday"),
            "order-1043" to listOf(LONG_TITLE, "Arrives on Thursday"),
            "return" to listOf("Start a return", "Within 30 days of delivery"),
        )
        for ((tag, texts) in cards) {
            val card = compose.onNode(hasTestTag(tag) and hasClickAction()).performScrollTo()
            card.assert(isButton).assertHasClickAction()
            // Its semantics merge its content, title first.
            assertEquals(tag, texts, card.fetchSemanticsNode().config.getOrNull(SemanticsProperties.Text)?.map { it.text })
        }
        // A service is given each of them as one item that it can stop on and activate.
        compose.onNodeWithTag("order-1042").performScrollTo()
        val node = serviceCard("Order 1042")
        assertTrue("one stop for a screen reader", node.isScreenReaderFocusable || node.isFocusable)
        assertTrue("it can be activated", node.isClickable)
    }

    @Test
    fun aStaticCardTakesNoClicksAndKeepsItsButtons() {
        compose.onNode(hasText("Storage") and isHeading()).performScrollTo()
        compose.onNodeWithText("Storage").assert(!hasClickAction())
        compose.onNode(hasText("Manage storage") and hasClickAction()).performScrollTo().performClick()
        assertLastAction("Manage storage")
        // To a service, its title is a heading and not something to activate.
        val title = serviceNode { it.text?.toString() == "Storage" }
        assertTrue("the title is a heading", title.isHeading)
        assertFalse("the title is not activated", title.isClickable)
    }

    @Test
    fun aTouchAnywhereOnAnInteractiveCardActivatesIt() {
        // In the corner of the card, away from its title.
        val card = compose.onNodeWithTag("return").performScrollTo()
        card.performTouchInput { click(Offset(width - 8f, height - 8f)) }
        assertLastAction("Start a return")
        // On the media.
        compose.onNodeWithTag("order-1042").performScrollTo().performTouchInput { click(Offset(centerX, 20f)) }
        assertLastAction("Order 1042")
    }

    @Test
    fun theListSaysHowManyCardsThereAre() {
        compose.onNodeWithTag("orders").performScrollTo()
        val list = serviceNode { it.collectionInfo != null }
        assertEquals("a list of three cards", 3, list.collectionInfo?.rowCount)
    }

    /** Google's Accessibility Test Framework: names, touch targets, contrast, and the rest. */
    @Test
    fun theScreenPassesGooglesAccessibilityChecks() {
        compose.enableAccessibilityChecks()
        compose.onRoot().tryPerformAccessibilityChecks()
        // The rest of the screen, once it is scrolled into view.
        compose.onNodeWithTag("album").performScrollTo()
        compose.onRoot().tryPerformAccessibilityChecks()
    }
}
