import Raincoat
import RaincoatThemeBase
import SwiftUI

/// The reference app shows every Raincoat component the way an app uses it. The UI tests in
/// ReferenceAppUITests drive it on a simulator, where they can check what unit tests cannot:
/// what assistive technology is told, the system's accessibility audit, touches, and text sizes.
@main
struct ReferenceApp: App {
    /// The screen to show: the Button's, unless the app is launched with `-screen <name>`, as the
    /// UI tests of each other component launch it.
    private let screen = UserDefaults.standard.string(forKey: "screen")

    var body: some Scene {
        WindowGroup {
            Group {
                switch screen {
                case "tabs": TabsScreen()
                default: ButtonScreen()
                }
            }
            .raincoatTheme(.base)
        }
    }
}
