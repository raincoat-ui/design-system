import XCTest

/// The Toast on a simulator, checked against specs/components/toast/spec.yaml and the
/// accessibility table of rfcs/0008-toast.md: what assistive technology is given, the timer on
/// the system's clock, the queue, a swipe, the room for the app's bottom bar and the keyboard,
/// touch targets, and the system's accessibility audit.
///
/// The timer is tested in depth, on a clock of the tests' own, by the package's unit tests
/// (ToastQueueTests). A UI test cannot hear what VoiceOver says: the unit tests check that the
/// host posts each message as an announcement with low priority.
final class ToastTests: ReferenceAppTestCase {
    /// The platform's minimum touch target, which the theme's matches.
    private let target: CGFloat = 44

    @MainActor
    private func launch(textSize: String? = nil) -> XCUIApplication {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launchArguments += ["-screen", "toast"]
        if let textSize {
            app.launchArguments += ["-UIPreferredContentSizeCategoryName", textSize]
        }
        app.launch()
        XCTAssertTrue(app.buttons["Archive message"].waitForExistence(timeout: 30))
        return app
    }

    /// Waits on the system's clock.
    private func wait(seconds: TimeInterval) {
        _ = XCTWaiter.wait(for: [XCTestExpectation(description: "time passes")], timeout: seconds)
    }

    @MainActor
    func testAToastShowsItsMessageAndClosesBySixSecondsLater() {
        let app = launch()
        app.buttons["Archive message"].tap()
        let message = app.staticTexts["Message archived"]
        XCTAssertTrue(message.waitForExistence(timeout: 5))
        // Nothing in the toast to activate: a toast without an action and a close label has no
        // buttons.
        XCTAssertFalse(app.buttons["Close"].exists)
        wait(seconds: 3)
        XCTAssertTrue(message.exists)
        XCTAssertTrue(message.waitForNonExistence(timeout: 10))
    }

    @MainActor
    func testAToastWithAnActionStaysAndItsActionRunsAndClosesIt() {
        let app = launch()
        app.buttons["Delete address"].tap()
        let undo = app.buttons["Undo"]
        XCTAssertTrue(undo.waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["Close"].exists)
        // Longer than a toast without an action stays (WCAG 2.2.1).
        wait(seconds: 9)
        XCTAssertTrue(undo.exists)
        undo.tap()
        XCTAssertEqual(app.staticTexts["last-action"].label, "Last action: Undo")
        XCTAssertTrue(app.staticTexts["Address deleted"].waitForNonExistence(timeout: 5))
    }

    @MainActor
    func testASecondToastWaitsInTheQueueThenFollows() {
        let app = launch()
        app.buttons["Copy two links"].tap()
        XCTAssertTrue(app.staticTexts["First link copied"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.staticTexts["Second link copied"].exists)
        app.buttons["Close"].tap()
        XCTAssertTrue(app.staticTexts["Second link copied"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["First link copied"].waitForNonExistence(timeout: 5))
    }

    /// A swipe down at least as long as a touch target closes the toast; a shorter one lets it go
    /// back. The drags are given in points, because `swipeDown()` moves by a share of the
    /// element's own height, which on a line of text is shorter than a touch target.
    @MainActor
    func testASwipeDownClosesTheToast() {
        let app = launch()
        app.buttons["Delete address"].tap()
        let message = app.staticTexts["Address deleted"]
        XCTAssertTrue(message.waitForExistence(timeout: 5))
        let start = message.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5))

        start.press(forDuration: 0.1, thenDragTo: start.withOffset(CGVector(dx: 0, dy: target / 2)))
        wait(seconds: 1)
        XCTAssertTrue(message.exists)

        start.press(forDuration: 0.1, thenDragTo: start.withOffset(CGVector(dx: 0, dy: target * 2)))
        XCTAssertTrue(message.waitForNonExistence(timeout: 5))
    }

    @MainActor
    func testTheToastSitsAboveTheAppsBottomBarAndItsButtonsAreLargeEnoughToTouch() {
        let app = launch()
        app.buttons["Delete address"].tap()
        let close = app.buttons["Close"]
        XCTAssertTrue(close.waitForExistence(timeout: 5))
        let bar = app.descendants(matching: .any)["bottom-bar"]
        XCTAssertTrue(bar.exists)
        XCTAssertLessThanOrEqual(close.frame.maxY, bar.frame.minY)
        XCTAssertLessThanOrEqual(app.staticTexts["Address deleted"].frame.maxY, bar.frame.minY)
        for name in ["Undo", "Close"] {
            XCTAssertGreaterThanOrEqual(app.buttons[name].frame.width, target - 0.5, name)
            XCTAssertGreaterThanOrEqual(app.buttons[name].frame.height, target - 0.5, name)
        }
    }

    @MainActor
    func testTheToastSitsAboveTheKeyboard() throws {
        let app = launch()
        app.descendants(matching: .any)["search"].tap()
        let keyboard = app.keyboards.firstMatch
        guard keyboard.waitForExistence(timeout: 5) else {
            throw XCTSkip("The simulator shows no on-screen keyboard, as with a hardware keyboard connected.")
        }
        app.buttons["Archive message"].tap()
        let message = app.staticTexts["Message archived"]
        XCTAssertTrue(message.waitForExistence(timeout: 5))
        XCTAssertLessThanOrEqual(message.frame.maxY, keyboard.frame.minY)
    }

    @MainActor
    func testTheToastGrowsWithTheTextSize() {
        var heights: [String: CGFloat] = [:]
        for size in ["UICTContentSizeCategoryL", "UICTContentSizeCategoryAccessibilityXL"] {
            let app = launch(textSize: size)
            app.buttons["Archive message"].tap()
            let message = app.staticTexts["Message archived"]
            XCTAssertTrue(message.waitForExistence(timeout: 5))
            heights[size] = message.frame.height
            app.terminate()
        }
        let standard = heights["UICTContentSizeCategoryL"] ?? 0
        let large = heights["UICTContentSizeCategoryAccessibilityXL"] ?? 0
        XCTAssertGreaterThan(large, standard * 1.25, "\(heights)")
    }

    /// The system's accessibility audit, with a toast on the screen.
    @MainActor
    func testTheScreenWithAToastPassesTheAccessibilityAudit() throws {
        let app = launch()
        app.buttons["Delete address"].tap()
        XCTAssertTrue(app.buttons["Undo"].waitForExistence(timeout: 5))
        var problems: [String] = []
        try app.performAccessibilityAudit { issue in
            // Raincoat scales its token sizes itself; testTheToastGrowsWithTheTextSize checks it.
            if issue.auditType == .dynamicType { return true }
            problems.append("\(issue.compactDescription): \(issue.element?.label ?? "no element")")
            return true
        }
        XCTAssertEqual(problems, [])
    }
}
