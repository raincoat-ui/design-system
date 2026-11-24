package io.github.raincoatui.tokens

import java.util.Locale

/** A color in sRGB, packed as `0xAARRGGBB`. */
@JvmInline
public value class TokenColor(public val argb: Long) {
    public val alpha: Int get() = ((argb shr 24) and 0xFF).toInt()
    public val red: Int get() = ((argb shr 16) and 0xFF).toInt()
    public val green: Int get() = ((argb shr 8) and 0xFF).toInt()
    public val blue: Int get() = (argb and 0xFF).toInt()
}

/** A composed text style. Sizes are in sp; the line height is a multiple of the size. */
public data class TokenTextStyle(
    /** Font families in order of preference. */
    public val families: List<String>,
    public val size: Double,
    /** A weight from 1 to 1000, where 400 is regular. */
    public val weight: Int,
    public val letterSpacing: Double,
    public val lineHeight: Double,
)

/** A cubic Bézier timing curve. */
public data class TokenEasing(
    public val x1: Double,
    public val y1: Double,
    public val x2: Double,
    public val y2: Double,
)

/** One layer of a shadow. Offsets, blur, and spread are in dp. */
public data class TokenShadowLayer(
    public val color: TokenColor,
    public val offsetX: Double,
    public val offsetY: Double,
    /** The blur radius, as CSS defines it for `box-shadow`. */
    public val blur: Double,
    public val spread: Double,
    /** Whether the shadow falls inside the shape instead of behind it. */
    public val inset: Boolean,
) {
    /** Whether the layer paints anything. A transparent layer does not, whatever its size. */
    public val isVisible: Boolean get() = color.alpha > 0
}

/** A shadow of one or more layers. The first layer is drawn on top, as in CSS. */
public data class TokenShadow(
    public val layers: List<TokenShadowLayer>,
) {
    /**
     * The layers that paint anything. A component draws only these, so a shadow of transparent
     * layers, such as the base's `shadow.none`, draws nothing at all.
     */
    public val visibleLayers: List<TokenShadowLayer> get() = layers.filter { it.isVisible }
}

/** The four color modes every theme provides. */
public enum class ColorMode(public val id: String) {
    Light("light"),
    Dark("dark"),
    LightHighContrast("light-hc"),
    DarkHighContrast("dark-hc"),
    ;

    public companion object {
        /** The mode for a color scheme and contrast setting. */
        public fun of(isDark: Boolean, increasedContrast: Boolean): ColorMode = when {
            isDark && increasedContrast -> DarkHighContrast
            isDark -> Dark
            increasedContrast -> LightHighContrast
            else -> Light
        }
    }
}

/** How tightly controls are sized. */
public enum class Density(public val id: String) {
    Comfortable("comfortable"),
    Compact("compact"),
}

/** A theme: the token values for every color mode and density. Themes are equal by id. */
public class RaincoatTheme(
    public val id: String,
    private val resolve: (ColorMode, Density) -> RaincoatTokenSet,
) {
    public fun tokens(mode: ColorMode, density: Density): RaincoatTokenSet = resolve(mode, density)

    override fun equals(other: Any?): Boolean = other is RaincoatTheme && other.id == id

    override fun hashCode(): Int = id.hashCode()

    override fun toString(): String = "RaincoatTheme($id)"
}

/**
 * Writes token values as text in one canonical form, so that the values compiled into a theme
 * can be compared with the values in the token source.
 */
public object TokenFormat {
    public fun color(value: TokenColor): String {
        val rgb = String.format(Locale.ROOT, "#%02x%02x%02x", value.red, value.green, value.blue)
        return if (value.alpha < 0xFF) rgb + String.format(Locale.ROOT, "%02x", value.alpha) else rgb
    }

    public fun number(value: Double): String = String.format(Locale.ROOT, "%.4f", value)

    /** Durations are stored in milliseconds and written in seconds. */
    public fun milliseconds(value: Int): String = number(value / 1000.0)

    public fun integer(value: Int): String = value.toString()

    public fun families(value: List<String>): String = value.joinToString(", ")

    public fun easing(value: TokenEasing): String =
        listOf(value.x1, value.y1, value.x2, value.y2).joinToString(",") { number(it) }

    public fun textStyle(value: TokenTextStyle): String = listOf(
        families(value.families),
        number(value.size),
        integer(value.weight),
        number(value.letterSpacing),
        number(value.lineHeight),
    ).joinToString("|")

    public fun shadow(value: TokenShadow): String = value.layers.joinToString(", ") { layer ->
        listOf(
            color(layer.color),
            number(layer.offsetX),
            number(layer.offsetY),
            number(layer.blur),
            number(layer.spread),
            layer.inset.toString(),
        ).joinToString("|")
    }
}
