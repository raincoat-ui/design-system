---

## "@raincoat-ui/swift": patch

A loading Button tells VoiceOver that it is in progress.

On iOS a loading button was read as its label alone. It now has the accessibility value "In
progress", so it is read as "Save changes, In progress". The words are translated into English,
Vietnamese, Simplified and Traditional Chinese, Japanese, and Korean, and are in English for any
other language. iOS uses a package's translation only for a language the app supports, or when
the app sets `CFBundleAllowMixedLocalizations`.

The Swift package now has resources and a default localization.
