#if canImport(SwiftUI) && canImport(CoreGraphics)
    import CoreGraphics
    @testable import Raincoat
    import RaincoatThemeBase
    import RaincoatTokens
    import SwiftUI
    import Testing

    // TEMPORARY. A diagnostic for the toast's size on macOS, recorded as an issue so that it shows
    // in the log. Delete before the pull request is ready.
    //
    // ToastProbe is a copy of RaincoatToast's body, built in steps: step 1 is the message, and
    // each later step adds the next piece in the order the body adds it. The test draws the probe
    // up to each step, then all of it but one step, then RaincoatToast itself.

    @MainActor
    private func measured(_ view: some View, width: CGFloat?) -> String {
        let renderer = ImageRenderer(content: view.raincoatTheme(.base))
        renderer.scale = 1
        renderer.proposedSize = ProposedViewSize(width: width, height: nil)
        guard let image = renderer.cgImage else { return "no image" }
        return "\(image.width)x\(image.height)"
    }

    /// What the probe's body last saw.
    @MainActor private var probeSaw = "nothing"

    extension View {
        /// The view with `change` applied when `enabled`, and as it is otherwise.
        @MainActor @ViewBuilder
        fileprivate func probeStep<Changed: View>(_ enabled: Bool, _ change: (Self) -> Changed) -> some View {
            if enabled {
                change(self)
            } else {
                self
            }
        }
    }

    /// RaincoatToast's body up to step `last`, without step `skip`, for a toast without an
    /// action or a close button. Steps:
    ///  1. the message, at scale 1, without `accessibilityFocused`
    ///  2. MessageAndAction
    ///  3. HStack
    ///  4. the two paddings
    ///  5. foregroundStyle
    ///  6. raincoatShadow
    ///  7. overlay with strokeBorder
    ///  8. contentShape
    ///  9. onHover
    /// 10. onChange
    /// 11. offset
    /// 12. simultaneousGesture
    /// 13. accessibilityElement
    /// 14. accessibilityAction
    /// 15. fixedSize
    /// 16. frame(maxWidth:)
    /// 17. the message at the scale of `@ScaledMetric`
    /// 18. the message's `accessibilityFocused`
    private struct ToastProbe: View {
        let last: Int
        let skip: Int?
        let message = "Message archived"
        let action: RaincoatToast.Action? = nil
        let closeLabel: String? = nil

        @Tokens private var tokens
        @Environment(\.raincoatToastControl) private var control
        @ScaledMetric(relativeTo: .body) private var textScale: CGFloat = 1
        @AccessibilityFocusState private var voiceOverFocus: ToastPart?
        @FocusState private var keyboardFocus: ToastPart?
        @State private var swipe: CGFloat = 0

        init(last: Int, skip: Int? = nil) {
            self.last = last
            self.skip = skip
        }

        private func on(_ step: Int) -> Bool { step <= last && step != skip }

        var body: some View {
            let toast = tokens.toast
            let _ = (probeSaw =
                "textScale \(textScale), message size \(toast.message.size), gap \(toast.gap), "
                + "paddingInline \(toast.paddingInline), paddingBlock \(toast.paddingBlock), "
                + "border \(toast.border.width), maxWidth \(toast.maxWidth)")
            outer(toast)
        }

        private func outer(_ toast: RaincoatTokenSet.ToastTokens) -> some View {
            interactive(toast)
                .probeStep(on(13)) { $0.accessibilityElement(children: .contain) }
                .probeStep(on(14)) { $0.accessibilityAction(.escape) { control?.close() } }
                .probeStep(on(15)) { $0.fixedSize(horizontal: false, vertical: true) }
                .probeStep(on(16)) { $0.frame(maxWidth: toast.maxWidth) }
        }

        private func interactive(_ toast: RaincoatTokenSet.ToastTokens) -> some View {
            lifted(toast)
                .probeStep(on(9)) { $0.onHover { hovering in control?.setPaused(.hover, hovering) } }
                .probeStep(on(10)) {
                    $0.onChange(of: voiceOverFocus != nil || keyboardFocus != nil) { _, focused in
                        control?.setPaused(.focus, focused)
                    }
                }
                .probeStep(on(11)) { $0.offset(y: swipe) }
                .probeStep(on(12)) { $0.simultaneousGesture(swipeDown) }
        }

        private func lifted(_ toast: RaincoatTokenSet.ToastTokens) -> some View {
            let shape = RoundedRectangle(cornerRadius: toast.radius, style: .continuous)
            return core(toast)
                .probeStep(on(4)) {
                    $0.padding(.horizontal, toast.paddingInline + toast.border.width)
                        .padding(.vertical, toast.paddingBlock + toast.border.width)
                }
                .probeStep(on(5)) { $0.foregroundStyle(Color(toast.fg)) }
                .probeStep(on(6)) { $0.raincoatShadow(toast.shadow, in: shape, fill: Color(toast.bg)) }
                .probeStep(on(7)) {
                    $0.overlay { shape.strokeBorder(Color(toast.border.color), lineWidth: toast.border.width) }
                }
                .probeStep(on(8)) { $0.contentShape(shape) }
        }

        @ViewBuilder private func core(_ toast: RaincoatTokenSet.ToastTokens) -> some View {
            if on(3) {
                HStack(alignment: .top, spacing: toast.gap) {
                    messageAndAction(toast)
                    closeButton
                }
            } else {
                messageAndAction(toast)
            }
        }

        @ViewBuilder private func messageAndAction(_ toast: RaincoatTokenSet.ToastTokens) -> some View {
            if on(2) {
                MessageAndAction(spacing: toast.gap) {
                    messageText
                    actionButton
                }
            } else {
                messageText
            }
        }

        @ViewBuilder private var messageText: some View {
            let text = RaincoatToast.message(message, tokens: tokens, scale: on(17) ? textScale : 1)
            if on(18) {
                text.accessibilityFocused($voiceOverFocus, equals: .message)
            } else {
                text
            }
        }

        @ViewBuilder private var actionButton: some View {
            if let action {
                RaincoatButton(Text(verbatim: action.label), variant: .ghost, size: .sm) {
                    action.perform()
                    control?.close()
                }
                .focused($keyboardFocus, equals: .action)
                .accessibilityFocused($voiceOverFocus, equals: .action)
            }
        }

        @ViewBuilder private var closeButton: some View {
            if let closeLabel {
                Button {
                    control?.close()
                } label: {
                    ToastCross(size: tokens.button.iconSize.sm * textScale)
                }
                .buttonStyle(
                    RaincoatButtonStyle(
                        variant: .ghost, size: .sm, isFullWidth: false, isLoading: false, isIconOnly: true
                    )
                )
                .accessibilityLabel(Text(verbatim: closeLabel))
                .focused($keyboardFocus, equals: .close)
                .accessibilityFocused($voiceOverFocus, equals: .close)
            }
        }

        private var swipeDown: some Gesture {
            DragGesture()
                .onChanged { drag in swipe = max(0, drag.translation.height) }
                .onEnded { drag in
                    if drag.translation.height >= tokens.button.targetMinimum, let control {
                        control.close()
                    } else {
                        swipe = 0
                    }
                }
        }
    }

    @MainActor
    @Test func diagnoseTheToastsSize() {
        var lines = ["TOAST DIAGNOSTIC 2"]
        for width in [nil, 360] as [CGFloat?] {
            let offered = width.map { "\($0)" } ?? "nil"
            for step in 1...18 {
                lines.append("width \(offered) up to step \(step): \(measured(ToastProbe(last: step), width: width))")
            }
            for step in 2...18 {
                lines.append(
                    "width \(offered) all but step \(step): "
                        + measured(ToastProbe(last: 18, skip: step), width: width)
                )
            }
            let undo = RaincoatToast.Action("Undo") {}
            lines += [
                "width \(offered) RaincoatToast: \(measured(RaincoatToast("Message archived"), width: width))",
                "width \(offered) RaincoatToast, control nil: "
                    + measured(
                        RaincoatToast("Message archived").environment(\.raincoatToastControl, nil), width: width
                    ),
                "width \(offered) RaincoatToast, Undo and Close: "
                    + measured(RaincoatToast("Message archived", action: undo, closeLabel: "Close"), width: width),
            ]
        }
        lines.append("probe body saw: \(probeSaw)")
        Issue.record(Comment(rawValue: lines.joined(separator: "\n")))
    }
#endif
