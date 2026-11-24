import XCTest

/// The Tabs on a simulator, checked against specs/components/tabs/spec.yaml: what VoiceOver is
/// given, the system's accessibility audit, touches, scrolling, and text sizes.
///
/// This file reads no theme: the iOS theme switch (tools/reference/ios-theme.mjs) links only the
/// theme under test. The one token it needs, the minimum touch target, is locked: no theme can
/// change it.
final class TabsTests: ReferenceAppTestCase {
    /// `size.target.minimum`, in points.
    private let targetMinimum: CGFloat = 44
    private let translated = ["Tổng quan", "Thông số kỹ thuật", "Đánh giá", "Câu hỏi thường gặp", "Vận chuyển", "Đổi trả"]

    @MainActor
    private func launch(textSize: String? = nil) -> XCUIApplication {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launchArguments += ["-screen", "tabs"]
        if let textSize {
            app.launchArguments += ["-UIPreferredContentSizeCategoryName", textSize]
        }
        app.launch()
        XCTAssertTrue(app.buttons["Details"].waitForExistence(timeout: 30))
        return app
    }

    @MainActor
    private func selected(_ app: XCUIApplication) -> String {
        app.staticTexts["selected"].label
    }

    /// Each row of tabs is given to VoiceOver as a tab bar, and each tab as a button named by its
    /// label, with the selected one marked. VoiceOver reads a tab in a tab bar with its position,
    /// such as "2 of 3".
    @MainActor
    func testEachRowIsATabBarOfTabsNamedByTheirLabelsWithTheSelectedOneMarked() {
        let app = launch()
        let rows: [[String]] = [
            ["Details", "Reviews", "Shipping"],
            ["Photos", "Videos", "Files"],
            // An icon alone has no name; these are given by the app.
            ["List", "Grid"],
        ]
        for row in rows {
            let bar = app.tabBars.containing(.button, identifier: row[0]).firstMatch
            XCTAssertTrue(bar.exists, "no tab bar holds \(row[0])")
            for (index, name) in row.enumerated() {
                let tab = bar.buttons[name]
                XCTAssertTrue(tab.exists, name)
                // The first tab of each row is selected, and no other.
                XCTAssertEqual(tab.isSelected, index == 0, name)
            }
        }
        XCTAssertTrue(app.tabBars.containing(.button, identifier: translated[0]).firstMatch.exists)
    }

    @MainActor
    func testATapSelectsATabAndShowsOnlyItsPanel() {
        let app = launch()
        XCTAssertEqual(selected(app), "Selected: details")
        XCTAssertTrue(app.staticTexts["Made of waxed cotton, with taped seams."].exists)

        app.buttons["Reviews"].tap()
        XCTAssertEqual(selected(app), "Selected: reviews")
        XCTAssertTrue(app.buttons["Reviews"].isSelected)
        XCTAssertFalse(app.buttons["Details"].isSelected)
        XCTAssertTrue(app.staticTexts["Rated 4 of 5 by 120 buyers."].exists)
        XCTAssertFalse(app.staticTexts["Made of waxed cotton, with taped seams."].exists)
    }

    /// A row that does not fit scrolls sideways, so its last tab can be reached, and no label is
    /// cut short to make it fit.
    @MainActor
    func testTheLastTabOfAnOverflowingTranslatedRowCanBeReached() {
        let app = launch()
        let first = app.buttons[translated[0]]
        let last = app.buttons[translated[translated.count - 1]]
        let screen = app.windows.firstMatch.frame
        // The row is at the bottom of the screen.
        app.swipeUp()
        XCTAssertTrue(first.isHittable)
        XCTAssertTrue(last.exists)
        XCTAssertGreaterThan(last.frame.minX, screen.maxX - 1, "the last tab is off the screen at first")

        for _ in 0..<translated.count where last.frame.maxX > screen.maxX {
            first.swipeLeft()
        }
        XCTAssertLessThanOrEqual(last.frame.maxX, screen.maxX)
        last.tap()
        XCTAssertTrue(last.isSelected)
        XCTAssertTrue(app.staticTexts["Đang xem: Đổi trả"].exists)

        // Each label is on one line, at its full width: every tab is as tall as the others.
        let heights = Set(translated.map { app.buttons[$0].frame.height.rounded() })
        XCTAssertEqual(heights.count, 1, "\(heights)")
    }

    @MainActor
    func testEveryTabsTouchTargetIsAtLeastTheMinimum() {
        let app = launch()
        let names = ["Details", "Reviews", "Shipping", "Photos", "Videos", "Files", "List", "Grid", translated[0]]
        // The frame is the area that takes touches, and the one assistive technology is given.
        for name in names {
            let tab = app.buttons[name]
            XCTAssertGreaterThanOrEqual(tab.frame.width, targetMinimum - 0.5, name)
            XCTAssertGreaterThanOrEqual(tab.frame.height, targetMinimum - 0.5, name)
        }
    }

    /// The system's accessibility audit: names, traits, touch targets, contrast, clipped text.
    @MainActor
    func testTheScreenPassesTheAccessibilityAudit() throws {
        let app = launch()
        let rowLabels = translated
        var problems: [String] = []
        try app.performAccessibilityAudit { issue in
            // The audit takes any font that was not made from a text style to be fixed in size.
            // Raincoat scales its token sizes itself, which testTabsGrowWithTheTextSize checks.
            if issue.auditType == .dynamicType { return true }
            // A tab that the overflowing row has scrolled partly out of view is cut off by the
            // edge of the row on purpose: a swipe brings it in whole.
            if issue.auditType == .textClipped, let label = issue.element?.label, rowLabels.contains(label) {
                return true
            }
            problems.append("\(issue.compactDescription): \(issue.element?.label ?? "no element")")
            return true
        }
        XCTAssertEqual(problems, [])
    }

    @MainActor
    func testTabsGrowWithTheTextSize() {
        var heights: [String: CGFloat] = [:]
        for size in ["UICTContentSizeCategoryL", "UICTContentSizeCategoryAccessibilityXL"] {
            let app = launch(textSize: size)
            heights[size] = app.buttons["Details"].frame.height
            app.terminate()
        }
        let standard = heights["UICTContentSizeCategoryL"] ?? 0
        let large = heights["UICTContentSizeCategoryAccessibilityXL"] ?? 0
        // The text is about twice as large; the space around it stays as it was.
        XCTAssertGreaterThan(large, standard * 1.25, "\(heights)")
    }
}
