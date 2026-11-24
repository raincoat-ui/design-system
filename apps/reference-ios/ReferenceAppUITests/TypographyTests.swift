import XCTest

/// Text and headings on a simulator, checked against specs/components/typography/spec.yaml: what
/// assistive technology is told, growth at the largest text size with nothing clipped, and the
/// system's accessibility audit.
final class TypographyTests: ReferenceAppTestCase {
    private let paragraph =
        "Your files are kept on this device and in the cloud. Changes made on one device reach the others the next time they connect, usually within a minute."
    private let longHeading = "Notifications for comments, mentions, and changes to shared documents"

    @MainActor
    private func launch(textSize: String? = nil) -> XCUIApplication {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launchArguments += ["-screen", "typography"]
        if let textSize {
            app.launchArguments += ["-UIPreferredContentSizeCategoryName", textSize]
        }
        app.launch()
        XCTAssertTrue(app.staticTexts["Settings"].waitForExistence(timeout: 30))
        return app
    }

    @MainActor
    func testEveryTextAndHeadingIsReadAsItsText() {
        let app = launch()
        let texts = [
            "Settings", "Text styles", "Colors", "Headings", "Level 3", "Level 4", "Level 5", "Level 6",
            "Recent files", "Shared with you", "Long text", longHeading,
            "Your files are up to date.", "Last checked at 9:41.", "This file could not be opened.",
        ]
        for text in texts {
            XCTAssertEqual(app.staticTexts.matching(identifier: text).count, 1, text)
        }
    }

    @MainActor
    func testTextCutShortIsReadInFull() {
        let app = launch()
        // Two lines show, ending in an ellipsis. VoiceOver is given the whole text.
        let text = app.staticTexts["max-lines"]
        XCTAssertTrue(text.waitForExistence(timeout: 10))
        XCTAssertEqual(text.label, paragraph)
        let line = app.staticTexts["Your files are up to date."].frame.height
        XCTAssertLessThan(text.frame.height, 2.5 * line, "\(text.frame.height) for lines of \(line)")
    }

    /// The system's accessibility audit: contrast, clipped text, traits, and the rest.
    @MainActor
    func testTheScreenPassesTheAccessibilityAudit() throws {
        let app = launch()
        try audit(app)
    }

    @MainActor
    func testAtTheLargestTextSizeTextGrowsAndNothingIsClipped() throws {
        var heights: [String: [String: CGFloat]] = [:]
        let names = ["Settings", "Level 6", "Your files are up to date.", longHeading]
        let sizes = ["UICTContentSizeCategoryL", "UICTContentSizeCategoryAccessibilityXXXL"]
        for size in sizes {
            let app = launch(textSize: size)
            for name in names {
                heights[name, default: [:]][size] = app.staticTexts[name].frame.height
            }
            if size == sizes.last {
                // The audit reports text that is clipped.
                try audit(app)
            }
            app.terminate()
        }
        for name in names {
            let standard = heights[name]?[sizes[0]] ?? 0
            let largest = heights[name]?[sizes[1]] ?? 0
            XCTAssertGreaterThan(largest, standard * 1.25, "\(name): \(heights[name] ?? [:])")
        }
        // Large headings grow less than body text, as the system's own do: the title grows with
        // the large title style, and body text with the body style.
        let growth = { (name: String) in (heights[name]?[sizes[1]] ?? 0) / (heights[name]?[sizes[0]] ?? 1) }
        XCTAssertLessThan(growth("Settings"), growth("Your files are up to date."), "\(heights)")
    }

    @MainActor
    private func audit(_ app: XCUIApplication, file: StaticString = #filePath, line: UInt = #line) throws {
        var problems: [String] = []
        try app.performAccessibilityAudit { issue in
            // The audit takes any font that was not made from a text style to be fixed in size.
            // Raincoat scales its token sizes itself, with the text style nearest each role, which
            // testAtTheLargestTextSizeTextGrowsAndNothingIsClipped checks directly.
            if issue.auditType == .dynamicType { return true }
            // Text with max-lines is cut short on purpose, and read in full, which
            // testTextCutShortIsReadInFull checks. Nothing else may be clipped.
            if issue.auditType == .textClipped, issue.element?.identifier == "max-lines" { return true }
            problems.append("\(issue.compactDescription): \(issue.element?.label ?? "no element")")
            return true
        }
        XCTAssertEqual(problems, [], file: file, line: line)
    }
}
