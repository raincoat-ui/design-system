import Raincoat
import RaincoatThemeBase
import SwiftUI

/// The reference app shows every Raincoat component the way an app uses it. The UI tests in
/// ReferenceAppUITests drive it on a simulator, where they can check what unit tests cannot:
/// what assistive technology is told, the system's accessibility audit, touches, and text sizes.
@main
struct ReferenceApp: App {
    /// The component screen to show. A UI test names it with the launch argument
    /// `-screen <name>`; the Button's screen is the first.
    private let screen = UserDefaults.standard.string(forKey: "screen")

    var body: some Scene {
        WindowGroup {
            Group {
                switch screen {
                case "typography": TypographyScreen()
                case "dialog": DialogScreen()
                default: ButtonScreen()
                }
            }
            .raincoatTheme(.base)
        }
    }
}
