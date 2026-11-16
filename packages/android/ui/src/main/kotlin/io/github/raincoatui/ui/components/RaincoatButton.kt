package io.github.raincoatui.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.interaction.collectIsHoveredAsState
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.progressSemantics
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.painter.Painter
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalViewConfiguration
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.github.raincoatui.tokens.ButtonSize
import io.github.raincoatui.tokens.ButtonVariant
import io.github.raincoatui.ui.LocalRaincoatTokens
import io.github.raincoatui.ui.toColor
import io.github.raincoatui.ui.toTextStyle
import kotlin.math.ceil

/**
 * A button that triggers an action. It follows the Raincoat Button spec.
 *
 * Colors, sizes, and text styles come from the theme given to
 * [RaincoatTheme][io.github.raincoatui.ui.RaincoatTheme].
 *
 * @param text The label. It wraps when it does not fit and is never truncated.
 * @param onClick What the button does.
 * @param variant How much emphasis the action gets.
 * @param size The height and text size of the button.
 * @param enabled Whether the button is available. A disabled button cannot be focused or
 *   activated.
 * @param loading Whether the action is in progress. A loading button keeps its label and focus,
 *   shows a spinner in place of the leading icon, and ignores activation.
 * @param fullWidth Whether the button stretches to the width of its container.
 * @param leadingIcon An icon before the label. It is decoration: the label carries the meaning.
 * @param trailingIcon An icon after the label.
 * @param interactionSource Observes or drives the button's presses, hovers, and focus.
 */
@Composable
public fun RaincoatButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    variant: ButtonVariant = ButtonVariant.Standard,
    size: ButtonSize = ButtonSize.Standard,
    enabled: Boolean = true,
    loading: Boolean = false,
    fullWidth: Boolean = false,
    leadingIcon: Painter? = null,
    trailingIcon: Painter? = null,
    interactionSource: MutableInteractionSource? = null,
) {
    ButtonLayout(
        text = text,
        contentDescription = null,
        leadingIcon = leadingIcon,
        trailingIcon = trailingIcon,
        onClick = onClick,
        modifier = modifier,
        variant = variant,
        size = size,
        enabled = enabled,
        loading = loading,
        fullWidth = fullWidth,
        interactionSource = interactionSource,
    )
}

/**
 * A square button that shows only an icon.
 *
 * @param icon The icon.
 * @param contentDescription What the button does, for assistive technology. An icon alone has
 *   no name.
 */
@Composable
public fun RaincoatButton(
    icon: Painter,
    contentDescription: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    variant: ButtonVariant = ButtonVariant.Standard,
    size: ButtonSize = ButtonSize.Standard,
    enabled: Boolean = true,
    loading: Boolean = false,
    interactionSource: MutableInteractionSource? = null,
) {
    ButtonLayout(
        text = null,
        contentDescription = contentDescription,
        leadingIcon = icon,
        trailingIcon = null,
        onClick = onClick,
        modifier = modifier,
        variant = variant,
        size = size,
        enabled = enabled,
        loading = loading,
        fullWidth = false,
        interactionSource = interactionSource,
    )
}

@Composable
private fun ButtonLayout(
    text: String?,
    contentDescription: String?,
    leadingIcon: Painter?,
    trailingIcon: Painter?,
    onClick: () -> Unit,
    modifier: Modifier,
    variant: ButtonVariant,
    size: ButtonSize,
    enabled: Boolean,
    loading: Boolean,
    fullWidth: Boolean,
    interactionSource: MutableInteractionSource?,
) {
    val button = LocalRaincoatTokens.current.button
    val source = interactionSource ?: remember { MutableInteractionSource() }
    val pressed by source.collectIsPressedAsState()
    val hovered by source.collectIsHoveredAsState()
    val focused by source.collectIsFocusedAsState()

    // A disabled button is not also busy.
    val busy = loading && enabled
    val interaction = ButtonInteraction.of(enabled, loading, pressed, hovered)
    val colors = ButtonColors.of(button, variant, interaction)
    val measurements = ButtonMeasurements.of(button, size)

    // Color changes ease in. When the person has turned animations off, Compose makes them
    // immediate.
    val easing = with(button.transition.easing) {
        CubicBezierEasing(x1.toFloat(), y1.toFloat(), x2.toFloat(), y2.toFloat())
    }
    val transition = tween<Color>(durationMillis = button.transition.duration, easing = easing)
    // A button with no fill fades to and from the clear form of its hover fill, so that the
    // change does not pass through a darker color.
    val clearFill = ButtonColors.of(button, variant, ButtonInteraction.Hover).fill?.toColor()?.copy(alpha = 0f)
    val fill by animateColorAsState(
        colors.fill?.toColor() ?: clearFill ?: Color.Transparent,
        transition,
        label = "fill",
    )
    val foreground by animateColorAsState(colors.foreground.toColor(), transition, label = "foreground")

    val density = LocalDensity.current
    val shape = RoundedCornerShape(button.radius.dp)
    val height = measurements.height.dp
    // The touch target is at least the minimum size, whatever the visible height. The platform
    // has a minimum of its own, and the larger one wins.
    val target = maxOf(button.targetMinimum.dp, LocalViewConfiguration.current.minimumTouchTargetSize.height)
    // Icons grow with the text.
    val iconSize = with(density) { measurements.iconSize.sp.toDp() }
    // The space above and below the label centers one line in the height. It is worked out in
    // whole pixels at the default font size, so one line never makes the button taller than the
    // token, and it stays the same when the label wraps or the text is enlarged: the button
    // grows instead.
    val paddingBlock = with(density) {
        val line = ceil((measurements.label.lineHeight * measurements.label.size).dp.toPx()).toInt()
        (maxOf(0, height.roundToPx() - line) / 2).toDp()
    }

    Box(
        modifier = modifier
            .then(if (fullWidth) Modifier.fillMaxWidth() else Modifier)
            .defaultMinSize(minWidth = target, minHeight = target)
            // A loading button stays enabled so that it keeps focus; it ignores activation.
            .clickable(
                interactionSource = source,
                indication = null,
                enabled = enabled,
                role = Role.Button,
                onClick = { if (!loading) onClick() },
            )
            // Assistive technology is told that something is in progress, in words that Compose
            // supplies in the person's language.
            .then(if (busy) Modifier.progressSemantics() else Modifier)
            .then(
                if (contentDescription != null) {
                    Modifier.semantics { this.contentDescription = contentDescription }
                } else {
                    Modifier
                },
            ),
        contentAlignment = Alignment.Center,
    ) {
        Row(
            modifier = Modifier
                .then(if (fullWidth) Modifier.fillMaxWidth() else Modifier)
                .focusRing(
                    visible = focused,
                    color = button.focusRing.color.toColor(),
                    width = button.focusRing.width.dp,
                    offset = button.focusRing.offset.dp,
                    radius = button.radius.dp,
                )
                .defaultMinSize(minWidth = height, minHeight = height)
                .background(fill, shape)
                .then(
                    colors.border?.let { Modifier.border(button.borderWidth.dp, it.toColor(), shape) } ?: Modifier,
                )
                .padding(
                    horizontal = if (text == null) 0.dp else measurements.paddingInline.dp,
                    vertical = if (text == null) 0.dp else paddingBlock,
                ),
            // The row follows the layout direction, so in right-to-left layouts the leading icon
            // is on the right.
            horizontalArrangement = Arrangement.spacedBy(button.gap.dp, Alignment.CenterHorizontally),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (busy) {
                ButtonSpinner(iconSize) { foreground }
            } else if (leadingIcon != null) {
                ButtonIcon(leadingIcon, iconSize, foreground)
            }
            if (text != null) {
                BasicText(
                    text = text,
                    // The label takes the room the icons leave and wraps inside it.
                    modifier = Modifier.weight(1f, fill = false),
                    style = measurements.label.toTextStyle().copy(textAlign = TextAlign.Center),
                    color = { foreground },
                )
            }
            if (trailingIcon != null) {
                ButtonIcon(trailingIcon, iconSize, foreground)
            }
        }
    }
}

/** An icon beside the label. It is decoration, so it has no description. */
@Composable
private fun ButtonIcon(painter: Painter, size: Dp, tint: Color) {
    Image(
        painter = painter,
        contentDescription = null,
        modifier = Modifier.size(size),
        colorFilter = ColorFilter.tint(tint),
    )
}

/** Shown in place of the leading icon while the button's action is in progress. */
@Composable
private fun ButtonSpinner(size: Dp, color: () -> Color) {
    val turn = rememberInfiniteTransition(label = "spinner")
    val angle by turn.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(tween(durationMillis = 1000, easing = LinearEasing)),
        label = "angle",
    )
    Canvas(Modifier.size(size)) {
        val stroke = this.size.minDimension / 8
        val topLeft = Offset(stroke / 2, stroke / 2)
        val arc = Size(this.size.width - stroke, this.size.height - stroke)
        drawArc(color().copy(alpha = 0.25f), 0f, 360f, false, topLeft, arc, style = Stroke(stroke))
        drawArc(color(), angle - 90f, 90f, false, topLeft, arc, style = Stroke(stroke, cap = StrokeCap.Round))
    }
}

/** A ring around the container, with a gap, while the button has keyboard focus. */
private fun Modifier.focusRing(visible: Boolean, color: Color, width: Dp, offset: Dp, radius: Dp): Modifier =
    if (!visible) {
        this
    } else {
        drawBehind {
            val stroke = width.toPx()
            val grow = offset.toPx() + stroke / 2
            drawRoundRect(
                color = color,
                topLeft = Offset(-grow, -grow),
                size = Size(size.width + 2 * grow, size.height + 2 * grow),
                cornerRadius = CornerRadius(radius.toPx() + grow),
                style = Stroke(stroke),
            )
        }
    }
