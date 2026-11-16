pluginManagement {
    repositories {
        gradlePluginPortal()
        mavenCentral()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        mavenCentral()
    }
}

rootProject.name = "raincoat"

// The Android modules live beside the other platform packages.
include(":tokens", ":theme-base")
project(":tokens").projectDir = file("packages/android/tokens")
project(":theme-base").projectDir = file("packages/android/theme-base")
