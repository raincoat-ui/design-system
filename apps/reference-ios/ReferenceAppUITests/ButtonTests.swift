import RaincoatThemeBase
import RaincoatTokens
import XCTest

/// The Button on a simulator, checked against specs/components/button/spec.yaml: what
/// assistive technology is told, the system's accessibility audit, touches, and text sizes.
final class ButtonTests: XCTestCase {
    private let tokens = RaincoatTheme.base.tokens(mode: .light, density: .comfortable).button
    private let longLabel = "Save all of these changes and send the updated version to every reviewer"

    @MainActor
    private func launch(textSize: String? = nil) -> XCUIApplication {
        continueAfterFailure = false
        let app = XCUIApplication()
        if let textSize {
            app.launchArguments += ["-UIPreferredContentSizeCategoryName", textSize]
        }
        app.launch()
        XCTAssertTrue(app.buttons["Save changes"].waitForExistence(timeout: 30))
        return app
    }

    @MainActor
    private func lastAction(_ app: XCUIApplication) -> String {
        app.staticTexts["last-action"].label
    }

    @MainActor
    func testEveryButtonIsAButtonNamedByItsLabel() {
        let app = launch()
        let names = [
            "Save changes", "Cancel", "Show details", "Delete project", "Small", "Medium", "Large", "Publish",
            "Send invite", "Continue", longLabel,
            // An icon alone has no name; this one is given by the app.
            "Delete page",
        ]
        for name in names {
            XCTAssertEqual(app.buttons.matching(identifier: name).count, 1, name)
        }
    }

    @MainActor
    func testATapRunsTheAction() {
        let app = launch()
        XCTAssertEqual(lastAction(app), "Last action: Nothing yet")
        app.buttons["Save changes"].tap()
        XCTAssertEqual(lastAction(app), "Last action: Save changes")
        app.buttons["Delete page"].tap()
        XCTAssertEqual(lastAction(app), "Last action: Delete page")
    }

    @MainActor
    func testADisabledButtonIsUnavailable() {
        let app = launch()
        let button = app.buttons["Publish"]
        XCTAssertFalse(button.isEnabled)
        button.tap()
        XCTAssertEqual(lastAction(app), "Last action: Nothing yet")
    }

    @MainActor
    func testALoadingButtonStaysAvailableAndIgnoresActivation() {
        let app = launch()
        let button = app.buttons["Send invite"]
        XCTAssertTrue(button.isEnabled)
        button.tap()
        XCTAssertEqual(lastAction(app), "Last action: Nothing yet")
    }

    @MainActor
    func testEveryTouchTargetIsAtLeastTheMinimum() {
        let app = launch()
        let buttons = app.buttons.allElementsBoundByIndex
        XCTAssertGreaterThanOrEqual(buttons.count, 12)
        // The frame is the area that takes touches, and the one assistive technology is given.
        for button in buttons {
            XCTAssertGreaterThanOrEqual(button.frame.width, tokens.targetMinimum - 0.5, button.label)
            XCTAssertGreaterThanOrEqual(button.frame.height, tokens.targetMinimum - 0.5, button.label)
        }
    }

    @MainActor
    func testASmallButtonTakesTheRoomItShowsAndTouchesJustOutsideItCount() {
        let app = launch()
        let above = app.staticTexts["small-above"].frame
        let below = app.staticTexts["small-below"].frame
        let target = app.buttons["Delete page"]

        // The lines directly above and below are as far apart as the button is tall.
        XCTAssertLessThan(tokens.height.sm, tokens.targetMinimum)
        XCTAssertEqual(below.minY - above.maxY, tokens.height.sm, accuracy: 0.5)

        // The touch target is larger, and centered on the button.
        XCTAssertEqual(target.frame.height, tokens.targetMinimum, accuracy: 0.5)
        XCTAssertEqual(target.frame.width, tokens.targetMinimum, accuracy: 0.5)
        XCTAssertEqual(target.frame.midY, (above.maxY + below.minY) / 2, accuracy: 0.5)

        // A touch inside the target but above the visible button, on the line of text there.
        let top = target.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0))
        top.withOffset(CGVector(dx: 0, dy: 1)).tap()
        XCTAssertEqual(lastAction(app), "Last action: Delete page")
    }

    /// The system's accessibility audit: names, traits, touch targets, contrast, clipped text.
    @MainActor
    func testTheScreenPassesTheAccessibilityAudit() throws {
        let app = launch()
        var problems: [String] = []
        try app.performAccessibilityAudit { issue in
            // A disabled control is exempt from contrast requirements (WCAG 1.4.3).
            if issue.auditType == .contrast, issue.element?.isEnabled == false { return true }
            // The audit takes any font that was not made from a text style to be fixed in size.
            // Raincoat scales its token sizes itself, which testButtonsGrowWithTheTextSize
            // checks directly.
            if issue.auditType == .dynamicType { return true }
            problems.append("\(issue.compactDescription): \(issue.element?.label ?? "no element")")
            return true
        }
        XCTAssertEqual(problems, [])
    }

    @MainActor
    func testButtonsGrowWithTheTextSize() {
        var heights: [String: [String: CGFloat]] = [:]
        let names = ["Save changes", "Small", "Large", "Send invite"]
        for size in ["UICTContentSizeCategoryL", "UICTContentSizeCategoryAccessibilityXL"] {
            let app = launch(textSize: size)
            for name in names {
                heights[name, default: [:]][size] = app.buttons[name].frame.height
            }
            app.terminate()
        }
        for name in names {
            let standard = heights[name]?["UICTContentSizeCategoryL"] ?? 0
            let large = heights[name]?["UICTContentSizeCategoryAccessibilityXL"] ?? 0
            // The text is about twice as large; the space around it stays as it was, and a
            // small button's frame starts from its touch target.
            XCTAssertGreaterThan(large, standard * 1.25, "\(name): \(heights[name] ?? [:])")
        }
    }
}
