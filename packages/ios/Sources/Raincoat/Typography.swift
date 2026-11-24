#if canImport(SwiftUI)
    import CoreText
    import RaincoatTokens
    import SwiftUI

    /// How much the person's text size setting enlarges a system text style: its size at the
    /// setting over its size at the default, such as 53 / 17 for body text at the largest
    /// accessibility size.
    ///
    /// `@ScaledMetric` rounds the value it scales, so a scale read as the scaled value of 1 is
    /// off: at the largest accessibility size it is 3, where body text is 3.12 times as large,
    /// and token sizes multiplied by it came out 4% small. A large value scaled and divided
    /// back keeps the ratio to within a thousandth.
    @propertyWrapper
    struct TextScale: DynamicProperty {
        private static let base: CGFloat = 1000

        @ScaledMetric private var scaled: CGFloat

        init(relativeTo textStyle: Font.TextStyle) {
            _scaled = ScaledMetric(wrappedValue: Self.base, relativeTo: textStyle)
        }

        var wrappedValue: CGFloat { scaled / Self.base }
    }

    /// A token text style made ready for SwiftUI.
    struct ResolvedTextStyle {
        let font: Font
        let tracking: CGFloat
        /// Height of one line as the token defines it.
        let lineHeight: CGFloat
        /// Extra space between lines, which brings the distance between baselines to the
        /// token's line height.
        let lineSpacing: CGFloat
        /// Space to add above the first line and below the last, so that a block of text is
        /// about as tall as its lines at the token's line height. It is rounded down, so that
        /// one line never exceeds `lineHeight`; give the text that as its minimum height.
        let halfLeading: CGFloat
    }

    extension TokenTextStyle {
        // CSS keywords in a font stack. They name no font file; the system font stands in.
        private static let genericFamilies: Set<String> = [
            "system-ui", "sans-serif", "serif", "monospace", "cursive", "fantasy",
            "ui-sans-serif", "ui-serif", "ui-monospace", "ui-rounded",
        ]

        /// The first family of the style that is installed, or registered by the app.
        var installedFamily: String? {
            families.first { family in
                guard !Self.genericFamilies.contains(family) else { return false }
                let wanted = CTFontDescriptorCreateWithAttributes(
                    [kCTFontFamilyNameAttribute: family] as CFDictionary
                )
                // The family is mandatory: without that, a missing family matches a fallback.
                let mandatory = NSSet(object: kCTFontFamilyNameAttribute) as CFSet
                return CTFontDescriptorCreateMatchingFontDescriptor(wanted, mandatory) != nil
            }
        }

        /// - Parameter scale: how much the person's text size setting enlarges text; 1 at the
        ///   default setting.
        func resolved(scale: CGFloat = 1) -> ResolvedTextStyle {
            let pointSize = size * scale
            let font: Font
            let metrics: CTFont
            if let family = installedFamily {
                font = Font.custom(family, fixedSize: pointSize).weight(fontWeight)
                metrics = CTFontCreateWithFontDescriptor(
                    CTFontDescriptorCreateWithAttributes([kCTFontFamilyNameAttribute: family] as CFDictionary),
                    pointSize,
                    nil
                )
            } else {
                font = Font.system(size: pointSize, weight: fontWeight)
                metrics =
                    CTFontCreateUIFontForLanguage(.system, pointSize, nil)
                    ?? CTFontCreateWithName("Helvetica" as CFString, pointSize, nil)
            }
            let natural = CTFontGetAscent(metrics) + CTFontGetDescent(metrics) + CTFontGetLeading(metrics)
            let target = lineHeight * pointSize
            return ResolvedTextStyle(
                font: font,
                tracking: letterSpacing * scale,
                lineHeight: target,
                lineSpacing: max(0, target - natural),
                // SwiftUI lays a line out on whole points, so the font's own height is rounded up.
                halfLeading: max(0, (target - natural.rounded(.up)) / 2)
            )
        }

        private var fontWeight: Font.Weight {
            switch weight {
            case ..<150: .ultraLight
            case ..<250: .thin
            case ..<350: .light
            case ..<450: .regular
            case ..<550: .medium
            case ..<650: .semibold
            case ..<750: .bold
            case ..<850: .heavy
            default: .black
            }
        }
    }
#endif
