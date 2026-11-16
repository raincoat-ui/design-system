// The reference app is a build of its own. It takes the Raincoat modules from a Maven
// repository, the way an app does. By default that is the repository this checkout stages:
//
//   ./gradlew publishAllPublicationsToStagingRepository
//   ./gradlew -p apps/reference-android connectedDebugAndroidTest
//
// -PraincoatRepository=<url or directory> and -PraincoatVersion=<version> point it at a
// published release instead.
pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        maven {
            name = "raincoat"
            url = uri(
                providers.gradleProperty("raincoatRepository")
                    .orElse(rootDir.resolve("../../build/release/maven").path)
                    .get(),
            )
            content { includeGroup("io.github.raincoat-ui") }
        }
        google()
        mavenCentral()
    }
    // The same tool versions as the modules themselves.
    versionCatalogs {
        create("libs") { from(files("../../gradle/libs.versions.toml")) }
    }
}

rootProject.name = "raincoat-reference"
