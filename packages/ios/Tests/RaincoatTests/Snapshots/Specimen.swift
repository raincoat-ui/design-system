#if canImport(SwiftUI)
    import Raincoat
    import SwiftUI
    import Testing

    /// A specimen is this wide, in points, as the web's is in CSS pixels, so that long text wraps
    /// at about the same place on both.
    let specimenWidth: CGFloat = 480
    private let specimenPadding: CGFloat = 24
    private let specimenGap: CGFloat = 16

    /// Every example of a component's spec, one under the other, on the theme's canvas color. The
    /// instances of an example sit side by side, from the leading edge, and wrap onto another row
    /// when they do not fit, as on the web.
    struct Specimen<Properties: Sendable, Instance: View>: View {
        let examples: [SpecExample<Properties>]
        /// The locale whose text the examples show.
        let locale: String
        let draw: (Properties, _ text: (String) -> String) -> Instance

        @Tokens private var tokens

        init(
            examples: [SpecExample<Properties>],
            locale: String,
            draw: @escaping (Properties, _ text: (String) -> String) -> Instance
        ) {
            self.examples = examples
            self.locale = locale
            self.draw = draw
        }

        var body: some View {
            VStack(alignment: .leading, spacing: specimenGap) {
                ForEach(examples.indices, id: \.self) { index in
                    let example = examples[index]
                    let text = { (content: String) -> String in
                        guard let value = example.text[locale]?[content] else {
                            Issue.record("\(example.id): no \(content) in \(locale)")
                            return ""
                        }
                        return value
                    }
                    WrappingRow(spacing: specimenGap) {
                        ForEach(example.instances.indices, id: \.self) { instance in
                            draw(example.instances[instance], text)
                        }
                    }
                }
            }
            .padding(specimenPadding)
            .frame(width: specimenWidth, alignment: .topLeading)
            .background(Color(tokens.color.bg.canvas))
        }
    }

    /// Views side by side from the leading edge, with a new row for a view that does not fit: a
    /// wrapping flex row on the web. Each view is offered the whole width, so a view wider than
    /// that wraps its own text, and a full-width view takes the row.
    ///
    /// It places views from the left. SwiftUI mirrors a layout in a right-to-left environment, as
    /// it does its stacks.
    struct WrappingRow: Layout {
        let spacing: CGFloat

        func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout Void) -> CGSize {
            let frames = arrange(subviews, width: proposal.width)
            let width = proposal.width.flatMap { $0.isFinite ? $0 : nil }
            return CGSize(
                width: width ?? frames.map(\.maxX).max() ?? 0,
                height: frames.map(\.maxY).max() ?? 0
            )
        }

        func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout Void) {
            let frames = arrange(subviews, width: bounds.width)
            for (subview, frame) in zip(subviews, frames) {
                subview.place(
                    at: CGPoint(x: bounds.minX + frame.minX, y: bounds.minY + frame.minY),
                    anchor: .topLeading,
                    proposal: ProposedViewSize(frame.size)
                )
            }
        }

        /// Where each view goes, from the top left, in rows no wider than the width.
        private func arrange(_ subviews: Subviews, width: CGFloat?) -> [CGRect] {
            let available = width.flatMap { $0.isFinite ? $0 : nil }
            var frames: [CGRect] = []
            var x: CGFloat = 0
            var y: CGFloat = 0
            var rowHeight: CGFloat = 0
            for subview in subviews {
                let size = subview.sizeThatFits(ProposedViewSize(width: available, height: nil))
                if let available, x > 0, x + size.width > available {
                    x = 0
                    y += rowHeight + spacing
                    rowHeight = 0
                }
                frames.append(CGRect(x: x, y: y, width: size.width, height: size.height))
                x += size.width + spacing
                rowHeight = max(rowHeight, size.height)
            }
            return frames
        }
    }

    /// Reads how much the environment's Dynamic Type size enlarges body text, as the components'
    /// own scaled metrics do. It draws nothing.
    struct TextScaleProbe: View {
        @MainActor
        final class Reading {
            var scale: CGFloat?
        }

        let reading: Reading
        @ScaledMetric(relativeTo: .body) private var scale: CGFloat = 1

        init(reading: Reading) {
            self.reading = reading
        }

        var body: some View {
            reading.scale = scale
            return Color.clear.frame(width: 0, height: 0)
        }
    }
#endif
