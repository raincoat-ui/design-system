plugins {
    alias(libs.plugins.android.library)
    alias(libs.plugins.kotlin.compose)
}

android {
    namespace = "consumer"
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
}

dependencies {
    // The one line an app adds. The theme and the token types come with it.
    implementation("io.github.raincoat-ui:ui:${providers.gradleProperty("raincoatVersion").get()}")

    implementation(platform(libs.compose.bom))
    implementation(libs.compose.foundation)
}
