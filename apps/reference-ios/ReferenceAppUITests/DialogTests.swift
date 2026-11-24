import XCTest

/// The dialog, the alert dialog, and the sheet on a simulator, checked against
/// specs/components/dialog/spec.yaml and the Accessibility table of
/// rfcs/0006-dialog-and-sheet.md: what assistive technology is given, where focus starts, each
/// way out, the largest text size, and the system's accessibility audit with each one open.
final class DialogTests: ReferenceAppTestCase {
    @MainActor
    private func launch(textSize: String? = nil) -> XCUIApplication {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launchArguments += ["-screen", "dialog"]
        if let textSize {
            app.launchArguments += ["-UIPreferredContentSizeCategoryName", textSize]
        }
        app.launch()
        XCTAssertTrue(app.staticTexts["Files"].waitForExistence(timeout: 30))
        return app
    }

    @MainActor
    private func status(_ app: XCUIApplication) -> String {
        app.staticTexts["status"].label
    }

    /// Waits for the rename dialog's field to take focus, then puts the keyboard away with Return.
    /// The keyboard, and the typing predictions over it, are the system's: the accessibility
    /// audit is of the dialog.
    @MainActor
    private func putTheKeyboardAway(_ app: XCUIApplication) {
        let field = app.textFields["Name"]
        expectation(for: NSPredicate(format: "hasKeyboardFocus == true"), evaluatedWith: field)
        waitForExpectations(timeout: 10)
        field.typeText("\n")
        XCTAssertTrue(app.keyboards.firstMatch.waitForNonExistence(timeout: 10))
    }

    /// A paragraph of the terms of use, in the dialog with long content.
    @MainActor
    private func terms(_ app: XCUIApplication) -> XCUIElement {
        app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", "You keep the rights")).firstMatch
    }

    @MainActor
    func testADialogIsNamedByItsTitleWithItsDescriptionFieldAndButtons() {
        let app = launch()
        app.buttons["Rename file"].tap()
        let title = app.staticTexts["Rename file"]
        XCTAssertTrue(title.waitForExistence(timeout: 10))
        XCTAssertTrue(app.staticTexts["Everyone the file is shared with sees the new name."].exists)
        let field = app.textFields["Name"]
        let cancel = app.buttons["Cancel"]
        XCTAssertTrue(field.exists)
        XCTAssertTrue(cancel.exists)
        // The title is above the field, and the buttons are below it, Cancel first.
        XCTAssertLessThan(title.frame.maxY, field.frame.minY)
        XCTAssertLessThan(field.frame.maxY, cancel.frame.minY)
        XCTAssertLessThan(cancel.frame.minX, app.buttons["Rename"].frame.minX)
        cancel.tap()
        XCTAssertTrue(title.waitForNonExistence(timeout: 10))
    }

    @MainActor
    func testADialogWithAShortFormStartsInItsField() {
        let app = launch()
        app.buttons["Rename file"].tap()
        let field = app.textFields["Name"]
        XCTAssertTrue(field.waitForExistence(timeout: 10))
        expectation(for: NSPredicate(format: "hasKeyboardFocus == true"), evaluatedWith: field)
        waitForExpectations(timeout: 10)
        app.buttons["Rename"].tap()
        XCTAssertTrue(field.waitForNonExistence(timeout: 10))
        XCTAssertEqual(status(app), "Renamed to Quarterly report.")
    }

    @MainActor
    func testTheAlertDialogIsTheSystemAlertAndCancelIsItsWayOut() {
        let app = launch()
        app.buttons["Delete address"].tap()
        let alert = app.alerts["Delete this address?"]
        XCTAssertTrue(alert.waitForExistence(timeout: 10))
        XCTAssertTrue(alert.staticTexts["It is removed from your account. This cannot be undone."].exists)
        alert.buttons["Cancel"].tap()
        XCTAssertTrue(alert.waitForNonExistence(timeout: 10))
        XCTAssertEqual(status(app), "Kept the address.")

        app.buttons["Delete address"].tap()
        XCTAssertTrue(alert.waitForExistence(timeout: 10))
        alert.buttons["Delete address"].tap()
        XCTAssertTrue(alert.waitForNonExistence(timeout: 10))
        XCTAssertEqual(status(app), "Deleted the address.")
    }

    @MainActor
    func testTheCloseButtonIsNamedAndClosesTheDialog() {
        let app = launch()
        app.buttons["Terms of use"].tap()
        let close = app.buttons["Close"]
        XCTAssertTrue(close.waitForExistence(timeout: 10))
        close.tap()
        XCTAssertTrue(close.waitForNonExistence(timeout: 10))
    }

    @MainActor
    func testLongContentScrollsUnderAHeaderThatStaysInPlace() {
        let app = launch()
        app.buttons["Terms of use"].tap()
        let close = app.buttons["Close"]
        XCTAssertTrue(close.waitForExistence(timeout: 10))
        let header = close.frame
        let paragraph = terms(app)
        let before = paragraph.frame
        paragraph.swipeUp()
        XCTAssertLessThan(paragraph.frame.minY, before.minY, "the body scrolled")
        XCTAssertEqual(close.frame.minY, header.minY, accuracy: 1, "the header stayed")
    }

    @MainActor
    func testASheetClosesWhenSweptDown() {
        let app = launch()
        app.buttons["Filters"].tap()
        let text = app.staticTexts["Show files shared with you in the last 30 days."]
        XCTAssertTrue(text.waitForExistence(timeout: 10))
        // A drag from the title, over the sheet's height and down to the bottom of the screen.
        // A swipe on an element moves only a fraction of its height, a few points on a line of
        // text, which does not move the sheet at all.
        let start = app.staticTexts["Filters"].coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5))
        let end = app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.97))
        start.press(forDuration: 0.1, thenDragTo: end, withVelocity: .fast, thenHoldForDuration: 0)
        XCTAssertTrue(text.waitForNonExistence(timeout: 10))
    }

    @MainActor
    func testASheetsButtonsCloseIt() {
        let app = launch()
        app.buttons["Share"].tap()
        XCTAssertTrue(app.staticTexts["Share file"].waitForExistence(timeout: 10))
        app.buttons["Copy link"].tap()
        XCTAssertTrue(app.staticTexts["Share file"].waitForNonExistence(timeout: 10))
        XCTAssertEqual(status(app), "Copied the link.")
    }

    @MainActor
    func testAtTheLargestTextSizeTheWholeDialogCanBeReached() throws {
        let app = launch(textSize: "UICTContentSizeCategoryAccessibilityXXXL")
        app.buttons["Rename file"].tap()
        let title = app.staticTexts["Rename file"]
        XCTAssertTrue(title.waitForExistence(timeout: 10))
        putTheKeyboardAway(app)
        // The whole dialog scrolls when the screen is too short for it, so the footer can be
        // reached.
        let cancel = app.buttons["Cancel"]
        for _ in 0..<4 where !cancel.isHittable {
            title.swipeUp()
        }
        XCTAssertTrue(cancel.isHittable)
        try audit(app)
        cancel.tap()
        XCTAssertTrue(title.waitForNonExistence(timeout: 10))
    }

    /// The system's accessibility audit, with each dialog and sheet, and the alert, open in turn.
    @MainActor
    func testEachOpenDialogPassesTheAccessibilityAudit() throws {
        let app = launch()
        for (button, close) in [
            ("Rename file", "Cancel"), ("Terms of use", "Close"), ("Share", "Cancel"), ("Filters", "Close"),
        ] {
            app.buttons[button].tap()
            XCTAssertTrue(app.buttons[close].waitForExistence(timeout: 10), button)
            if button == "Rename file" { putTheKeyboardAway(app) }
            try audit(app)
            app.buttons[close].tap()
            XCTAssertTrue(app.buttons[close].waitForNonExistence(timeout: 10), button)
        }
        app.buttons["Delete address"].tap()
        let alert = app.alerts.firstMatch
        XCTAssertTrue(alert.waitForExistence(timeout: 10))
        try audit(app)
        alert.buttons["Cancel"].tap()
    }

    @MainActor
    private func audit(_ app: XCUIApplication, file: StaticString = #filePath, line: UInt = #line) throws {
        var problems: [String] = []
        try app.performAccessibilityAudit { issue in
            // The audit takes any font that was not made from a text style to be fixed in size.
            // Raincoat scales its token sizes itself, which the Typography tests check.
            if issue.auditType == .dynamicType { return true }
            problems.append("\(issue.compactDescription): \(issue.element?.label ?? "no element")")
            return true
        }
        XCTAssertEqual(problems, [], file: file, line: line)
    }
}
