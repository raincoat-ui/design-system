# Tabs guidelines

## When to use

Use tabs to split one view into two to seven panels of related content that people do not need
to compare side by side, such as "Details", "Reviews", and "Shipping" on a product.

- For more than seven panels, or for content people compare, use headings on one screen.
- Do not use tabs to step through a process. Each tab must make sense on its own.
- Do not use tabs to move between an app's main sections. That is navigation.
- Do not put tabs inside tabs.

## Writing the labels

- Keep each label to one or two words, in sentence case: "Shipping", "Order history".
- Do not repeat the screen's title in the labels.
- A label stays on one line and is never truncated. When translated labels do not fit, the row
  scrolls sideways; it does not wrap or cut a label short.
- A count can be part of the label, such as "Reviews (12)", until a badge component exists.

## Icons

- An icon beside a label is decoration; the label carries the meaning.
- A tab with only an icon must be given an accessible name that says what its panel holds.
  Prefer labels: an icon alone is harder to recognise than a word.

## Selection

- One tab is always selected. Choose the one people need most often as the first.
- Hide a tab that leads nowhere instead of disabling it. Tabs have no disabled state, because a
  disabled tab cannot say why it is disabled.
- On the web, the arrow keys select the tab they reach, and its panel shows at once. If a panel
  takes long to show, such as one that loads data, use the manual activation mode: the arrow
  keys then only move focus, and Enter or Space selects.

## Panels

- Only the selected tab's panel is shown. On the web, a panel that is not selected is not
  rendered at all, unless the app keeps it mounted, for example to keep what was typed into a
  form.
- Give a panel its own spacing. Tabs set none between the row and the panel.

## Do and don't

| Do                                                       | Don't                                    |
| -------------------------------------------------------- | ---------------------------------------- |
| Use two to seven tabs for related content in one view    | Use tabs as an app's main navigation     |
| Keep labels short, and let a long translation scroll     | Truncate a label, or shorten it to fit   |
| Hide a tab that has nothing to show                      | Disable a tab                            |
| Put content people compare on one screen, under headings | Split content people compare across tabs |
