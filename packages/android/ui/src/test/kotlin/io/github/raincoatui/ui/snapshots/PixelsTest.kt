package io.github.raincoatui.ui.snapshots

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder

/** The comparison of a snapshot with its baseline. */
class PixelsTest {
    @get:Rule
    val folder = TemporaryFolder()

    private val white = 0xFFFFFFFF.toInt()
    private val black = 0xFF000000.toInt()
    private val red = 0xFFFF0000.toInt()

    private fun image(width: Int, height: Int, color: Int) = Pixels(width, height, IntArray(width * height) { color })

    @Test
    fun `an image is the same as itself`() {
        val image = image(4, 3, white)
        assertEquals(0, image.compareWith(image(4, 3, white)).pixels)
    }

    @Test
    fun `a color a little off counts as the same, and one further off as different`() {
        // One level of each channel off, as rounding gives, then a step that is plain to see.
        assertEquals(0, image(2, 2, white).compareWith(image(2, 2, 0xFFFEFEFE.toInt())).pixels)
        assertEquals(4, image(2, 2, white).compareWith(image(2, 2, 0xFFC0C0C0.toInt())).pixels)
    }

    @Test
    fun `each pixel that differs is counted, and marked in red`() {
        val drawn = image(3, 2, white)
        drawn.argb[4] = black
        val difference = image(3, 2, white).compareWith(drawn)
        assertEquals(1, difference.pixels)
        assertEquals(red, difference.image[1, 1])
        // The rest is the baseline, faded.
        assertEquals(white, difference.image[0, 0])
    }

    @Test
    fun `a pixel in one image and not the other differs`() {
        val difference = image(3, 2, white).compareWith(image(3, 3, white))
        assertEquals(3, difference.pixels)
        assertEquals(3, difference.image.width)
        assertEquals(3, difference.image.height)
    }

    @Test
    fun `parts are stacked inside the padding, a gap apart, and blended over the background`() {
        val clear = 0x00000000
        val halfBlack = 0x80000000.toInt()
        val parts = listOf(image(2, 1, black), image(2, 2, halfBlack), image(1, 1, clear))
        val stack = Pixels.stack(parts, width = 4, padding = 1, gap = 1, background = white)
        assertEquals(4, stack.width)
        // Padding, 1 row, gap, 2 rows, gap, 1 row, padding.
        assertEquals(8, stack.height)
        assertEquals(white, stack[0, 0])
        assertEquals(black, stack[1, 1])
        assertEquals(white, stack[3, 1])
        assertEquals(white, stack[1, 2])
        // Half black over white.
        assertEquals(0xFF7F7F7F.toInt(), stack[2, 4])
        // A clear part shows the background.
        assertEquals(white, stack[1, 6])
    }

    @Test
    fun `rows are cut from an image`() {
        val image = Pixels(1, 3, intArrayOf(white, black, red))
        val cut = image.rows(1, 3)
        assertEquals(2, cut.height)
        assertArrayEquals(intArrayOf(black, red), cut.argb)
    }

    @Test
    fun `a PNG keeps every pixel`() {
        val pixels = Pixels(3, 1, intArrayOf(white, 0xFF123456.toInt(), 0x80FF8000.toInt()))
        val file = folder.root.resolve("image.png")
        pixels.writePng(file)
        val read = Pixels.readPng(file)
        assertEquals(3, read.width)
        assertEquals(1, read.height)
        assertArrayEquals(pixels.argb, read.argb)
    }
}
