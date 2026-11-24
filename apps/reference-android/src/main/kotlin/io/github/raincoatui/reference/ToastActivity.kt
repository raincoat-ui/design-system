package io.github.raincoatui.reference

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import io.github.raincoatui.ui.RaincoatTheme

/** The Toast's screen, in the theme the app was built with. Its tests start it directly. */
class ToastActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            RaincoatTheme(theme = appTheme) {
                ToastScreen()
            }
        }
    }
}
