---
"@raincoat-ui/react": minor
"@raincoat-ui/swift": minor
"@raincoat-ui/android": minor
---

Card: a surface that groups content about one subject, on every platform.

- A card has a title, which is a heading in `heading-sm` at the level you give, and optionally
  media at the top, edge to edge, a body, and Buttons in a footer at the end. Its outline, fill,
  and shadow come from the theme. It fills the width it is given and grows with its content.
- A card is static, a container that can hold links and buttons, or interactive: the whole card
  is one link or one button, named by its title, and holds no other controls. An interactive
  card's outline steps to the strong border color under a pointer, its fill changes while it is
  pressed, and keyboard focus draws the focus ring around the whole card.
- **React:** `Card`, `CardMedia`, `CardTitle`, `CardBody`, and `CardFooter`. A `CardLink` or a
  `CardButton` in the title makes the card interactive. A static card and a link card render in
  a Server Component.
- **SwiftUI:** `RaincoatCard`, with `.media { }` and `.footer { }`. A `Button` or
  `NavigationLink` whose label is a `RaincoatCard`, with `.buttonStyle(.raincoatCard)`, is an
  interactive card, read by VoiceOver as one element, title first.
- **Compose:** `RaincoatCard`, on Compose Foundation. With `onClick` it is interactive: one
  button whose semantics merge the card's content.
- The shadow is drawn from `card.shadow`; the base theme's is none.
