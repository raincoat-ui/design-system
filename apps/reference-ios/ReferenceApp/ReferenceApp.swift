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
            screen
                .raincoatTheme(.base)
        }
    }

    /// One screen per component. The Button's is the first; a UI test launches the app with
    /// `-screen toast` for the Toast's.
    @ViewBuilder private var screen: some View {
        switch UserDefaults.standard.string(forKey: "screen") ?? "" {
        case "toast": ToastScreen()
        default: ButtonScreen()
        }
    }
}
