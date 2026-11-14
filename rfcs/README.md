# RFCs

An RFC is a short proposal, reviewed before the work starts. It is required for:

- a new component,
- adding, renaming, or removing a semantic or component token,
- changing which tokens a theme may override, or which are locked.

Bug fixes, documentation, and changes to primitive token values do not need one.

## Process

1. Copy `0000-template.md` to `NNNN-short-title.md`, using the next free number.
2. Fill it in and open a pull request containing only the RFC.
3. Discussion happens on that pull request. When it merges with `Status: accepted`, the work may
   begin.
4. The implementing pull request references the RFC number. CI checks that the RFC exists and is
   accepted.

An RFC that is declined is still merged, with `Status: declined` and the reason, so the question
does not have to be argued twice.
