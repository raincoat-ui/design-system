import Raincoat
import SwiftUI

/// Text and headings in the states of the Typography spec, as a settings screen sets them: a
/// title, sections, running text, and short facts. The outline has one level 1 heading and
/// skips no level.
struct TypographyScreen: View {
    @Tokens private var tokens

    static let paragraph =
        "Your files are kept on this device and in the cloud. Changes made on one device reach the others the next time they connect, usually within a minute."
    static let longHeading = "Notifications for comments, mentions, and changes to shared documents"
    /// An Arabic name, as a person would write it.
    static let name = "مريم الحسيني"

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: tokens.space._4) {
                Text("Settings").raincoatHeading(level: 1)
                Text("Choose how this app keeps your files, and what it tells you about them.")
                    .raincoatText(.bodyLg)

                Text("Text styles").raincoatHeading(level: 2)
                ForEach(TextVariant.allCases, id: \.self) { variant in
                    Text("Synced 2 minutes ago, in \(variant.rawValue)").raincoatText(variant)
                }

                Text("Colors").raincoatHeading(level: 2)
                Text("Your files are up to date.").raincoatText()
                Text("Last checked at 9:41.").raincoatText(color: .muted)
                Text("This file could not be opened.").raincoatText(color: .danger)

                Text("Headings").raincoatHeading(level: 2)
                ForEach(3...6, id: \.self) { level in
                    Text("Level \(level)").raincoatHeading(level: level)
                }
                Text("Recent files").raincoatHeading(level: 3, variant: .headingSm)
                Text("Shared with you").raincoatHeading(level: 3, color: .muted)

                Text("Long text").raincoatHeading(level: 2)
                Text(Self.longHeading).raincoatHeading(level: 3)
                Text(Self.paragraph)
                    .raincoatText(maxLines: 2)
                    .accessibilityIdentifier("max-lines")
                Text("Message from \(Self.name), 2 minutes ago").raincoatText()
            }
            .padding(tokens.space._6)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .background(Color(tokens.color.bg.canvas))
    }
}
