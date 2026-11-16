// Checks that native component code takes its colors and sizes from tokens.
//
// A component may not name a color or write a size as a number. It reads both from the theme,
// which is what lets one component serve every theme, color mode, and density. The check reads
// the source line by line; it is a net for the usual mistakes, not a proof.
//
// The web components are checked differently: see packages/web/test/package/package.test.js,
// which inspects the stylesheet they compile to.

const SYSTEM_COLORS =
  "red|orange|yellow|green|mint|teal|cyan|blue|indigo|purple|pink|brown|white|gray|black|clear|accentColor|primary|secondary|tertiary|quaternary";

const SWIFT_RULES = [
  {
    // Color(red: …), Color(.sRGB, …), Color("Name"), Color(hue: …), Color(white: …)
    pattern: /\bColor\(\s*(?:red:|hue:|white:|\.sRGB|\.displayP3|\.linear|"|#)/,
    message: "builds a color from literal values; use Color(<a token color>)",
  },
  {
    pattern: new RegExp(`\\bColor\\.(?:${SYSTEM_COLORS})\\b`),
    message: "names a system color; use a token color",
  },
  {
    pattern: /\b(?:UIColor|NSColor|CGColor)\b|#colorLiteral/,
    message: "uses a platform color; use a token color",
  },
  {
    // .foregroundStyle(.red), .fill(.primary), .background(.white) …
    pattern: new RegExp(
      `\\.(?:foregroundStyle|foregroundColor|fill|stroke|strokeBorder|background|tint|border|shadow)\\(\\s*\\.(?:${SYSTEM_COLORS})\\b`,
    ),
    message: "styles with a system color; use a token color",
  },
  {
    // A number given to a size parameter: cornerRadius: 8, lineWidth: 1, width: 44 …
    pattern:
      /\b(?:cornerRadius|lineWidth|spacing|size|fixedSize|width|height|minWidth|minHeight|maxWidth|maxHeight|idealWidth|idealHeight|radius|length)\s*:\s*-?(?!0\b)\d/,
    message: "gives a size as a number; use a token",
  },
  {
    // A number as a whole argument of a layout modifier: .padding(8), .padding(.vertical, 8),
    // .offset(x: 4). Arithmetic on a token, such as inset(by: lineWidth / 2), is not one.
    pattern:
      /\.(?:padding|offset|inset|lineSpacing|tracking|kerning|blur)\((?:[^()]*,\s*)?(?:\w+\s*:\s*)?-?(?!0\b)\d+(?:\.\d+)?\s*[,)]/,
    message: "gives a size as a number; use a token",
  },
];

const KOTLIN_RULES = [
  {
    // Color(0xFFF7D22A), Color(red = …), Color(247, 210, 42)
    pattern: /\bColor\(\s*(?:0x|\d|red\s*=|alpha\s*=)/,
    message: "builds a color from literal values; use a token color",
  },
  {
    // Color.Red and the like. Transparent and Unspecified are not colors of a design.
    pattern: /\bColor\.(?!Transparent\b|Unspecified\b)[A-Z]\w*/,
    message: "names a fixed color; use a token color",
  },
  {
    pattern: /\b(?:MaterialTheme\.|colorResource\(|dimensionResource\()/,
    message: "reads a color or size from somewhere other than the Raincoat tokens",
  },
  {
    // 8.dp, 14.sp, 1.5.em. Zero is allowed.
    pattern: /(?<![\w.])(?!0\.(?:dp|sp|em)\b)\d+(?:\.\d+)?\.(?:dp|sp|em)\b/,
    message: "gives a size as a number; use a token",
  },
  {
    pattern: /\b(?:Dp|TextUnit)\(\s*\d/,
    message: "gives a size as a number; use a token",
  },
];

const RULES = { swift: SWIFT_RULES, kotlin: KOTLIN_RULES };

/** Removes comments, so that prose is not mistaken for code. Line numbers are kept. */
function withoutComments(source) {
  return source
    .replaceAll(/\/\*[\s\S]*?\*\//g, (comment) => comment.replaceAll(/[^\n]/g, " "))
    .replaceAll(/\/\/.*$/gm, "");
}

/**
 * Lints the source of one native component file.
 * @param {"swift" | "kotlin"} language
 * @returns {{line: number, text: string, message: string}[]} problems, empty when clean.
 */
export function lintComponentSource(language, source) {
  const rules = RULES[language];
  if (!rules) throw new Error(`no rules for "${language}"`);
  const original = source.split("\n");
  return withoutComments(source)
    .split("\n")
    .flatMap((code, index) =>
      rules
        .filter(({ pattern }) => pattern.test(code))
        .map(({ message }) => ({ line: index + 1, text: original[index].trim(), message })),
    );
}

/** Where each platform keeps its component sources, relative to the repository root. */
export const COMPONENT_SOURCES = [
  { language: "swift", dir: "packages/ios/Sources/Raincoat/Components", extension: ".swift" },
  {
    language: "kotlin",
    dir: "packages/android/ui/src/main/kotlin/io/github/raincoatui/ui/components",
    extension: ".kt",
  },
];
