package io.github.raincoatui.ui.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicText
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.painter.Painter
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.LocalViewConfiguration
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.error
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.text
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextDirection
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.github.raincoatui.tokens.InputSize
import io.github.raincoatui.tokens.InputType
import io.github.raincoatui.ui.LocalRaincoatTokens
import io.github.raincoatui.ui.rememberComposedForDisplay
import io.github.raincoatui.ui.toColor
import io.github.raincoatui.ui.toTextStyle
import kotlin.math.ceil

/**
 * A text field with its label, an optional description, and an error message, in one line or
 * several. It follows the Raincoat Input spec.
 *
 * It is built on Compose Foundation's [BasicTextField]. Colors, sizes, and text styles come from
 * the theme given to [RaincoatTheme][io.github.raincoatui.ui.RaincoatTheme].
 *
 * Assistive technology is given the label as the field's name, then the description. An invalid
 * field carries Compose's error semantics with its message, which TalkBack reads with the field.
 * Android has no required state: mark the fields that are optional in their label.
 *
 * The field takes the room it shows. A field shorter than the minimum touch target also takes
 * touches that land just above and below it.
 *
 * @param value The text in the field.
 * @param onValueChange Called with the new text as the person types.
 * @param label What the field is for, above it. It wraps and is never truncated.
 * @param type What the field holds. It chooses the keyboard.
 * @param size The height and text size of the field.
 * @param description Help that is read before typing, between the label and the field.
 * @param placeholder An example of the format, shown while the field is empty. Never
 *   instructions, and never the label.
 * @param invalid Whether the value is not accepted. An invalid field shows its error.
 * @param error What to do to make the value acceptable, below the field. An invalid field must
 *   have one.
 * @param multiline Whether the field takes several lines. It holds text, whatever the type,
 *   starts [rows] lines tall, and grows with its content.
 * @param rows How many lines tall a multi-line field starts.
 * @param enabled Whether the field is available. A disabled field cannot be focused or changed.
 * @param readOnly Whether the value can be focused and selected but not changed.
 * @param labelHidden Whether the label is hidden from view. It is still the field's name.
 * @param leadingIcon A decorative icon at the start of the field.
 * @param keyboardActions What the keyboard's action key does, such as submitting the form.
 * @param interactionSource Observes the field's focus and presses.
 */
@Composable
public fun RaincoatInput(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    type: InputType = InputType.Standard,
    size: InputSize = InputSize.Standard,
    description: String? = null,
    placeholder: String? = null,
    invalid: Boolean = false,
    error: String? = null,
    multiline: Boolean = false,
    rows: Int = 3,
    enabled: Boolean = true,
    readOnly: Boolean = false,
    labelHidden: Boolean = false,
    leadingIcon: Painter? = null,
    keyboardActions: KeyboardActions = KeyboardActions.Default,
    interactionSource: MutableInteractionSource? = null,
) {
    val input = LocalRaincoatTokens.current.input
    val source = interactionSource ?: remember { MutableInteractionSource() }
    val focused by source.collectIsFocusedAsState()

    val keyboard = InputKeyboard.of(if (multiline) InputType.Text else type)
    val colors = InputColors.of(input, enabled, invalid, readOnly)
    val measurements = InputMeasurements.of(input, size)
    val shownError = error?.takeIf { invalid }
    val lines = maxOf(1, rows)

    val density = LocalDensity.current
    val shape = RoundedCornerShape(input.radius.dp)
    val height = measurements.height.dp
    val valueLine = measurements.value.lineHeight * measurements.value.size
    // The space above and below the value centers one line in the height. It is worked out in
    // whole pixels at the default font size, as for the Button, and stays the same when the text
    // is enlarged or a multi-line field grows: the field grows instead.
    val paddingBlock = with(density) {
        val line = ceil(valueLine.dp.toPx()).toInt()
        (maxOf(0, height.roundToPx() - line) / 2).toDp()
    }
    // The icon grows with the text, and sits beside the first line.
    val iconSize = with(density) { measurements.iconSize.sp.toDp() }
    val firstLine = with(density) { valueLine.sp.toDp() }

    val valueStyle = measurements.value.toTextStyle().let { style ->
        // Addresses and numbers are left-to-right whatever the language.
        if (keyboard.leftToRight) style.copy(textDirection = TextDirection.Ltr) else style
    }
    val outerDirection = LocalLayoutDirection.current
    val fieldDirection = if (keyboard.leftToRight) LayoutDirection.Ltr else outerDirection

    // Where the field is shorter than the minimum touch target, Compose also gives it the touches
    // that land just outside it, and reports the larger area to assistive technology.
    val platform = LocalViewConfiguration.current
    val viewConfiguration = remember(platform, input.targetMinimum) {
        platform.withMinimumTouchTarget(input.targetMinimum.dp)
    }
    CompositionLocalProvider(LocalViewConfiguration provides viewConfiguration) {
        BasicTextField(
            value = value,
            onValueChange = onValueChange,
            modifier = modifier
                .fillMaxWidth()
                // The error is the field's state, with its message.
                .semantics { if (shownError != null) this.error(shownError) },
            enabled = enabled,
            readOnly = readOnly,
            textStyle = valueStyle.copy(color = colors.foreground.toColor()),
            keyboardOptions = keyboard.options(),
            keyboardActions = keyboardActions,
            singleLine = !multiline,
            minLines = if (multiline) lines else 1,
            visualTransformation = if (keyboard.secure) PasswordVisualTransformation() else VisualTransformation.None,
            interactionSource = source,
            cursorBrush = SolidColor(colors.foreground.toColor()),
            // The label, the description, and the error are part of the field, so that the field
            // carries them for assistive technology, in that order, and a touch on them focuses
            // it.
            decorationBox = { innerTextField ->
                Column(
                    modifier = if (labelHidden) {
                        Modifier.semantics { text = AnnotatedString(label) }
                    } else {
                        Modifier
                    },
                    verticalArrangement = Arrangement.spacedBy(input.gap.dp),
                ) {
                    if (!labelHidden) {
                        // The read-only texts are composed (NFC); the value, which the person
                        // edits, is left as it is.
                        BasicText(
                            text = rememberComposedForDisplay(label),
                            style = measurements.label.toTextStyle().copy(color = input.label.fg.toColor()),
                        )
                    }
                    if (description != null) {
                        BasicText(
                            text = rememberComposedForDisplay(description),
                            style = input.description.type.toTextStyle().copy(color = input.description.fg.toColor()),
                        )
                    }
                    CompositionLocalProvider(LocalLayoutDirection provides fieldDirection) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                // Whenever the field has focus: it has focus only to be typed in.
                                .focusRing(
                                    visible = focused,
                                    color = input.focusRing.color.toColor(),
                                    width = input.focusRing.width.dp,
                                    offset = input.focusRing.offset.dp,
                                    radius = input.radius.dp,
                                )
                                .defaultMinSize(minHeight = height)
                                .background(colors.fill.toColor(), shape)
                                .border(input.borderWidth.dp, colors.border.toColor(), shape)
                                .padding(horizontal = measurements.paddingInline.dp, vertical = paddingBlock),
                            // The row follows the layout direction, so in right-to-left layouts the
                            // leading icon is on the right.
                            horizontalArrangement = Arrangement.spacedBy(input.gap.dp),
                            verticalAlignment = if (multiline) Alignment.Top else Alignment.CenterVertically,
                        ) {
                            if (leadingIcon != null) {
                                Box(Modifier.height(firstLine), contentAlignment = Alignment.Center) {
                                    Image(
                                        painter = leadingIcon,
                                        contentDescription = null,
                                        modifier = Modifier.size(iconSize),
                                        colorFilter = ColorFilter.tint(colors.foreground.toColor()),
                                    )
                                }
                            }
                            Box(
                                modifier = Modifier.weight(1f),
                                contentAlignment = if (multiline) Alignment.TopStart else Alignment.CenterStart,
                            ) {
                                if (value.isEmpty() && placeholder != null) {
                                    BasicText(
                                        text = rememberComposedForDisplay(placeholder),
                                        style = valueStyle.copy(color = colors.placeholder.toColor()),
                                    )
                                }
                                innerTextField()
                            }
                        }
                    }
                    if (shownError != null) {
                        // The field says it, as its error.
                        BasicText(
                            text = rememberComposedForDisplay(shownError),
                            modifier = Modifier.clearAndSetSemantics {},
                            style = input.error.type.toTextStyle().copy(color = input.error.fg.toColor()),
                        )
                    }
                }
            },
        )
    }
}

/** The keyboard for a type of field, in Compose's terms. */
private fun InputKeyboard.options(): KeyboardOptions = KeyboardOptions(
    capitalization = if (corrects) KeyboardCapitalization.Unspecified else KeyboardCapitalization.None,
    autoCorrectEnabled = corrects,
    keyboardType = when (keys) {
        InputKeyboard.Keys.Text, InputKeyboard.Keys.Search -> KeyboardType.Text
        InputKeyboard.Keys.Email -> KeyboardType.Email
        InputKeyboard.Keys.Password -> KeyboardType.Password
        InputKeyboard.Keys.Phone -> KeyboardType.Phone
        InputKeyboard.Keys.Url -> KeyboardType.Uri
    },
    imeAction = if (keys == InputKeyboard.Keys.Search) ImeAction.Search else ImeAction.Unspecified,
)
