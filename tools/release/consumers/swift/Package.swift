// swift-tools-version: 6.2
import Foundation
import PackageDescription

// A stand-in for an app that uses Raincoat. It resolves the Swift package the way an app does
// and compiles a screen against it:
//
//   RAINCOAT_SWIFT_PATH=<mirror tree> swift build --package-path tools/release/consumers/swift
//   RAINCOAT_VERSION=<version>        swift build --package-path tools/release/consumers/swift
//
// The first form uses a local copy of the mirror; its directory must be named
// design-system-swift, as the repository is. The second uses the published mirror.
let environment = ProcessInfo.processInfo.environment
let raincoat: Package.Dependency =
    if let path = environment["RAINCOAT_SWIFT_PATH"] {
        .package(path: path)
    } else if let version = environment["RAINCOAT_VERSION"].flatMap({ Version($0) }) {
        .package(url: "https://github.com/raincoat-ui/design-system-swift", exact: version)
    } else {
        fatalError("Set RAINCOAT_SWIFT_PATH or RAINCOAT_VERSION.")
    }

let package = Package(
    name: "Consumer",
    platforms: [.iOS(.v17), .macOS(.v14)],
    dependencies: [raincoat],
    targets: [
        .target(
            name: "Consumer",
            dependencies: [
                .product(name: "Raincoat", package: "design-system-swift"),
                .product(name: "RaincoatThemeBase", package: "design-system-swift"),
            ]
        )
    ]
)
