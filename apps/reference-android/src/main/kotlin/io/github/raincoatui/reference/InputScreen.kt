package io.github.raincoatui.reference

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.BasicText
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.painter.Painter
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.github.raincoatui.tokens.ButtonVariant
import io.github.raincoatui.tokens.InputSize
import io.github.raincoatui.tokens.InputType
import io.github.raincoatui.tokens.TokenColor
import io.github.raincoatui.ui.LocalRaincoatTokens
import io.github.raincoatui.ui.components.RaincoatButton
import io.github.raincoatui.ui.components.RaincoatInput

internal const val NAME_ERROR = "Enter your full name"
internal const val EMAIL_ERROR = "Enter an email address, like name@example.com"

private val emailAddress = Regex("^[^\\s@]+@[^\\s@]+$")

/**
 * The Input in the states of its spec, and a form that checks its fields as RFC 0004 says: when
 * it is submitted, with focus moved to the first field in error, and after that as each field
 * changes. Sending the form writes a line at the top, which is how the tests see that it was sent.
 */
@Composable
fun InputScreen() {
    val tokens = LocalRaincoatTokens.current
    var name by rememberSaveable { mutableStateOf("") }
    var email by rememberSaveable { mutableStateOf("") }
    var phone by rememberSaveable { mutableStateOf("") }
    var message by rememberSaveable { mutableStateOf("") }
    var submitted by rememberSaveable { mutableStateOf(false) }
    var sent by rememberSaveable { mutableStateOf("Nothing yet") }
    var small by rememberSaveable { mutableStateOf("Ana Lima") }
    var medium by rememberSaveable { mutableStateOf("Ana Lima") }
    var large by rememberSaveable { mutableStateOf("Ana Lima") }
    var search by rememberSaveable { mutableStateOf("") }
    val nameFocus = remember { FocusRequester() }
    val emailFocus = remember { FocusRequester() }

    val nameError = if (submitted && name.isBlank()) NAME_ERROR else null
    val emailError = if (submitted && !emailAddress.matches(email.trim())) EMAIL_ERROR else null

    val body = TextStyle(color = tokens.color.fg.default.toComposeColor(), fontSize = tokens.type.body.md.size.sp)
    val caption = TextStyle(color = tokens.color.fg.muted.toComposeColor(), fontSize = tokens.type.body.sm.size.sp)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(tokens.color.bg.canvas.toComposeColor())
            .safeDrawingPadding()
            .verticalScroll(rememberScrollState())
            .padding(tokens.space._6.dp),
        verticalArrangement = Arrangement.spacedBy(tokens.space._6.dp),
    ) {
        BasicText("Sent: $sent", Modifier.testTag("sent"), style = body)

        InputSection("A form", caption) {
            RaincoatInput(
                name,
                { name = it },
                label = "Full name",
                modifier = Modifier.focusRequester(nameFocus),
                invalid = nameError != null,
                error = nameError,
            )
            RaincoatInput(
                email,
                { email = it },
                label = "Email",
                modifier = Modifier.focusRequester(emailFocus),
                type = InputType.Email,
                description = "We send the receipt here.",
                placeholder = "name@example.com",
                invalid = emailError != null,
                error = emailError,
            )
            RaincoatInput(phone, { phone = it }, label = "Phone (optional)", type = InputType.Tel)
            RaincoatInput(message, { message = it }, label = "Message (optional)", multiline = true)
            RaincoatButton(
                "Send",
                {
                    submitted = true
                    when {
                        name.isBlank() -> nameFocus.requestFocus()
                        !emailAddress.matches(email.trim()) -> emailFocus.requestFocus()
                        else -> { sent = name }
                    }
                },
                variant = ButtonVariant.Primary,
            )
        }

        InputSection("Sizes", caption) {
            RaincoatInput(small, { small = it }, label = "Small", size = InputSize.Sm)
            RaincoatInput(medium, { medium = it }, label = "Medium", size = InputSize.Md)
            RaincoatInput(large, { large = it }, label = "Large", size = InputSize.Lg)
        }

        InputSection("Disabled and read-only", caption) {
            RaincoatInput("Harbour Supplies", {}, label = "Company", enabled = false)
            RaincoatInput("DE89 3704 0044 0532 0130 00", {}, label = "Account number", readOnly = true)
        }

        // The lines directly above and below the small field show how much room it takes: the
        // tests measure the distance between them.
        InputSection("A hidden label and an icon", caption) {
            Column {
                BasicText("Above the small field", Modifier.testTag("small-above"), style = body)
                RaincoatInput(
                    search,
                    { search = it },
                    label = "Search the docs",
                    type = InputType.Search,
                    size = InputSize.Sm,
                    labelHidden = true,
                    leadingIcon = SearchIcon,
                )
                BasicText("Below the small field", Modifier.testTag("small-below"), style = body)
            }
        }
    }
}

@Composable
private fun InputSection(title: String, style: TextStyle, content: @Composable () -> Unit) {
    val space = LocalRaincoatTokens.current.space
    Column(verticalArrangement = Arrangement.spacedBy(space._2.dp)) {
        BasicText(title, Modifier.semantics { heading() }, style = style)
        Column(verticalArrangement = Arrangement.spacedBy(space._4.dp)) { content() }
    }
}

private fun TokenColor.toComposeColor(): Color = Color(argb)

/** A magnifying glass, drawn for this app. An app brings its own icon set. */
private object SearchIcon : Painter() {
    override val intrinsicSize: Size = Size.Unspecified

    override fun DrawScope.onDraw() {
        val stroke = size.minDimension / 8
        val radius = size.minDimension * 0.3f
        val center = Offset(size.width * 0.42f, size.height * 0.42f)
        drawCircle(color = Color.Black, radius = radius, center = center, style = Stroke(stroke))
        drawLine(
            color = Color.Black,
            start = Offset(center.x + radius * 0.7f, center.y + radius * 0.7f),
            end = Offset(size.width * 0.9f, size.height * 0.9f),
            strokeWidth = stroke,
        )
    }
}
