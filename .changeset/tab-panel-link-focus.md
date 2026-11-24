---
"@raincoat-ui/react": patch
---

Tabs: a tab panel that holds a link or a control is never a Tab stop itself, not even just
after its tab is selected. Before, when an arrow key selected a tab, its panel took focus for a
moment, so a Tab pressed at once went to the panel instead of the link in it.
