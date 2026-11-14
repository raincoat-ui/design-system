# Add or change a token

Tokens are JSON files in the [DTCG 2025.10](https://www.designtokens.org/tr/2025.10/) format
under `tokens/`. This page is the whole procedure.

## 1. Decide whether you need an RFC

| Change                                                      | RFC needed?               |
| ----------------------------------------------------------- | ------------------------- |
| Changing the value of a primitive token                     | No                        |
| Adding a primitive token                                    | No                        |
| Adding, renaming, or removing a semantic or component token | Yes, see `rfcs/README.md` |
| Changing whether a token is `overridable`                   | Yes                       |

## 2. Pick the tier

| Tier      | Directory           | Value must be                    |
| --------- | ------------------- | -------------------------------- |
| Primitive | `tokens/primitive/` | A literal value                  |
| Semantic  | `tokens/semantic/`  | A reference to a primitive token |
| Component | `tokens/component/` | A reference to a semantic token  |

A reference is the token's path in curly braces: `"{color.neutral.900}"`.

## 3. Write the token

```json
"muted": {
  "$value": "{color.neutral.600}",
  "$description": "Secondary text, such as captions and help text.",
  "$extensions": {
    "raincoat": {
      "overridable": true,
      "on": ["color.bg.canvas", "color.bg.surface", "color.bg.subtle"],
      "contrast": "text"
    }
  }
}
```

- **Names** use lowercase letters, digits, and hyphens.
- **`$description` is required.** Say where the token is used, not what its value is.
- **`$type`** is set on the token or on a group above it.
- **Colors** in primitives are written as `oklch`, `hsl`, or `srgb` components with a `hex`
  that matches them. The linter tells you the correct hex if yours is off.
- **Dimensions** are `{ "value": 16, "unit": "px" }`, in `px` or `rem`.

### Colors that sit on something

A text, border, or focus-ring color must say what it is drawn on and which requirement applies:

| `contrast`   | Use for                                                                  | Required ratio (high-contrast modes) |
| ------------ | ------------------------------------------------------------------------ | ------------------------------------ |
| `text`       | Text below 24px                                                          | 4.5:1 (7:1)                          |
| `large-text` | Text at 24px and above                                                   | 3:1 (4.5:1)                          |
| `graphic`    | Control outlines, focus rings, icons that carry meaning                  | 3:1 (3:1)                            |
| `exempt`     | Disabled or purely decorative colors; needs a `contrast-note` saying why | none                                 |

### Color modes and densities

A semantic color lives in four files, one per mode: `color.light`, `color.dark`,
`color.light-hc`, and `color.dark-hc`. Add the token to all four. Density-dependent sizes live in
`density.comfortable` and `density.compact`; add those to both.

## 4. Check it

```sh
pnpm tokens:lint                 # structure, references, tiers, values
pnpm tokens:contrast             # every declared pair in every color mode
pnpm tokens:contrast -- --all    # also list the pairs that pass, with their ratios
pnpm tokens:build                # regenerate every platform's output
```

Commit the regenerated files together with your token change. All three checks run in CI and
block the merge; CI also fails if a generated file does not match the token source.

## 5. Open the pull request

Use the "Token change" template (append `?template=token-change.md` to the pull request URL).
