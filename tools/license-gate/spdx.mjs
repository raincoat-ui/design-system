// A small SPDX license-expression evaluator: identifiers, AND, OR, WITH, and parentheses.
// Anything it cannot parse ("SEE LICENSE IN ...", "UNLICENSED", an empty string) is treated
// as not allowed, so the package needs a reviewed correction in licenses/curations.yml.

const TOKEN = /\s*(\(|\)|[A-Za-z0-9.+-]+)/y;

function tokenize(expression) {
  const tokens = [];
  TOKEN.lastIndex = 0;
  let position = 0;
  while (position < expression.length) {
    TOKEN.lastIndex = position;
    const match = TOKEN.exec(expression);
    if (!match) {
      if (expression.slice(position).trim() === "") break;
      return null;
    }
    tokens.push(match[1]);
    position = TOKEN.lastIndex;
  }
  return tokens;
}

/** Parses an expression into a tree, or returns null when it is not a valid expression. */
export function parse(expression) {
  if (typeof expression !== "string") return null;
  const tokens = tokenize(expression);
  if (!tokens || tokens.length === 0) return null;
  let index = 0;
  const peek = () => tokens[index];
  const isOperator = (token, name) => token !== undefined && token.toUpperCase() === name;

  function factor() {
    const token = tokens[index++];
    if (token === undefined || token === ")") return null;
    if (token === "(") {
      const inner = either();
      if (!inner || tokens[index++] !== ")") return null;
      return inner;
    }
    if (["AND", "OR", "WITH"].includes(token.toUpperCase())) return null;
    if (isOperator(peek(), "WITH")) {
      index++;
      const exception = tokens[index++];
      if (exception === undefined || exception === "(" || exception === ")") return null;
      return { type: "license", id: `${token} WITH ${exception}` };
    }
    return { type: "license", id: token };
  }

  function both() {
    let left = factor();
    while (left && isOperator(peek(), "AND")) {
      index++;
      const right = factor();
      if (!right) return null;
      left = { type: "and", left, right };
    }
    return left;
  }

  function either() {
    let left = both();
    while (left && isOperator(peek(), "OR")) {
      index++;
      const right = both();
      if (!right) return null;
      left = { type: "or", left, right };
    }
    return left;
  }

  const tree = either();
  return tree && index === tokens.length ? tree : null;
}

/** True when the expression can be satisfied using only licenses in `allowed` (a Set). */
export function isAllowed(expression, allowed) {
  const tree = parse(expression);
  if (!tree) return false;
  const visit = (node) => {
    if (node.type === "license") return allowed.has(node.id);
    if (node.type === "and") return visit(node.left) && visit(node.right);
    return visit(node.left) || visit(node.right);
  };
  return visit(tree);
}
