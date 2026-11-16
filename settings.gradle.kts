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
include(":tokens", ":theme-base", ":ui")
project(":tokens").projectDir = file("packages/android/tokens")
project(":theme-base").projectDir = file("packages/android/theme-base")
project(":ui").projectDir = file("packages/android/ui")
