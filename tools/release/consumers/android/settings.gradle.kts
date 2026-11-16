// A stand-in for an app that uses Raincoat. It resolves the artifacts from a Maven repository,
// the way an app does, and compiles a screen against them:
//
//   ./gradlew -p tools/release/consumers/android compileDebugKotlin \
//     -PraincoatRepository=<url or directory> -PraincoatVersion=<version>
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
            url = uri(providers.gradleProperty("raincoatRepository").get())
            content { includeGroup("io.github.raincoat-ui") }
        }
        google()
        mavenCentral()
    }
    // The same tool versions as the modules themselves.
    versionCatalogs {
        create("libs") { from(files("../../../../gradle/libs.versions.toml")) }
    }
}

rootProject.name = "raincoat-consumer"
