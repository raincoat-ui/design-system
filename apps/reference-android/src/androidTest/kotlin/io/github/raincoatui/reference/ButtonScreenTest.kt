package io.github.raincoatui.reference

import android.graphics.Rect
import android.view.accessibility.AccessibilityNodeInfo
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.SemanticsNodeInteraction
import androidx.compose.ui.test.assertHasClickAction
import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.assertTextEquals
import androidx.compose.ui.test.assertTouchHeightIsEqualTo
import androidx.compose.ui.test.assertTouchWidthIsEqualTo
import androidx.compose.ui.test.click
import androidx.compose.ui.test.getUnclippedBoundsInRoot
import androidx.compose.ui.test.hasContentDescription
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.accessibility.enableAccessibilityChecks
import androidx.compose.ui.test.junit4.v2.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performTouchInput
import androidx.compose.ui.test.tryPerformAccessibilityChecks
import androidx.compose.ui.unit.dp
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import io.github.raincoatui.tokens.ColorMode
import io.github.raincoatui.tokens.Density
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * The Button on an emulator, checked against specs/components/button/spec.yaml: what an
 * accessibility service is given, Google's accessibility checks, and touches.
 */
@RunWith(AndroidJUnit4::class)
class ButtonScreenTest {
    @get:Rule
    val compose = createAndroidComposeRule<MainActivity>()

    private val button = appTheme.tokens(ColorMode.Light, Density.Comfortable).button

    /** The platform's minimum touch target, which is larger than the token's. */
    private val target = 48

    private val isButton = SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Button)

    private fun named(name: String): SemanticsNodeInteraction =
        compose.onNode(isButton and (hasText(name) or hasContentDescription(name)))

    private fun assertLastAction(expected: String) {
        compose.onNodeWithTag("last-action").assertTextEquals("Last action: $expected")
    }

    /**
     * The node an accessibility service, such as TalkBack, stops on for a button.
     *
     * Compose gives a service a container that takes focus and clicks. Under it are the name,
     * as text or as a description, and a node that says "button". TalkBack reads them as one
     * item: "Save changes, button".
     */
    private fun serviceNode(name: String): AccessibilityNodeInfo {
        compose.waitForIdle()
        val automation = InstrumentationRegistry.getInstrumentation().uiAutomation
        var seen = emptyList<AccessibilityNodeInfo>()
        // The tree is built once a service is listening, which takes a moment.
        repeat(50) {
            seen = automation.rootInActiveWindow?.let(::withDescendants).orEmpty()
            val found = seen.firstOrNull { node ->
                val children = children(node)
                children.any { it.className == "android.widget.Button" } &&
                    children.any { it.text?.toString() == name || it.contentDescription?.toString() == name }
            }
            if (found != null) return found
            Thread.sleep(100)
        }
        val tree = seen.joinToString("\n") { "${it.className} text=${it.text} description=${it.contentDescription}" }
        throw AssertionError("no button named \"$name\" among the ${seen.size} nodes a service is given:\n$tree")
    }

    private fun children(node: AccessibilityNodeInfo): List<AccessibilityNodeInfo> =
        (0 until node.childCount).mapNotNull(node::getChild)

    /** A node and everything under it. Compose does not answer a search by text, so walk the tree. */
    private fun withDescendants(node: AccessibilityNodeInfo): List<AccessibilityNodeInfo> =
        listOf(node) + children(node).flatMap(::withDescendants)

    @Test
    fun everyButtonIsAButtonNamedByItsLabel() {
        val names = listOf(
            "Save changes", "Cancel", "Show details", "Delete project", "Small", "Medium", "Large", "Publish",
            "Send invite", "Archive", "Continue", LONG_LABEL,
            // An icon alone has no name; this one is given by the app.
            "Delete page",
        )
        for (name in names) {
            named(name).assertHasClickAction()
        }
        // A service is given each of them as one item that it can stop on and activate.
        for (name in listOf("Save changes", "Delete page")) {
            val node = serviceNode(name)
            assertTrue(name, node.isScreenReaderFocusable)
            assertTrue(name, node.isClickable)
            assertTrue(name, node.isEnabled)
        }
    }

    @Test
    fun aTouchRunsTheAction() {
        assertLastAction("Nothing yet")
        named("Save changes").performClick()
        assertLastAction("Save changes")
        named("Delete page").performScrollTo().performClick()
        assertLastAction("Delete page")
    }

    @Test
    fun aDisabledButtonIsUnavailable() {
        named("Publish").assertIsNotEnabled().performClick()
        assertLastAction("Nothing yet")
        assertTrue(!serviceNode("Publish").isEnabled)
    }

    @Test
    fun aLoadingButtonSaysItIsInProgressStaysAvailableAndIgnoresActivation() {
        named("Send invite").assertIsEnabled().performClick()
        assertLastAction("Nothing yet")

        // The name stays, and the item carries the state for a screen reader to say with it.
        val loading = serviceNode("Send invite")
        assertEquals("In progress", loading.stateDescription?.toString())
        assertTrue(loading.isEnabled)
        assertTrue(loading.isScreenReaderFocusable)

        // No other button has a state to report, and a disabled button is not also in progress.
        assertNull(serviceNode("Save changes").stateDescription)
        assertNull(serviceNode("Archive").stateDescription)
    }

    @Test
    fun aSmallButtonTakesTheRoomItShowsAndTouchesJustOutsideItCount() {
        // An accessibility service is given the touch target, not only the visible button,
        // wherever no other item is in the way. The small button in the row of sizes has room
        // around it. (This is read before anything is scrolled: an item at the edge of the
        // scrolling area is cut off there.)
        val bounds = Rect().also { serviceNode("Small").getBoundsInScreen(it) }
        val pixelsPerDp = InstrumentationRegistry.getInstrumentation().targetContext.resources.displayMetrics.density
        assertEquals(target * pixelsPerDp, bounds.height().toFloat(), 1.5f)

        val small = named("Delete page").performScrollTo()
        val above = compose.onNodeWithTag("small-above").getUnclippedBoundsInRoot()
        val below = compose.onNodeWithTag("small-below").getUnclippedBoundsInRoot()
        val height = button.height.sm
        assertTrue(height < target)

        // The lines directly above and below are as far apart as the button is tall.
        assertEquals(height, (below.top - above.bottom).value.toDouble(), 0.5)

        // The touch target is larger than the button.
        small.assertTouchWidthIsEqualTo(target.dp).assertTouchHeightIsEqualTo(target.dp)

        // A touch inside the target but above the visible button, on the line of text there.
        val reach = (target - height.toFloat()) / 2 * pixelsPerDp
        small.performTouchInput { click(Offset(centerX, -reach + 2)) }
        assertLastAction("Delete page")
    }

    /** Google's Accessibility Test Framework: names, touch targets, contrast, clickable spans. */
    @Test
    fun theScreenPassesGooglesAccessibilityChecks() {
        compose.enableAccessibilityChecks()
        compose.onRoot().tryPerformAccessibilityChecks()
        // The rest of the screen, once it is scrolled into view.
        named(LONG_LABEL).performScrollTo()
        compose.onRoot().tryPerformAccessibilityChecks()
    }
}
