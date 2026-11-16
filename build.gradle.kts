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
