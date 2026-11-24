package io.github.raincoatui.ui

import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.platform.ViewRootForTest
import androidx.compose.ui.test.SemanticsNodeInteraction
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.junit4.ComposeTestRule

/**
 * Captures this node from a frame drawn just before the capture.
 *
 * On Android 17, Robolectric draws each frame for real, and a capture copies the last frame the
 * renderer drew. On a device, Compose draws the window again before a capture; under Robolectric
 * it does not. So a capture shows a frame only if the renderer drew it, and the renderer can skip
 * one. It skips a frame whose vsync is less than 2 ms after the vsync of the frame it drew last.
 * Robolectric turns its own clock into the host's clock to give each frame a vsync. In the first
 * frame after `setContent`, Compose asks for another frame while it applies the window insets,
 * and Robolectric moves its clock 15 ms on before the frame reaches the renderer. The frame's
 * vsync is then 15 ms in the past. When the frame before it was drawn less than about 13 ms
 * earlier, the renderer skips it. Nothing asks for that frame again, and every capture of the
 * scene shows the window as it was before the scene: its background only.
 *
 * So the window is drawn again first. Nothing in it changes, so Compose asks for no frame, and the
 * new frame's vsync is the current time: the renderer draws it, with all of the scene.
 */
internal fun SemanticsNodeInteraction.captureRedrawn(compose: ComposeTestRule): ImageBitmap {
    val view = (fetchSemanticsNode().root as ViewRootForTest).view
    compose.runOnUiThread { view.rootView.invalidate() }
    compose.waitForIdle()
    return captureToImage()
}
