package io.github.raincoatui.ui.components

import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.MutableTransitionState
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.rememberTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.AnchoredDraggableDefaults
import androidx.compose.foundation.gestures.AnchoredDraggableState
import androidx.compose.foundation.gestures.DraggableAnchors
import androidx.compose.foundation.gestures.Orientation
import androidx.compose.foundation.gestures.anchoredDraggable
import androidx.compose.foundation.gestures.animateTo
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.WindowInsetsSides
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.only
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawOutline
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.clipRect
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.painter.Painter
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.input.InputMode
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.Layout
import androidx.compose.ui.layout.Placeable
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalInputModeManager
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.semantics.paneTitle
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Constraints
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.compose.ui.window.DialogWindowProvider
import io.github.raincoatui.tokens.ButtonSize
import io.github.raincoatui.tokens.ButtonVariant
import io.github.raincoatui.tokens.DialogSize
import io.github.raincoatui.tokens.HeadingVariant
import io.github.raincoatui.tokens.SheetEdge
import io.github.raincoatui.tokens.TextVariant
import io.github.raincoatui.tokens.TokenEasing
import io.github.raincoatui.ui.LocalRaincoatTokens
import io.github.raincoatui.ui.raincoatShadow
import io.github.raincoatui.ui.toColor

/**
 * A dialog: a panel centered over a scrim, for a short task that must be finished or abandoned
 * before going on. It follows the dialog part of the Raincoat Dialog spec.
 *
 * It is shown while [open] is true, in a window of its own: the screen behind is under the scrim,
 * cannot be used, and is out of reach of TalkBack. It fades in and out. Back, predictive back,
 * Escape, a tap on the scrim, and the close button call [onDismissRequest]; set [open] to false
 * there to close it, or keep it open while it holds unsaved changes and ask first.
 *
 * The body scrolls between the header and the footer when it does not fit, with a hairline at
 * an edge while content is beneath it; when the window is too short for three lines of the body,
 * as at the largest font scales, the whole dialog scrolls. The footer's buttons sit at the end
 * edge, the primary action last, and stack, the primary action first, when they do not fit.
 *
 * @param open Whether the dialog is shown.
 * @param onDismissRequest Called when the person asks to close the dialog.
 * @param title Names the dialog. It wraps and is never cut short.
 * @param titleLevel The title's place in the outline of the screen, from 1 to 6. The title is set
 *   in heading-md at every level.
 * @param size The width of the dialog. On a narrower window, it spans the window less a margin.
 * @param description One sentence under the title.
 * @param closeLabel The name of the close button, which is shown only when this is given, at the
 *   end of the header. Give it when the footer has no Cancel.
 * @param initialFocus Where keyboard focus goes when the dialog opens, such as the first field of
 *   a short form.
 * @param actions The footer's buttons, Cancel first and the primary action last.
 * @param content The body.
 * @throws IllegalArgumentException when [titleLevel] is not from 1 to 6.
 */
@Composable
public fun RaincoatDialog(
    open: Boolean,
    onDismissRequest: () -> Unit,
    title: String,
    titleLevel: Int,
    modifier: Modifier = Modifier,
    size: DialogSize = DialogSize.Standard,
    description: String? = null,
    closeLabel: String? = null,
    initialFocus: FocusRequester? = null,
    actions: (@Composable () -> Unit)? = null,
    content: (@Composable () -> Unit)? = null,
) {
    val heading = DialogHeading(title, titleLevel, description, closeLabel)
    ModalWindow(open, onDismissRequest, dismissOnScrim = true, initialFocus = initialFocus) { look, progress ->
        Box(
            Modifier.fillMaxSize()
                .windowInsetsPadding(WindowInsets.safeDrawing)
                .padding(look.margin.dp),
            contentAlignment = Alignment.Center,
        ) {
            ModalPanel(
                heading = heading,
                look = look,
                shape = RoundedCornerShape(look.radius.dp),
                hiddenEdges = PanelEdges.None,
                onClose = onDismissRequest,
                actions = actions,
                content = content,
                modifier = modifier
                    .widthIn(max = look.width(size).dp)
                    .fillMaxWidth()
                    .graphicsLayer { alpha = progress() },
            )
        }
    }
}

/**
 * An alert dialog, which asks people to confirm something consequential or irreversible. It
 * follows the alert-dialog part of the Raincoat Dialog spec.
 *
 * It is a small dialog with Cancel and a confirming button, and no close button. Keyboard focus
 * starts on Cancel. Back, predictive back, and Escape mean Cancel; a tap on the scrim does
 * nothing, so that a stray tap never counts as an answer. Set [open] to false in [onCancel] and
 * in [onConfirm].
 *
 * @param open Whether the alert dialog is shown.
 * @param onCancel Called on Cancel, back, and Escape.
 * @param onConfirm Called on the confirming button.
 * @param title Says what will happen, as a question: "Delete this address?".
 * @param titleLevel The title's place in the outline of the screen, from 1 to 6.
 * @param confirmLabel The confirming button. It repeats the verb of the title: "Delete address".
 * @param cancelLabel The button that closes the alert dialog without doing anything.
 * @param description One sentence under the title, such as what confirming does.
 * @param destructive Whether confirming destroys something: the confirming button is then a
 *   danger button, and otherwise a primary one.
 */
@Composable
public fun RaincoatAlertDialog(
    open: Boolean,
    onCancel: () -> Unit,
    onConfirm: () -> Unit,
    title: String,
    titleLevel: Int,
    confirmLabel: String,
    cancelLabel: String,
    modifier: Modifier = Modifier,
    description: String? = null,
    destructive: Boolean = false,
) {
    val heading = DialogHeading(title, titleLevel, description, closeLabel = null)
    val cancel = remember { FocusRequester() }
    ModalWindow(open, onCancel, dismissOnScrim = false, initialFocus = cancel) { look, progress ->
        Box(
            Modifier.fillMaxSize()
                .windowInsetsPadding(WindowInsets.safeDrawing)
                .padding(look.margin.dp),
            contentAlignment = Alignment.Center,
        ) {
            ModalPanel(
                heading = heading,
                look = look,
                shape = RoundedCornerShape(look.radius.dp),
                hiddenEdges = PanelEdges.None,
                onClose = onCancel,
                actions = {
                    RaincoatButton(cancelLabel, onClick = onCancel, modifier = Modifier.focusRequester(cancel))
                    RaincoatButton(
                        confirmLabel,
                        onClick = onConfirm,
                        variant = if (destructive) ButtonVariant.Danger else ButtonVariant.Primary,
                    )
                },
                content = null,
                modifier = modifier
                    .widthIn(max = look.width(DialogSize.Sm).dp)
                    .fillMaxWidth()
                    .graphicsLayer { alpha = progress() },
            )
        }
    }
}

/**
 * A sheet: a panel that rises from the bottom edge or slides in from the end edge, for a longer
 * task or one that keeps the screen behind in view. It follows the sheet part of the Raincoat
 * Dialog spec.
 *
 * It is shown while [open] is true, in a window of its own, over a scrim, and slides in from its
 * edge. A bottom sheet has a drag handle, and dragging it down far or fast enough asks to close
 * it; it settles back if [open] stays true. Back, predictive back, Escape, a tap on the scrim, and
 * the close button call [onDismissRequest] too: dragging is never the only way out.
 *
 * @param edge The edge the sheet comes from. On a window less than twice its width, an end sheet
 *   comes from the bottom.
 * @see RaincoatDialog for the other parameters.
 */
@Composable
public fun RaincoatSheet(
    open: Boolean,
    onDismissRequest: () -> Unit,
    title: String,
    titleLevel: Int,
    modifier: Modifier = Modifier,
    edge: SheetEdge = SheetEdge.Standard,
    description: String? = null,
    closeLabel: String? = null,
    initialFocus: FocusRequester? = null,
    actions: (@Composable () -> Unit)? = null,
    content: (@Composable () -> Unit)? = null,
) {
    val heading = DialogHeading(title, titleLevel, description, closeLabel)
    ModalWindow(open, onDismissRequest, dismissOnScrim = true, initialFocus = initialFocus) { look, progress ->
        BoxWithConstraints(Modifier.fillMaxSize()) {
            val placed = if (edge == SheetEdge.End && maxWidth < (2 * look.endSheetWidth).dp) SheetEdge.Bottom else edge
            when (placed) {
                SheetEdge.Bottom -> BottomSheet(heading, look, progress, onDismissRequest, actions, content, modifier, open)
                SheetEdge.End -> EndSheet(heading, look, progress, onDismissRequest, actions, content, modifier)
            }
        }
    }
}

/** A position of a bottom sheet that is dragged. */
private enum class SheetPosition { Open, Closed }

@Composable
private fun BottomSheet(
    heading: DialogHeading,
    look: DialogAppearance,
    progress: () -> Float,
    onDismissRequest: () -> Unit,
    actions: (@Composable () -> Unit)?,
    content: (@Composable () -> Unit)?,
    modifier: Modifier,
    open: Boolean,
) {
    val drag = remember { AnchoredDraggableState(SheetPosition.Open) }
    val stillOpen by rememberUpdatedState(open)
    val dismiss by rememberUpdatedState(onDismissRequest)
    // A drag that settles where the sheet is closed asks to close it. If the app keeps it open,
    // it settles back.
    LaunchedEffect(drag) {
        snapshotFlow { drag.settledValue }.collect { value ->
            if (value != SheetPosition.Closed) return@collect
            dismiss()
            withFrameNanos {}
            withFrameNanos {}
            if (stillOpen) drag.animateTo(SheetPosition.Open)
        }
    }
    val easing = look.enterEasing.toEasing()
    Box(
        Modifier.fillMaxSize()
            .windowInsetsPadding(WindowInsets.safeDrawing.only(WindowInsetsSides.Top + WindowInsetsSides.Horizontal))
            .padding(top = look.margin.dp),
        contentAlignment = Alignment.BottomCenter,
    ) {
        ModalPanel(
            heading = heading,
            look = look,
            shape = RoundedCornerShape(topStart = look.radius.dp, topEnd = look.radius.dp),
            hiddenEdges = PanelEdges.Bottom,
            onClose = onDismissRequest,
            actions = actions,
            content = content,
            handle = true,
            insets = WindowInsets.safeDrawing.only(WindowInsetsSides.Bottom),
            modifier = modifier
                .widthIn(max = look.bottomSheetMaxWidth.dp)
                .fillMaxWidth()
                .onSizeChanged { size ->
                    drag.updateAnchors(
                        DraggableAnchors {
                            SheetPosition.Open at 0f
                            SheetPosition.Closed at size.height.toFloat()
                        },
                    )
                }
                // It slides up from below the window, and follows a finger that drags it down.
                .graphicsLayer {
                    val dragged = drag.offset.takeUnless { it.isNaN() } ?: 0f
                    translationY = (1 - progress()) * size.height + dragged
                }
                .anchoredDraggable(
                    state = drag,
                    orientation = Orientation.Vertical,
                    flingBehavior = AnchoredDraggableDefaults.flingBehavior(
                        state = drag,
                        positionalThreshold = { distance -> distance / 2 },
                        animationSpec = tween(look.enterDuration, easing = easing),
                    ),
                ),
        )
    }
}

@Composable
private fun EndSheet(
    heading: DialogHeading,
    look: DialogAppearance,
    progress: () -> Float,
    onDismissRequest: () -> Unit,
    actions: (@Composable () -> Unit)?,
    content: (@Composable () -> Unit)?,
    modifier: Modifier,
) {
    val direction = LocalLayoutDirection.current
    Box(
        Modifier.fillMaxSize()
            .windowInsetsPadding(WindowInsets.safeDrawing.only(WindowInsetsSides.Start)),
        contentAlignment = Alignment.CenterEnd,
    ) {
        ModalPanel(
            heading = heading,
            look = look,
            shape = RoundedCornerShape(topStart = look.radius.dp, bottomStart = look.radius.dp),
            hiddenEdges = PanelEdges.EndAndEnds,
            onClose = onDismissRequest,
            actions = actions,
            content = content,
            insets = WindowInsets.safeDrawing.only(WindowInsetsSides.Vertical + WindowInsetsSides.End),
            modifier = modifier
                .widthIn(max = look.endSheetWidth.dp)
                .fillMaxWidth()
                .fillMaxHeight()
                // It slides in from beyond the end edge: the right, or the left in right-to-left
                // layouts.
                .graphicsLayer {
                    val toward = if (direction == LayoutDirection.Ltr) 1 else -1
                    translationX = (1 - progress()) * size.width * toward
                },
        )
    }
}

/** What a dialog's header shows. */
private data class DialogHeading(
    val title: String,
    val level: Int,
    val description: String?,
    val closeLabel: String?,
)

private fun TokenEasing.toEasing() = CubicBezierEasing(x1.toFloat(), y1.toFloat(), x2.toFloat(), y2.toFloat())

/**
 * The window a dialog or a sheet is shown in, with its scrim, while [open] is true and while it
 * leaves. [content] draws the panel, given how far it has entered, from 0 to 1. The scrim and the
 * panel come in with the enter tokens and leave with the exit tokens; when the person has turned
 * animations off, Compose makes both immediate.
 */
@Composable
private fun ModalWindow(
    open: Boolean,
    onDismissRequest: () -> Unit,
    dismissOnScrim: Boolean,
    initialFocus: FocusRequester?,
    content: @Composable (look: DialogAppearance, progress: () -> Float) -> Unit,
) {
    val look = DialogAppearance.of(LocalRaincoatTokens.current)
    val visibility = remember { MutableTransitionState(false) }
    visibility.targetState = open
    val transition = rememberTransition(visibility, label = "dialog")
    val progress = transition.animateFloat(
        transitionSpec = {
            if (targetState) {
                tween(look.enterDuration, easing = look.enterEasing.toEasing())
            } else {
                tween(look.exitDuration, easing = look.exitEasing.toEasing())
            }
        },
        label = "progress",
    ) { shown -> if (shown) 1f else 0f }
    if (!transition.currentState && !transition.targetState) return

    val dismiss by rememberUpdatedState(onDismissRequest)
    // The window of the dialog takes the screen's layout direction, and its input mode: a keyboard
    // in use on the screen is in use in the dialog, as Android's touch mode is one for every
    // window.
    val direction = LocalLayoutDirection.current
    val screenInputMode by rememberUpdatedState(LocalInputModeManager.current.inputMode)
    Dialog(
        onDismissRequest = { dismiss() },
        properties = DialogProperties(
            dismissOnBackPress = true,
            dismissOnClickOutside = false,
            usePlatformDefaultWidth = false,
            decorFitsSystemWindows = false,
        ),
    ) {
        // The window draws no dimming of its own: the scrim is the theme's.
        val view = LocalView.current
        SideEffect { (view.parent as? DialogWindowProvider)?.window?.setDimAmount(0f) }
        val inputModes = LocalInputModeManager.current
        // Once the panel is laid out, keyboard focus goes where the app or the kind says.
        LaunchedEffect(Unit) {
            withFrameNanos {}
            if (screenInputMode == InputMode.Keyboard) inputModes.requestInputMode(InputMode.Keyboard)
            initialFocus?.requestFocus()
        }
        CompositionLocalProvider(LocalLayoutDirection provides direction) {
            ModalScreen(look, progress::value, dismissOnScrim, dismiss = { dismiss() }, content)
        }
    }
}

/** The scrim over the whole window, and the panel over it. Escape asks to close. */
@Composable
private fun ModalScreen(
    look: DialogAppearance,
    progress: () -> Float,
    dismissOnScrim: Boolean,
    dismiss: () -> Unit,
    content: @Composable (look: DialogAppearance, progress: () -> Float) -> Unit,
) {
    Box(
        Modifier.fillMaxSize().onPreviewKeyEvent { event ->
            // Escape asks to close, as back does.
            if (event.key == Key.Escape && event.type == KeyEventType.KeyDown) {
                dismiss()
                true
            } else {
                false
            }
        },
    ) {
        Box(
            Modifier.fillMaxSize()
                .graphicsLayer { alpha = progress() }
                .background(look.scrim.toColor())
                // A tap on the scrim asks to close; it is no control of its own for
                // TalkBack, which closes with back.
                .then(if (dismissOnScrim) Modifier.pointerInput(Unit) { detectTapGestures { dismiss() } } else Modifier),
        )
        content(look, progress)
    }
}

/** The edges of a panel that touch the window, and so have no outline. */
private enum class PanelEdges { None, Bottom, EndAndEnds }

/**
 * The panel: a raised surface with a hairline outline and the shadow token, holding the header,
 * the body, and the footer. The body scrolls between the header and the footer while it has room
 * for three lines; otherwise the whole panel scrolls.
 */
@Composable
private fun ModalPanel(
    heading: DialogHeading,
    look: DialogAppearance,
    shape: Shape,
    hiddenEdges: PanelEdges,
    onClose: () -> Unit,
    actions: (@Composable () -> Unit)?,
    content: (@Composable () -> Unit)?,
    modifier: Modifier,
    handle: Boolean = false,
    insets: WindowInsets? = null,
) {
    BoxWithConstraints(
        modifier
            .semantics { paneTitle = heading.title }
            .raincoatShadow(look.shadow, shape, look.background.toColor())
            .clip(shape)
            .outline(shape, look, hiddenEdges)
            .then(if (insets != null) Modifier.windowInsetsPadding(insets) else Modifier),
    ) {
        val density = LocalDensity.current
        var headerHeight by remember { mutableIntStateOf(0) }
        var footerHeight by remember { mutableIntStateOf(0) }
        val bodyLine = with(density) { (look.description.size * look.description.lineHeight).sp.toPx() }
        val bodySpace = with(density) { (look.halfGap + if (actions != null) look.halfGap else look.padding).dp.roundToPx() }
        val available = if (constraints.hasBoundedHeight) constraints.maxHeight else Int.MAX_VALUE
        val scrolling = DialogScrolling.of(available, headerHeight, footerHeight, bodyLine, bodySpace, content != null)
        val bodyScroll = rememberScrollState()
        val wholeScroll = rememberScrollState()
        val header = @Composable { divider: Boolean ->
            DialogHeader(
                heading = heading,
                look = look,
                isLast = content == null && actions == null,
                divider = divider,
                onClose = onClose,
                modifier = Modifier.onSizeChanged { headerHeight = it.height },
            )
        }
        val footer = @Composable { divider: Boolean ->
            if (actions != null) {
                DialogFooter(
                    look = look,
                    divider = divider,
                    actions = actions,
                    modifier = Modifier.onSizeChanged { footerHeight = it.height },
                )
            }
        }
        when (scrolling) {
            DialogScrolling.Body -> Column {
                header(bodyScroll.value > 0)
                if (content != null) {
                    DialogBody(
                        look = look,
                        isLast = actions == null,
                        content = content,
                        modifier = Modifier.weight(1f, fill = false).verticalScroll(bodyScroll),
                    )
                }
                footer(content != null && bodyScroll.value < bodyScroll.maxValue)
            }
            DialogScrolling.Whole -> Column(Modifier.verticalScroll(wholeScroll)) {
                header(false)
                if (content != null) DialogBody(look, isLast = actions == null, content = content)
                footer(false)
            }
        }
        if (handle) {
            Box(
                Modifier.align(Alignment.TopCenter)
                    .padding(top = look.handle.offset.dp)
                    .size(look.handle.width.dp, look.handle.height.dp)
                    .background(look.handle.color.toColor(), RoundedCornerShape(look.handle.radius.dp)),
            )
        }
    }
}

/**
 * The hairline outline of a panel, drawn inside its edge as a border is, except along the edges
 * that touch the window.
 */
private fun Modifier.outline(shape: Shape, look: DialogAppearance, hidden: PanelEdges): Modifier = drawWithContent {
    drawContent()
    val stroke = look.borderWidth.dp.toPx()
    val inside = shape.createOutline(Size(size.width - stroke, size.height - stroke), layoutDirection, this)
    val endIsRight = layoutDirection == LayoutDirection.Ltr
    val hideEnds = hidden == PanelEdges.EndAndEnds
    clipRect(
        left = if (hideEnds && !endIsRight) stroke else 0f,
        top = if (hideEnds) stroke else 0f,
        right = if (hideEnds && endIsRight) size.width - stroke else size.width,
        bottom = if (hidden != PanelEdges.None) size.height - stroke else size.height,
    ) {
        translate(stroke / 2, stroke / 2) { drawOutline(inside, look.border.toColor(), style = Stroke(stroke)) }
    }
}

/** The hairline along one edge of a section, while content is beneath it. */
private fun Modifier.divider(look: DialogAppearance, shown: Boolean, atTop: Boolean): Modifier =
    if (!shown) {
        this
    } else {
        drawBehind {
            val stroke = look.borderWidth.dp.toPx()
            val y = if (atTop) stroke / 2 else size.height - stroke / 2
            drawLine(look.divider.toColor(), Offset(0f, y), Offset(size.width, y), stroke)
        }
    }

/** The title, the description under it, and the close button at the end. */
@Composable
private fun DialogHeader(
    heading: DialogHeading,
    look: DialogAppearance,
    isLast: Boolean,
    divider: Boolean,
    onClose: () -> Unit,
    modifier: Modifier,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .divider(look, divider, atTop = false)
            .padding(
                start = look.padding.dp,
                end = look.padding.dp,
                top = look.padding.dp,
                bottom = (if (isLast) look.padding else look.halfGap).dp,
            ),
        horizontalArrangement = Arrangement.spacedBy(look.gap.dp),
        verticalAlignment = Alignment.Top,
    ) {
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(look.titleGap.dp)) {
            RaincoatHeading(heading.title, heading.level, variant = HeadingVariant.HeadingMd)
            if (heading.description != null) RaincoatText(heading.description, variant = TextVariant.BodyMd)
        }
        if (heading.closeLabel != null) {
            val ghost = LocalRaincoatTokens.current.button.ghost.fg.toColor()
            val cross = remember(ghost) { DialogCross(ghost) }
            RaincoatButton(
                icon = cross,
                contentDescription = heading.closeLabel,
                onClick = onClose,
                variant = ButtonVariant.Ghost,
                size = ButtonSize.Sm,
            )
        }
    }
}

/** The body: the app's content, between the header and the footer. */
@Composable
private fun DialogBody(
    look: DialogAppearance,
    isLast: Boolean,
    content: @Composable () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier
            .fillMaxWidth()
            .padding(
                start = look.padding.dp,
                end = look.padding.dp,
                top = look.halfGap.dp,
                bottom = (if (isLast) look.padding else look.halfGap).dp,
            ),
    ) {
        content()
    }
}

/**
 * The footer: the buttons in a row at the end edge while they fit, and otherwise stacked, the
 * primary action first, each as wide as the footer.
 */
@Composable
private fun DialogFooter(
    look: DialogAppearance,
    divider: Boolean,
    actions: @Composable () -> Unit,
    modifier: Modifier,
) {
    Layout(
        content = actions,
        modifier = modifier
            .fillMaxWidth()
            .divider(look, divider, atTop = true)
            .padding(start = look.padding.dp, end = look.padding.dp, top = look.halfGap.dp, bottom = look.padding.dp),
    ) { measurables, constraints ->
        val spacing = look.footerGap.dp.roundToPx()
        val natural = measurables.map { it.maxIntrinsicWidth(Constraints.Infinity) }
        val placeables = arrayOfNulls<Placeable>(measurables.size)
        val arrangement = FooterArrangement.of(
            widths = natural,
            heightAt = { index, width ->
                val placeable = measurables[index].measure(Constraints.fixedWidth(width.coerceAtMost(constraints.maxWidth)))
                placeables[index] = placeable
                placeable.height
            },
            available = constraints.maxWidth,
            spacing = spacing,
        )
        layout(arrangement.width.coerceAtMost(constraints.maxWidth), arrangement.height) {
            placeables.forEachIndexed { index, placeable ->
                val (x, y) = arrangement.positions[index]
                placeable?.placeRelative(x, y)
            }
        }
    }
}

/** The cross of the close button, in the ghost button's color. */
private class DialogCross(private val color: Color) : Painter() {
    override val intrinsicSize: Size = Size.Unspecified

    override fun DrawScope.onDraw() {
        val inset = size.minDimension / 4
        val stroke = size.minDimension / 8
        drawLine(color, Offset(inset, inset), Offset(size.width - inset, size.height - inset), stroke, StrokeCap.Round)
        drawLine(color, Offset(size.width - inset, inset), Offset(inset, size.height - inset), stroke, StrokeCap.Round)
    }
}
