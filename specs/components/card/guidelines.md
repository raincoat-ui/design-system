# Card guidelines

## When to use

Use a card to group content about one subject, such as an order, a contact, or an article, when
a screen shows several of them for people to choose between. For a single block of content on a
screen, use a section with a heading: a card adds an outline and nothing else.

## Static or interactive

| Kind        | Use it when                                                 | Holds                                      |
| ----------- | ----------------------------------------------------------- | ------------------------------------------ |
| Static      | The card shows content, or offers more than one thing to do | Any content, links, and Buttons            |
| Interactive | The whole card leads to one place, or does one thing        | Content only: no links, Buttons, or fields |

- Make a card interactive only when the whole card leads to one place. If it needs a Button,
  keep it static and make the title the link.
- An interactive card is a link when it leads somewhere, and a button when it does something
  on the same screen, such as opening a sheet. Choose by what happens, not by how it looks.
- An interactive card holds no other controls. A control inside it would be a second target
  that a keyboard, a screen reader, and a touch each reach differently on each platform.
- Do not disable a card. A card that cannot be opened should not look as if it could: make it
  static.

## The title

- Give every card a title, even when the media seems to say it all. The title names the card
  for assistive technology, and people move from card to card by heading.
- Choose the title's level for the card's place in the outline of the screen: the level after
  the heading of the section the cards are in. The look stays `heading-sm`.
- Let titles wrap. Never cut a title short.

## Media

- Media is an image at the top of the card, edge to edge. Give it a text alternative that says
  what the image shows, or an empty one when it only decorates.
- Do not put text in the image. It does not translate, grow, or reach a screen reader.

## Body and footer

- Keep the body to what people need to choose this card over the others.
- Shorten a description with `max-lines` (Typography) only when the full text is one tap away.
- Put actions in the footer, as Buttons, only on a static card. They sit at the end of the
  card, and wrap when they do not fit.

## Collections

- Put a collection of cards in a list, so that a screen reader says how many there are: a
  `ul` or `ol` on the web.
- A card fills the width it is given. The grid or list around it, and the space between cards,
  are the app's.
- In a row of cards, let each card grow with its content. Do not give cards a fixed height.

## Do and don't

| Do                                                             | Don't                                                |
| -------------------------------------------------------------- | ---------------------------------------------------- |
| Make the title the link of a static card that also has Buttons | Put a Button inside an interactive card              |
| Give every card a title                                        | Rely on an image to say what a card is               |
| Let titles and bodies wrap, and cards grow                     | Truncate a title, or give cards a fixed height       |
| Keep every card in an app alike                                | Change a card's outline or fill to make it stand out |
