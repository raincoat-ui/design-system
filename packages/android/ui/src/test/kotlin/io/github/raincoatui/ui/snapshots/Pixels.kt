package io.github.raincoatui.ui.snapshots

import java.awt.image.BufferedImage
import java.io.File
import javax.imageio.ImageIO

/**
 * An image as ARGB pixels, row by row, in sRGB and not premultiplied: what Compose's
 * `ImageBitmap.readPixels` gives. PNG files are read and written with the JVM's ImageIO, so that
 * a baseline is compared pixel for pixel with what was drawn, whatever encoder wrote it.
 */
internal class Pixels(val width: Int, val height: Int, val argb: IntArray) {
    init {
        require(argb.size == width * height) { "$width×$height pixels need ${width * height} values, not ${argb.size}" }
    }

    operator fun get(x: Int, y: Int): Int = argb[y * width + x]

    fun writePng(file: File) {
        val image = BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB)
        image.setRGB(0, 0, width, height, argb, 0, width)
        file.parentFile?.mkdirs()
        check(ImageIO.write(image, "png", file)) { "No PNG writer for $file" }
    }

    /**
     * How this image, the baseline, differs from [drawn]. A pixel differs when its color is
     * further from the baseline's than [THRESHOLD], by the measure the web's comparison uses
     * (pixelmatch), or when it is in one image and not the other. Antialiased edges are not
     * excused: on the same runner, Robolectric draws the same pixels every time.
     */
    fun compareWith(drawn: Pixels): Difference {
        val columns = maxOf(width, drawn.width)
        val rows = maxOf(height, drawn.height)
        val image = IntArray(columns * rows)
        var pixels = 0
        for (y in 0 until rows) {
            for (x in 0 until columns) {
                val inBoth = x < width && y < height && x < drawn.width && y < drawn.height
                image[y * columns + x] = if (inBoth && colorDelta(this[x, y], drawn[x, y]) <= MAX_DELTA) {
                    faded(this[x, y])
                } else {
                    pixels++
                    DIFFERENT
                }
            }
        }
        return Difference(pixels, Pixels(columns, rows, image))
    }

    /** The number of pixels that differ, and an image that shows them in red on a faded baseline. */
    class Difference(val pixels: Int, val image: Pixels)

    companion object {
        /** The largest color difference that counts as the same color: pixelmatch's default. */
        const val THRESHOLD = 0.1

        /** The largest YIQ difference, between black and white, is 35215. */
        private const val MAX_DELTA = 35215 * THRESHOLD * THRESHOLD

        private const val DIFFERENT = 0xFFFF0000.toInt()

        fun readPng(file: File): Pixels {
            val image = ImageIO.read(file) ?: error("$file is not an image ImageIO can read")
            val argb = image.getRGB(0, 0, image.width, image.height, null, 0, image.width)
            return Pixels(image.width, image.height, argb)
        }

        /**
         * The squared difference of two colors in the YIQ color space, weighted as in Kotsarenko
         * and Ramos, "Measuring perceived color difference using YIQ NTSC transmission color space
         * in mobile applications" (2010): the measure pixelmatch uses. A color that is not opaque
         * is first blended with white.
         */
        fun colorDelta(first: Int, second: Int): Double {
            if (first == second) return 0.0
            val (r1, g1, b1) = onWhite(first)
            val (r2, g2, b2) = onWhite(second)
            val y = luma(r1, g1, b1) - luma(r2, g2, b2)
            val i = (r1 * 0.59597799 - g1 * 0.27417610 - b1 * 0.32180189) -
                (r2 * 0.59597799 - g2 * 0.27417610 - b2 * 0.32180189)
            val q = (r1 * 0.21147017 - g1 * 0.52261711 + b1 * 0.31114694) -
                (r2 * 0.21147017 - g2 * 0.52261711 + b2 * 0.31114694)
            return 0.5053 * y * y + 0.299 * i * i + 0.1957 * q * q
        }

        private fun onWhite(argb: Int): Triple<Double, Double, Double> {
            val alpha = (argb ushr 24 and 0xFF) / 255.0
            fun channel(shift: Int) = 255 + ((argb ushr shift and 0xFF) - 255) * alpha
            return Triple(channel(16), channel(8), channel(0))
        }

        private fun luma(r: Double, g: Double, b: Double) = r * 0.29889531 + g * 0.58662247 + b * 0.11448223

        /** A pixel of the baseline, in gray and faded toward white, as pixelmatch shows it. */
        private fun faded(argb: Int): Int {
            val (r, g, b) = onWhite(argb)
            val gray = (255 + (luma(r, g, b) - 255) * 0.1).toInt().coerceIn(0, 255)
            return (0xFF shl 24) or (gray shl 16) or (gray shl 8) or gray
        }
    }
}

/**
 * Where the snapshots read their baselines and write what they draw. The repository's root
 * build.gradle.kts gives each directory to the test task as a system property.
 */
internal class SnapshotFiles(
    private val baselines: File,
    private val output: File,
    /** Whether to compare with the baselines. Only CI does: the baselines are drawn there. */
    val compare: Boolean,
) {
    /** The committed baseline: src/test/__screenshots__/<theme>/<component>/<snapshot>.png. */
    fun baseline(name: String) = File(baselines, "$name.png")

    /** What CI drew for a baseline that is missing or differs, laid out as the baselines are. */
    fun actual(name: String) = File(output, "actual/$name.png")

    /** Where what CI drew differs from the baseline. */
    fun diff(name: String) = File(output, "diff/$name.png")

    /** What was drawn outside CI, to look at. It is never a baseline. */
    fun local(name: String) = File(output, "local/$name.png")

    companion object {
        fun fromSystem() = SnapshotFiles(
            baselines = File(property("raincoat.snapshots.baselines")),
            output = File(property("raincoat.snapshots.output")),
            compare = property("raincoat.snapshots.compare").toBooleanStrict(),
        )

        private fun property(name: String): String =
            System.getProperty(name) ?: error("$name is not set: run the snapshots with Gradle")
    }
}
