#if canImport(SwiftUI)
    import RaincoatTokens
    import SwiftUI

    extension View {
        /// Draws a token shadow, such as `tokens.toast.shadow`, around this view in `shape`.
        ///
        /// Every component that lifts a surface draws its shadow token with this:
        ///
        ///     let shape = RoundedRectangle(cornerRadius: tokens.card.radius)
        ///     content
        ///         .background { shape.fill(Color(tokens.card.bg.default)) }
        ///         .raincoatShadow(tokens.card.shadow, in: shape)
        ///
        /// It draws only the shadow's visible layers, so a shadow of transparent layers, such as
        /// the base theme's `shadow.none`, draws nothing at all. The layers are drawn as CSS draws a
        /// `box-shadow`: the first one on top, each moved by its offset, grown by its spread, and
        /// blurred by half its blur radius. An outer layer is drawn behind the view: give the view
        /// an opaque fill, because under a translucent one the shadow shows through, where CSS
        /// would not draw it. An inset layer is drawn over the view, inside the shape.
        public func raincoatShadow<S: InsettableShape>(_ shadow: TokenShadow, in shape: S) -> some View {
            modifier(TokenShadowModifier(shadow: shadow, shape: shape))
        }
    }

    /// Draws the visible layers of a token shadow. See `View.raincoatShadow(_:in:)`.
    struct TokenShadowModifier<S: InsettableShape>: ViewModifier {
        let shadow: TokenShadow
        let shape: S

        func body(content: Content) -> some View {
            // The first layer is on top, so it is drawn last.
            let layers = Array(shadow.visibleLayers.reversed().enumerated())
            let outer = layers.filter { !$0.element.inset }
            let inner = layers.filter { $0.element.inset }
            content
                .background {
                    ZStack {
                        ForEach(outer, id: \.offset) { _, layer in
                            shape
                                .inset(by: -layer.spread)
                                .fill(Color(layer.color))
                                .offset(x: layer.offsetX, y: layer.offsetY)
                                .blur(radius: layer.blur / 2)
                        }
                    }
                    .allowsHitTesting(false)
                }
                .overlay {
                    ZStack {
                        ForEach(inner, id: \.offset) { _, layer in
                            InsetShadowLayer(layer: layer, shape: shape)
                        }
                    }
                    .allowsHitTesting(false)
                }
        }
    }

    /// One inset layer: its color inside the shape, except where the shape, moved by the offset
    /// and shrunk by the spread, lets the view show through.
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
