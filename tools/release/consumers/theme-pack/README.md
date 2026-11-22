# A theme pack, for the release checks

A stand-in for a theme kept outside this repository: a fictional brand, Harbor, in the layout a
private theme pack uses. `tools/release/consumers/theme-pack.mjs` copies it out of the repository,
installs `@raincoat-ui/tokens` the way a theme pack does, and builds it with the published command
line. It then compiles what that produced against Raincoat's own packages: the Swift package
against the Swift mirror, and the Android module against the Maven repository.
