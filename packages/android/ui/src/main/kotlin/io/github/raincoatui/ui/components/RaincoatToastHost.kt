package io.github.raincoatui.ui.components

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.SizeTransform
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.border
import androidx.compose.foundation.gestures.Orientation
import androidx.compose.foundation.gestures.draggable
import androidx.compose.foundation.gestures.rememberDraggableState
import androidx.compose.foundation.hoverable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsHoveredAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.WindowInsetsSides
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.only
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.Stable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.painter.Painter
import androidx.compose.ui.layout.Layout
import androidx.compose.ui.platform.AccessibilityManager
import androidx.compose.ui.platform.LocalAccessibilityManager
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.dismiss
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Constraints
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.compose.currentStateAsState
import io.github.raincoatui.tokens.ButtonSize
import io.github.raincoatui.tokens.ButtonVariant
import io.github.raincoatui.tokens.TokenEasing
import io.github.raincoatui.ui.LocalRaincoatTokens
import io.github.raincoatui.ui.rememberComposedForDisplay
import io.github.raincoatui.ui.raincoatShadow
import io.github.raincoatui.ui.toColor
import io.github.raincoatui.ui.toTextStyle
import kotlin.coroutines.resume
import kotlin.math.ceil
import kotlin.math.roundToInt
import kotlinx.coroutines.CancellableContinuation
import kotlinx.coroutines.delay
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/** How long a toast without an action stays, while nothing pauses it (RFC 0008). */
internal const val TOAST_DURATION_MILLIS: Long = 6000

/** How often the timer of a toast counts down, while nothing pauses it. */
private const val TOAST_TICK_MILLIS: Long = 100

/** How a toast closed. */
public enum class RaincoatToastResult {
    /** The action was used. */
    ActionPerformed,

    /** It closed without the action: by its close button, a swipe, or its timer. */
    Closed,
}

/**
 * The toasts of a [RaincoatToastHost]: remember one with `remember { RaincoatToastHostState() }`
 * and call [show] from a coroutine, as with Compose's snackbar host.
 *
 * One toast is shown at a time. A call to [show] while another toast is on the screen waits for
 * it, so toasts appear in the order they were asked for.
 */
@Stable
public class RaincoatToastHostState {
    private val mutex = Mutex()

    /** The toast on the screen, or null. */
    internal var current: ToastData? by mutableStateOf(null)
        private set

    /**
     * Shows a toast without an action, and suspends until it closes. It closes after 6 seconds,
     * or later when the person's accessibility timeout is longer.
     *
     * @param message What happened, in one short sentence, such as "Address deleted", in the
     *   app's language. It wraps and is never truncated.
     * @param closeLabel The name of a close button, such as "Close". Without it, there is no close
     *   button.
     */
    public suspend fun show(message: String, closeLabel: String? = null): RaincoatToastResult =
        present(message, actionLabel = null, closeLabel = closeLabel)

    /**
     * Shows a toast with an action and a close button, and suspends until one of them is used.
     * It never closes by itself.
     *
     * @param message What happened, in one short sentence, in the app's language.
     * @param actionLabel One or two words, such as "Undo" or "View".
     * @param closeLabel The name of the close button, such as "Close", read by assistive
     *   technology. The button shows only a cross.
     * @return [RaincoatToastResult.ActionPerformed] when the action was used.
     */
    public suspend fun show(message: String, actionLabel: String, closeLabel: String): RaincoatToastResult =
        present(message, actionLabel, closeLabel)

    private suspend fun present(message: String, actionLabel: String?, closeLabel: String?): RaincoatToastResult =
        mutex.withLock {
            try {
                suspendCancellableCoroutine { continuation ->
                    current = ToastData(message, actionLabel, closeLabel, continuation)
                }
            } finally {
                current = null
            }
        }
}

/** A toast on the screen, and how to close it. */
internal class ToastData(
    val message: String,
    val actionLabel: String?,
    val closeLabel: String?,
    private val continuation: CancellableContinuation<RaincoatToastResult>,
) {
    fun close(result: RaincoatToastResult) {
        if (continuation.isActive) continuation.resume(result)
    }
}

/**
 * How long a toast stays: 6 seconds, or the person's accessibility timeout ("Time to take action")
 * when that is longer. Null for a toast with an action, which stays until it is used or closed
 * (WCAG 2.2.1).
 */
internal fun timeout(toast: ToastData, accessibility: AccessibilityManager?): Long? {
    if (toast.actionLabel != null) return null
    val recommended = accessibility?.calculateRecommendedTimeoutMillis(
        TOAST_DURATION_MILLIS,
        containsIcons = toast.closeLabel != null,
        containsText = true,
        containsControls = toast.closeLabel != null,
    ) ?: TOAST_DURATION_MILLIS
    return maxOf(TOAST_DURATION_MILLIS, recommended)
}

/** Why the timer of the toast on the screen is stopped. */
internal enum class ToastPause {
    /** A mouse pointer is over the toast. */
    Hover,

    /** Keyboard focus is in the toast. */
    Focus,
}

/**
 * Shows the toasts of [state], one at a time, at the bottom center of the space it is given.
 *
 * Put it over the screen's content, at the bottom, as you would a snackbar host:
 *
 *     Box(Modifier.fillMaxSize()) {
 *         Content()
 *         RaincoatToastHost(toasts, Modifier.align(Alignment.BottomCenter))
 *     }
 *
 * A toast sits above the on-screen keyboard and the system bars. To keep it above a bar of your
 * own, place the host above the bar. A toast never takes focus; its message is a polite live
 * region, so TalkBack says it after whatever it is saying. Without an action, a toast closes after
 * 6 seconds, or the person's accessibility timeout ("Time to take action") when that is longer.
 * The time stops while a mouse pointer is over the toast, while keyboard focus is in it, and while
 * the app is in the background. A swipe down closes it.
 */
@Composable
public fun RaincoatToastHost(state: RaincoatToastHostState, modifier: Modifier = Modifier) {
    val toast = LocalRaincoatTokens.current.toast
    val current = state.current

    // What stops the timer of the toast on the screen. Each toast starts without a pause of its
    // own; the app's being in the background holds for all of them.
    var hovered by remember(current) { mutableStateOf(false) }
    var focused by remember(current) { mutableStateOf(false) }
    val lifecycle by LocalLifecycleOwner.current.lifecycle.currentStateAsState()
    val inBackground = !lifecycle.isAtLeast(Lifecycle.State.STARTED)
    val paused by rememberUpdatedState(hovered || focused || inBackground)

    // The time the toast on the screen has left. It counts down while nothing pauses it, and goes
    // on from where it stopped, to within one count.
    val accessibility = LocalAccessibilityManager.current
    LaunchedEffect(current) {
        val shown = current ?: return@LaunchedEffect
        var left = timeout(shown, accessibility) ?: return@LaunchedEffect
        while (left > 0) {
            delay(TOAST_TICK_MILLIS)
            if (!paused) left -= TOAST_TICK_MILLIS
        }
        shown.close(RaincoatToastResult.Closed)
    }

    val density = LocalDensity.current
    val slide = with(density) { toast.margin.dp.roundToPx() }
    Box(
        modifier = modifier
            .fillMaxWidth()
            .windowInsetsPadding(WindowInsets.safeDrawing.only(WindowInsetsSides.Horizontal + WindowInsetsSides.Bottom))
            .padding(toast.margin.dp),
        contentAlignment = Alignment.BottomCenter,
    ) {
        AnimatedContent(
            targetState = current,
            transitionSpec = {
                // Entering, the toast slides up from as far below as its margin while it fades in;
                // leaving, the reverse. The next toast enters once the last one has left. When the
                // person has turned animations off, Compose makes all of this immediate.
                val enterEasing = toast.enter.easing.toEasing()
                val exitEasing = toast.exit.easing.toEasing()
                val wait = if (initialState != null) toast.exit.duration else 0
                val enter = fadeIn(tween(toast.enter.duration, wait, enterEasing)) +
                    slideInVertically(tween(toast.enter.duration, wait, enterEasing)) { slide }
                val exit = fadeOut(tween(toast.exit.duration, easing = exitEasing)) +
                    slideOutVertically(tween(toast.exit.duration, easing = exitEasing)) { slide }
                (enter togetherWith exit).using(SizeTransform(clip = false))
            },
            contentAlignment = Alignment.BottomCenter,
            label = "toast",
        ) { shown ->
            if (shown != null) {
                ToastLayout(
                    message = shown.message,
                    actionLabel = shown.actionLabel,
                    onAction = { shown.close(RaincoatToastResult.ActionPerformed) },
                    closeLabel = shown.closeLabel,
                    onClose = { shown.close(RaincoatToastResult.Closed) },
                    onPauseChange = { reason, pause ->
                        when (reason) {
                            ToastPause.Hover -> hovered = pause
                            ToastPause.Focus -> focused = pause
                        }
                    },
                    swipeToClose = true,
                )
            }
        }
    }
}

/**
 * A toast without an action, drawn on its own. It stands still: it is not announced as it
 * appears, and does not close by itself. To show a toast to people, use [RaincoatToastHost].
 *
 * @param message What happened, in one short sentence.
 * @param closeLabel The name of a close button. Without it, there is no close button.
 * @param onClose What the close button does.
 */
@Composable
public fun RaincoatToast(
    message: String,
    modifier: Modifier = Modifier,
    closeLabel: String? = null,
    onClose: () -> Unit = {},
) {
    ToastLayout(
        message = message,
        actionLabel = null,
        onAction = {},
        closeLabel = closeLabel,
        onClose = onClose,
        modifier = modifier,
    )
}

/**
 * A toast with an action and a close button, drawn on its own. To show a toast to people, use
 * [RaincoatToastHost].
 *
 * @param message What happened, in one short sentence.
 * @param actionLabel One or two words, such as "Undo".
 * @param onAction What the action does.
 * @param closeLabel The name of the close button, read by assistive technology.
 * @param onClose What the close button does.
 */
@Composable
public fun RaincoatToast(
    message: String,
    actionLabel: String,
    onAction: () -> Unit,
    closeLabel: String,
    onClose: () -> Unit,
    modifier: Modifier = Modifier,
) {
    ToastLayout(
        message = message,
        actionLabel = actionLabel,
        onAction = onAction,
        closeLabel = closeLabel,
        onClose = onClose,
        modifier = modifier,
    )
}

@Composable
private fun ToastLayout(
    message: String,
    actionLabel: String?,
    onAction: () -> Unit,
    closeLabel: String?,
    onClose: () -> Unit,
    modifier: Modifier = Modifier,
    onPauseChange: (ToastPause, Boolean) -> Unit = { _, _ -> },
    swipeToClose: Boolean = false,
) {
    val tokens = LocalRaincoatTokens.current
    val toast = tokens.toast
    val button = tokens.button
    val density = LocalDensity.current
    val shape = RoundedCornerShape(toast.radius.dp)
    val style = toast.message.toTextStyle()
    val fg = toast.fg.toColor()

    // The first line of the message is centered on the small buttons beside it. As in the
    // Button, the space is worked out in whole pixels, so one line is never taller than a button.
    val messageInset = with(density) {
        val line = ceil(toast.message.lineHeight * toast.message.size.dp.toPx()).toInt()
        (maxOf(0, button.height.sm.dp.roundToPx() - line) / 2).toDp()
    }

    val hover = remember { MutableInteractionSource() }
    val hovered by hover.collectIsHoveredAsState()
    val onPause by rememberUpdatedState(onPauseChange)
    LaunchedEffect(hovered) { onPause(ToastPause.Hover, hovered) }

    // A swipe down moves the toast with the finger. Once it is as long as a touch target, letting
    // go closes the toast; a shorter one lets it go back.
    var swipe by remember { mutableFloatStateOf(0f) }
    val swipeState = rememberDraggableState { delta -> swipe = maxOf(0f, swipe + delta) }
    val closeAfter = with(density) { button.targetMinimum.dp.toPx() }

    Row(
        modifier = modifier
            .widthIn(max = toast.maxWidth.dp)
            .offset { IntOffset(0, swipe.roundToInt()) }
            .then(
                if (swipeToClose) {
                    Modifier.draggable(
                        state = swipeState,
                        orientation = Orientation.Vertical,
                        onDragStopped = { if (swipe >= closeAfter) onClose() else swipe = 0f },
                    )
                } else {
                    Modifier
                },
            )
            .hoverable(hover)
            .onFocusChanged { onPause(ToastPause.Focus, it.hasFocus) }
            // Escape closes the toast while keyboard focus is in it.
            .onKeyEvent { event ->
                if (event.key != Key.Escape) return@onKeyEvent false
                if (event.type == KeyEventType.KeyUp) onClose()
                true
            }
            // TalkBack offers to dismiss the toast, as a swipe would.
            .semantics { dismiss { onClose(); true } }
            .raincoatShadow(toast.shadow, shape, toast.bg.toColor())
            .border(toast.border.width.dp, toast.border.color.toColor(), shape)
            // The outline is drawn inside the padding, so the content keeps its distance from it.
            .padding(
                horizontal = (toast.paddingInline + toast.border.width).dp,
                vertical = (toast.paddingBlock + toast.border.width).dp,
            ),
        horizontalArrangement = Arrangement.spacedBy(toast.gap.dp),
        verticalAlignment = Alignment.Top,
    ) {
        MessageAndAction(
            gap = toast.gap.dp,
            modifier = Modifier.weight(1f, fill = false),
            message = {
                BasicText(
                    // Composed (NFC), as all read-only text is.
                    text = rememberComposedForDisplay(message),
                    // Announced politely, after whatever TalkBack is saying.
                    modifier = Modifier
                        .semantics { liveRegion = LiveRegionMode.Polite }
                        .padding(vertical = messageInset),
                    style = style,
                    color = { fg },
                )
            },
            action = actionLabel?.let { label ->
                {
                    RaincoatButton(
                        label,
                        onClick = onAction,
                        variant = ButtonVariant.Ghost,
                        size = ButtonSize.Sm,
                    )
                }
            },
        )
        if (closeLabel != null) {
            val cross = remember(button.ghost.fg) { ToastCross(button.ghost.fg.toColor()) }
            RaincoatButton(
                icon = cross,
                contentDescription = closeLabel,
                onClick = onClose,
                variant = ButtonVariant.Ghost,
                size = ButtonSize.Sm,
            )
        }
    }
}

/**
 * The message, and the action after it while the two fit on one line. When they do not, the
 * message takes the whole width and the action moves below it, at the end.
 */
@Composable
private fun MessageAndAction(
    gap: Dp,
    modifier: Modifier,
    message: @Composable () -> Unit,
    action: (@Composable () -> Unit)?,
) {
    Layout(contents = listOf(message, action ?: {}), modifier = modifier) { (messages, actions), constraints ->
        val space = gap.roundToPx()
        val loose = constraints.copy(minWidth = 0, minHeight = 0)
        val actionPlaceable = actions.firstOrNull()?.measure(loose)
        val actionWidth = actionPlaceable?.let { it.width + space } ?: 0
        val text = messages.first()
        val oneLine = text.maxIntrinsicWidth(Constraints.Infinity) + actionWidth <= constraints.maxWidth
        if (oneLine) {
            val messagePlaceable = text.measure(loose.copy(maxWidth = constraints.maxWidth - actionWidth))
            val width = messagePlaceable.width + actionWidth
            val height = maxOf(messagePlaceable.height, actionPlaceable?.height ?: 0)
            layout(width, height) {
                messagePlaceable.placeRelative(0, 0)
                actionPlaceable?.placeRelative(messagePlaceable.width + space, 0)
            }
        } else {
            val messagePlaceable = text.measure(loose)
            val width = constraints.maxWidth
            val below = actionPlaceable?.let { it.height + space } ?: 0
            layout(width, messagePlaceable.height + below) {
                messagePlaceable.placeRelative(0, 0)
                actionPlaceable?.placeRelative(width - actionPlaceable.width, messagePlaceable.height + space)
            }
        }
    }
}

/**
 * The cross of the close button, drawn here rather than taken from an icon set, with the stroke
 * of the Button's spinner. The Button tints it with its own color.
 */
private class ToastCross(private val color: Color) : Painter() {
    override val intrinsicSize: Size = Size.Unspecified

    override fun DrawScope.onDraw() {
        val stroke = size.minDimension / 8
        val inset = size.minDimension / 4
        drawLine(color, Offset(inset, inset), Offset(size.width - inset, size.height - inset), stroke, StrokeCap.Round)
        drawLine(color, Offset(size.width - inset, inset), Offset(inset, size.height - inset), stroke, StrokeCap.Round)
    }
}

private fun TokenEasing.toEasing() = CubicBezierEasing(x1.toFloat(), y1.toFloat(), x2.toFloat(), y2.toFloat())
