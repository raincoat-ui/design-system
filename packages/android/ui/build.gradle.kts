import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    alias(libs.plugins.android.library)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.licensee)
}

group = "io.github.raincoat-ui"

// The Compose components. They are built on Compose Foundation alone: no Material dependency,
// so an app is free to use Material, or not, beside them.
android {
    namespace = "io.github.raincoatui.ui"
    compileSdk = 37

    defaultConfig {
        minSdk = 26
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        compose = true
    }

    testOptions {
        unitTests {
            // The component tests run on the JVM with Robolectric, which needs the resources.
            isIncludeAndroidResources = true
        }
    }
}

kotlin {
    explicitApi()
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_17)
        allWarningsAsErrors.set(true)
    }
}

// Fails the build when a dependency that ships with this module carries a license outside
// the "ship" scope of licenses/allowlist.yml.
licensee {
    @Suppress("UNCHECKED_CAST")
    val allowlist = groovy.json.JsonSlurper()
        .parse(rootProject.file("licenses/allowlist.json")) as Map<String, List<String>>
    allowlist.getValue("ship").forEach { allow(it) }
    // The allowlist is shared with npm and Swift, so most entries are unused here.
    unusedAction(app.cash.licensee.UnusedAction.IGNORE)
}

dependencies {
    api(project(":tokens"))
    api(project(":theme-base"))

    implementation(platform(libs.compose.bom))
    api(libs.compose.runtime)
    api(libs.compose.ui)
    implementation(libs.compose.foundation)

    testImplementation(platform(libs.compose.bom))
    testImplementation(libs.junit)
    testImplementation(libs.robolectric)
    testImplementation(libs.androidx.test.ext.junit)
    testImplementation(libs.compose.ui.test.junit4)
    // The Compose test library asks for Espresso 3.5.0, which calls a method that recent
    // Android versions no longer have.
    testImplementation(libs.androidx.test.espresso.core)
    debugImplementation(libs.compose.ui.test.manifest)
}
