package io.github.raincoatui.reference

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import io.github.raincoatui.ui.RaincoatTheme

/**
 * The reference app's only screen for now: the Button in the states of its spec, in the theme
 * the app was built with (appTheme, written by the build).
 */
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            RaincoatTheme(theme = appTheme) {
                ButtonScreen()
            }
        }
    }
}
