#if os(iOS)
    import CoreGraphics
    import Foundation
    import Raincoat
    import SwiftUI
    import Testing
    import UIKit

    // The visual snapshots of the SwiftUI components: each snapshot of specs/snapshots.yaml, in
    // every theme. A snapshot draws every example of the component's spec together, as a
    // specimen, in the snapshot's color mode, layout direction, language, and Dynamic Type size.
    // The examples and their text in each locale are generated from the spec and its
    // strings.yaml (Generated/Snapshots.swift). See docs/adr/0019-visual-snapshots.md.
    //
    // To add a component, write Snapshots/<Component>Snapshots.swift beside this file: a test in
    // this suite that passes the generated examples to expectSnapshot, with a function that draws
    // one instance of them. ButtonSnapshots.swift is the model.
    //
    // The snapshots are drawn by iOS, in a simulator: SwiftUI on macOS does not enlarge text for
    // a larger Dynamic Type size. A specimen is shown in a window of its own and the window is
    // drawn, as the system draws an app, so that the views UIKit provides, such as a text field
    // and a scroll view, are drawn too; ImageRenderer leaves them out. They run only when
    // RAINCOAT_SNAPSHOTS is set, which xcodebuild passes to the tests from
    // TEST_RUNNER_RAINCOAT_SNAPSHOTS. From packages/ios:
    //
    //     TEST_RUNNER_RAINCOAT_SNAPSHOTS=1 xcodebuild test -scheme Raincoat-Package \
    //       -destination 'platform=iOS Simulator,name=iPhone 17' \
    //       -only-testing:RaincoatTests/VisualSnapshots
    //
    // A simulator reads and writes the Mac's files, so the tests find the baselines and write
    // what they drew in this checkout, by the path of this file. In CI (CI set, through
    // TEST_RUNNER_CI) each drawing is compared with its baseline, packages/ios/__screenshots__/
    // <theme>/<component>/<snapshot>.png. A missing or different baseline fails the test, and
    // what was drawn is written to packages/ios/test-results/snapshots/actual/, with the
    // difference in .../diff/; CI uploads both. Anywhere else nothing is compared and no baseline
    // is ever written: the images go to test-results/snapshots/local/, to look at. Baselines are
    // recorded in CI only; CONTRIBUTING.md says how to accept them.

    @Suite(.enabled(if: SnapshotRun.current != nil, "RAINCOAT_SNAPSHOTS=1 draws the snapshots"))
    struct VisualSnapshots {}

    /// What a run does with the snapshots it draws.
    enum SnapshotRun: Sendable {
        /// Compares each with its baseline: in CI.
        case compare
        /// Only saves it, to look at: anywhere else.
        case draw

        static let current: SnapshotRun? = {
            let environment = ProcessInfo.processInfo.environment
            guard let value = environment["RAINCOAT_SNAPSHOTS"], !value.isEmpty, value != "0" else { return nil }
            return (environment["CI"] ?? "").isEmpty ? .draw : .compare
        }()
    }

    /// Pixels per point. An iPhone has two or three; at two a specimen is 960 pixels wide.
    let snapshotScale: CGFloat = 2

    /// A drawn pixel matches its baseline when each of its channels is within this many steps
    /// (of 255) of the baseline's, about 3%. One pixel that does not match fails the snapshot.
    let snapshotTolerance = 8

    /// The folders and files of the snapshots.
    enum SnapshotFiles {
        /// This folder, where each component's snapshot test is.
        static let tests = URL(filePath: #filePath).deletingLastPathComponent()
        /// packages/ios
        static let swiftPackage = tests.deletingLastPathComponent().deletingLastPathComponent()
            .deletingLastPathComponent()
        static let repository = swiftPackage.deletingLastPathComponent().deletingLastPathComponent()
        static let baselines = swiftPackage.appending(path: "__screenshots__")
        static let results = swiftPackage.appending(path: "test-results/snapshots")

        /// The components whose spec names a SwiftUI implementation, by id, in order.
        static func componentsWithSwiftUIImplementations() throws -> [String] {
            let specs = repository.appending(path: "specs/components")
            return try FileManager.default.contentsOfDirectory(atPath: specs.path(percentEncoded: false))
                .sorted()
                .filter { id in
                    let spec = specs.appending(path: "\(id)/spec.yaml")
                    guard let yaml = try? String(contentsOf: spec, encoding: .utf8) else { return false }
                    return namesSwiftUIImplementation(yaml)
                }
        }

        /// Whether a spec's top-level `implementations` map has an `ios` entry. Specs are checked
        /// against their schema (`pnpm tokens:lint`), so reading the lines is enough.
        static func namesSwiftUIImplementation(_ yaml: String) -> Bool {
            var inImplementations = false
            var entryIndent: Int?
            for line in yaml.split(separator: "\n") {
                let text = line.drop { $0 == " " }
                if text.isEmpty || text.hasPrefix("#") { continue }
                let indent = line.count - text.count
                if indent == 0 {
                    inImplementations = text.hasPrefix("implementations:")
                    entryIndent = nil
                } else if inImplementations {
                    if entryIndent == nil { entryIndent = indent }
                    if indent == entryIndent, text.hasPrefix("ios:") { return true }
                }
            }
            return false
        }

        /// The names of the files in a folder, without hidden ones; none when it does not exist.
        static func contents(of folder: URL) -> [String] {
            let names = (try? FileManager.default.contentsOfDirectory(atPath: folder.path(percentEncoded: false))) ?? []
            return names.filter { !$0.hasPrefix(".") }.sorted()
        }
    }

    /// "date-picker" → "DatePicker"
    private func pascalCase(_ id: String) -> String {
        id.split(separator: "-").map { String($0.prefix(1)).uppercased() + String($0.dropFirst()) }.joined()
    }

    /// "date-picker" → "datePicker"
    private func camelCase(_ id: String) -> String {
        let name = pascalCase(id)
        return String(name.prefix(1)).lowercased() + String(name.dropFirst())
    }

    /// Draws the examples of a component in one theme and snapshot, and, in CI, compares the
    /// drawing with its baseline.
    ///
    /// - Parameters:
    ///   - component: The id of the component's spec, which names its baselines.
    ///   - examples: The examples generated from the spec, such as `buttonExamples`.
    ///   - draw: Draws one instance of the examples, given its properties and the text of its
    ///     content in the snapshot's locale: `text("label")`, or `text.optional("error")` for
    ///     content that only some examples have.
    @MainActor
    func expectSnapshot<Properties: Sendable, Instance: View>(
        of component: String,
        examples: [SpecExample<Properties>],
        theme: RaincoatTheme,
        snapshot: VisualSnapshot,
        draw: @escaping (_ instance: Properties, _ text: SnapshotText) -> Instance
    ) throws {
        let reading = TextScaleProbe.Reading()
        let drawing = try Bitmap(
            drawSpecimen(
                Specimen(examples: examples, locale: snapshot.locale, draw: draw),
                theme: theme, snapshot: snapshot, reading: reading
            )
        )

        // The window was drawn: its top left corner is the specimen's canvas.
        let canvas = theme.tokens(mode: snapshot.mode, density: .comfortable).color.bg.canvas
        let corner = [canvas.red, canvas.green, canvas.blue].map { Int(($0 * 255).rounded()) }
        #expect(
            zip(drawing.pixel(1, 1).prefix(3), corner).allSatisfy { abs($0 - $1) <= snapshotTolerance },
            "the specimen's canvas was not drawn"
        )

        // The snapshot's text size is in effect: only a size larger than the default enlarges text.
        let scale = try #require(reading.scale, "the text size was not read")
        if snapshot.textSize.dynamicTypeSize > .large {
            #expect(scale > 1, "Dynamic Type's \(snapshot.textSize.dynamicTypeSize) does not enlarge text here")
        } else {
            #expect(scale == 1)
        }

        let name = "\(theme.id)/\(component)/\(snapshot.id).png"
        switch SnapshotRun.current {
        case .compare?:
            guard let baseline = try Bitmap.read(SnapshotFiles.baselines.appending(path: name)) else {
                try drawing.write(to: SnapshotFiles.results.appending(path: "actual/\(name)"))
                Issue.record(
                    "\(name) has no baseline. CI uploaded what it drew as the ios-snapshots artifact; CONTRIBUTING.md says how to accept it."
                )
                return
            }
            let differences = drawing.differences(from: baseline, tolerance: snapshotTolerance)
            if differences.count > 0 {
                try drawing.write(to: SnapshotFiles.results.appending(path: "actual/\(name)"))
                try differences.image.write(to: SnapshotFiles.results.appending(path: "diff/\(name)"))
                Issue.record(
                    """
                    \(name) differs from its baseline in \(differences.count) pixels \
                    (\(drawing.width)×\(drawing.height) drawn, \(baseline.width)×\(baseline.height) \
                    in the baseline). CI uploaded what it drew, and the difference in red, as the \
                    ios-snapshots artifact; CONTRIBUTING.md says how to accept it.
                    """
                )
            }
        case .draw?, nil:
            try drawing.write(to: SnapshotFiles.results.appending(path: "local/\(name)"))
        }
    }

    /// The text of an example in the snapshot's locale, by the content it fills.
    struct SnapshotText: Sendable {
        let example: String
        let locale: String
        let values: [String: String]

        /// The text of content the example has: `text("label")`. Text that is missing fails the
        /// snapshot.
        func callAsFunction(_ content: String) -> String {
            guard let value = values[content] else {
                Issue.record("\(example): no \(content) in \(locale)")
                return ""
            }
            return value
        }

        /// The text of content that only some examples have, such as an error, or nil.
        func optional(_ content: String) -> String? {
            values[content]
        }
    }

    /// Draws a specimen as the snapshot asks, in a theme: shown in a window of its own, with the
    /// snapshot's appearance set as the system sets it, and the window drawn as the system draws
    /// an app, UIKit's views included.
    @MainActor
    private func drawSpecimen(
        _ specimen: some View, theme: RaincoatTheme, snapshot: VisualSnapshot, reading: TextScaleProbe.Reading
    ) throws -> CGImage {
        // SwiftUI lets a test set the color scheme but not the contrast setting, so a theme that
        // answers every request with the tokens of the snapshot's color mode draws it, as in
        // ButtonRenderingTests. The window's traits say the same, for UIKit's views.
        let mode = snapshot.mode
        let isDark = mode == .dark || mode == .darkHighContrast
        let isHighContrast = mode == .lightHighContrast || mode == .darkHighContrast
        let fixed = RaincoatTheme(id: "\(theme.id)-\(mode.rawValue)") { _, density in
            theme.tokens(mode: mode, density: density)
        }
        let canvas = theme.tokens(mode: mode, density: .comfortable).color.bg.canvas
        let scheme: ColorScheme = isDark ? .dark : .light
        let root =
            specimen
            .background { TextScaleProbe(reading: reading) }
            .raincoatTheme(fixed)
            .environment(\.colorScheme, scheme)
            .environment(\.layoutDirection, snapshot.layoutDirection)
            .environment(\.locale, Locale(identifier: snapshot.locale))
            // Text is set as on a device whose language is the snapshot's, so that line
            // height, line breaks, and spacing follow its script.
            .typesettingLanguage(Locale.Language(identifier: snapshot.locale))
            .dynamicTypeSize(snapshot.textSize.dynamicTypeSize)
            // A snapshot shows views at rest: nothing animates, so a spinner is drawn where it
            // starts, in every run.
            .transaction { transaction in
                transaction.disablesAnimations = true
                transaction.animation = nil
            }

        let controller = UIHostingController(rootView: root)
        controller.safeAreaRegions = []
        controller.overrideUserInterfaceStyle = isDark ? .dark : .light
        controller.traitOverrides.accessibilityContrast = isHighContrast ? .high : .normal
        controller.traitOverrides.preferredContentSizeCategory = contentSizeCategory(
            snapshot.textSize.dynamicTypeSize
        )
        controller.traitOverrides.layoutDirection = snapshot.rightToLeft ? .rightToLeft : .leftToRight
        controller.view.semanticContentAttribute = snapshot.rightToLeft ? .forceRightToLeft : .forceLeftToRight
        // Shows below a specimen whose height is not a whole number of points.
        controller.view.backgroundColor = UIColor(
            red: canvas.red, green: canvas.green, blue: canvas.blue, alpha: canvas.alpha
        )

        // A window draws its views only when it is shown in a scene: the test runner's.
        let scene = try #require(
            UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.first,
            "the test runner has no window scene to show the specimen in"
        )
        let window = UIWindow(windowScene: scene)
        window.frame = CGRect(x: 0, y: 0, width: specimenWidth, height: specimenWidth)
        window.rootViewController = controller
        window.isHidden = false
        defer {
            window.isHidden = true
            window.rootViewController = nil
        }
        let size = controller.sizeThatFits(in: CGSize(width: specimenWidth, height: .greatestFiniteMagnitude))
        window.frame = CGRect(x: 0, y: 0, width: specimenWidth, height: size.height.rounded(.up))
        // Let the window finish what views do as they appear, such as scrolling a selected tab
        // into view.
        for _ in 0..<3 {
            window.layoutIfNeeded()
            RunLoop.main.run(until: Date(timeIntervalSinceNow: 0.05))
        }
        window.layoutIfNeeded()

        let format = UIGraphicsImageRendererFormat()
        format.scale = snapshotScale
        format.opaque = true
        format.preferredRange = .standard
        var drewHierarchy = false
        let image = UIGraphicsImageRenderer(size: window.bounds.size, format: format).image { context in
            drewHierarchy = window.drawHierarchy(in: window.bounds, afterScreenUpdates: true)
            if !drewHierarchy {
                // Drawn only to be looked at: drawing the layers can leave out UIKit's views.
                window.layer.render(in: context.cgContext)
            }
        }
        if !drewHierarchy {
            Issue.record(
                "\(theme.id)/\(snapshot.id): the window could not be drawn as the system draws it (drawHierarchy drew nothing)"
            )
        }
        return try #require(image.cgImage, "the specimen could not be drawn")
    }

    /// The UIKit text size of a Dynamic Type size.
    private func contentSizeCategory(_ size: DynamicTypeSize) -> UIContentSizeCategory {
        switch size {
        case .xSmall: return .extraSmall
        case .small: return .small
        case .medium: return .medium
        case .large: return .large
        case .xLarge: return .extraLarge
        case .xxLarge: return .extraExtraLarge
        case .xxxLarge: return .extraExtraExtraLarge
        case .accessibility1: return .accessibilityMedium
        case .accessibility2: return .accessibilityLarge
        case .accessibility3: return .accessibilityExtraLarge
        case .accessibility4: return .accessibilityExtraExtraLarge
        case .accessibility5: return .accessibilityExtraExtraExtraLarge
        @unknown default: return .large
        }
    }

    extension VisualSnapshots {
        /// Each component whose spec names a SwiftUI implementation has a snapshot test,
        /// Snapshots/<Component>Snapshots.swift, which draws the examples generated from its spec.
        @Test func everyComponentWithASwiftUIImplementationHasSnapshots() throws {
            let components = try SnapshotFiles.componentsWithSwiftUIImplementations()
            #expect(components.contains("button"), "the specs were not found")
            for component in components {
                let file = "\(pascalCase(component))Snapshots.swift"
                guard
                    let source = try? String(contentsOf: SnapshotFiles.tests.appending(path: file), encoding: .utf8)
                else {
                    Issue.record(
                        "specs/components/\(component) has no snapshot test: add Tests/RaincoatTests/Snapshots/\(file)"
                    )
                    continue
                }
                #expect(
                    source.contains("\(camelCase(component))Examples"),
                    "Snapshots/\(file) does not draw \(camelCase(component))Examples"
                )
            }
        }

        /// Every baseline belongs to a theme, a component, and a snapshot that are still drawn.
        /// A baseline that is missing fails the snapshot itself.
        @Test func everyBaselineBelongsToASnapshot() throws {
            let themes = Set(allThemes.map(\.id))
            let components = try Set(SnapshotFiles.componentsWithSwiftUIImplementations())
            let snapshots = Set(allSnapshots.map { "\($0.id).png" })
            let baselines = SnapshotFiles.baselines
            for theme in SnapshotFiles.contents(of: baselines) {
                guard themes.contains(theme) else {
                    Issue.record("\(theme)/ holds the baselines of no theme; delete it")
                    continue
                }
                for component in SnapshotFiles.contents(of: baselines.appending(path: theme)) {
                    for file in SnapshotFiles.contents(of: baselines.appending(path: "\(theme)/\(component)"))
                    where !components.contains(component) || !snapshots.contains(file) {
                        Issue.record("\(theme)/\(component)/\(file) is the baseline of no snapshot; delete it")
                    }
                }
            }
        }
    }
#endif
