---
"@raincoat-ui/react": minor
"@raincoat-ui/swift": minor
"@raincoat-ui/android": minor
---

Tabs: a row of tabs that switches between panels of related content in one view.

- **React.** `Tabs`, `TabsList`, `TabsTrigger`, and `TabsContent`, also from
  `@raincoat-ui/react/tabs`. The arrow keys select the tab they reach, or only move focus with
  `activationMode="manual"`; the tabs follow the page's direction; `keepMounted` keeps a panel's
  content while its tab is not selected. When the tabs do not fit, the list scrolls sideways, with
  previous and next buttons for a mouse.
- **SwiftUI.** `RaincoatTabs` and `RaincoatTab`. VoiceOver is told the row is a tab bar, and the
  selected tab carries the selected trait.
- **Compose.** `RaincoatTabs` and `RaincoatTab`: a selectable group of tabs with the tab role.
  Enter or Space selects.

Selection is controlled by the app or kept by the tabs. Labels stay on one line and are never
truncated. There are no disabled tabs.
