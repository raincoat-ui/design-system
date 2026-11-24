import Raincoat
import SwiftUI

/// The Toast in the states of its spec, shown the way an app shows them: from buttons, inside a
/// toast host. The screen keeps a bar of its own at the bottom, declared as a safe area inset, so
/// the toasts sit above it, and a search field, to bring up the keyboard. An action writes its
/// name in the line at the top, which is how the UI tests see that it ran.
struct ToastScreen: View {
    @State private var lastAction = "Nothing yet"

    var body: some View {
        ToastScreenContent(lastAction: $lastAction)
            .raincoatToastHost()
    }
}

/// The content inside the host, where `showRaincoatToast` reaches it.
private struct ToastScreenContent: View {
    @Binding var lastAction: String
    @Tokens private var tokens
    @Environment(\.showRaincoatToast) private var showToast
    @State private var search = ""

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: tokens.space._3) {
                Text("Last action: \(lastAction)")
                    .accessibilityIdentifier("last-action")

                RaincoatButton("Archive message", variant: .secondary) {
                    showToast(RaincoatToast("Message archived"))
                }
                RaincoatButton("Delete address", variant: .secondary) {
                    showToast(
                        RaincoatToast(
                            "Address deleted",
                            action: .init("Undo") { lastAction = "Undo" },
                            closeLabel: "Close"
                        )
                    )
                }
                RaincoatButton("Copy two links", variant: .secondary) {
                    showToast(RaincoatToast("First link copied", closeLabel: "Close"))
                    showToast(RaincoatToast("Second link copied", closeLabel: "Close"))
                }
                TextField(
                    "Search", text: $search,
                    prompt: Text("Search").foregroundStyle(Color(tokens.color.fg.muted))
                )
                .padding(tokens.space._3)
                .overlay {
                    RoundedRectangle(cornerRadius: tokens.radius.md)
                        .strokeBorder(Color(tokens.color.border.control), lineWidth: tokens.borderWidth.thin)
                }
                .accessibilityIdentifier("search")
            }
            .padding(tokens.space._6)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .foregroundStyle(Color(tokens.color.fg.default))
        .background(Color(tokens.color.bg.canvas))
        .safeAreaInset(edge: .bottom, spacing: 0) {
            HStack(spacing: tokens.space._6) {
                Text("Button")
                Text("Toast").bold()
            }
            .padding(tokens.space._4)
            .frame(maxWidth: .infinity)
            .background(Color(tokens.color.bg.surface))
            .accessibilityElement(children: .combine)
            .accessibilityIdentifier("bottom-bar")
        }
    }
}
