#if canImport(SwiftUI) && canImport(CoreGraphics)
    import CoreGraphics
    @testable import Raincoat
    import RaincoatThemeBase
    import RaincoatTokens
    import SwiftUI
    import Testing
    #if os(macOS)
        import AppKit
    #endif

    // TEMPORARY. A diagnostic for the toast on macOS: does a real AppKit host measure a view that
    // follows VoiceOver's focus, which ImageRenderer measures as 10 by 10 points? It prints what it
    // finds, so that it shows in the log, and it never fails. Delete before the pull request is
    // ready.

    @MainActor
    private func measured(_ view: some View, width: CGFloat?) -> String {
        let renderer = ImageRenderer(content: view.raincoatTheme(.base))
        renderer.scale = 1
        renderer.proposedSize = ProposedViewSize(width: width, height: nil)
        guard let image = renderer.cgImage else { return "no image" }
        return "\(image.width)x\(image.height)"
    }

    private func described(_ size: CGSize) -> String {
        "\(Int(size.width.rounded()))x\(Int(size.height.rounded()))"
    }

    /// The size of an image, where it has ink, and how many of its pixels differ from the first
    /// opaque one, which is the toast's fill: the text and the outline.
    private func inked(_ image: CGImage?) -> String {
        guard let image else { return "no image" }
        let width = image.width
        let height = image.height
        var pixels = [UInt8](repeating: 0, count: width * height * 4)
        let drawn = pixels.withUnsafeMutableBytes { raw -> Bool in
            guard let space = CGColorSpace(name: CGColorSpace.sRGB),
                let context = CGContext(
                    data: raw.baseAddress, width: width, height: height, bitsPerComponent: 8,
                    bytesPerRow: width * 4, space: space,
                    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
                )
            else { return false }
            context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
            return true
        }
        guard drawn else { return "\(width)x\(height), unreadable" }
        var xs: [Int] = []
        var ys: [Int] = []
        var fill: [UInt8]?
        var marks = 0
        for y in 0..<height {
            for x in 0..<width {
                let start = (y * width + x) * 4
                guard pixels[start + 3] > 0 else { continue }
                xs.append(x)
                ys.append(y)
                let color = Array(pixels[start..<start + 3])
                if let fill {
                    if zip(color, fill).contains(where: { pair in abs(Int(pair.0) - Int(pair.1)) > 8 }) {
                        marks += 1
                    }
                } else {
                    fill = color
                }
            }
        }
        guard let minX = xs.min(), let maxX = xs.max(), let minY = ys.min(), let maxY = ys.max() else {
            return "\(width)x\(height), no ink"
        }
        return "\(width)x\(height), ink in x \(minX)-\(maxX) y \(minY)-\(maxY), \(marks) marks"
    }

    /// A test's own name for the one part that VoiceOver can be on.
    private enum ProbePart: Hashable {
        case message
    }

    /// The toast's message, padded and filled as a toast is, following VoiceOver's focus as the
    /// toast's message does on iOS, or not, and handling Escape as the toast once did, or not.
    private struct MessageProbe: View {
        let followsVoiceOver: Bool
        let handlesEscape: Bool

        @Tokens private var tokens
        @AccessibilityFocusState private var focus: ProbePart?

        init(followsVoiceOver: Bool, handlesEscape: Bool = false) {
            self.followsVoiceOver = followsVoiceOver
            self.handlesEscape = handlesEscape
        }

        var body: some View {
            let toast = tokens.toast
            let padded = message
                .padding(.horizontal, toast.paddingInline + toast.border.width)
                .padding(.vertical, toast.paddingBlock + toast.border.width)
                .background(Color(toast.bg))
            if handlesEscape {
                padded.onKeyPress(.escape) { .ignored }
            } else {
                padded
            }
        }

        @ViewBuilder private var message: some View {
            let text = RaincoatToast.message("Message archived", tokens: tokens, scale: 1)
            if followsVoiceOver {
                text.accessibilityFocused($focus, equals: .message)
            } else {
                text
            }
        }
    }

    #if os(macOS)
        /// Sizes from AppKit: what a hosting controller says fits, with no width and in 360 points,
        /// and a hosting view's fitting size, on its own and held to 360 points wide.
        @MainActor
        private func hostedSizes(_ view: some View) -> String {
            let root = view.raincoatTheme(.base)
            let unlimited = CGFloat.greatestFiniteMagnitude
            let controller = NSHostingController(rootView: root)
            let ideal = controller.sizeThatFits(in: CGSize(width: unlimited, height: unlimited))
            let narrow = controller.sizeThatFits(in: CGSize(width: 360, height: unlimited))
            let free = NSHostingView(rootView: root)
            let held = NSHostingView(rootView: root)
            held.translatesAutoresizingMaskIntoConstraints = false
            held.widthAnchor.constraint(equalToConstant: 360).isActive = true
            return "controller \(described(ideal)), in 360 \(described(narrow)); "
                + "view fittingSize \(described(free.fittingSize)), held to 360 \(described(held.fittingSize))"
        }

        /// Draws the view in a hosting view, in a borderless window, at its fitting size: through
        /// AppKit's display cache, and by rendering its layers.
        @MainActor
        private func hostedDrawing(_ view: some View) -> String {
            _ = NSApplication.shared
            let host = NSHostingView(rootView: view.raincoatTheme(.base))
            let size = host.fittingSize
            let window = NSWindow(
                contentRect: CGRect(origin: .zero, size: size), styleMask: .borderless, backing: .buffered,
                defer: false
            )
            window.isReleasedWhenClosed = false
            window.contentView = host
            host.frame = CGRect(origin: .zero, size: size)
            host.layoutSubtreeIfNeeded()
            host.display()
            var found = ["fitting \(described(size)), backing scale \(window.backingScaleFactor)"]
            if let bitmap = host.bitmapImageRepForCachingDisplay(in: host.bounds) {
                host.cacheDisplay(in: host.bounds, to: bitmap)
                found.append("cacheDisplay \(inked(bitmap.cgImage))")
            } else {
                found.append("cacheDisplay: no bitmap")
            }
            if let layer = host.layer, let space = CGColorSpace(name: CGColorSpace.sRGB),
                let context = CGContext(
                    data: nil, width: Int(size.width.rounded(.up)), height: Int(size.height.rounded(.up)),
                    bitsPerComponent: 8, bytesPerRow: 0, space: space,
                    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
                )
            {
                layer.render(in: context)
                found.append("layer.render \(inked(context.makeImage()))")
            } else {
                found.append("layer.render: no layer")
            }
            return found.joined(separator: "; ")
        }
    #endif

    @MainActor
    @Test func diagnoseTheToastInAnAppKitHost() {
        var lines = ["TOAST DIAGNOSTIC 3"]
        let undo = RaincoatToast.Action("Undo") {}
        let views: [(String, AnyView)] = [
            ("message following VoiceOver", AnyView(MessageProbe(followsVoiceOver: true))),
            ("message not following VoiceOver", AnyView(MessageProbe(followsVoiceOver: false))),
            (
                "message handling Escape with onKeyPress",
                AnyView(MessageProbe(followsVoiceOver: false, handlesEscape: true))
            ),
            ("RaincoatToast", AnyView(RaincoatToast("Message archived"))),
            (
                "RaincoatToast, Undo and Close",
                AnyView(RaincoatToast("Message archived", action: undo, closeLabel: "Close"))
            ),
        ]
        for (name, view) in views {
            lines.append("\(name): ImageRenderer \(measured(view, width: nil)), at 360 \(measured(view, width: 360))")
            #if os(macOS)
                lines.append("\(name): \(hostedSizes(view))")
                lines.append("\(name): drawn in a window: \(hostedDrawing(view))")
            #endif
        }
        print(lines.joined(separator: "\n"))
    }
#endif
