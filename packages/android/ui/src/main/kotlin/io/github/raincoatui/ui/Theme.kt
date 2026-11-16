package io.github.raincoatui.ui

import android.app.UiModeManager
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.ProvidableCompositionLocal
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.platform.LocalContext
import io.github.raincoatui.theme.base.BaseTheme
import io.github.raincoatui.tokens.ColorMode
import io.github.raincoatui.tokens.Density
import io.github.raincoatui.tokens.RaincoatTheme
import io.github.raincoatui.tokens.RaincoatTokenSet

/**
 * The tokens in effect: those of the theme, color mode, and density given to [RaincoatTheme].
 *
 * Components read every color, size, and text style from here. Outside a [RaincoatTheme] it
 * holds the base theme in light mode at comfortable density.
 */
public val LocalRaincoatTokens: ProvidableCompositionLocal<RaincoatTokenSet> =
    staticCompositionLocalOf { BaseTheme.tokens(ColorMode.Light, Density.Comfortable) }

/**
 * Applies a Raincoat theme to [content].
 *
 * An app calls this once, near its root, with the theme module it depends on:
 * `RaincoatTheme(BaseTheme) { App() }`.
 *
 * @param theme The theme to draw with.
 * @param darkTheme Whether to use the dark color modes. Follows the system by default.
 * @param increasedContrast Whether to use the high-contrast color modes. By default, follows
 *   the system's contrast setting, which exists from Android 14.
 * @param density How tightly controls are sized.
 */
@Composable
public fun RaincoatTheme(
    theme: RaincoatTheme = BaseTheme,
    darkTheme: Boolean = isSystemInDarkTheme(),
    increasedContrast: Boolean = isSystemContrastIncreased(),
    density: Density = Density.Comfortable,
    content: @Composable () -> Unit,
) {
    val tokens = remember(theme, darkTheme, increasedContrast, density) {
        theme.tokens(ColorMode.of(isDark = darkTheme, increasedContrast = increasedContrast), density)
    }
    CompositionLocalProvider(LocalRaincoatTokens provides tokens, content = content)
}

/** Whether the person has asked the system for more contrast. False before Android 14. */
@Composable
private fun isSystemContrastIncreased(): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) return false
    val context = LocalContext.current
    val uiModeManager = remember(context) { context.getSystemService(UiModeManager::class.java) }
        ?: return false
    var contrast by remember(uiModeManager) { mutableStateOf(uiModeManager.contrast) }
    // The setting can change while the app is running, and no configuration change says so.
    DisposableEffect(uiModeManager) {
        val listener = UiModeManager.ContrastChangeListener { contrast = it }
        uiModeManager.addContrastChangeListener(context.mainExecutor, listener)
        onDispose { uiModeManager.removeContrastChangeListener(listener) }
    }
    return contrast > 0f
}
