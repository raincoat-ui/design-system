// A reader for the stylesheet Tailwind generates: enough CSS parsing to list every rule with
// the at-rules around it. It is not a general CSS parser; it assumes no braces or semicolons
// inside strings, which holds for the generated file.

const CONTAINERS = /^@(media|supports|layer|keyframes)\b/;

/**
 * Every rule of a stylesheet.
 * @returns {{context: string[], selector: string, declarations: [string, string][]}[]}
 *   `context` lists the enclosing at-rules, outermost first. An at-rule with a body of
 *   declarations, such as @property, is returned as a rule whose selector is its prelude.
 */
export function rules(css) {
  const text = css.replaceAll(/\/\*[\s\S]*?\*\//g, "");
  const found = [];
  let at = 0;

  function block(context) {
    while (at < text.length && text[at] !== "}") {
      const open = text.indexOf("{", at);
      const semicolon = text.indexOf(";", at);
      const close = text.indexOf("}", at);
      const before = (index, other) => index !== -1 && (other === -1 || index < other);
      // A statement at-rule, such as "@layer properties;".
      if (before(semicolon, open) && before(semicolon, close)) {
        at = semicolon + 1;
        continue;
      }
      if (open === -1) break;
      const prelude = text.slice(at, open).trim();
      at = open + 1;
      if (CONTAINERS.test(prelude)) {
        block([...context, prelude]);
      } else {
        const end = text.indexOf("}", at);
        found.push({ context, selector: prelude, declarations: declarations(text.slice(at, end)) });
        at = end;
      }
      at += 1;
    }
  }

  block([]);
  return found;
}

function declarations(body) {
  return body
    .split(";")
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .map((declaration) => {
      const colon = declaration.indexOf(":");
      return [declaration.slice(0, colon).trim(), declaration.slice(colon + 1).trim()];
    });
}

/** The class a selector starts with, unescaped, or null when it starts with something else. */
export function leadingClass(selector) {
  const match = selector.match(/^\.((?:\\.|[\w-])+)/);
  return match ? match[1].replaceAll(/\\(.)/g, "$1") : null;
}
