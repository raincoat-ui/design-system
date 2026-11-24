package io.github.raincoatui.reference

import android.view.accessibility.AccessibilityNodeInfo
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.assertTextEquals
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.isHeading
import androidx.compose.ui.test.junit4.accessibility.enableAccessibilityChecks
import androidx.compose.ui.test.junit4.v2.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.tryPerformAccessibilityChecks
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Text and headings on an emulator, checked against specs/components/typography/spec.yaml: what
 * an accessibility service is given, and Google's accessibility checks.
 */
@RunWith(AndroidJUnit4::class)
class TypographyScreenTest {
    @get:Rule
    val compose = createAndroidComposeRule<TypographyActivity>()

    private val headings = listOf(
        "Settings", "Text styles", "Colors", "Headings", "Level 3", "Level 4", "Level 5", "Level 6",
        "Recent files", "Shared with you", "Long text", LONG_HEADING,
    )
    private val texts = listOf(
        "Your files are up to date.", "Last checked at 9:41.", "This file could not be opened.", PARAGRAPH,
    )

    /** The node an accessibility service, such as TalkBack, is given for a text. */
    private fun serviceNode(text: String): AccessibilityNodeInfo {
        compose.waitForIdle()
        val automation = InstrumentationRegistry.getInstrumentation().uiAutomation
        var seen = emptyList<AccessibilityNodeInfo>()
        // The tree is built once a service is listening, which takes a moment.
        repeat(50) {
            seen = automation.rootInActiveWindow?.let(::withDescendants).orEmpty()
            val found = seen.firstOrNull { it.text?.toString() == text }
            if (found != null) return found
            Thread.sleep(100)
        }
        val tree = seen.joinToString("\n") { "${it.className} text=${it.text}" }
        throw AssertionError("no text \"$text\" among the ${seen.size} nodes a service is given:\n$tree")
    }

    private fun children(node: AccessibilityNodeInfo): List<AccessibilityNodeInfo> =
        (0 until node.childCount).mapNotNull(node::getChild)

    /** A node and everything under it. Compose does not answer a search by text, so walk the tree. */
    private fun withDescendants(node: AccessibilityNodeInfo): List<AccessibilityNodeInfo> =
        listOf(node) + children(node).flatMap(::withDescendants)

    @Test
    fun everyHeadingIsAHeadingAndTextIsNot() {
        for (name in headings) {
            compose.onNode(hasText(name) and isHeading()).performScrollTo()
        }
        for (text in texts) {
            compose.onNodeWithText(text).assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.Heading))
        }
        // An accessibility service is told which items are headings, so TalkBack can move
        // between them. Android has no heading levels.
        compose.onNodeWithText("Settings").performScrollTo()
        assertTrue("Settings is a heading to a service", serviceNode("Settings").isHeading)
        assertFalse("running text is not a heading", serviceNode("Your files are up to date.").isHeading)
    }

    @Test
    fun textCutShortIsGivenInFull() {
        compose.onNodeWithTag("max-lines").performScrollTo().assertTextEquals(PARAGRAPH)
        // A service is given an item with the whole text, not the two lines that show.
        assertTrue("the paragraph is on screen", serviceNode(PARAGRAPH).isVisibleToUser)
    }

    /** Google's Accessibility Test Framework: contrast, text sizes, and the rest. */
    @Test
    fun theScreenPassesGooglesAccessibilityChecks() {
        compose.enableAccessibilityChecks()
        compose.onRoot().tryPerformAccessibilityChecks()
        // The rest of the screen, once it is scrolled into view.
        compose.onNodeWithTag("max-lines").performScrollTo()
        compose.onRoot().tryPerformAccessibilityChecks()
    }
}
