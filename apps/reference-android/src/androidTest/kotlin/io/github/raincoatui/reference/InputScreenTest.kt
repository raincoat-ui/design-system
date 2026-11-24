package io.github.raincoatui.reference

import android.view.accessibility.AccessibilityNodeInfo
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.semantics.getOrNull
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.SemanticsNodeInteraction
import androidx.compose.ui.test.assertIsFocused
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.assertTextEquals
import androidx.compose.ui.test.assertTouchHeightIsEqualTo
import androidx.compose.ui.test.getUnclippedBoundsInRoot
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.accessibility.enableAccessibilityChecks
import androidx.compose.ui.test.junit4.v2.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performTextInput
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
 * The Input on an emulator, checked against specs/components/input/spec.yaml and the
 * Accessibility table of RFC 0004: what an accessibility service is given, a form checked on
 * submit with focus moved to the first field in error, Google's accessibility checks, and the
 * touch target.
 */
@RunWith(AndroidJUnit4::class)
class InputScreenTest {
    @get:Rule
    val compose = createAndroidComposeRule<InputActivity>()

    private val input = appTheme.tokens(ColorMode.Light, Density.Comfortable).input

    /** The platform's minimum touch target, which is larger than the token's. */
    private val target = 48

    private val isTextField = SemanticsMatcher.keyIsDefined(SemanticsProperties.EditableText)

    /** The text field whose name (its label) is [name]. */
    private fun field(name: String): SemanticsNodeInteraction = compose.onNode(isTextField and hasText(name))

    private fun texts(node: SemanticsNodeInteraction): List<String> =
        node.fetchSemanticsNode().config.getOrNull(SemanticsProperties.Text).orEmpty().map { it.text }

    private fun error(node: SemanticsNodeInteraction): String? =
        node.fetchSemanticsNode().config.getOrNull(SemanticsProperties.Error)

    private fun send() {
        compose.onNodeWithText("Send").performScrollTo().performClick()
        compose.waitForIdle()
    }

    /** Every node an accessibility service, such as TalkBack, is given that is an edit box. */
    private fun serviceEditBoxes(): List<AccessibilityNodeInfo> {
        compose.waitForIdle()
        val automation = InstrumentationRegistry.getInstrumentation().uiAutomation
        var found = emptyList<AccessibilityNodeInfo>()
        // The tree is built once a service is listening, which takes a moment.
        repeat(50) {
            found = automation.rootInActiveWindow?.let(::withDescendants).orEmpty()
                .filter { it.className == "android.widget.EditText" }
            if (found.isNotEmpty()) return found
            Thread.sleep(100)
        }
        return found
    }

    private fun withDescendants(node: AccessibilityNodeInfo): List<AccessibilityNodeInfo> =
        listOf(node) + (0 until node.childCount).mapNotNull(node::getChild).flatMap(::withDescendants)

    /** Everything a service is given that names or describes a node. */
    private fun AccessibilityNodeInfo.words(): String =
        listOfNotNull(text, hintText, contentDescription, stateDescription).joinToString(" | ")

    @Test
    fun everyFieldIsNamedByItsLabelAndTheDescriptionFollows() {
        for (name in listOf("Full name", "Email", "Phone (optional)", "Message (optional)", "Small", "Medium", "Large")) {
            assertEquals(name, name, texts(field(name)).first())
        }
        assertEquals(
            listOf("Email", "We send the receipt here."),
            texts(field("Email")).take(2),
        )
        // A hidden label is still the name.
        assertEquals(listOf("Search the docs"), texts(field("Search the docs")).take(1))
        // The service is given an edit box for each field, with its label.
        val boxes = serviceEditBoxes()
        assertTrue(
            "edit boxes: ${boxes.map { it.words() }}",
            boxes.any { it.words().contains("Full name") },
        )
    }

    @Test
    fun aDisabledFieldIsUnavailableAndAReadOnlyOneIsNot() {
        field("Company").performScrollTo().assertIsNotEnabled()
        val boxes = serviceEditBoxes()
        val company = boxes.firstOrNull { it.words().contains("Company") }
        assertTrue("edit boxes: ${boxes.map { it.words() }}", company != null && !company.isEnabled)
        val account = boxes.firstOrNull { it.words().contains("Account number") || it.text?.contains("DE89") == true }
        assertTrue("edit boxes: ${boxes.map { it.words() }}", account != null && account.isEnabled)
    }

    @Test
    fun submittingMovesFocusToTheFirstFieldInErrorWhichCarriesItsError() {
        send()
        val name = field("Full name").assertIsFocused()
        assertEquals(NAME_ERROR, error(name))
        assertEquals(EMAIL_ERROR, error(field("Email")))
        compose.onNodeWithTag("sent").assertTextEquals("Sent: Nothing yet")

        // An accessibility service is given the field's error with it.
        val boxes = serviceEditBoxes()
        val invalid = boxes.filter { it.isContentInvalid }
        assertEquals("edit boxes: ${boxes.map { it.words() }}", listOf(NAME_ERROR, EMAIL_ERROR), invalid.map { it.error?.toString() })

        // After that, a field is checked as it changes: its error clears as soon as it is fixed.
        name.performTextInput("Ana Lima")
        compose.waitForIdle()
        assertNull(error(field("Full name")))
        send()
        val email = field("Email").assertIsFocused()
        email.performTextInput("ana@example.com")
        compose.waitForIdle()
        assertNull(error(field("Email")))
        send()
        compose.onNodeWithTag("sent").assertTextEquals("Sent: Ana Lima")
    }

    @Test
    fun aSmallFieldTakesTheRoomItShowsAndItsTouchTargetReachesPastIt() {
        val small = field("Search the docs").performScrollTo()
        val above = compose.onNodeWithTag("small-above").getUnclippedBoundsInRoot()
        val below = compose.onNodeWithTag("small-below").getUnclippedBoundsInRoot()
        val height = input.height.sm
        assertTrue("the small field is shorter than the target", height < target)

        // The lines directly above and below are as far apart as the field is tall.
        assertEquals(height, (below.top - above.bottom).value.toDouble(), 0.5)
        // The touch target is larger than the field; it is the area a service is given, too.
        small.assertTouchHeightIsEqualTo(target.dp)
    }

    /** Google's Accessibility Test Framework: names, touch targets, contrast, clickable spans. */
    @Test
    fun theScreenPassesGooglesAccessibilityChecks() {
        compose.enableAccessibilityChecks()
        // With every error shown.
        send()
        compose.onRoot().tryPerformAccessibilityChecks()
        // The rest of the screen, once it is scrolled into view.
        field("Search the docs").performScrollTo()
        compose.onRoot().tryPerformAccessibilityChecks()
    }
}
