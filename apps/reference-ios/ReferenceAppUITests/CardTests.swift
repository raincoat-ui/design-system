import XCTest

/// The Card on a simulator, checked against specs/components/card/spec.yaml: what assistive
/// technology is told, touches, growth at a large text size, and the system's accessibility
/// audit.
final class CardTests: ReferenceAppTestCase {
    private let longTitle = "Your order of three linen shirts and a wool scarf is on its way"

    @MainActor
    private func launch(textSize: String? = nil) -> XCUIApplication {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launchArguments += ["-screen", "card"]
        if let textSize {
            app.launchArguments += ["-UIPreferredContentSizeCategoryName", textSize]
        }
        app.launch()
        XCTAssertTrue(app.buttons["order-1042"].waitForExistence(timeout: 30))
        return app
    }

    @MainActor
    private func lastAction(_ app: XCUIApplication) -> String {
        app.staticTexts["last-action"].label
    }

    @MainActor
    func testEachInteractiveCardIsOneElementReadTitleFirst() {
        let app = launch()
        let cards = [
            "order-1042": ("Order 1042", ["A parcel at a front door", "Delivered on Monday"]),
            "order-1043": (longTitle, ["Arrives on Thursday"]),
            "return": ("Start a return", ["Within 30 days of delivery"]),
        ]
        for (identifier, (title, rest)) in cards {
            let card = app.buttons[identifier]
            XCTAssertTrue(card.exists, identifier)
            // One element, which VoiceOver reads title first, then the rest of the card.
            XCTAssertTrue(card.label.hasPrefix(title), "\(identifier): \(card.label)")
            for part in rest {
                XCTAssertTrue(card.label.contains(part), "\(identifier) reads \(part): \(card.label)")
            }
            // The card's content is not a set of separate elements.
            XCTAssertEqual(app.staticTexts.matching(identifier: title).count, 0, identifier)
        }
    }

    @MainActor
    func testAStaticCardKeepsItsPartsAndItsButtons() {
        let app = launch()
        for text in ["Storage", "4.2 GB of 15 GB used", "Summer trip"] {
            XCTAssertTrue(app.staticTexts[text].exists, text)
        }
        for name in ["Manage storage", "Share", "Open album"] {
            XCTAssertEqual(app.buttons.matching(identifier: name).count, 1, name)
        }
        app.buttons["Manage storage"].tap()
        XCTAssertEqual(lastAction(app), "Last action: Manage storage")
    }

    @MainActor
    func testATapAnywhereOnAnInteractiveCardActivatesIt() {
        let app = launch()
        // In the corner of the button card, away from its title.
        app.buttons["return"].coordinate(withNormalizedOffset: CGVector(dx: 0.95, dy: 0.9)).tap()
        XCTAssertEqual(lastAction(app), "Last action: Start a return")
        // On the media of a link card.
        app.buttons["order-1042"].coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.1)).tap()
        XCTAssertTrue(app.staticTexts["order-screen"].waitForExistence(timeout: 10))
        XCTAssertEqual(app.staticTexts["order-screen"].label, "Order 1042")
    }

    @MainActor
    func testCardsFillTheWidthTheyAreGiven() {
        let app = launch()
        let widths = ["order-1042", "order-1043", "return"].map { app.buttons[$0].frame.width }
        XCTAssertEqual(widths[0], widths[1], accuracy: 0.5)
        XCTAssertEqual(widths[0], widths[2], accuracy: 0.5)
        XCTAssertGreaterThan(widths[0], app.frame.width / 2)
    }

    /// The system's accessibility audit: names, traits, contrast, clipped text, and the rest.
    @MainActor
    func testTheScreenPassesTheAccessibilityAudit() throws {
        let app = launch()
        try audit(app)
    }

    @MainActor
    func testAtTheLargestTextSizeCardsGrowAndNothingIsClipped() throws {
        var heights: [String: [String: CGFloat]] = [:]
        let names = ["order-1042", "order-1043", "return"]
        let sizes = ["UICTContentSizeCategoryL", "UICTContentSizeCategoryAccessibilityXXXL"]
        for size in sizes {
            let app = launch(textSize: size)
            for name in names {
                heights[name, default: [:]][size] = app.buttons[name].frame.height
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
    }

    @MainActor
    private func audit(_ app: XCUIApplication, file: StaticString = #filePath, line: UInt = #line) throws {
        var problems: [String] = []
        try app.performAccessibilityAudit { issue in
            // The audit takes any font that was not made from a text style to be fixed in size.
            // Raincoat scales its token sizes itself, which
            // testAtTheLargestTextSizeCardsGrowAndNothingIsClipped checks directly.
            if issue.auditType == .dynamicType { return true }
            problems.append("\(issue.compactDescription): \(issue.element?.label ?? "no element")")
            return true
        }
        XCTAssertEqual(problems, [], file: file, line: line)
    }
}
