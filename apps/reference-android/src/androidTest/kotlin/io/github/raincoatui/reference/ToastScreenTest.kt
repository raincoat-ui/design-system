package io.github.raincoatui.reference

import android.view.View
import android.view.accessibility.AccessibilityNodeInfo
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.SemanticsNodeInteraction
import androidx.compose.ui.test.assertHasClickAction
import androidx.compose.ui.test.assertTextEquals
import androidx.compose.ui.test.getUnclippedBoundsInRoot
import androidx.compose.ui.test.hasContentDescription
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.accessibility.enableAccessibilityChecks
import androidx.compose.ui.test.junit4.v2.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.tryPerformAccessibilityChecks
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Assume.assumeTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * The Toast on an emulator, checked against specs/components/toast/spec.yaml and the
 * accessibility table of rfcs/0008-toast.md: what an accessibility service is given, the timer
 * on the test's clock, the queue, the room for the app's bottom bar and the keyboard, and Google's
 * accessibility checks.
 */
@RunWith(AndroidJUnit4::class)
class ToastScreenTest {
    @get:Rule
    val compose = createAndroidComposeRule<ToastActivity>()

    private val isButton = SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Button)
    private val isToast = SemanticsMatcher.keyIsDefined(SemanticsActions.Dismiss)

    private fun named(name: String): SemanticsNodeInteraction =
        compose.onNode(isButton and (hasText(name) or hasContentDescription(name)))

    private fun isShown(message: String) = compose.onAllNodes(hasText(message)).fetchSemanticsNodes().isNotEmpty()

    private fun advance(milliseconds: Long) {
        compose.mainClock.advanceTimeBy(milliseconds)
        compose.waitForIdle()
    }

    /** Runs a few frames, for a change to reach the toast's host. */
    private fun frames() {
        repeat(3) { compose.mainClock.advanceTimeByFrame() }
        compose.waitForIdle()
    }

    /** The nodes an accessibility service, such as TalkBack, is given. */
    private fun serviceNodes(): List<AccessibilityNodeInfo> {
        compose.waitForIdle()
        val automation = InstrumentationRegistry.getInstrumentation().uiAutomation
        fun withDescendants(node: AccessibilityNodeInfo): List<AccessibilityNodeInfo> =
            listOf(node) + (0 until node.childCount).mapNotNull(node::getChild).flatMap(::withDescendants)
        var seen = emptyList<AccessibilityNodeInfo>()
        // The tree is built once a service is listening, which takes a moment.
        repeat(50) {
            seen = automation.rootInActiveWindow?.let(::withDescendants).orEmpty()
            if (seen.isNotEmpty()) return seen
            Thread.sleep(100)
        }
        return seen
    }

    @Test
    fun aToastIsAPoliteLiveRegionThatDoesNotTakeFocus() {
        named("Archive message").performClick()
        compose.waitForIdle()
        assertTrue(isShown("Message archived"))
        var message: AccessibilityNodeInfo? = null
        for (attempt in 0 until 50) {
            message = serviceNodes().firstOrNull { it.text?.toString() == "Message archived" }
            if (message != null) break
            Thread.sleep(100)
        }
        val node = message ?: throw AssertionError("a service is not given the message")
        assertEquals(View.ACCESSIBILITY_LIVE_REGION_POLITE, node.liveRegion)
        assertTrue("the message does not take focus", !node.isFocused && !node.isAccessibilityFocused)
    }

    @Test
    fun aToastWithAnActionHasTheActionAndANamedCloseButton() {
        named("Delete address").performClick()
        compose.waitForIdle()
        named("Undo").assertHasClickAction()
        named("Close").assertHasClickAction()
        named("Undo").performClick()
        compose.waitForIdle()
        compose.onNodeWithTag("last-action").assertTextEquals("Last action: Undo")
    }

    @Test
    fun withoutAnActionAToastClosesAfterSixSeconds() {
        compose.mainClock.autoAdvance = false
        named("Archive message").performClick()
        frames()
        assertTrue(isShown("Message archived"))
        advance(5500)
        assertTrue(isShown("Message archived"))
        advance(2000)
        assertTrue(!isShown("Message archived"))
    }

    @Test
    fun withAnActionAToastStaysUntilItIsUsedOrClosed() {
        compose.mainClock.autoAdvance = false
        named("Delete address").performClick()
        frames()
        advance(10 * 60 * 1000)
        assertTrue(isShown("Address deleted"))
        named("Close").performClick()
        frames()
        advance(2000)
        assertTrue(!isShown("Address deleted"))
    }

    @Test
    fun aSecondToastWaitsInTheQueueThenFollows() {
        named("Copy two links").performClick()
        compose.waitForIdle()
        assertTrue(isShown("First link copied"))
        assertTrue(!isShown("Second link copied"))
        named("Close").performClick()
        compose.waitForIdle()
        assertTrue(isShown("Second link copied"))
    }

    @Test
    fun theToastSitsAboveTheAppsBottomBar() {
        named("Archive message").performClick()
        compose.waitForIdle()
        val toast = compose.onNode(isToast).getUnclippedBoundsInRoot()
        val bar = compose.onNodeWithTag("bottom-bar").getUnclippedBoundsInRoot()
        assertTrue("toast ${toast.bottom}, bar ${bar.top}", toast.bottom <= bar.top)
    }

    @Test
    fun theToastSitsAboveTheKeyboard() {
        compose.onNodeWithTag("search").performClick()
        compose.waitForIdle()
        val view = compose.activity.window.decorView
        var keyboard = 0
        for (attempt in 0 until 30) {
            keyboard = ViewCompat.getRootWindowInsets(view)?.getInsets(WindowInsetsCompat.Type.ime())?.bottom ?: 0
            if (keyboard > 0) break
            Thread.sleep(100)
        }
        assumeTrue("the emulator shows no on-screen keyboard", keyboard > 0)
        named("Archive message").performClick()
        compose.waitForIdle()
        val toast = compose.onNode(isToast).fetchSemanticsNode().boundsInWindow
        assertTrue("toast ${toast.bottom}, keyboard ${view.height - keyboard}", toast.bottom <= view.height - keyboard)
    }

    /** Google's Accessibility Test Framework, with a toast on the screen. */
    @Test
    fun theScreenWithAToastPassesGooglesAccessibilityChecks() {
        named("Delete address").performClick()
        compose.waitForIdle()
        compose.enableAccessibilityChecks()
        compose.onRoot().tryPerformAccessibilityChecks()
    }
}
