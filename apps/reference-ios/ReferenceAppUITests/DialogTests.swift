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
        let description = app.staticTexts["Everyone the file is shared with sees the new name."]
        let field = app.textFields["Name"]
        // The field takes focus, and the keyboard leaves the dialog less of the screen.
        expectation(for: NSPredicate(format: "hasKeyboardFocus == true"), evaluatedWith: field)
        waitForExpectations(timeout: 10)
        let keyboard = app.keyboards.firstMatch
        XCTAssertTrue(keyboard.waitForExistence(timeout: 10))
        // The dialog brings the field being edited into view, above the keyboard.
        settle(field)
        assertAboveTheKeyboard(field, keyboard, "once the keyboard is up")
        // The whole dialog scrolls when the screen is too short for it, so the footer can be
        // reached. Scrolled to the field, it may show neither the title nor the description.
        let cancel = app.buttons["Cancel"]
        for _ in 0..<4 where !cancel.isHittable {
            ([title, description].first { $0.isHittable } ?? field).swipeUp()
        }
        // And it stays where it was scrolled to: Cancel is in the same place on two looks half
        // a second apart, and can still be touched.
        var last = cancel.frame
        var still = false
        for _ in 0..<10 where !still {
            Thread.sleep(forTimeInterval: 0.5)
            let next = cancel.frame
            still = next == last
            last = next
        }
        XCTAssertTrue(still, "Cancel stops moving: \(last)")
        XCTAssertTrue(cancel.isHittable)
        // The field is still being edited, and still wholly above the keyboard.
        XCTAssertEqual(field.value(forKey: "hasKeyboardFocus") as? Bool, true)
        assertAboveTheKeyboard(field, keyboard, "scrolled to Cancel")
        try audit(app, "Rename file at the largest text size", sheet: "Rename file")
        cancel.tap()
        XCTAssertTrue(title.waitForNonExistence(timeout: 10))
    }

    /// The check of clipped text that the audit cannot make in a sheet shorter than the screen
    /// (see `audit`). At the default and the largest text size, each dialog that fits the screen
    /// grows with its text, and its title, description or body, and buttons each lie wholly
    /// inside its sheet, on the screen, where they can be touched. The rename dialog is checked
    /// with its keyboard put away, so that all of its sheet shows.
    @MainActor
    func testEachDialogGrowsWithItsTextAndShowsEveryTextWhole() {
        let dialogs: [(button: String, title: String, texts: [String], buttons: [String])] = [
            (
                "Rename file", "Rename file", ["Everyone the file is shared with sees the new name."],
                ["Cancel", "Rename"]
            ),
            ("Share", "Share file", ["People with the link can view the file."], ["Cancel", "Copy link"]),
            ("Filters", "Filters", ["Show files shared with you in the last 30 days."], ["Close"]),
        ]
        let sizes = ["UICTContentSizeCategoryL", "UICTContentSizeCategoryAccessibilityXXXL"]
        var heights: [String: [CGFloat]] = [:]
        for size in sizes {
            let app = launch(textSize: size)
            continueAfterFailure = true
            for dialog in dialogs {
                app.buttons[dialog.button].tap()
                let title = app.staticTexts[dialog.title]
                XCTAssertTrue(title.waitForExistence(timeout: 10), dialog.title)
                if dialog.button == "Rename file" {
                    let field = app.textFields["Name"]
                    expectation(for: NSPredicate(format: "hasKeyboardFocus == true"), evaluatedWith: field)
                    waitForExpectations(timeout: 10)
                    field.typeText("\n")
                    XCTAssertTrue(app.keyboards.firstMatch.waitForNonExistence(timeout: 10), dialog.title)
                }
                // The sheet moves to the height of its content once it is measured.
                settle(title)
                guard let top = sheetTop(titled: dialog.title, in: app) else {
                    XCTFail("\(dialog.title): no title")
                    continue
                }
                // The sheet is attached to the bottom of the screen, so it shows from its top down.
                let shown = CGRect(x: app.frame.minX, y: top, width: app.frame.width, height: app.frame.maxY - top)
                heights[dialog.title, default: []].append(app.frame.maxY - title.frame.minY)
                if size == sizes[0] {
                    // As tall as its content, the sheet stops well short of the top of the screen.
                    XCTAssertGreaterThan(
                        title.frame.minY, app.frame.minY + app.frame.height / 4,
                        "\(dialog.title): the title's top is at \(title.frame.minY) of \(app.frame.height)"
                    )
                }
                let parts = [title] + dialog.texts.map { app.staticTexts[$0] } + dialog.buttons.map { app.buttons[$0] }
                for part in parts {
                    for _ in 0..<4 where !part.isHittable {
                        title.swipeUp()
                    }
                    let name = "\(dialog.title), \(part.label), \(size)"
                    XCTAssertTrue(part.isHittable, name)
                    XCTAssertTrue(
                        shown.insetBy(dx: -0.5, dy: -0.5).contains(part.frame), "\(name): \(part.frame) in \(shown)"
                    )
                }
                app.buttons[dialog.buttons[0]].tap()
                XCTAssertTrue(title.waitForNonExistence(timeout: 10), dialog.title)
            }
            app.terminate()
        }
        // Each fits the screen at both sizes, so its sheet is as tall as its text needs: what
        // shows of it, from its title to the bottom of the screen, grows with the text.
        for dialog in dialogs {
            let measured = heights[dialog.title] ?? []
            XCTAssertEqual(measured.count, 2, dialog.title)
            if measured.count == 2 {
                XCTAssertGreaterThan(
                    measured[1], measured[0] * 1.25,
                    "\(dialog.title): \(measured[0]) at the default size, \(measured[1]) at the largest"
                )
            }
        }
    }

    /// The system's accessibility audit, of the screen alone, then with each dialog and sheet, and
    /// the alert, open in turn. Every one is audited even when one fails, and each is an activity
    /// of its own in the results, so that a failure says which it was.
    @MainActor
    func testEachOpenDialogPassesTheAccessibilityAudit() throws {
        let app = launch()
        continueAfterFailure = true
        try audit(app, "the screen alone")
        for (button, title, close) in [
            ("Rename file", "Rename file", "Cancel"), ("Terms of use", "Terms of use", "Close"),
            ("Share", "Share file", "Cancel"), ("Filters", "Filters", "Close"),
        ] {
            app.buttons[button].tap()
            XCTAssertTrue(app.buttons[close].waitForExistence(timeout: 10), button)
            if button == "Rename file" {
                // As the person finds it: in the field, with the keyboard up.
                let field = app.textFields["Name"]
                expectation(for: NSPredicate(format: "hasKeyboardFocus == true"), evaluatedWith: field)
                waitForExpectations(timeout: 10)
                try audit(app, "\(button), with the keyboard up", sheet: title)
                // And with the keyboard put away, as Return does.
                field.typeText("\n")
                XCTAssertTrue(app.keyboards.firstMatch.waitForNonExistence(timeout: 10))
                try audit(app, "\(button), with the keyboard away", sheet: title)
            } else {
                try audit(app, button, sheet: title)
            }
            app.buttons[close].tap()
            XCTAssertTrue(app.buttons[close].waitForNonExistence(timeout: 10), button)
        }
        app.buttons["Delete address"].tap()
        let alert = app.alerts.firstMatch
        XCTAssertTrue(alert.waitForExistence(timeout: 10))
        try audit(app, "the alert dialog")
        alert.buttons["Cancel"].tap()
    }

    /// The system's accessibility audit of the screen, as an activity named for what is open. An
    /// issue it finds fails the test, with what XCTest attaches to it, unless it is one of these.
    /// For an issue that names no element, the activity also keeps what the screen showed when
    /// the issue was reported, and the app's elements, so that it can be traced.
    ///
    /// - Parameter title: The title of the dialog open in a sheet, if one is.
    @MainActor
    private func audit(_ app: XCUIApplication, _ state: String, sheet title: String? = nil) throws {
        try XCTContext.runActivity(named: "Audit: \(state)") { activity in
            var traced = false
            try app.performAccessibilityAudit { issue in
                // The audit takes any font that was not made from a text style to be fixed in
                // size. Raincoat scales its token sizes itself, which the Typography tests check.
                if issue.auditType == .dynamicType { return true }
                // The keyboard, and the typing predictions over it, are the system's.
                if let element = issue.element, self.isTheKeyboards(element, app) { return true }
                // The audit reports every text in a sheet shorter than the screen as one that
                // may be clipped at larger text sizes, whatever holds it: the system's own text
                // and buttons too, in a sheet at a height, medium, or large detent alike, but not
                // in a full-screen cover (the diagnostic of job 138580939095). So in the open
                // dialog's sheet alone, testEachDialogGrowsWithItsTextAndShowsEveryTextWhole
                // checks the text instead. Anywhere else, the issue still fails.
                if issue.auditType == .textClipped, let title, let element = issue.element,
                    self.isInSheet(element, titled: title, app)
                {
                    return true
                }
                if issue.element == nil, !traced {
                    traced = true
                    let screenshot = XCTAttachment(screenshot: app.screenshot())
                    screenshot.name = "\(state): \(issue.compactDescription): \(issue.detailedDescription)"
                    screenshot.lifetime = .keepAlways
                    activity.add(screenshot)
                    let elements = XCTAttachment(string: app.debugDescription)
                    elements.name = "\(state): the app's elements"
                    elements.lifetime = .keepAlways
                    activity.add(elements)
                }
                return false
            }
        }
    }

    /// Whether an element is the system keyboard's, or one of the typing predictions over it:
    /// within the frame of the keys or of the predictions, or one of the elements of the window
    /// that holds the keyboard, which holds the predictions too, at any text size. The app's own
    /// elements are in a window of their own.
    @MainActor
    private func isTheKeyboards(_ element: XCUIElement, _ app: XCUIApplication) -> Bool {
        let frame = element.frame
        let keyboard = [app.keyboards.firstMatch, app.otherElements["SystemInputAssistantView"]]
        if keyboard.contains(where: { $0.exists && $0.frame.contains(frame) }) { return true }
        let window = app.windows.containing(.keyboard, identifier: nil).firstMatch
        guard window.exists else { return false }
        let same = NSPredicate(format: "label == %@", element.label)
        return window.descendants(matching: element.elementType).matching(same).allElementsBoundByIndex
            .contains { $0.frame == frame }
    }

    /// How far the top of a dialog's sheet can be above its title: the dialog's padding, with
    /// room to spare for a theme's.
    private static let sheetTopPadding: CGFloat = 40

    /// The top of the open dialog's sheet: the top of its title, less the sheet's padding above
    /// it. The sheet is attached to the bottom of the screen, so all from there down is the
    /// sheet's.
    @MainActor
    private func sheetTop(titled title: String, in app: XCUIApplication) -> CGFloat? {
        let text = app.staticTexts[title]
        guard text.exists else { return nil }
        return text.frame.minY - Self.sheetTopPadding
    }

    /// Whether an element is in the open dialog's sheet: at or below the sheet's top.
    @MainActor
    private func isInSheet(_ element: XCUIElement, titled title: String, _ app: XCUIApplication) -> Bool {
        guard let top = sheetTop(titled: title, in: app) else { return false }
        return element.frame.minY >= top
    }

    /// Checks that an element lies wholly above the top of the keyboard.
    @MainActor
    private func assertAboveTheKeyboard(
        _ element: XCUIElement, _ keyboard: XCUIElement, _ when: String,
        file: StaticString = #filePath, line: UInt = #line
    ) {
        XCTAssertLessThanOrEqual(
            element.frame.maxY, keyboard.frame.minY + 0.5,
            "\(when): \(element.label) at \(element.frame), the keyboard at \(keyboard.frame)",
            file: file, line: line
        )
    }

    /// Waits until an element stops moving, as a sheet does once it reaches its height.
    @MainActor
    private func settle(_ element: XCUIElement) {
        var last = element.frame
        for _ in 0..<20 {
            Thread.sleep(forTimeInterval: 0.25)
            let next = element.frame
            if next == last { return }
            last = next
        }
    }
}
