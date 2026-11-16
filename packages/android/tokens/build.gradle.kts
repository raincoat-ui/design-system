import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.licensee)
}

group = "io.github.raincoat-ui"

// Pure Kotlin with no Android dependency, so the token contract is testable on any JVM.
kotlin {
    explicitApi()
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_17)
        allWarningsAsErrors.set(true)
    }
}

java {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
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
    testImplementation(kotlin("test"))
}

tasks.test {
    useJUnitPlatform()
}
