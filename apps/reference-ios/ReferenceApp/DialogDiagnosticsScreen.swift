import Raincoat
import SwiftUI

/// TEMPORARY, for PR 65, and removed before it merges: the same title, description, and buttons
/// in different containers, so that DialogDiagnosticsTests can tell which container the
/// accessibility audit's "Text clipped" comes from. Each variant is opened by its button.
struct DialogDiagnosticsScreen: View {
    enum Variant: String, CaseIterable, Identifiable {
        case heightDetent = "1 height 300"
        case largeDetent = "2 large"
        case heightScroll = "3 height 300 scroll"
        case heightScrollBounce = "4 height 300 scroll bounce"
        case heightGeometry = "5 height 300 geometry"
        case cover = "6 full-screen cover"
        case heightWidePadding = "7 height 300 padding 64"
        case heightSystemText = "8 height 300 system text"
        case mediumDetent = "9 medium"

        var id: String { rawValue }
    }

    @State private var sheet: Variant?
    @State private var cover: Variant?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 8) {
                ForEach(Variant.allCases) { variant in
                    Button(variant.rawValue) {
                        if variant == .cover {
                            cover = variant
                        } else {
                            sheet = variant
                        }
                    }
                }
            }
            .padding(24)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .sheet(item: $sheet) { variant in
            content(variant)
        }
        .fullScreenCover(item: $cover) { variant in
            content(variant)
        }
    }

    private func close() {
        sheet = nil
        cover = nil
    }

    @ViewBuilder
    private func content(_ variant: Variant) -> some View {
        switch variant {
        case .heightDetent:
            panel(padding: 24).presentationDetents([.height(300)])
        case .largeDetent:
            panel(padding: 24).presentationDetents([.large])
        case .heightScroll:
            ScrollView { panel(padding: 24) }.presentationDetents([.height(300)])
        case .heightScrollBounce:
            ScrollView { panel(padding: 24) }
                .scrollBounceBehavior(.basedOnSize)
                .presentationDetents([.height(300)])
        case .heightGeometry:
            GeometryReader { proxy in
                panel(padding: 24).frame(width: proxy.size.width, height: proxy.size.height, alignment: .top)
            }
            .presentationDetents([.height(300)])
        case .cover:
            panel(padding: 24)
        case .heightWidePadding:
            panel(padding: 64).presentationDetents([.height(300)])
        case .heightSystemText:
            systemPanel.presentationDetents([.height(300)])
        case .mediumDetent:
            panel(padding: 24).presentationDetents([.medium])
        }
    }

    /// The dialog's title, description, and footer, in Raincoat's text styles and buttons.
    private func panel(padding: CGFloat) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Rename file").raincoatHeading(level: 2, variant: .headingMd)
            Text("Everyone the file is shared with sees the new name.").raincoatText(.bodyMd)
            HStack(spacing: 8) {
                Spacer()
                RaincoatButton("Cancel") { close() }
                RaincoatButton("Copy link", variant: .primary) { close() }
            }
        }
        .padding(padding)
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    /// The same in the system's text styles and buttons, which follow Dynamic Type themselves.
    private var systemPanel: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Rename file").font(.headline).accessibilityAddTraits(.isHeader)
            Text("Everyone the file is shared with sees the new name.").font(.body)
            HStack(spacing: 8) {
                Spacer()
                Button("Cancel") { close() }
                Button("Copy link") { close() }.buttonStyle(.borderedProminent)
            }
        }
        .padding(24)
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
