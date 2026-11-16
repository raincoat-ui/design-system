#if canImport(SwiftUI)
    import Foundation
    import Testing

    @testable import Raincoat

    // The few words the components say to assistive technology, in each language they are
    // translated into. English is the fallback for every other language.

    private let languages = ["en", "vi", "zh-Hans", "zh-Hant", "ja", "ko"]

    private func translation(of key: String, in language: String) throws -> String {
        let path = try #require(Bundle.module.path(forResource: language, ofType: "lproj"), "no \(language).lproj")
        let bundle = try #require(Bundle(path: path))
        return bundle.localizedString(forKey: key, value: "", table: nil)
    }

    @Test(arguments: languages)
    func theLoadingAnnouncementIsTranslated(language: String) throws {
        let words = try translation(of: "button.loading", in: language)
        #expect(!words.isEmpty)
        if language != "en" {
            #expect(try words != translation(of: "button.loading", in: "en"))
        }
    }

    @Test func noOtherLanguageIsShippedHalfTranslated() throws {
        let shipped = try #require(Bundle.module.urls(forResourcesWithExtension: "lproj", subdirectory: nil))
            .map { $0.deletingPathExtension().lastPathComponent }
        #expect(Set(shipped) == Set(languages))
    }
#endif
