import Raincoat
import RaincoatThemeBase
import SwiftUI

/// The reference app shows every Raincoat component the way an app uses it. The UI tests in
/// ReferenceAppUITests drive it on a simulator, where they can check what unit tests cannot:
/// what assistive technology is told, the system's accessibility audit, touches, and text sizes.
@main
struct ReferenceApp: App {
    var body: some Scene {
        WindowGroup {
            ButtonScreen()
                .raincoatTheme(.base)
        }
    }
}
