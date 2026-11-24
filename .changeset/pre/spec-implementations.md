---
"@raincoat-ui/tokens": patch
---

A component spec can list each platform's component under `implementations`: its source file
and what it is called there. In this repository, `raincoat-tokens lint` fails when a listed file
does not exist, is not in its platform's language, or does not mention the name.
