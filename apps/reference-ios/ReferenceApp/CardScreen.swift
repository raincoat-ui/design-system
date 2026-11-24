import Raincoat
import SwiftUI

/// The Card in the states of its spec, as an orders screen sets cards: links to orders and a
/// button that starts a return, and static cards that hold Buttons. Activating anything writes
/// its name in the line at the top, which is how the UI tests see that an action ran. The outline
/// has one level 1 heading and skips no level.
struct CardScreen: View {
    @Tokens private var tokens
    @State private var lastAction = "Nothing yet"

    static let longTitle = "Your order of three linen shirts and a wool scarf is on its way"

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: tokens.space._4) {
                    Text("Orders").raincoatHeading(level: 1)
                    Text("Last action: \(lastAction)")
                        .raincoatText()
                        .accessibilityIdentifier("last-action")

                    Text("Recent orders").raincoatHeading(level: 2)
                    NavigationLink(value: "Order 1042") {
                        RaincoatCard("Order 1042", level: 3) {
                            Text("Delivered on Monday").raincoatText(color: .muted)
                        }
                        .media { Picture(label: "A parcel at a front door") }
                    }
                    .buttonStyle(.raincoatCard)
                    .accessibilityIdentifier("order-1042")

                    NavigationLink(value: Self.longTitle) {
                        RaincoatCard(Self.longTitle, level: 3) {
                            Text("Arrives on Thursday").raincoatText(color: .muted)
                        }
                    }
                    .buttonStyle(.raincoatCard)
                    .accessibilityIdentifier("order-1043")

                    Button {
                        lastAction = "Start a return"
                    } label: {
                        RaincoatCard("Start a return", level: 3) {
                            Text("Within 30 days of delivery").raincoatText(color: .muted)
                        }
                    }
                    .buttonStyle(.raincoatCard)
                    .accessibilityIdentifier("return")

                    Text("Your account").raincoatHeading(level: 2)
                    RaincoatCard("Storage", level: 3) {
                        Text("4.2 GB of 15 GB used").raincoatText(color: .muted)
                    }
                    .footer {
                        RaincoatButton("Manage storage") { lastAction = "Manage storage" }
                    }

                    RaincoatCard("Summer trip", level: 3) {
                        Text("48 photos, shared with 3 people").raincoatText(color: .muted)
                    }
                    .media { Picture(label: "A lake between hills covered in pine trees") }
                    .footer {
                        RaincoatButton("Share", variant: .ghost) { lastAction = "Share" }
                        RaincoatButton("Open album", variant: .primary) { lastAction = "Open album" }
                    }
                }
                .padding(tokens.space._6)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .background(Color(tokens.color.bg.canvas))
            .navigationDestination(for: String.self) { order in
                Text(order)
                    .raincoatHeading(level: 1)
                    .accessibilityIdentifier("order-screen")
            }
        }
    }
}

/// A picture to stand for a photo: hills under a sky, in the theme's colors, with a label that
/// says what it shows.
private struct Picture: View {
    let label: String
    @Tokens private var tokens

    var body: some View {
        ZStack {
            Rectangle().fill(Color(tokens.color.bg.subtle))
            Hills().fill(Color(tokens.color.accent.default))
        }
        .frame(height: 120)
        .accessibilityElement()
        .accessibilityLabel(label)
        .accessibilityAddTraits(.isImage)
    }
}

private struct Hills: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: rect.minX, y: rect.maxY))
        path.addLine(to: CGPoint(x: rect.minX, y: rect.minY + rect.height * 0.6))
        path.addQuadCurve(
            to: CGPoint(x: rect.midX, y: rect.minY + rect.height * 0.6),
            control: CGPoint(x: rect.minX + rect.width / 4, y: rect.minY)
        )
        path.addQuadCurve(
            to: CGPoint(x: rect.maxX, y: rect.minY + rect.height / 2),
            control: CGPoint(x: rect.maxX - rect.width / 4, y: rect.maxY)
        )
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY))
        path.closeSubpath()
        return path
    }
}
