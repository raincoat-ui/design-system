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
        // The whole dialog scrolls when the screen is too short for it, so the footer can be
        // reached. Scrolled to the field, it may show neither the title nor the description.
        let cancel = app.buttons["Cancel"]
        for _ in 0..<4 where !cancel.isHittable {
            ([title, description].first { $0.isHittable } ?? field).swipeUp()
        }
        XCTAssertTrue(cancel.isHittable)
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
                guard let sheet = openSheet(titled: dialog.title, in: app) else {
                    XCTFail("\(dialog.title): no sheet holds the title")
                    continue
                }
                let shown = sheet.frame.intersection(app.frame)
                heights[dialog.title, default: []].append(shown.height)
                let parts = [title] + dialog.texts.map { app.staticTexts[$0] } + dialog.buttons.map { app.buttons[$0] }
                for part in parts {
                    for _ in 0..<4 where !part.isHittable {
                        sheet.swipeUp()
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
        // Each fits the screen at both sizes, so its sheet is as tall as its text needs.
        for dialog in dialogs {
            let measured = heights[dialog.title] ?? []
            XCTAssertEqual(measured.count, 2, dialog.title)
            if measured.count == 2 {
                XCTAssertGreaterThan(measured[1], measured[0] * 1.25, "\(dialog.title): \(measured)")
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

    /// Whether an element is the system keyboard's, or one of the typing predictions over it.
    @MainActor
    private func isTheKeyboards(_ element: XCUIElement, _ app: XCUIApplication) -> Bool {
        let frame = element.frame
        let keyboard = [app.keyboards.firstMatch, app.otherElements["SystemInputAssistantView"]]
        return keyboard.contains { $0.exists && $0.frame.contains(frame) }
    }

    /// The sheet of the open dialog with this title: the largest element that holds the title
    /// and not the screen beneath it, whose heading is "Files".
    @MainActor
    private func openSheet(titled title: String, in app: XCUIApplication) -> XCUIElement? {
        let titleText = NSPredicate(
            format: "elementType == %lu AND label == %@", XCUIElement.ElementType.staticText.rawValue, title
        )
        return app.otherElements.containing(titleText).allElementsBoundByIndex
            .filter { $0.frame.width > 0 && !$0.staticTexts["Files"].exists }
            .max { $0.frame.width * $0.frame.height < $1.frame.width * $1.frame.height }
    }

    /// Whether an element is one of the open dialog's own, inside its sheet: the sheet holds an
    /// element of the same type and label, in the same place.
    @MainActor
    private func isInSheet(_ element: XCUIElement, titled title: String, _ app: XCUIApplication) -> Bool {
        guard let sheet = openSheet(titled: title, in: app) else { return false }
        let frame = element.frame
        let same = NSPredicate(
            format: "elementType == %lu AND label == %@", element.elementType.rawValue, element.label
        )
        return sheet.descendants(matching: .any).matching(same).allElementsBoundByIndex.contains { $0.frame == frame }
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
