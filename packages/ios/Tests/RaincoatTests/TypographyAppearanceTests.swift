import RaincoatThemeBase
import RaincoatTokens
import Testing

@testable import Raincoat

// The mapping from a Text or Heading's variant and color to its tokens. Expected values are
// looked up by token id, built from the variant's and color's names in the spec, so these tests
// do not repeat the switch statements they check. This file uses no SwiftUI and runs on Linux.
// The mappings are checked in every theme (allThemes, in Generated/Themes.swift).

/// The id of a variant's text style: body-lg is type.body.lg, caption is type.caption.
private func styleId(_ variant: String) -> String {
    "type." + variant.split(separator: "-").joined(separator: ".")
}

@Test(arguments: allThemes, ColorMode.allCases)
func eachTextVariantAndColorTakesItsTokens(theme: RaincoatTheme, mode: ColorMode) {
    let set = theme.tokens(mode: mode, density: .comfortable)
    let source = set.flattened()
    for variant in TextVariant.allCases {
        for color in TextColor.allCases {
            let appearance = TextAppearance(set, variant: variant, color: color)
            #expect(TokenFormat.string(appearance.style) == source[styleId(variant.rawValue)], "\(variant)")
            #expect(TokenFormat.string(appearance.color) == source["color.fg.\(color.rawValue)"], "\(color)")
            #expect(TextAppearance(set, .text(variant, color)) == appearance)
        }
    }
}

@Test(arguments: allThemes, ColorMode.allCases)
func eachHeadingVariantAndColorTakesItsTokens(theme: RaincoatTheme, mode: ColorMode) {
    let set = theme.tokens(mode: mode, density: .comfortable)
    let source = set.flattened()
    for variant in HeadingVariant.allCases {
        for color in HeadingColor.allCases {
            let appearance = TextAppearance(set, variant: variant, color: color)
            #expect(TokenFormat.string(appearance.style) == source[styleId(variant.rawValue)], "\(variant)")
            #expect(TokenFormat.string(appearance.color) == source["color.fg.\(color.rawValue)"], "\(color)")
            #expect(TextAppearance(set, .heading(variant, color)) == appearance)
        }
    }
}

@Test func textStylesDoNotChangeWithDensity() {
    let comfortable = RaincoatTheme.base.tokens(mode: .light, density: .comfortable)
    let compact = RaincoatTheme.base.tokens(mode: .light, density: .compact)
    for variant in TextVariant.allCases {
        #expect(
            TextAppearance(comfortable, variant: variant, color: .default)
                == TextAppearance(compact, variant: variant, color: .default)
        )
    }
}

@Test func aHeadingLooksAsItsLevelSaysUnlessToldOtherwise() {
    // As the spec says: 1 is heading-xl, 2 heading-lg, 3 heading-md, and 4 to 6 heading-sm.
    let looks = (1...6).map { HeadingVariant.standard(level: $0) }
    #expect(looks == [.headingXl, .headingLg, .headingMd, .headingSm, .headingSm, .headingSm])
    #expect(HeadingVariant.standardByLevel.keys.sorted() == Array(1...6))
}

@Test func eachStyleGrowsWithTheSystemTextStyleNearestItsRole() {
    #expect(TextScaling(HeadingVariant.headingXl) == .largeTitle)
    #expect(TextScaling(HeadingVariant.headingLg) == .title2)
    #expect(TextScaling(HeadingVariant.headingMd) == .title3)
    #expect(TextScaling(HeadingVariant.headingSm) == .headline)
    for variant in TextVariant.allCases {
        #expect(TextScaling(variant) == (variant == .caption ? .caption : .body), "\(variant)")
    }
    #expect(TextScaling(.text(.caption, .muted)) == .caption)
    #expect(TextScaling(.heading(.headingMd, .default)) == .title3)
}
