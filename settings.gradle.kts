pluginManagement {
    repositories {
        // Google's repository serves the Android Gradle plugin and nothing else here.
        google {
            content {
                includeGroupByRegex("com\\.android.*")
                includeGroupByRegex("com\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
        gradlePluginPortal()
        mavenCentral()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        // AndroidX and the Android tools come from Google's repository; everything else from
        // Maven Central.
        google {
            content {
                includeGroupByRegex("com\\.android.*")
                includeGroupByRegex("com\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
        mavenCentral()
    }
}

rootProject.name = "raincoat"

// The Android modules live beside the other platform packages.
include(":tokens", ":ui")
project(":tokens").projectDir = file("packages/android/tokens")
project(":ui").projectDir = file("packages/android/ui")

// One module per theme, theme-<id>. The token build generates each of them, build file
// included, so a new theme joins the build without an edit here.
file("packages/android")
    .listFiles { dir -> dir.name.startsWith("theme-") && dir.resolve("build.gradle.kts").isFile }!!
    .sortedBy { it.name }
    .forEach { dir ->
        include(":${dir.name}")
        project(":${dir.name}").projectDir = dir
    }
