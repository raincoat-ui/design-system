import Raincoat
import SwiftUI

/// The dialog, the alert dialog, and the sheet as an app uses them, from the Dialog spec: a dialog
/// with a short form, which starts in its field; a dialog with content longer than the screen;
/// an alert dialog that confirms a deletion; and two sheets. What each did is written at the
/// bottom of the screen.
struct DialogScreen: View {
    @Tokens private var tokens
    @State private var name = "Quarterly report"
    @State private var status = "Nothing yet."
    @State private var isRenaming = false
    @State private var isReadingTerms = false
    @State private var isConfirming = false
    @State private var isSharing = false
    @State private var isFiltering = false

    static let terms =
        "You keep the rights to everything you upload. We store it so that you can reach it from your devices, and share it only with the people you choose. You can delete your account at any time, and everything in it is deleted within thirty days."

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: tokens.space._4) {
                Text("Files").raincoatHeading(level: 1)
                Text("\(name), shared with 3 people.").raincoatText()
                RaincoatButton("Rename file") { isRenaming = true }
                RaincoatButton("Terms of use") { isReadingTerms = true }
                RaincoatButton("Delete address", variant: .danger) { isConfirming = true }
                RaincoatButton("Share") { isSharing = true }
                RaincoatButton("Filters") { isFiltering = true }
                Text(status).raincoatText(color: .muted).accessibilityIdentifier("status")
            }
            .padding(tokens.space._6)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .raincoatDialog(
            Text("Rename file"), titleLevel: 2, isPresented: $isRenaming,
            description: Text("Everyone the file is shared with sees the new name.")
        ) {
            RenameField(name: $name)
        } actions: {
            RaincoatButton("Cancel") { isRenaming = false }
            RaincoatButton("Rename", variant: .primary) {
                status = "Renamed to \(name)."
                isRenaming = false
            }
        }
        .raincoatDialog(
            Text("Terms of use"), titleLevel: 2, isPresented: $isReadingTerms, closeLabel: Text("Close")
        ) {
            VStack(alignment: .leading, spacing: tokens.space._4) {
                ForEach(0..<12, id: \.self) { _ in Text(Self.terms) }
            }
        }
        .raincoatAlertDialog(
            Text("Delete this address?"), isPresented: $isConfirming,
            message: Text("It is removed from your account. This cannot be undone."),
            actionLabel: Text("Delete address"), destructive: true, cancelLabel: Text("Cancel"),
            onCancel: { status = "Kept the address." }
        ) {
            status = "Deleted the address."
        }
        .raincoatSheet(
            Text("Share file"), titleLevel: 2, isPresented: $isSharing,
            description: Text("People with the link can view the file.")
        ) {
            EmptyView()
        } actions: {
            RaincoatButton("Cancel") { isSharing = false }
            RaincoatButton("Copy link", variant: .primary) {
                status = "Copied the link."
                isSharing = false
            }
        }
        .raincoatSheet(
            Text("Filters"), titleLevel: 2, isPresented: $isFiltering, closeLabel: Text("Close")
        ) {
            Text("Show files shared with you in the last 30 days.")
        }
    }
}

/// The field of the rename dialog. It takes focus when the dialog opens.
private struct RenameField: View {
    @Binding var name: String
    @FocusState private var isFocused: Bool

    var body: some View {
        TextField("Name", text: $name)
            .textFieldStyle(.roundedBorder)
            .focused($isFocused)
            .onAppear { isFocused = true }
    }
}
