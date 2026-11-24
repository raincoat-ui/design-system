#if canImport(SwiftUI)
    import RaincoatTokens
    import SwiftUI

    /// A text field with its label, an optional description, and an error message, in one line or
    /// several. It follows the Raincoat Input spec.
    ///
    ///     RaincoatInput("Full name", text: $name)
    ///     RaincoatInput("Email", text: $email, type: .email, prompt: Text("name@example.com"))
    ///     RaincoatInput("Email", text: $email, isInvalid: !isValid, error: Text("Enter an email address"))
    ///     RaincoatInput("Message", text: $message, isMultiline: true)
    ///
    /// Disable it with `disabled(_:)`, as any SwiftUI control, and move focus to it with
    /// `focused(_:equals:)`. Colors, sizes, and text styles come from the theme in the
    /// environment; see `View.raincoatTheme(_:)`.
    ///
    /// The label is the field's name for VoiceOver, and the description its hint. iOS has no
    /// invalid state, so an invalid field's error message follows its label: "Email, Enter an
    /// email address". It has no required state either: mark the fields that are optional in
    /// their label.
    public struct RaincoatInput: View {
        private let label: Text
        @Binding private var text: String
        private let type: InputType
        private let size: InputSize
        private let description: Text?
        private let prompt: Text?
        private let isInvalid: Bool
        private let error: Text?
        private let isMultiline: Bool
        private let rows: Int
        private let isReadOnly: Bool
        private let isLabelHidden: Bool
        private let leadingIcon: Image?

        @Tokens private var tokens
        @Environment(\.isEnabled) private var isEnabled

        /// Creates a field with a label.
        ///
        /// - Parameters:
        ///   - label: What the field is for, above it. It wraps and is never truncated.
        ///   - text: The value.
        ///   - type: What the field holds. It chooses the keyboard and what autofill offers.
        ///   - size: The height and text size of the field.
        ///   - description: Help that is read before typing, between the label and the field.
        ///   - prompt: An example of the format, shown while the field is empty. Never
        ///     instructions, and never the label.
        ///   - isInvalid: Whether the value is not accepted. An invalid field shows its error.
        ///   - error: What to do to make the value acceptable, below the field. An invalid field
        ///     must have one.
        ///   - isMultiline: Whether the field takes several lines. It holds text, whatever the
        ///     type, starts `rows` lines tall, and grows with its content.
        ///   - rows: How many lines tall a multi-line field starts.
        ///   - isReadOnly: Whether the value can be selected and copied but not changed.
        ///   - isLabelHidden: Whether the label is hidden from view. It is still the field's name.
        ///   - leadingIcon: A decorative icon at the start of the field.
        public init(
            _ label: Text,
            text: Binding<String>,
            type: InputType = .standard,
            size: InputSize = .standard,
            description: Text? = nil,
            prompt: Text? = nil,
            isInvalid: Bool = false,
            error: Text? = nil,
            isMultiline: Bool = false,
            rows: Int = 3,
            isReadOnly: Bool = false,
            isLabelHidden: Bool = false,
            leadingIcon: Image? = nil
        ) {
            self.label = label
            _text = text
            self.type = isMultiline ? .text : type
            self.size = size
            self.description = description
            self.prompt = prompt
            self.isInvalid = isInvalid
            self.error = error
            self.isMultiline = isMultiline
            self.rows = max(1, rows)
            self.isReadOnly = isReadOnly
            self.isLabelHidden = isLabelHidden
            self.leadingIcon = leadingIcon
        }

        /// Creates a field whose label is a localized string key.
        public init(
            _ labelKey: LocalizedStringKey,
            text: Binding<String>,
            type: InputType = .standard,
            size: InputSize = .standard,
            description: Text? = nil,
            prompt: Text? = nil,
            isInvalid: Bool = false,
            error: Text? = nil,
            isMultiline: Bool = false,
            rows: Int = 3,
            isReadOnly: Bool = false,
            isLabelHidden: Bool = false,
            leadingIcon: Image? = nil
        ) {
            self.init(
                Text(labelKey), text: text, type: type, size: size, description: description,
                prompt: prompt, isInvalid: isInvalid, error: error, isMultiline: isMultiline, rows: rows,
                isReadOnly: isReadOnly, isLabelHidden: isLabelHidden, leadingIcon: leadingIcon
            )
        }

        /// Creates a field whose label is a string that is shown as it is.
        @_disfavoredOverload
        public init(
            _ label: some StringProtocol,
            text: Binding<String>,
            type: InputType = .standard,
            size: InputSize = .standard,
            description: Text? = nil,
            prompt: Text? = nil,
            isInvalid: Bool = false,
            error: Text? = nil,
            isMultiline: Bool = false,
            rows: Int = 3,
            isReadOnly: Bool = false,
            isLabelHidden: Bool = false,
            leadingIcon: Image? = nil
        ) {
            self.init(
                Text(label), text: text, type: type, size: size, description: description,
                prompt: prompt, isInvalid: isInvalid, error: error, isMultiline: isMultiline, rows: rows,
                isReadOnly: isReadOnly, isLabelHidden: isLabelHidden, leadingIcon: leadingIcon
            )
        }

        public var body: some View {
            let input = tokens.input
            let measurements = InputMeasurements(input, size: size)
            let shownError = isInvalid ? error : nil

            // The field carries the label, the description, and the error for VoiceOver, so the
            // texts around it are hidden from it.
            VStack(alignment: .leading, spacing: input.gap) {
                if !isLabelHidden {
                    InputText(label, style: measurements.label, color: input.label.fg)
                }
                if let description {
                    InputText(description, style: input.description.type, color: input.description.fg)
                }
                InputBox(
                    size: size, isInvalid: isInvalid, isReadOnly: isReadOnly, isMultiline: isMultiline,
                    isLeftToRight: InputKeyboard(type).isLeftToRight, leadingIcon: leadingIcon
                ) {
                    editor(placeholder: InputColors(
                        input, isEnabled: isEnabled, isInvalid: isInvalid, isReadOnly: isReadOnly
                    ).placeholder)
                    .accessibilityLabel(shownError.map { label + Text(verbatim: ", ") + $0 } ?? label)
                    .accessibilityHint(description ?? Text(verbatim: ""))
                }
                if let shownError {
                    InputText(shownError, style: input.error.type, color: input.error.fg)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }

        /// The control that takes the text: a text field, a secure field, or, when read-only, the
        /// value as selectable text.
        @ViewBuilder
        private func editor(placeholder: TokenColor) -> some View {
            let keyboard = InputKeyboard(type)
            let prompt = (self.prompt ?? Text(verbatim: "")).foregroundStyle(Color(placeholder))
            if isReadOnly {
                let shown = keyboard.isSecure ? String(repeating: "\u{2022}", count: text.count) : text
                Text(verbatim: shown)
                    .lineLimit(nil)
                    .fixedSize(horizontal: false, vertical: true)
                    .textSelection(.enabled)
                    .accessibilityElement(children: .ignore)
                    .accessibilityValue(Text(verbatim: shown))
                    .accessibilityAddTraits(.isStaticText)
            } else if keyboard.isSecure {
                SecureField(text: $text, prompt: prompt) { label }
                    .textFieldStyle(.plain)
                    .keyboard(keyboard)
            } else if isMultiline {
                TextField(text: $text, prompt: prompt, axis: .vertical) { label }
                    .lineLimit(rows...)
                    .textFieldStyle(.plain)
                    .keyboard(keyboard)
            } else {
                TextField(text: $text, prompt: prompt) { label }
                    .textFieldStyle(.plain)
                    .keyboard(keyboard)
            }
        }
    }

    /// The Raincoat field's appearance, for any SwiftUI text field.
    ///
    /// Use it to give a `TextField` or a `SecureField` the look of a `RaincoatInput`'s field,
    /// without its label, description, and error:
    ///
    ///     TextField("Search", text: $query).textFieldStyle(.raincoat(size: .sm))
    public struct RaincoatTextFieldStyle: TextFieldStyle {
        let size: InputSize
        let isInvalid: Bool

        public init(size: InputSize = .standard, isInvalid: Bool = false) {
            self.size = size
            self.isInvalid = isInvalid
        }

        public func _body(configuration: TextField<Self._Label>) -> some View {
            InputBox(
                size: size, isInvalid: isInvalid, isReadOnly: false, isMultiline: false,
                isLeftToRight: false, leadingIcon: nil
            ) {
                configuration
            }
        }
    }

    extension TextFieldStyle where Self == RaincoatTextFieldStyle {
        /// The Raincoat field's appearance.
        public static func raincoat(size: InputSize = .standard, isInvalid: Bool = false) -> RaincoatTextFieldStyle {
            RaincoatTextFieldStyle(size: size, isInvalid: isInvalid)
        }
    }

    /// The field: fill, outline, padding, the leading icon, and the text style of the value.
    ///
    /// The field takes the room it shows. Where it is shorter than the minimum touch target, the
    /// control inside reaches past its top and bottom, so that touches there place the caret and
    /// assistive technology is given the larger area.
    struct InputBox<Content: View>: View {
        let size: InputSize
        let isInvalid: Bool
        let isReadOnly: Bool
        let isMultiline: Bool
        /// Whether the field stays left-to-right in a right-to-left layout, its icon included.
        let isLeftToRight: Bool
        let leadingIcon: Image?
        @ViewBuilder let content: Content

        @Tokens private var tokens
        @Environment(\.isEnabled) private var isEnabled
        @Environment(\.layoutDirection) private var layoutDirection
        @ScaledMetric(relativeTo: .body) private var textScale: CGFloat = 1

        var body: some View {
            let input = tokens.input
            let measurements = InputMeasurements(input, size: size)
            let colors = InputColors(input, isEnabled: isEnabled, isInvalid: isInvalid, isReadOnly: isReadOnly)
            let value = measurements.value.resolved(scale: textScale)
            let paddingBlock = CGFloat(measurements.paddingBlock)
            // One line of the value with the space above and below it: the token's height, unless
            // the text is enlarged, when the field grows instead.
            let line = max(CGFloat(measurements.height), value.lineHeight + 2 * paddingBlock)
            let reach: CGFloat = isMultiline ? 0 : max(0, (CGFloat(input.targetMinimum) - line) / 2)
            // Icons grow with the text.
            let iconSize = measurements.iconSize * textScale
            let shape = RoundedRectangle(cornerRadius: input.radius, style: .continuous)

            // The stack follows the layout direction, so in right-to-left layouts the leading icon
            // is on the right.
            HStack(alignment: isMultiline ? .top : .center, spacing: input.gap) {
                if let leadingIcon {
                    leadingIcon
                        .resizable()
                        .scaledToFit()
                        .frame(width: iconSize, height: iconSize)
                        // Beside the first line of a multi-line field.
                        .frame(height: isMultiline ? value.lineHeight : nil)
                        .padding(.vertical, isMultiline ? paddingBlock : 0)
                        .accessibilityHidden(true)
                }
                content
                    .font(value.font)
                    .tracking(value.tracking)
                    .lineSpacing(value.lineSpacing)
                    .foregroundStyle(Color(colors.foreground))
                    .frame(
                        maxWidth: .infinity,
                        minHeight: isMultiline ? nil : line + 2 * reach,
                        alignment: .leading
                    )
                    .padding(.vertical, isMultiline ? paddingBlock : -reach)
            }
            .padding(.horizontal, measurements.paddingInline)
            .frame(minHeight: measurements.height)
            .foregroundStyle(Color(colors.foreground))
            .background { shape.fill(Color(colors.fill)) }
            .overlay { shape.strokeBorder(Color(colors.border), lineWidth: input.borderWidth) }
            .environment(\.layoutDirection, isLeftToRight ? .leftToRight : layoutDirection)
        }
    }

    /// The label, the description, or the error: wrapped, never truncated, and hidden from
    /// VoiceOver, because the field says it.
    private struct InputText: View {
        let text: Text
        let style: TokenTextStyle
        let color: TokenColor

        @ScaledMetric(relativeTo: .body) private var textScale: CGFloat = 1

        init(_ text: Text, style: TokenTextStyle, color: TokenColor) {
            self.text = text
            self.style = style
            self.color = color
        }

        var body: some View {
            let resolved = style.resolved(scale: textScale)
            text
                .font(resolved.font)
                .tracking(resolved.tracking)
                .lineSpacing(resolved.lineSpacing)
                .foregroundStyle(Color(color))
                .lineLimit(nil)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.vertical, resolved.halfLeading)
                .frame(minHeight: resolved.lineHeight)
                .frame(maxWidth: .infinity, alignment: .leading)
                .accessibilityHidden(true)
        }
    }

    extension View {
        /// The keyboard, autofill, and corrections for a type of field. iOS only: a Mac has no
        /// on-screen keyboard.
        fileprivate func keyboard(_ keyboard: InputKeyboard) -> some View {
            #if os(iOS)
                let keys: UIKeyboardType =
                    switch keyboard.keys {
                    case .standard: .default
                    case .email: .emailAddress
                    case .phone: .phonePad
                    case .url: .URL
                    case .search: .webSearch
                    }
                let content: UITextContentType? =
                    switch keyboard.content {
                    case .unspecified: nil
                    case .email: .emailAddress
                    case .password: .password
                    case .phone: .telephoneNumber
                    case .url: .URL
                    }
                return self
                    .keyboardType(keys)
                    .textContentType(content)
                    .textInputAutocapitalization(keyboard.corrects ? nil : .never)
                    .autocorrectionDisabled(!keyboard.corrects)
                    .submitLabel(keyboard.keys == .search ? .search : .return)
            #else
                return self.autocorrectionDisabled(!keyboard.corrects)
            #endif
        }
    }
#endif
