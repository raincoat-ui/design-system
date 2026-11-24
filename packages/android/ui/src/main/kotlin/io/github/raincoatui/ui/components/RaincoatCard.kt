package io.github.raincoatui.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.interaction.collectIsHoveredAsState
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.isTraversalGroup
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.traversalIndex
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import io.github.raincoatui.tokens.HeadingVariant
import io.github.raincoatui.ui.LocalRaincoatTokens
import io.github.raincoatui.ui.raincoatShadow
import io.github.raincoatui.ui.toColor

/**
 * A surface that groups content about one subject, such as an order or a person. It follows the
 * Raincoat Card spec.
 *
 * A card is static unless it is given [onClick]: a container that can hold links and buttons.
 * With [onClick] the whole card is one button, which a touch, a click, Enter, or Space anywhere on
 * it activates. Its semantics merge its content, title first, and it holds no other controls.
 * Compose has no link role, so a card that leads to another screen is a button too, as a row that
 * opens a screen is.
 *
 * The card fills the width it is given and grows with its content. Its outline, fill, and shadow
 * come from the theme given to [RaincoatTheme][io.github.raincoatui.ui.RaincoatTheme].
 *
 * @param title What the card is about. It is a heading in the `heading-sm` look, and it wraps and
 *   is never cut short.
 * @param level The title's place in the outline of the screen, from 1 to 6. Android has no heading
 *   levels; it keeps code the same on every platform.
 * @param onClick What the whole card does. Null, the default, makes a static card.
 * @param media An image at the top of the card, edge to edge, with the card's top corners. Give it
 *   a height and a content description that says what it shows, or none when it only decorates.
 * @param footer Actions, as Buttons, at the end of a static card. They wrap when they do not fit.
 * @param interactionSource Observes or drives an interactive card's presses, hovers, and focus.
 * @param content The body: any content, such as text, a list of facts, or a status.
 * @throws IllegalArgumentException when [level] is not from 1 to 6.
 */
@Composable
public fun RaincoatCard(
    title: String,
    level: Int,
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null,
    media: (@Composable () -> Unit)? = null,
    footer: (@Composable () -> Unit)? = null,
    interactionSource: MutableInteractionSource? = null,
    content: (@Composable () -> Unit)? = null,
) {
    val card = LocalRaincoatTokens.current.card
    val source = interactionSource ?: remember { MutableInteractionSource() }
    val pressed by source.collectIsPressedAsState()
    val hovered by source.collectIsHoveredAsState()
    val focused by source.collectIsFocusedAsState()

    // A static card has no states: it is always at rest.
    val interactive = onClick != null
    val state = if (interactive) CardState.of(pressed, hovered) else CardState.Rest
    val colors = CardColors.of(card, state)

    // Outline and fill changes ease in. When the person has turned animations off, Compose makes
    // them immediate.
    val easing = with(card.transition.easing) {
        CubicBezierEasing(x1.toFloat(), y1.toFloat(), x2.toFloat(), y2.toFloat())
    }
    val transition = tween<Color>(durationMillis = card.transition.duration, easing = easing)
    val fill by animateColorAsState(colors.fill.toColor(), transition, label = "fill")
    val border by animateColorAsState(colors.border.toColor(), transition, label = "border")

    val shape = RoundedCornerShape(card.radius.dp)
    // The padding is inside the outline, as on the web.
    val padding = (card.border.width + card.padding).dp
    val gap = card.gap.dp

    Column(
        modifier = modifier
            .fillMaxWidth()
            .cardFocusRing(
                visible = interactive && focused,
                color = card.focusRing.color.toColor(),
                width = card.focusRing.width.dp,
                offset = card.focusRing.offset.dp,
                radius = card.radius.dp,
            )
            .then(
                if (onClick != null) {
                    // One button for the whole card, whose semantics merge the card's content.
                    Modifier.clickable(
                        interactionSource = source,
                        indication = null,
                        role = Role.Button,
                        onClick = onClick,
                    )
                } else {
                    // The parts of a static card are read together, title first.
                    Modifier.semantics { isTraversalGroup = true }
                },
            )
            .raincoatShadow(card.shadow, shape, fill)
            .border(card.border.width.dp, border, shape)
            // The media's top corners follow the card's.
            .clip(shape),
    ) {
        if (media != null) {
            Box(Modifier.fillMaxWidth()) { media() }
        }
        Column(
            modifier = Modifier
                .fillMaxWidth()
                // Below the media, the gap between parts; without it, the padding.
                .padding(start = padding, end = padding, bottom = padding, top = if (media != null) gap else padding),
            verticalArrangement = Arrangement.spacedBy(gap),
        ) {
            RaincoatHeading(
                text = title,
                level = level,
                // Read first, though the media is drawn above it.
                modifier = Modifier.semantics { traversalIndex = -1f },
                variant = HeadingVariant.HeadingSm,
            )
            if (content != null) {
                Column(Modifier.fillMaxWidth()) { content() }
            }
            if (footer != null) {
                // At the end edge, which is the left in right-to-left layouts, in rows.
                FlowRow(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(gap, Alignment.End),
                    verticalArrangement = Arrangement.spacedBy(gap),
                ) {
                    footer()
                }
            }
        }
    }
}

/** A ring around the card, with a gap, while an interactive card has keyboard focus. */
private fun Modifier.cardFocusRing(visible: Boolean, color: Color, width: Dp, offset: Dp, radius: Dp): Modifier =
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
