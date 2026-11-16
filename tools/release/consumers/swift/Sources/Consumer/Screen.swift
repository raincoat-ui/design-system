import Raincoat
import RaincoatThemeBase

/// The token types come with `import Raincoat`, on every platform the package builds for.
public let buttonHeight = RaincoatTheme.base.tokens(mode: .dark, density: .compact).button.height.md

#if canImport(SwiftUI)
    import SwiftUI

    public struct Screen: View {
        let isSaving: Bool
        let save: () -> Void

        public var body: some View {
            VStack {
                RaincoatButton("Save changes", variant: .primary, isLoading: isSaving, action: save)
                RaincoatButton("Cancel", size: .sm) {}.disabled(isSaving)
            }
            .raincoatTheme(.base)
            .raincoatDensity(.compact)
        }
    }
#endif
