const skipWhitespace = (source: string, index: number) => {
  let nextIndex = index;
  while (/\s/.test(source[nextIndex] ?? "")) nextIndex += 1;
  return nextIndex;
};

const findBalancedEnd = (source: string, startIndex: number, open: string, close: string) => {
  let depth = 0;
  let quote: string | null = null;
  let escaped = false;

  for (let index = startIndex; index < source.length; index += 1) {
    const char = source[index];
    const nextChar = source[index + 1];

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === "'" || char === '"' || char === "`") {
      quote = char;
      continue;
    }

    if (char === "/" && nextChar === "/") {
      const newlineIndex = source.indexOf("\n", index + 2);
      if (newlineIndex === -1) return source.length - 1;
      index = newlineIndex;
      continue;
    }

    if (char === "/" && nextChar === "*") {
      const closeIndex = source.indexOf("*/", index + 2);
      if (closeIndex === -1) return source.length - 1;
      index = closeIndex + 1;
      continue;
    }

    if (char === open) depth += 1;
    if (char === close) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  return -1;
};

const readMatchArms = (source: string, startIndex: number, endIndex: number) => {
  const arms: Array<{ body: string; pattern: string }> = [];
  let index = startIndex;

  while (index < endIndex) {
    index = skipWhitespace(source, index);
    if (index >= endIndex) break;

    const arrowIndex = source.indexOf("=>", index);
    if (arrowIndex === -1 || arrowIndex > endIndex) return null;
    const pattern = source.slice(index, arrowIndex).trim();
    const bodyStart = skipWhitespace(source, arrowIndex + 2);
    if (source[bodyStart] !== "{") return null;
    const bodyEnd = findBalancedEnd(source, bodyStart, "{", "}");
    if (bodyEnd === -1 || bodyEnd > endIndex) return null;

    arms.push({
      body: source.slice(bodyStart + 1, bodyEnd),
      pattern,
    });
    index = bodyEnd + 1;
  }

  return arms;
};

export const lowerFlowMatchSyntax = (source: string) => {
  let output = "";
  let index = 0;
  let matchIndex = 0;

  while (index < source.length) {
    const startIndex = source.indexOf("match", index);
    if (startIndex === -1) {
      output += source.slice(index);
      break;
    }

    const before = source[startIndex - 1] ?? "";
    const after = source[startIndex + "match".length] ?? "";
    if (/[$\w]/.test(before) || /[$\w]/.test(after)) {
      output += source.slice(index, startIndex + "match".length);
      index = startIndex + "match".length;
      continue;
    }

    const parenStart = skipWhitespace(source, startIndex + "match".length);
    if (source[parenStart] !== "(") {
      output += source.slice(index, startIndex + "match".length);
      index = startIndex + "match".length;
      continue;
    }

    const parenEnd = findBalancedEnd(source, parenStart, "(", ")");
    const braceStart = skipWhitespace(source, parenEnd + 1);
    if (parenEnd === -1 || source[braceStart] !== "{") {
      output += source.slice(index, startIndex + "match".length);
      index = startIndex + "match".length;
      continue;
    }

    const braceEnd = findBalancedEnd(source, braceStart, "{", "}");
    if (braceEnd === -1) {
      output += source.slice(index, startIndex + "match".length);
      index = startIndex + "match".length;
      continue;
    }

    const arms = readMatchArms(source, braceStart + 1, braceEnd);
    if (!arms?.length) {
      output += source.slice(index, startIndex + "match".length);
      index = startIndex + "match".length;
      continue;
    }

    const valueName = `__flowMatchValue${matchIndex++}`;
    const expression = source.slice(parenStart + 1, parenEnd).trim();
    const loweredArms = arms
      .map(({ body, pattern }, armIndex) => {
        const prefix = armIndex === 0 ? "if" : pattern === "_" ? "else if" : "else if";
        const condition = pattern === "_" ? "true" : `${valueName} === ${pattern}`;
        return `${prefix} (${condition}) {${body}}`;
      })
      .join(" ");

    output += source.slice(index, startIndex);
    output += `{ const ${valueName} = ${expression}; ${loweredArms} }`;
    index = braceEnd + 1;
  }

  return output;
};
