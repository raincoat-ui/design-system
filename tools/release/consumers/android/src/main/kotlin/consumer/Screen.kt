package consumer

import androidx.compose.foundation.layout.Column
import androidx.compose.runtime.Composable
import io.github.raincoatui.theme.base.BaseTheme
import io.github.raincoatui.tokens.ButtonSize
import io.github.raincoatui.tokens.ButtonVariant
import io.github.raincoatui.tokens.Density
import io.github.raincoatui.ui.RaincoatTheme
import io.github.raincoatui.ui.components.RaincoatButton

@Composable
fun Screen(saving: Boolean, onSave: () -> Unit) {
    RaincoatTheme(BaseTheme, density = Density.Compact) {
        Column {
            RaincoatButton("Save changes", onClick = onSave, variant = ButtonVariant.Primary, loading = saving)
            RaincoatButton("Cancel", onClick = {}, size = ButtonSize.Sm, enabled = !saving)
        }
    }
}
