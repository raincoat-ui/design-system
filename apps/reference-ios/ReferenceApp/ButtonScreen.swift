import Raincoat
import SwiftUI

/// The Button in the states of its spec. Activating a button writes its name in the line at
/// the top, which is how the UI tests see that an action ran.
struct ButtonScreen: View {
    @Tokens private var tokens
    @State private var lastAction = "Nothing yet"

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: tokens.space._6) {
                Text("Last action: \(lastAction)")
                    .accessibilityIdentifier("last-action")

                section("Variants") {
                    VStack(alignment: .leading, spacing: tokens.space._3) {
                        RaincoatButton("Save changes", variant: .primary) { lastAction = "Save changes" }
                        RaincoatButton("Cancel", variant: .secondary) { lastAction = "Cancel" }
                        RaincoatButton("Show details", variant: .ghost) { lastAction = "Show details" }
                        RaincoatButton("Delete project", variant: .danger) { lastAction = "Delete project" }
                    }
                }

                section("Sizes") {
                    HStack(spacing: tokens.space._4) {
                        RaincoatButton("Small", variant: .primary, size: .sm) { lastAction = "Small" }
                        RaincoatButton("Medium", variant: .primary, size: .md) { lastAction = "Medium" }
                        RaincoatButton("Large", variant: .primary, size: .lg) { lastAction = "Large" }
                    }
                }

                section("Disabled and loading") {
                    HStack(spacing: tokens.space._4) {
                        RaincoatButton("Publish", variant: .primary) { lastAction = "Publish" }
                            .disabled(true)
                        RaincoatButton("Send invite", variant: .primary, isLoading: true) { lastAction = "Send invite" }
                    }
                }

                // The lines directly above and below the small button show how much room it
                // takes: the tests measure the distance between them.
                section("Icon only") {
                    VStack(alignment: .leading, spacing: 0) {
                        Text("Above the small button").accessibilityIdentifier("small-above")
                        RaincoatButton(
                            icon: Image(systemName: "trash"), accessibilityLabel: Text("Delete page"),
                            variant: .secondary, size: .sm
                        ) { lastAction = "Delete page" }
                        Text("Below the small button").accessibilityIdentifier("small-below")
                    }
                }

                section("Full width and a long label") {
                    VStack(spacing: tokens.space._3) {
                        RaincoatButton("Continue", variant: .primary, isFullWidth: true) { lastAction = "Continue" }
                        RaincoatButton(
                            "Save all of these changes and send the updated version to every reviewer",
                            variant: .secondary
                        ) { lastAction = "Save all" }
                    }
                }
            }
            .padding(tokens.space._6)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .foregroundStyle(Color(tokens.color.fg.default))
        .background(Color(tokens.color.bg.canvas))
    }

    private func section(_ title: String, @ViewBuilder content: () -> some View) -> some View {
        VStack(alignment: .leading, spacing: tokens.space._2) {
            Text(title)
                .font(.footnote)
                .foregroundStyle(Color(tokens.color.fg.muted))
                .accessibilityAddTraits(.isHeader)
            content()
        }
    }
}
