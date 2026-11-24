#if canImport(SwiftUI)
    import RaincoatTokens
    import SwiftUI

    extension View {
        /// Fills `shape` behind this view with `fill`, and draws a token shadow, such as
        /// `tokens.toast.shadow`, with it, as CSS draws a `box-shadow`: the outer layers behind
        /// the fill, the inset layers over the fill and behind the view.
        ///
        /// Every component that lifts a surface draws its shadow token and its fill with this, in
        /// place of a background:
        ///
        ///     let shape = RoundedRectangle(cornerRadius: tokens.card.radius)
        ///     content.raincoatShadow(tokens.card.shadow, in: shape, fill: Color(tokens.card.bg.default))
        ///
        /// It draws only the shadow's visible layers, so a shadow of transparent layers, such as
        /// the base theme's `shadow.none`, draws nothing at all: only the fill. The first layer is
        /// drawn on top, and each is moved by its offset, grown by its spread (shrunk, for an inset
        /// layer), and blurred by half its blur radius, the Gaussian deviation CSS uses.
        public func raincoatShadow<S: InsettableShape>(
            _ shadow: TokenShadow, in shape: S, fill: Color
        ) -> some View {
            background { TokenShadowBackground(shadow: shadow, shape: shape, fill: fill) }
        }
    }

    /// The fill of a shape with a token shadow's layers around and inside it. See
    /// `View.raincoatShadow(_:in:fill:)`.
    private struct TokenShadowBackground<S: InsettableShape>: View {
        let shadow: TokenShadow
        let shape: S
        let fill: Color

        var body: some View {
            // The first layer is on top, so it is drawn last.
            let layers = Array(shadow.visibleLayers.reversed().enumerated())
            ZStack {
                ForEach(layers.filter { !$0.element.inset }, id: \.offset) { _, layer in
                    shape
                        .inset(by: -layer.spread)
                        .fill(Color(layer.color))
                        .offset(x: layer.offsetX, y: layer.offsetY)
                        .blur(radius: layer.blur / 2)
                }
                shape.fill(fill)
                ForEach(layers.filter { $0.element.inset }, id: \.offset) { _, layer in
                    InsetShadowLayer(layer: layer, shape: shape)
                }
            }
            .allowsHitTesting(false)
        }
    }

    /// One inset layer: its color inside the shape, except where the shape, moved by the offset
    /// and shrunk by the spread, lets the fill show through.
    private struct InsetShadowLayer<S: InsettableShape>: View {
        let layer: TokenShadowLayer
        let shape: S

        var body: some View {
            Rectangle()
                .fill(Color(layer.color))
                .mask {
                    Rectangle()
                        .overlay {
                            shape
                                .inset(by: layer.spread)
                                .offset(x: layer.offsetX, y: layer.offsetY)
                                .blur(radius: layer.blur / 2)
                                .blendMode(.destinationOut)
                        }
                        .compositingGroup()
                }
                .clipShape(shape)
        }
    }
#endif
