import java.util.Properties
import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    id("com.android.application") version libs.versions.agp
    alias(libs.plugins.kotlin.compose)
}

// The version this checkout would release, unless another one is asked for.
val raincoatVersion: String = providers.gradleProperty("raincoatVersion").orNull
    ?: Properties()
        .apply { rootDir.resolve("../../gradle.properties").inputStream().use(::load) }
        .getProperty("version")

// The reference app shows every Raincoat component the way an app uses it. Its tests run on an
// emulator, where they can check what the JVM tests cannot: Google's accessibility checks, and
// what an accessibility service is given. It is never published.
android {
    namespace = "io.github.raincoatui.reference"
    compileSdk = 37

    defaultConfig {
        applicationId = "io.github.raincoatui.reference"
        minSdk = 26
        targetSdk = 37
        versionCode = 1
        versionName = "1.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        compose = true
    }
}

kotlin {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_17)
        allWarningsAsErrors.set(true)
    }
}

dependencies {
    // The one line an app adds. The theme and the token types come with it.
    implementation("io.github.raincoat-ui:ui:$raincoatVersion")
    implementation(platform(libs.compose.bom))
    implementation(libs.compose.foundation)
    implementation("androidx.activity:activity-compose:1.13.0")

    androidTestImplementation(platform(libs.compose.bom))
    androidTestImplementation(libs.compose.ui.test.junit4)
    // Google's Accessibility Test Framework, for Compose tests.
    androidTestImplementation("androidx.compose.ui:ui-test-junit4-accessibility")
    androidTestImplementation("androidx.test:runner:1.7.0")
    androidTestImplementation(libs.androidx.test.ext.junit)
    // The Compose test library asks for an Espresso that calls a method recent Android versions
    // no longer have.
    androidTestImplementation(libs.androidx.test.espresso.core)
}
