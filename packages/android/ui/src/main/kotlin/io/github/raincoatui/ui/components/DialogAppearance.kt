package io.github.raincoatui.ui.components

import io.github.raincoatui.tokens.DialogSize
import io.github.raincoatui.tokens.RaincoatTokenSet
import io.github.raincoatui.tokens.TokenColor
import io.github.raincoatui.tokens.TokenEasing
import io.github.raincoatui.tokens.TokenShadow
import io.github.raincoatui.tokens.TokenTextStyle

// What a Dialog, an alert dialog, and a Sheet look like, and how their parts are laid out, taken
// from the dialog and sheet tokens. Nothing here draws, so the tests can check it on its own.

/** The colors, sizes, spaces, and text styles of a dialog or a sheet. Sizes are in dp. */
internal data class DialogAppearance(
    val scrim: TokenColor,
    val background: TokenColor,
    val foreground: TokenColor,
    val border: TokenColor,
    val borderWidth: Double,
    val divider: TokenColor,
    val radius: Double,
    val shadow: TokenShadow,
    val margin: Double,
    val padding: Double,
    val gap: Double,
    val footerGap: Double,
    /** The space between the title and the description. */
    val titleGap: Double,
    val title: TokenTextStyle,
    val description: TokenTextStyle,
    val widthSm: Double,
    val widthMd: Double,
    val widthLg: Double,
    val endSheetWidth: Double,
    val bottomSheetMaxWidth: Double,
    val handle: DialogHandle,
    /** How long the scrim and the panel take to come in, in milliseconds, and their curve. */
    val enterDuration: Int,
    val enterEasing: TokenEasing,
    /** How long they take to leave, and their curve. */
    val exitDuration: Int,
    val exitEasing: TokenEasing,
) {
    /**
     * The space each of two neighbouring sections keeps on its side of the line between them:
     * half the gap, so that a hairline between them sits halfway.
     */
    val halfGap: Double get() = gap / 2

    /** The width of a dialog of a size, before a narrow window makes it narrower. */
    fun width(size: DialogSize): Double = when (size) {
        DialogSize.Sm -> widthSm
        DialogSize.Md -> widthMd
        DialogSize.Lg -> widthLg
    }

    internal companion object {
        fun of(tokens: RaincoatTokenSet): DialogAppearance {
            val dialog = tokens.dialog
            return DialogAppearance(
                scrim = dialog.scrim,
                background = dialog.bg,
                foreground = dialog.fg,
                border = dialog.border.color,
                borderWidth = dialog.border.width,
                divider = dialog.divider,
                radius = dialog.radius,
                shadow = dialog.shadow,
                margin = dialog.margin,
                padding = dialog.padding,
                gap = dialog.gap,
                footerGap = dialog.footer.gap,
                titleGap = tokens.space._2,
                title = dialog.title,
                description = dialog.description,
                widthSm = dialog.width.sm,
                widthMd = dialog.width.md,
                widthLg = dialog.width.lg,
                endSheetWidth = tokens.sheet.width.end,
                bottomSheetMaxWidth = tokens.sheet.maxWidth.bottom,
                handle = DialogHandle(
                    color = tokens.sheet.handle.color,
                    width = tokens.space._8,
                    height = tokens.space._1,
                    offset = tokens.space._2,
                    radius = tokens.radius.full,
                ),
                enterDuration = dialog.enter.duration,
                enterEasing = dialog.enter.easing,
                exitDuration = dialog.exit.duration,
                exitEasing = dialog.exit.easing,
            )
        }
    }
}

/**
 * The drag handle at the top of a bottom sheet: a short rounded bar, [offset] down from the top
 * edge, in the sheet's padding. Its size comes from the spacing scale, since the sheet tokens
 * give it only a color.
 */
internal data class DialogHandle(
    val color: TokenColor,
    val width: Double,
    val height: Double,
    val offset: Double,
    val radius: Double,
)

/** What scrolls in a dialog that does not fit. */
internal enum class DialogScrolling {
    /** The header and the footer stay in place, and the body scrolls between them. */
    Body,

    /** The whole dialog scrolls as one, header and footer included. */
    Whole,
    ;

    internal companion object {
        /**
         * The body scrolls while it has room for three lines of text between the header and the
         * footer; in a window too short for that, as at the largest font scales, the whole dialog
         * does. A dialog without a body scrolls as one when its header and footer do not fit.
         *
         * @param available The height the dialog has, in pixels.
         * @param header The height of the header, its space included.
         * @param footer The height of the footer, its space included, or 0 without one.
         * @param bodyLine The height of one line of the body's text.
         * @param bodySpace The body's own space above and below its content.
         */
        fun of(available: Int, header: Int, footer: Int, bodyLine: Float, bodySpace: Int, hasBody: Boolean): DialogScrolling {
            val room = available - header - footer
            return when {
                !hasBody -> if (room < 0) Whole else Body
                room + 0.5f >= 3 * bodyLine + bodySpace -> Body
                else -> Whole
            }
        }
    }
}

/**
 * Where the footer's buttons go. In a row at the end edge, the primary action last, while they
 * fit; otherwise stacked, the primary action first, each as wide as the footer. Positions are
 * from the footer's top start corner, in pixels, in the order of the buttons; a right-to-left
 * layout mirrors them.
 */
internal data class FooterArrangement(
    val positions: List<Pair<Int, Int>>,
    val widths: List<Int>,
    val width: Int,
    val height: Int,
    val stacked: Boolean,
) {
    internal companion object {
        /**
         * @param widths Each button's own width, on one line.
         * @param heightAt The height of a button, by its index, at a given width.
         * @param available The width of the footer.
         * @param spacing The space between two buttons.
         */
        fun of(widths: List<Int>, heightAt: (Int, Int) -> Int, available: Int, spacing: Int): FooterArrangement {
            val row = widths.sum() + spacing * (widths.size - 1).coerceAtLeast(0)
            if (widths.size < 2 || row <= available) {
                val width = maxOf(row, available)
                val heights = widths.indices.map { heightAt(it, widths[it]) }
                val height = heights.maxOrNull() ?: 0
                var x = width - row
                val positions = widths.indices.map { index ->
                    val position = x to (height - heights[index]) / 2
                    x += widths[index] + spacing
                    position
                }
                return FooterArrangement(positions, widths, width, height, stacked = false)
            }
            // The primary action, the last button, goes on top.
            val heights = widths.indices.map { heightAt(it, available) }
            val positions = MutableList(widths.size) { 0 to 0 }
            var y = 0
            for (index in widths.indices.reversed()) {
                positions[index] = 0 to y
                y += heights[index] + spacing
            }
            return FooterArrangement(
                positions = positions,
                widths = widths.map { available },
                width = available,
                height = (y - spacing).coerceAtLeast(0),
                stacked = true,
            )
        }
    }
}
