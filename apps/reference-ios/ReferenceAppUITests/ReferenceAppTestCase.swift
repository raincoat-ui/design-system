import XCTest

/// The base of every test class here.
///
/// The first launch of the app by a test run is slow, once: on CI it has taken more than two
/// minutes, and every later launch a few seconds. Each test has a time limit, and that first
/// launch has failed a test whose own steps passed. So each class launches the app once before
/// its first test, where it counts against no test's limit and is part of no test's time.
class ReferenceAppTestCase: XCTestCase {
    override class func setUp() {
        super.setUp()
        MainActor.assumeIsolated {
            let app = XCUIApplication()
            app.launch()
            app.terminate()
        }
    }
}
