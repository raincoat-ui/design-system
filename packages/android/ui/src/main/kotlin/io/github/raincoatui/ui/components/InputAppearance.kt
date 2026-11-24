package io.github.raincoatui.ui.components

import io.github.raincoatui.tokens.InputSize
import io.github.raincoatui.tokens.InputType
import io.github.raincoatui.tokens.RaincoatTokenSet.InputTokens
import io.github.raincoatui.tokens.TokenColor
import io.github.raincoatui.tokens.TokenTextStyle

// What an Input looks like for a size, a type, and a state, taken from the Input tokens.
// Nothing here touches Compose.

/**
 * The colors of a field.
 *
 * @property fill Fill of the field.
 * @property border Outline of the field.
 * @property foreground Color of the value, the cursor, and the leading icon.
 * @property placeholder Color of the placeholder, shown while the field is empty.
 */
internal data class InputColors(
    val fill: TokenColor,
    val border: TokenColor,
    val foreground: TokenColor,
    val placeholder: TokenColor,
) {
    companion object {
        /**
         * Disabled wins over everything else. A read-only field has its own fill, and its hairline
         * outline unless it is invalid: an invalid field always has the danger outline.
         */
        fun of(tokens: InputTokens, enabled: Boolean, invalid: Boolean, readOnly: Boolean): InputColors =
            if (!enabled) {
                InputColors(tokens.bg.disabled, tokens.border.disabled, tokens.fg.disabled, tokens.fg.disabled)
            } else {
                InputColors(
                    fill = if (readOnly) tokens.bg.readOnly else tokens.bg.default,
                    border = when {
                        invalid -> tokens.border.invalid
                        readOnly -> tokens.border.readOnly
                        else -> tokens.border.default
                    },
                    foreground = tokens.fg.default,
                    placeholder = tokens.placeholder,
                )
            }
    }
}

/**
 * The measurements of a field of one size.
 *
 * @property height Height of the field when its value is one line.
 */
internal data class InputMeasurements(
    val height: Double,
    val paddingInline: Double,
    val iconSize: Double,
    val label: TokenTextStyle,
    val value: TokenTextStyle,
) {
    companion object {
        // The `when` is exhaustive on purpose: a size added to the spec does not compile until it
        // is given measurements here.
        fun of(tokens: InputTokens, size: InputSize): InputMeasurements = when (size) {
            InputSize.Sm -> InputMeasurements(
                tokens.height.sm, tokens.paddingInline.sm, tokens.iconSize.sm, tokens.label.sm, tokens.value.sm,
            )
            InputSize.Md -> InputMeasurements(
                tokens.height.md, tokens.paddingInline.md, tokens.iconSize.md, tokens.label.md, tokens.value.md,
            )
            InputSize.Lg -> InputMeasurements(
                tokens.height.lg, tokens.paddingInline.lg, tokens.iconSize.lg, tokens.label.lg, tokens.value.lg,
            )
        }
    }
}

/**
 * What the keyboard offers for each type, in plain values that the field turns into Compose's.
 *
 * @property secure Whether what is typed is hidden, as in a password field.
 * @property corrects Whether the keyboard may capitalize and correct what is typed.
 * @property leftToRight Whether the value is left-to-right whatever the language, as an address
 *   or a number is.
 */
internal data class InputKeyboard(
    val keys: Keys,
    val secure: Boolean,
    val corrects: Boolean,
    val leftToRight: Boolean,
) {
    enum class Keys { Text, Email, Password, Phone, Url, Search }

    companion object {
        fun of(type: InputType): InputKeyboard = when (type) {
            InputType.Text -> InputKeyboard(Keys.Text, secure = false, corrects = true, leftToRight = false)
            InputType.Email -> InputKeyboard(Keys.Email, secure = false, corrects = false, leftToRight = true)
            InputType.Password -> InputKeyboard(Keys.Password, secure = true, corrects = false, leftToRight = false)
            InputType.Search -> InputKeyboard(Keys.Search, secure = false, corrects = true, leftToRight = false)
            InputType.Tel -> InputKeyboard(Keys.Phone, secure = false, corrects = false, leftToRight = true)
            InputType.Url -> InputKeyboard(Keys.Url, secure = false, corrects = false, leftToRight = true)
        }
    }
}
