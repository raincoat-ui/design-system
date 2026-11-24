plugins {
    alias(libs.plugins.android.library) apply false
    alias(libs.plugins.kotlin.jvm) apply false
    alias(libs.plugins.kotlin.compose) apply false
    alias(libs.plugins.licensee) apply false
}

// What every published module shares: where a release is staged, and the facts about the
// project in each module's POM. A module opts in by applying the maven-publish plugin.
subprojects {
    // Every JAR carries the license text and the notices.
    tasks.withType<Jar>().configureEach {
        metaInf { from(rootProject.files("LICENSE", "NOTICE")) }
    }

    pluginManager.withPlugin("maven-publish") {
        configure<PublishingExtension> {
            repositories {
                // A release is staged here. tools/release/maven-repo.mjs then adds it to the
                // Maven repository served by GitHub Pages.
                maven {
                    name = "staging"
                    url = uri(rootProject.layout.buildDirectory.dir("release/maven"))
                }
            }
            publications.withType<MavenPublication>().configureEach {
                pom {
                    name.set(provider { "Raincoat ${project.name}" })
                    description.set(provider { project.description })
                    url.set("https://raincoat-ui.github.io/design-system/")
                    licenses {
                        license {
                            name.set("Apache-2.0")
                            url.set("https://www.apache.org/licenses/LICENSE-2.0.txt")
                        }
                    }
                    developers {
                        developer {
                            name.set("The Raincoat authors")
                            url.set("https://github.com/raincoat-ui")
                        }
                    }
                    scm {
                        url.set("https://github.com/raincoat-ui/design-system")
                        connection.set("scm:git:https://github.com/raincoat-ui/design-system.git")
                    }
                }
            }
        }
    }
}

// The visual snapshots of the Compose components, in packages/android/ui/src/test/kotlin/.../
// snapshots, compare what they draw with the baselines in packages/android/ui/src/test/
// __screenshots__, in CI only, and write what they drew to packages/android/ui/build/snapshots.
// Every component spec with an Android implementation needs a snapshot test. See
// docs/adr/0019-visual-snapshots.md. This is test configuration only. It is here rather than in
// the module's build file, where any change counts as a change to what the module ships
// (.changeset/config.json).
project(":ui") {
    tasks.withType<Test>().configureEach {
        val baselines = layout.projectDirectory.dir("src/test/__screenshots__")
        val specs = rootProject.layout.projectDirectory.dir("specs/components")
        inputs.files(fileTree(baselines))
            .withPropertyName("snapshotBaselines")
            .withPathSensitivity(PathSensitivity.RELATIVE)
        inputs.files(fileTree(specs) { include("*/spec.yaml") })
            .withPropertyName("componentSpecs")
            .withPathSensitivity(PathSensitivity.RELATIVE)
        systemProperty("raincoat.specs", specs.asFile.absolutePath)
        systemProperty("raincoat.snapshots.baselines", baselines.asFile.absolutePath)
        systemProperty("raincoat.snapshots.output", layout.buildDirectory.dir("snapshots").get().asFile.absolutePath)
        // CI sets CI. Only CI compares, because the baselines are drawn there (CONTRIBUTING.md).
        systemProperty("raincoat.snapshots.compare", providers.environmentVariable("CI").isPresent.toString())
    }
}
