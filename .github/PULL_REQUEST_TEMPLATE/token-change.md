<!-- Title: a Conventional Commit, for example: feat(tokens): add focus ring tokens -->

## Token change

- RFC: <!-- link; required for semantic and component tokens -->
- Tier: <!-- primitive | semantic | component -->
- Kind: <!-- added | value changed | renamed | deprecated | removed -->

## Tokens

| Name | Before | After | Themes may override? |
| ---- | ------ | ----- | -------------------- |
|      |        |       |                      |

## Checklist

- [ ] Every token has a `$description`.
- [ ] Values are given for all four color modes (light, dark, light-hc, dark-hc) where the token is a color.
- [ ] Contrast checks pass for every theme and mode.
- [ ] Generated outputs were regenerated, not edited.
- [ ] A rename or removal has an entry in `tokens/renames.json` and follows the deprecation policy.
- [ ] Every commit is signed off.
