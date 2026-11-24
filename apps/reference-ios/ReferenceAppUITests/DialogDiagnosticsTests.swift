import XCTest

/// TEMPORARY, for PR 65, and removed before it merges: audits the same title, description, and
/// buttons in each container on DialogDiagnosticsScreen, and reports what the audit finds in
/// each, without failing on it. Each variant is an activity of its own, and the test's output
/// has one line per variant, starting with DIAGNOSTIC.
final class DialogDiagnosticsTests: ReferenceAppTestCase {
    @MainActor
    func testWhereTextClippedComesFrom() throws {
        continueAfterFailure = true
        let app = XCUIApplication()
        app.launchArguments += ["-screen", "dialog-diagnostics"]
        app.launch()
        let variants = [
            "1 height 300", "2 large", "3 height 300 scroll", "4 height 300 scroll bounce",
            "5 height 300 geometry", "6 full-screen cover", "7 height 300 padding 64",
            "8 height 300 system text", "9 medium",
        ]
        var summary: [String] = []
        for variant in variants {
            let open = app.buttons[variant]
            XCTAssertTrue(open.waitForExistence(timeout: 30), variant)
            open.tap()
            let cancel = app.buttons["Cancel"]
            XCTAssertTrue(cancel.waitForExistence(timeout: 10), variant)
            // Lets the presentation settle before the audit.
            Thread.sleep(forTimeInterval: 1)
            var found: [String] = []
            var dynamicType = 0
            try XCTContext.runActivity(named: "Variant \(variant)") { _ in
                try app.performAccessibilityAudit { issue in
                    if issue.auditType == .dynamicType {
                        dynamicType += 1
                    } else {
                        let element = issue.element.map { "\"\($0.label)\" at \($0.frame)" } ?? "no element"
                        found.append("\(issue.compactDescription): \(element)")
                    }
                    return true
                }
            }
            let issues = found.isEmpty ? "no issue" : found.joined(separator: "; ")
            let line = "DIAGNOSTIC \(variant): \(issues) (and \(dynamicType) Dynamic Type)"
            print(line)
            summary.append(line)
            cancel.tap()
            XCTAssertTrue(cancel.waitForNonExistence(timeout: 10), variant)
        }
        let attachment = XCTAttachment(string: summary.joined(separator: "\n"))
        attachment.name = "Where Text clipped comes from"
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
