package io.github.raincoatui.ui.components

import io.github.raincoatui.tokens.ColorMode
import io.github.raincoatui.tokens.Density
import io.github.raincoatui.tokens.DialogSize
import io.github.raincoatui.tokens.TokenFormat
import io.github.raincoatui.ui.generated.allThemes
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * The dialog's tokens, and the decisions its layout makes: what scrolls and where the footer's
 * buttons go. Expected token values are looked up by token id, in every theme.
 */
class DialogAppearanceTest {
    @Test
    fun `a dialog takes its colors, sizes, spaces, text styles, and motion from its tokens`() {
        for (theme in allThemes) for (mode in ColorMode.entries) for (density in Density.entries) {
            val set = theme.tokens(mode, density)
            val source = set.flattened()
            val look = DialogAppearance.of(set)
            val where = "${theme.id}, ${mode.id}, ${density.id}"
            assertEquals("scrim, $where", source["dialog.scrim"], TokenFormat.color(look.scrim))
            assertEquals("fill, $where", source["dialog.bg"], TokenFormat.color(look.background))
            assertEquals("text, $where", source["dialog.fg"], TokenFormat.color(look.foreground))
            assertEquals("outline, $where", source["dialog.border.color"], TokenFormat.color(look.border))
            assertEquals("outline width, $where", source["dialog.border.width"], TokenFormat.number(look.borderWidth))
            assertEquals("hairline, $where", source["dialog.divider"], TokenFormat.color(look.divider))
            assertEquals("radius, $where", source["dialog.radius"], TokenFormat.number(look.radius))
            assertEquals("shadow, $where", source["dialog.shadow"], TokenFormat.shadow(look.shadow))
            assertEquals("margin, $where", source["dialog.margin"], TokenFormat.number(look.margin))
            assertEquals("padding, $where", source["dialog.padding"], TokenFormat.number(look.padding))
            assertEquals("gap, $where", source["dialog.gap"], TokenFormat.number(look.gap))
            assertEquals("footer gap, $where", source["dialog.footer.gap"], TokenFormat.number(look.footerGap))
            assertEquals("title, $where", source["dialog.title"], TokenFormat.textStyle(look.title))
            assertEquals("description, $where", source["dialog.description"], TokenFormat.textStyle(look.description))
            for (size in DialogSize.entries) {
                assertEquals("$size, $where", source["dialog.width.${size.id}"], TokenFormat.number(look.width(size)))
            }
            assertEquals("end sheet, $where", source["sheet.width.end"], TokenFormat.number(look.endSheetWidth))
            assertEquals("bottom sheet, $where", source["sheet.max-width.bottom"], TokenFormat.number(look.bottomSheetMaxWidth))
            assertEquals("handle, $where", source["sheet.handle.color"], TokenFormat.color(look.handle.color))
            assertEquals("enter, $where", source["dialog.enter.duration"], TokenFormat.milliseconds(look.enterDuration))
            assertEquals("enter curve, $where", source["dialog.enter.easing"], TokenFormat.easing(look.enterEasing))
            assertEquals("exit, $where", source["dialog.exit.duration"], TokenFormat.milliseconds(look.exitDuration))
            assertEquals("exit curve, $where", source["dialog.exit.easing"], TokenFormat.easing(look.exitEasing))
            assertEquals("half the gap on each side of a line, $where", look.gap, 2 * look.halfGap, 0.0)
        }
    }

    @Test
    fun `the body scrolls while it has room for three lines, and otherwise the whole dialog does`() {
        // 600 - 100 - 80 leaves 420 for the body.
        assertEquals("roomy", DialogScrolling.Body, DialogScrolling.of(600, 100, 80, 24f, 16, hasBody = true))
        assertEquals("exactly three lines", DialogScrolling.Body, DialogScrolling.of(100 + 80 + 72 + 16, 100, 80, 24f, 16, hasBody = true))
        assertEquals("less than three lines", DialogScrolling.Whole, DialogScrolling.of(100 + 80 + 72 + 14, 100, 80, 24f, 16, hasBody = true))
        assertEquals("header and footer too tall", DialogScrolling.Whole, DialogScrolling.of(300, 200, 160, 60f, 16, hasBody = true))
        assertEquals("no body, fits", DialogScrolling.Body, DialogScrolling.of(300, 200, 80, 24f, 0, hasBody = false))
        assertEquals("no body, too tall", DialogScrolling.Whole, DialogScrolling.of(300, 200, 160, 24f, 0, hasBody = false))
    }

    @Test
    fun `buttons that fit sit in a row at the end edge, the primary last, centered on the tallest`() {
        val heights = listOf(40, 48)
        val arrangement = FooterArrangement.of(listOf(80, 120), { index, _ -> heights[index] }, available = 400, spacing = 8)
        assertFalse("a row", arrangement.stacked)
        assertEquals("as wide as the footer", 400, arrangement.width)
        assertEquals("as tall as the tallest", 48, arrangement.height)
        assertEquals("Cancel, then the primary action at the end", listOf(192 to 4, 280 to 0), arrangement.positions)
        assertEquals("each as wide as its label", listOf(80, 120), arrangement.widths)
    }

    @Test
    fun `buttons that do not fit stack, the primary first, each as wide as the footer`() {
        val asked = mutableListOf<Pair<Int, Int>>()
        val arrangement = FooterArrangement.of(
            listOf(180, 240),
            { index, width ->
                asked += index to width
                if (index == 1) 64 else 40
            },
            available = 300,
            spacing = 8,
        )
        assertTrue("stacked", arrangement.stacked)
        assertEquals("each is measured once, at the footer's width", listOf(0 to 300, 1 to 300), asked.sortedBy { it.first })
        assertEquals("the primary action on top, then Cancel", listOf(0 to 72, 0 to 0), arrangement.positions)
        assertEquals("each as wide as the footer", listOf(300, 300), arrangement.widths)
        assertEquals("both, and the space between them", 112, arrangement.height)
    }

    @Test
    fun `a single button never stacks`() {
        val arrangement = FooterArrangement.of(listOf(500), { _, _ -> 40 }, available = 300, spacing = 8)
        assertFalse("one button", arrangement.stacked)
        assertEquals("its own width", 500, arrangement.widths.single())
    }
}
