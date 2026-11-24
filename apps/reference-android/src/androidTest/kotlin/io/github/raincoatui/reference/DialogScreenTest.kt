package io.github.raincoatui.reference

import android.view.accessibility.AccessibilityNodeInfo
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.assertIsFocused
import androidx.compose.ui.test.hasAnyAncestor
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.isDialog
import androidx.compose.ui.test.junit4.accessibility.enableAccessibilityChecks
import androidx.compose.ui.test.junit4.v2.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.tryPerformAccessibilityChecks
import androidx.test.espresso.Espresso
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * The dialog, the alert dialog, and the sheet on an emulator, checked against
 * specs/components/dialog/spec.yaml and the Accessibility table of rfcs/0006-dialog-and-sheet.md:
 * what an accessibility service is given while one is open, back, and Google's accessibility
 * checks with each one open.
 */
@RunWith(AndroidJUnit4::class)
class DialogScreenTest {
    @get:Rule
    val compose = createAndroidComposeRule<DialogActivity>()

    private fun panel(title: String) = compose.onNode(SemanticsMatcher.expectValue(SemanticsProperties.PaneTitle, title))

    private fun open(button: String, title: String) {
        compose.onNodeWithText(button).performScrollTo().performClick()
        compose.waitForIdle()
        panel(title).assertExists()
    }

    private fun status(): String =
        compose.onNodeWithTag("status").fetchSemanticsNode().config[SemanticsProperties.Text].joinToString()

    private fun children(node: AccessibilityNodeInfo): List<AccessibilityNodeInfo> =
        (0 until node.childCount).mapNotNull(node::getChild)

    /** A node and everything under it. Compose does not answer a search by text, so walk the tree. */
    private fun withDescendants(node: AccessibilityNodeInfo): List<AccessibilityNodeInfo> =
        listOf(node) + children(node).flatMap(::withDescendants)

    /**
     * The texts and names an accessibility service, such as TalkBack, is given in the window it
     * is in, once [expected] is among them.
     */
    private fun serviceTexts(expected: String): List<String> {
        compose.waitForIdle()
        val automation = InstrumentationRegistry.getInstrumentation().uiAutomation
        var seen = emptyList<String>()
        // The tree is built once a service is listening, which takes a moment.
        repeat(50) {
            seen = automation.rootInActiveWindow?.let(::withDescendants).orEmpty()
                .flatMap { listOfNotNull(it.text?.toString(), it.contentDescription?.toString()) }
            if (expected in seen) return seen
            Thread.sleep(100)
        }
        throw AssertionError("no \"$expected\" among what a service is given:\n${seen.joinToString("\n")}")
    }

    @Test
    fun aServiceIsGivenTheDialogAloneNamedByItsTitle() {
        open("Rename file", "Rename file")
        val texts = serviceTexts("Rename file")
        assertTrue("its description: $texts", "Everyone the file is shared with sees the new name." in texts)
        assertTrue("its buttons: $texts", "Cancel" in texts && "Rename" in texts)
        // The screen behind is not in the window a service is in.
        assertFalse("not the screen's title: $texts", "Files" in texts)
        assertFalse("not the screen's buttons: $texts", "Terms of use" in texts)
    }

    @Test
    fun backClosesADialogAndCancelsAnAlertDialog() {
        open("Rename file", "Rename file")
        Espresso.pressBack()
        compose.waitForIdle()
        compose.onNode(isDialog()).assertDoesNotExist()
        assertEquals("nothing happened", "Nothing yet.", status())

        open("Delete address", "Delete this address?")
        Espresso.pressBack()
        compose.waitForIdle()
        compose.onNode(isDialog()).assertDoesNotExist()
        assertEquals("back means Cancel", "Kept the address.", status())
    }

    @Test
    fun theCloseButtonIsNamedAndClosesTheDialog() {
        open("Terms of use", "Terms of use")
        compose.onNodeWithContentDescription("Close").performClick()
        compose.waitForIdle()
        compose.onNode(isDialog()).assertDoesNotExist()
    }

    @Test
    fun anAlertDialogsActionRuns() {
        open("Delete address", "Delete this address?")
        // The alert dialog's own button, not the one on the screen behind.
        compose.onNode(hasText("Delete address") and hasAnyAncestor(isDialog())).performClick()
        compose.waitForIdle()
        compose.onNode(isDialog()).assertDoesNotExist()
        assertEquals("the action ran", "Deleted the address.", status())
    }

    @Test
    fun theFieldOfAShortFormTakesFocus() {
        open("Rename file", "Rename file")
        compose.onNodeWithContentDescription("Name").assertIsFocused()
    }

    /** Google's Accessibility Test Framework, with each dialog and sheet open in turn. */
    @Test
    fun eachOpenDialogPassesGooglesAccessibilityChecks() {
        compose.enableAccessibilityChecks()
        for ((button, title) in listOf(
            "Rename file" to "Rename file",
            "Terms of use" to "Terms of use",
            "Delete address" to "Delete this address?",
            "Share" to "Share file",
            "Filters" to "Filters",
        )) {
            open(button, title)
            compose.onNode(isDialog()).tryPerformAccessibilityChecks()
            Espresso.pressBack()
            compose.waitForIdle()
        }
    }
}
