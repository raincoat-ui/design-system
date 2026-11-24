import Raincoat
import SwiftUI

/// The Tabs in the states of their spec. The app shows it when launched with `-screen tabs`.
/// The selected tab of the first row is written in the line at the top, which is how the UI
/// tests see the selection change.
struct TabsScreen: View {
    @Tokens private var tokens
    @State private var product = "details"

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: tokens.space._6) {
                Text("Selected: \(product)")
                    .accessibilityIdentifier("selected")

                group("Labels") {
                    RaincoatTabs(
                        selection: $product,
                        tabs: [
                            RaincoatTab("Details", value: "details"),
                            RaincoatTab("Reviews", value: "reviews"),
                            RaincoatTab("Shipping", value: "shipping"),
                        ]
                    ) { section in
                        panel(Self.productPanels[section] ?? "")
                    }
                }

                group("Icons") {
                    RaincoatTabs(
                        tabs: [
                            RaincoatTab("Photos", value: 0, icon: Image(systemName: "photo")),
                            RaincoatTab("Videos", value: 1, icon: Image(systemName: "video")),
                            RaincoatTab("Files", value: 2, icon: Image(systemName: "doc")),
                        ]
                    ) { section in
                        panel(["No photos yet.", "No videos yet.", "No files yet."][section])
                    }
                }

                group("Icon only") {
                    RaincoatTabs(
                        tabs: [
                            RaincoatTab(icon: Image(systemName: "list.bullet"), accessibilityLabel: Text("List"), value: 0),
                            RaincoatTab(icon: Image(systemName: "square.grid.2x2"), accessibilityLabel: Text("Grid"), value: 1),
                        ]
                    ) { section in
                        panel(section == 0 ? "Shown as a list." : "Shown as a grid.")
                    }
                }

                // More tabs than fit a phone, in a translation longer than the English, as an
                // app ships them in Vietnamese.
                group("Overflowing, translated") {
                    RaincoatTabs(
                        tabs: Self.translated.enumerated().map { index, label in
                            RaincoatTab(label, value: index)
                        }
                    ) { section in
                        panel("Đang xem: \(Self.translated[section])")
                    }
                }
            }
            .padding(tokens.space._6)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .foregroundStyle(Color(tokens.color.fg.default))
        .background(Color(tokens.color.bg.canvas))
    }

    static let productPanels = [
        "details": "Made of waxed cotton, with taped seams.",
        "reviews": "Rated 4 of 5 by 120 buyers.",
        "shipping": "Ships in two days.",
    ]

    static let translated = ["Tổng quan", "Thông số kỹ thuật", "Đánh giá", "Câu hỏi thường gặp", "Vận chuyển", "Đổi trả"]

    private func panel(_ text: String) -> some View {
        Text(text)
            .padding(.vertical, tokens.space._4)
            .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func group(_ title: String, @ViewBuilder content: () -> some View) -> some View {
        VStack(alignment: .leading, spacing: tokens.space._2) {
            Text(title)
                .font(.footnote)
                .foregroundStyle(Color(tokens.color.fg.muted))
                .accessibilityAddTraits(.isHeader)
            content()
        }
    }
}
