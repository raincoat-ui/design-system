package io.github.raincoatui.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.interaction.collectIsHoveredAsState
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.relocation.BringIntoViewRequester
import androidx.compose.foundation.relocation.bringIntoViewRequester
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.painter.Painter
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalViewConfiguration
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.github.raincoatui.ui.LocalRaincoatTokens
import io.github.raincoatui.ui.rememberComposedForDisplay
import io.github.raincoatui.ui.toColor
import io.github.raincoatui.ui.toTextStyle
import kotlin.math.ceil

/**
 * One tab of [RaincoatTabs]: its label, an optional leading icon, and the value that selects it.
 *
 * @property value The value the tab selects. It identifies the tab, so each tab's must differ.
 * @property text The label, or null for a tab that shows only an icon.
 * @property icon An icon before the label.
 * @property contentDescription What the panel of a tab that shows only an icon holds, for
 *   assistive technology. Null for a tab with a label, which names it.
 */
public class RaincoatTab<out T> private constructor(
    public val value: T,
    public val text: String?,
    public val icon: Painter?,
    public val contentDescription: String?,
) {
    /**
     * A tab with a label.
     *
     * @param text The label: one or two words, in sentence case. It stays on one line and is
     *   never truncated.
     * @param icon An icon before the label. It is decoration: the label carries the meaning.
     */
    public constructor(value: T, text: String, icon: Painter? = null) : this(value, text, icon, null)

    /**
     * A tab that shows only an icon.
     *
     * @param contentDescription What the tab's panel holds, for assistive technology. An icon
     *   alone has no name.
     */
    public constructor(value: T, icon: Painter, contentDescription: String) :
        this(value, null, icon, contentDescription)
}

/**
 * A row of tabs that switches between panels of related content in one view, with the selected
 * tab's panel under it. It follows the Raincoat Tabs spec. The app controls the selection.
 *
 * The row runs across the full width over a hairline. When the tabs do not fit, it scrolls
 * sideways, and the selected tab, or the one with keyboard focus, is scrolled into view. A tab
 * has no disabled state: leave out a tab that leads nowhere.
 *
 * The row is a selectable group and each tab is selectable with the tab role, which TalkBack
 * reads with its selected state and position. A keyboard moves focus between the tabs as for any
 * control, and Enter or Space selects. Colors, sizes, and text styles come from the theme given to
 * [RaincoatTheme][io.github.raincoatui.ui.RaincoatTheme].
 *
 * @param tabs The tabs, in order. Two to seven is the range the guidelines give.
 * @param selected The value of the selected tab.
 * @param onSelect Called with the value of a tab the person selects.
 * @param panel The content of the selected tab.
 */
@Composable
public fun <T> RaincoatTabs(
    tabs: List<RaincoatTab<T>>,
    selected: T,
    onSelect: (T) -> Unit,
    modifier: Modifier = Modifier,
    panel: @Composable (T) -> Unit,
) {
    Column(modifier) {
        TabRow(tabs, selected, onSelect)
        panel(selected)
    }
}

/**
 * Tabs that keep their own selection. See the other [RaincoatTabs].
 *
 * @param tabs The tabs, in order. There must be at least one.
 * @param initialSelection The value of the tab selected first: the first tab's by default.
 * @param onSelect Called with the value of a tab the person selects.
 * @param panel The content of the selected tab.
 */
@Composable
public fun <T> RaincoatTabs(
    tabs: List<RaincoatTab<T>>,
    modifier: Modifier = Modifier,
    initialSelection: T = tabs.first().value,
    onSelect: (T) -> Unit = {},
    panel: @Composable (T) -> Unit,
) {
    var selected by remember { mutableStateOf(initialSelection) }
    RaincoatTabs(
        tabs = tabs,
        selected = selected,
        onSelect = { value ->
            selected = value
            onSelect(value)
        },
        modifier = modifier,
        panel = panel,
    )
}

/** The row: the tabs in a list that scrolls sideways, over a hairline across the full width. */
@Composable
private fun <T> TabRow(tabs: List<RaincoatTab<T>>, selected: T, onSelect: (T) -> Unit) {
    val tokens = LocalRaincoatTokens.current.tabs
    val divider = tokens.divider.color.toColor()

    // A tab's layout size is what it shows. Where that is smaller than the minimum touch target,
    // Compose also gives the tab the touches that land just outside it, and reports the larger
    // area to assistive technology.
    val platform = LocalViewConfiguration.current
    val viewConfiguration = remember(platform, tokens.targetMinimum) {
        platform.withMinimumTouchTarget(tokens.targetMinimum.dp)
    }
    CompositionLocalProvider(LocalViewConfiguration provides viewConfiguration) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                // The hairline does not scroll, and the tabs are drawn over it, so the indicator
                // covers it under the selected tab.
                .drawBehind {
                    val line = tokens.divider.width.dp.toPx()
                    drawRect(divider, topLeft = Offset(0f, size.height - line), size = Size(size.width, line))
                }
                // The row follows the layout direction: in right-to-left layouts the first tab is
                // on the right, and the row scrolls from the right.
                .horizontalScroll(rememberScrollState())
                .selectableGroup(),
        ) {
            for (tab in tabs) {
                key(tab.value) {
                    Tab(tab, selected = tab.value == selected, onSelect = { onSelect(tab.value) })
                }
            }
        }
    }
}

/** One tab. */
@Composable
private fun Tab(tab: RaincoatTab<*>, selected: Boolean, onSelect: () -> Unit) {
    val tokens = LocalRaincoatTokens.current.tabs
    val source = remember { MutableInteractionSource() }
    val pressed by source.collectIsPressedAsState()
    val hovered by source.collectIsHoveredAsState()
    val focused by source.collectIsFocusedAsState()
    val colors = TabColors.of(tokens, selected, TabInteraction.of(pressed, hovered))
    val measurements = TabMeasurements.of(tokens)

    // Color changes ease in. When the person has turned animations off, Compose makes them
    // immediate. A fill or an indicator that goes away fades to its clear form, so that the
    // change does not pass through a darker color.
    val easing = with(tokens.transition.easing) {
        CubicBezierEasing(x1.toFloat(), y1.toFloat(), x2.toFloat(), y2.toFloat())
    }
    val transition = tween<Color>(durationMillis = tokens.transition.duration, easing = easing)
    val fill by animateColorAsState(
        colors.fill?.toColor() ?: tokens.bg.hover.toColor().copy(alpha = 0f),
        transition,
        label = "fill",
    )
    val foreground by animateColorAsState(colors.foreground.toColor(), transition, label = "foreground")
    val indicator by animateColorAsState(
        colors.indicator?.toColor() ?: tokens.indicator.color.toColor().copy(alpha = 0f),
        transition,
        label = "indicator",
    )
    val focusRing = tokens.focusRing.color.toColor()

    val density = LocalDensity.current
    val height = measurements.height.dp
    // Icons grow with the text.
    val iconSize = with(density) { measurements.iconSize.sp.toDp() }
    // The space above and below the label centers one line in the height, in whole pixels at the
    // default font size. It stays the same when the text is enlarged: the tab grows instead.
    val paddingBlock = with(density) {
        val line = ceil((measurements.label.lineHeight * measurements.label.size).dp.toPx()).toInt()
        (maxOf(0, height.roundToPx() - line) / 2).toDp()
    }

    // A tab selected by the app, or selected first, is scrolled into view once the row is laid
    // out. A tab that takes keyboard focus is scrolled into view by Compose.
    val requester = remember { BringIntoViewRequester() }
    LaunchedEffect(selected) {
        if (selected) {
            withFrameNanos { }
            requester.bringIntoView()
        }
    }

    Row(
        modifier = Modifier
            .bringIntoViewRequester(requester)
            // The focus ring, for keyboard focus, inside the tab's edge, where the scrolling row
            // cannot clip it. It is drawn over the fill and the indicator.
            .drawWithContent {
                drawContent()
                if (focused) {
                    val stroke = tokens.focusRing.width.dp.toPx()
                    drawRect(
                        color = focusRing,
                        topLeft = Offset(stroke / 2, stroke / 2),
                        size = Size(size.width - stroke, size.height - stroke),
                        style = Stroke(stroke),
                    )
                }
            }
            // Space selects, as Enter does, unless Compose already handles it.
            .onKeyEvent { event ->
                if (event.key != Key.Spacebar) return@onKeyEvent false
                if (event.type == KeyEventType.KeyUp) onSelect()
                true
            }
            .selectable(
                selected = selected,
                interactionSource = source,
                indication = null,
                role = Role.Tab,
                onClick = onSelect,
            )
            .then(
                tab.contentDescription?.let { name -> Modifier.semantics { contentDescription = name } }
                    ?: Modifier,
            )
            .defaultMinSize(minHeight = height)
            .drawBehind {
                drawRect(fill)
                val bar = tokens.indicator.width.dp.toPx()
                drawRect(indicator, topLeft = Offset(0f, size.height - bar), size = Size(size.width, bar))
            }
            .padding(horizontal = measurements.paddingInline.dp, vertical = paddingBlock),
        // The row follows the layout direction, so in right-to-left layouts the icon is on the
        // right of the label.
        horizontalArrangement = Arrangement.spacedBy(measurements.gap.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        tab.icon?.let { painter ->
            Image(
                painter = painter,
                contentDescription = null,
                modifier = Modifier.size(iconSize),
                colorFilter = ColorFilter.tint(foreground),
            )
        }
        tab.text?.let { text ->
            BasicText(
                // Composed (NFC), as all read-only text is.
                text = rememberComposedForDisplay(text),
                style = measurements.label.toTextStyle(),
                color = { foreground },
                // One line, at its full width: the row scrolls instead of wrapping or cutting it.
                softWrap = false,
                maxLines = 1,
            )
        }
    }
}
