#if canImport(SwiftUI) && canImport(CoreGraphics)
    import CoreGraphics
    @testable import Raincoat
    import RaincoatThemeBase
    import RaincoatTokens
    import SwiftUI
    import Testing

    // TEMPORARY. A diagnostic for the toast's size on macOS, recorded as an issue so that it shows
    // in the log. Delete before the pull request is ready.

    @MainActor
    private func measured(_ view: some View, width: CGFloat?) -> String {
        let renderer = ImageRenderer(content: view.raincoatTheme(.base))
        renderer.scale = 1
        renderer.proposedSize = ProposedViewSize(width: width, height: nil)
        guard let image = renderer.cgImage else { return "no image" }
        return "\(image.width)x\(image.height)"
    }

    @MainActor
    @Test func diagnoseTheToastsSize() {
        let tokens = RaincoatTheme.base.tokens(mode: .light, density: .comfortable)
        let text = tokens.toast.message.resolved(scale: 1)
        let shape = RoundedRectangle(cornerRadius: 8)
        let message = RaincoatToast.message("Message archived", tokens: tokens, scale: 1)
        let undo = RaincoatButton(Text("Undo"), variant: .ghost, size: .sm) {}
        var lines = [
            "TOAST DIAGNOSTIC",
            "metrics: font size \(tokens.toast.message.size), lineHeight \(text.lineHeight), "
                + "halfLeading \(text.halfLeading), lineSpacing \(text.lineSpacing), tracking \(text.tracking), "
                + "button.height.sm \(tokens.button.height.sm)",
        ]
        for width in [nil, 360] as [CGFloat?] {
            let offered = width.map { "\($0)" } ?? "nil"
            lines += [
                "width \(offered) (a) message: \(measured(message, width: width))",
                "width \(offered) (b) message, padding, plain background: "
                    + measured(message.padding(13).background { shape.fill(.white) }, width: width),
                "width \(offered) (c) message, padding, raincoatShadow: "
                    + measured(
                        message.padding(13).raincoatShadow(tokens.toast.shadow, in: shape, fill: .white),
                        width: width
                    ),
                "width \(offered) (d) Undo: \(measured(undo, width: width))",
                "width \(offered) (d) Undo, padding, raincoatShadow: "
                    + measured(
                        undo.padding(13).raincoatShadow(tokens.toast.shadow, in: shape, fill: .white),
                        width: width
                    ),
                "width \(offered) (e) RaincoatToast: \(measured(RaincoatToast("Message archived"), width: width))",
            ]
        }
        Issue.record(Comment(rawValue: lines.joined(separator: "\n")))
    }
#endif
