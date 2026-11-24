import Foundation
import Raincoat
import SwiftUI

/// The Input in the states of its spec, and a form that checks its fields as RFC 0004 says: when
/// it is submitted, with focus moved to the first field in error, and after that as each field
/// changes. Sending the form writes a line at the top, which is how the UI tests see that it was
/// sent.
struct InputScreen: View {
    private enum Field: Hashable {
        case name, email
    }

    @Tokens private var tokens
    @State private var name = ""
    @State private var email = ""
    @State private var phone = ""
    @State private var message = ""
    @State private var submitted = false
    @State private var sent = "Nothing yet"
    @State private var search = ""
    @State private var small = "Ana Lima"
    @State private var medium = "Ana Lima"
    @State private var large = "Ana Lima"
    @FocusState private var focus: Field?

    /// The first field's label and error, in the language the app was launched in, so that the
    /// tests can check what VoiceOver is given in more than one language.
    private let words = Words(language: Locale.preferredLanguages.first ?? "en")

    private var nameError: String? {
        submitted && name.trimmingCharacters(in: .whitespaces).isEmpty ? words.nameError : nil
    }

    private var emailError: String? {
        let address = email.trimmingCharacters(in: .whitespaces)
        let isAddress = address.split(separator: "@", omittingEmptySubsequences: false).count == 2
            && !address.hasPrefix("@") && !address.hasSuffix("@") && !address.contains(" ")
        return submitted && !isAddress ? "Enter an email address, like name@example.com" : nil
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: tokens.space._6) {
                Text("Sent: \(sent)")
                    .accessibilityIdentifier("sent")

                section("A form") {
                    VStack(alignment: .leading, spacing: tokens.space._4) {
                        RaincoatInput(
                            words.name, text: $name, isInvalid: nameError != nil,
                            error: nameError.map { Text(verbatim: $0) }
                        )
                        .focused($focus, equals: .name)
                        RaincoatInput(
                            "Email", text: $email, type: .email,
                            description: Text("We send the receipt here."),
                            prompt: Text(verbatim: "name@example.com"),
                            isInvalid: emailError != nil, error: emailError.map { Text(verbatim: $0) }
                        )
                        .focused($focus, equals: .email)
                        RaincoatInput("Phone (optional)", text: $phone, type: .tel)
                        RaincoatInput("Message (optional)", text: $message, isMultiline: true)
                        RaincoatButton("Send", variant: .primary) { submit() }
                    }
                }

                section("Sizes") {
                    VStack(alignment: .leading, spacing: tokens.space._4) {
                        RaincoatInput("Small", text: $small, size: .sm)
                        RaincoatInput("Medium", text: $medium, size: .md)
                        RaincoatInput("Large", text: $large, size: .lg)
                    }
                }

                section("Disabled and read-only") {
                    VStack(alignment: .leading, spacing: tokens.space._4) {
                        RaincoatInput("Company", text: .constant("Harbour Supplies"))
                            .disabled(true)
                        RaincoatInput("Account number", text: .constant("DE89 3704 0044 0532 0130 00"), isReadOnly: true)
                    }
                }

                // The lines directly above and below the small field show how much room it
                // takes: the tests measure the distance between them.
                section("A hidden label and an icon") {
                    VStack(alignment: .leading, spacing: 0) {
                        Text("Above the small field").accessibilityIdentifier("small-above")
                        RaincoatInput(
                            "Search the docs", text: $search, type: .search, size: .sm, isLabelHidden: true,
                            leadingIcon: Image(systemName: "magnifyingglass")
                        )
                        Text("Below the small field").accessibilityIdentifier("small-below")
                    }
                }
            }
            .padding(tokens.space._6)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .foregroundStyle(Color(tokens.color.fg.default))
        .background(Color(tokens.color.bg.canvas))
    }

    private func submit() {
        submitted = true
        if nameError != nil {
            focus = .name
        } else if emailError != nil {
            focus = .email
        } else {
            sent = name
        }
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

/// The first field's words in English, Vietnamese, and Japanese.
private struct Words {
    let name: String
    let nameError: String

    init(language: String) {
        switch language.prefix(2) {
        case "vi":
            name = "Họ và tên"
            nameError = "Nhập họ và tên của bạn"
        case "ja":
            name = "氏名"
            nameError = "氏名を入力してください"
        default:
            name = "Full name"
            nameError = "Enter your full name"
        }
    }
}
