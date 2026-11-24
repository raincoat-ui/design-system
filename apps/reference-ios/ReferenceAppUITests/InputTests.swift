import XCTest

/// The Input on a simulator, checked against specs/components/input/spec.yaml and the
/// Accessibility table of RFC 0004: what VoiceOver is given, in more than one language, a form
/// checked on submit with focus moved to the first field in error, the system's accessibility
/// audit, touches, and text sizes.
///
/// It reads no token: it compares what the app shows with itself and with the platform's minimum
/// touch target, so it runs unchanged in every theme.
final class InputTests: ReferenceAppTestCase {
    /// The smallest touch target the platform asks for, in points.
    private let minimumTarget: CGFloat = 44

    @MainActor
    private func launch(textSize: String? = nil, language: String? = nil) -> XCUIApplication {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launchArguments += ["-screen", "input"]
        if let textSize {
            app.launchArguments += ["-UIPreferredContentSizeCategoryName", textSize]
        }
        if let language {
            app.launchArguments += ["-AppleLanguages", "(\(language))"]
        }
        app.launch()
        XCTAssertTrue(app.buttons["Send"].waitForExistence(timeout: 30))
        return app
    }

    @MainActor
    private func hasKeyboardFocus(_ element: XCUIElement) -> Bool {
        (element.value(forKey: "hasKeyboardFocus") as? Bool) ?? false
    }

    @MainActor
    func testEveryFieldIsNamedByItsLabel() {
        let app = launch()
        for name in ["Full name", "Email", "Phone (optional)", "Small", "Medium", "Large", "Company", "Search the docs"] {
            XCTAssertTrue(app.textFields[name].exists, name)
        }
        // A field of several lines is a text field or a text view, as the system makes it.
        let message = app.descendants(matching: .any)["Message (optional)"]
        XCTAssertTrue(message.exists)
        XCTAssertTrue([.textField, .textView].contains(message.elementType), "\(message.elementType)")
        XCTAssertGreaterThanOrEqual(message.frame.height, minimumTarget - 0.5)
        // The texts around a field are not said again: the field says them.
        XCTAssertFalse(app.staticTexts["We send the receipt here."].exists)
        // A read-only field is its value, named by its label.
        let account = app.staticTexts["Account number"]
        XCTAssertTrue(account.exists)
        XCTAssertEqual(account.value as? String, "DE89 3704 0044 0532 0130 00")
    }

    @MainActor
    func testADisabledFieldIsUnavailable() {
        let app = launch()
        XCTAssertFalse(app.textFields["Company"].isEnabled)
        XCTAssertTrue(app.textFields["Full name"].isEnabled)
    }

    @MainActor
    func testSubmittingMovesFocusToTheFirstFieldInErrorWhichSaysItsError() {
        let app = launch()
        app.buttons["Send"].tap()

        // iOS has no invalid state: the error follows the label.
        let name = app.textFields["Full name, Enter your full name"]
        XCTAssertTrue(name.waitForExistence(timeout: 5))
        XCTAssertTrue(hasKeyboardFocus(name))
        XCTAssertTrue(app.textFields["Email, Enter an email address, like name@example.com"].exists)
        XCTAssertEqual(app.staticTexts["sent"].label, "Sent: Nothing yet")

        // After that, a field is checked as it changes: the error clears as soon as it is fixed.
        name.typeText("Ana Lima")
        XCTAssertTrue(app.textFields["Full name"].waitForExistence(timeout: 5))
        app.buttons["Send"].tap()
        let email = app.textFields["Email, Enter an email address, like name@example.com"]
        XCTAssertTrue(email.waitForExistence(timeout: 5))
        XCTAssertTrue(hasKeyboardFocus(email))
        email.typeText("ana@example.com")
        XCTAssertTrue(app.textFields["Email"].waitForExistence(timeout: 5))
        app.buttons["Send"].tap()
        XCTAssertEqual(app.staticTexts["sent"].label, "Sent: Ana Lima")
    }

    // What VoiceOver is given for a field in error, in the person's language. Each language
    // needs a launch of its own, so each is a test of its own.

    @MainActor
    func testAnErrorFollowsTheLabelInVietnamese() {
        assertError(language: "vi", says: "Họ và tên, Nhập họ và tên của bạn")
    }

    @MainActor
    func testAnErrorFollowsTheLabelInJapanese() {
        assertError(language: "ja", says: "氏名, 氏名を入力してください")
    }

    @MainActor
    private func assertError(language: String, says words: String, file: StaticString = #filePath, line: UInt = #line) {
        let app = launch(language: language)
        app.buttons["Send"].tap()
        XCTAssertTrue(app.textFields[words].waitForExistence(timeout: 5), language, file: file, line: line)
    }

    @MainActor
    func testEveryTouchTargetIsAtLeastTheMinimum() {
        let app = launch()
        let fields = app.textFields.allElementsBoundByIndex
        XCTAssertGreaterThanOrEqual(fields.count, 8)
        // The frame is the area that takes touches, and the one assistive technology is given.
        for field in fields {
            XCTAssertGreaterThanOrEqual(field.frame.height, minimumTarget - 0.5, field.label)
        }
    }

    /// Scrolls the screen up until the element is on it. XCTest taps a coordinate where it is,
    /// without scrolling, so a tap at a point below the screen reaches nothing.
    @MainActor
    private func scrollOntoTheScreen(_ element: XCUIElement, in app: XCUIApplication) {
        let screen = app.windows.firstMatch.frame
        var swipes = 0
        while !screen.contains(element.frame), swipes < 6 {
            app.swipeUp()
            swipes += 1
        }
        XCTAssertTrue(screen.contains(element.frame), "\(element.frame) is not inside \(screen)")
    }

    /// Takes keyboard focus away from the field: Return ends editing, and otherwise the caret goes
    /// to another field.
    @MainActor
    private func leave(_ field: XCUIElement, in app: XCUIApplication) {
        guard hasKeyboardFocus(field) else { return }
        field.typeText("\n")
        if hasKeyboardFocus(field) {
            app.textFields["Large"].tap()
        }
    }

    /// Taps a point a distance below the top of the visible small field, with the field on the
    /// screen and without focus, and says whether the field has keyboard focus after it.
    @MainActor
    private func smallFieldIsFocusedByATap(_ distance: CGFloat, fromTop: Bool, in app: XCUIApplication) -> Bool {
        let field = app.textFields["Search the docs"]
        leave(field, in: app)
        scrollOntoTheScreen(field, in: app)
        let top = app.staticTexts["small-above"].frame.maxY
        let bottom = app.staticTexts["small-below"].frame.minY
        let y = fromTop ? top + distance : (top + bottom) / 2
        app.coordinate(withNormalizedOffset: .zero).withOffset(CGVector(dx: field.frame.midX, dy: y)).tap()
        return hasKeyboardFocus(field)
    }

    @MainActor
    func testASmallFieldTakesTheRoomItShowsAndTouchesJustOutsideItCount() {
        let app = launch()
        let field = app.textFields["Search the docs"]
        // The field is below the first screen.
        scrollOntoTheScreen(field, in: app)
        let above = app.staticTexts["small-above"].frame
        let below = app.staticTexts["small-below"].frame

        // The lines directly above and below are closer together than the touch target is tall:
        // the field takes the room it shows.
        let shown = below.minY - above.maxY
        XCTAssertLessThan(shown, minimumTarget)
        XCTAssertGreaterThan(shown, 0)

        // The touch target is larger, and centered on the field.
        XCTAssertEqual(field.frame.height, minimumTarget, accuracy: 0.5)
        XCTAssertEqual(field.frame.midY, (above.maxY + below.minY) / 2, accuracy: 0.5)

        // Which taps reach the field, recorded in the log until this test passes.
        let diagnostics = [
            ("1 pt above the visible field", smallFieldIsFocusedByATap(-1, fromTop: true, in: app)),
            ("1 pt inside the visible field's top", smallFieldIsFocusedByATap(1, fromTop: true, in: app)),
            ("the visible field's centre", smallFieldIsFocusedByATap(0, fromTop: false, in: app)),
        ]
        for (place, focused) in diagnostics {
            XCTContext.runActivity(named: "Diagnostic: a tap at \(place) focuses the field: \(focused)") { _ in }
        }
        leave(field, in: app)
        scrollOntoTheScreen(field, in: app)
        XCTAssertFalse(hasKeyboardFocus(field), "The field kept focus, so the last tap shows nothing")

        // A touch inside the target but above the visible field, on the line of text there.
        field.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0)).withOffset(CGVector(dx: 0, dy: 1)).tap()
        XCTAssertTrue(hasKeyboardFocus(field))
    }

    /// The system's accessibility audit: names, traits, touch targets, contrast, clipped text.
    /// An issue that is not exempt is also left to XCTest, which records it with its element and
    /// a screenshot.
    @MainActor
    func testTheScreenPassesTheAccessibilityAudit() throws {
        let app = launch()
        var problems: [String] = []
        try app.performAccessibilityAudit { issue in
            // A disabled control is exempt from contrast requirements (WCAG 1.4.3).
            if issue.auditType == .contrast, issue.element?.isEnabled == false { return true }
            // The audit takes any font that was not made from a text style to be fixed in size.
            // Raincoat scales its token sizes itself, which testFieldsGrowWithTheTextSize checks.
            if issue.auditType == .dynamicType { return true }
            if let element = issue.element {
                let value = element.value.map { "\($0)" } ?? "none"
                let placeholder = element.placeholderValue ?? "none"
                problems.append(
                    "\(issue.compactDescription): \(element.label), frame \(element.frame), "
                        + "value \(value), placeholder \(placeholder)"
                )
            } else {
                problems.append("\(issue.compactDescription): no element")
            }
            return false
        }
        XCTAssertEqual(problems, [])
    }

    @MainActor
    func testFieldsGrowWithTheTextSize() {
        var heights: [String: [String: CGFloat]] = [:]
        let names = ["Small", "Medium", "Large"]
        for size in ["UICTContentSizeCategoryL", "UICTContentSizeCategoryAccessibilityXL"] {
            let app = launch(textSize: size)
            for name in names {
                heights[name, default: [:]][size] = app.textFields[name].frame.height
            }
            app.terminate()
        }
        for name in names {
            let standard = heights[name]?["UICTContentSizeCategoryL"] ?? 0
            let large = heights[name]?["UICTContentSizeCategoryAccessibilityXL"] ?? 0
            XCTAssertGreaterThan(large, standard * 1.25, "\(name): \(heights[name] ?? [:])")
        }
    }
}
