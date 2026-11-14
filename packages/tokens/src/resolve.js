// Reference handling. Raincoat supports the curly-brace form only: "{group.token}".

const ALIAS = /^\{([^{}]+)\}$/;

/** The token id a value refers to, or null when the value is not a reference. */
export function aliasTarget(value) {
  return typeof value === "string" ? (ALIAS.exec(value)?.[1] ?? null) : null;
}

/** Every reference inside a value, including those nested in composite values. */
export function aliasesIn(value) {
  const target = aliasTarget(value);
  if (target) return [target];
  if (Array.isArray(value)) return value.flatMap(aliasesIn);
  if (value !== null && typeof value === "object") return Object.values(value).flatMap(aliasesIn);
  return [];
}

export class ResolveError extends Error {}

/** A token's value with every reference replaced by the value it points to. */
export function resolveToken(id, tokens, stack = []) {
  const token = tokens.get(id);
  if (!token) {
    throw new ResolveError(`reference to "${id}", which does not exist`);
  }
  if (stack.includes(id)) {
    throw new ResolveError(`circular reference: ${[...stack, id].join(" -> ")}`);
  }
  const next = [...stack, id];
  const visit = (value) => {
    const target = aliasTarget(value);
    if (target) return resolveToken(target, tokens, next);
    if (Array.isArray(value)) return value.map(visit);
    if (value !== null && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, visit(item)]));
    }
    return value;
  };
  return visit(token.value);
}

/** A token's type: its own or inherited one, else the type of the token it refers to. */
export function resolvedType(id, tokens, stack = []) {
  const token = tokens.get(id);
  if (!token || stack.includes(id)) return undefined;
  if (token.type) return token.type;
  const target = aliasTarget(token.value);
  return target ? resolvedType(target, tokens, [...stack, id]) : undefined;
}
