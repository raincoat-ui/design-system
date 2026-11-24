package io.github.raincoatui.ui.snapshots

import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.painter.Painter

/**
 * A simple shape that stands for an app's icon, as on the web: a circle, a square, and a
 * triangle, in turn by [index], on a 24-unit grid. The component tints it.
 */
internal class ShapeIcon(private val index: Int) : Painter() {
    override val intrinsicSize: Size = Size.Unspecified

    override fun DrawScope.onDraw() {
        val unit = size.minDimension / 24f
        when (index % 3) {
            0 -> drawCircle(Color.Black, radius = 8 * unit, center = Offset(12 * unit, 12 * unit))
            1 -> drawRoundRect(
                Color.Black,
                topLeft = Offset(4 * unit, 4 * unit),
                size = Size(16 * unit, 16 * unit),
                cornerRadius = CornerRadius(2 * unit),
            )
            else -> drawPath(
                Path().apply {
                    moveTo(12 * unit, 4 * unit)
                    lineTo(20 * unit, 20 * unit)
                    lineTo(4 * unit, 20 * unit)
                    close()
                },
                Color.Black,
            )
        }
    }
}
