package io.github.raincoatui.reference

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import io.github.raincoatui.ui.RaincoatTheme

/**
 * The Input in the states of its spec, in the theme the app was built with (appTheme, written by
 * the build). Its tests open it directly.
 */
class InputActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            RaincoatTheme(theme = appTheme) {
                InputScreen()
            }
        }
    }
}
