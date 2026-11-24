package io.github.raincoatui.ui

import androidx.compose.foundation.background
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.dropShadow
import androidx.compose.ui.draw.innerShadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.shadow.Shadow
import androidx.compose.ui.unit.DpOffset
import androidx.compose.ui.unit.dp
import io.github.raincoatui.tokens.TokenShadow
import io.github.raincoatui.tokens.TokenShadowLayer

/**
 * Fills [shape] with [fill] and draws a token shadow, such as the toast's `toast.shadow`, with it,
 * as CSS draws a `box-shadow`: the outer layers behind the fill, the inset layers over the fill and
 * behind the element's content.
 *
 * Every component that lifts a surface draws its shadow token and its fill with this, in place of
 * `background`:
 *
 *     Modifier.raincoatShadow(tokens.card.shadow, shape, tokens.card.bg.default.toColor())
 *
 * It draws only the shadow's visible layers, so a shadow of transparent layers, such as the base
 * theme's `shadow.none`, draws nothing at all: only the fill. The first layer is drawn on top, and
 * each is moved by its offset, grown by its spread (shrunk, for an inset layer), and blurred by its
 * blur radius.
 */
public fun Modifier.raincoatShadow(shadow: TokenShadow, shape: Shape, fill: Color): Modifier {
    // Of two shadow modifiers in a chain, the later one draws on top, so the first layer comes last.
    val layers = shadow.visibleLayers.reversed()
    return layers.filter { !it.inset }.fold(this) { modifier, layer -> modifier.dropShadow(shape, layer.toShadow()) }
        .background(fill, shape)
        .then(layers.filter { it.inset }.fold(Modifier as Modifier) { modifier, layer -> modifier.innerShadow(shape, layer.toShadow()) })
}

private fun TokenShadowLayer.toShadow() = Shadow(
    radius = blur.dp,
    color = color.toColor(),
    spread = spread.dp,
    offset = DpOffset(offsetX.dp, offsetY.dp),
)
