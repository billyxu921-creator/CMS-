import { parse } from 'acorn';

// Keep the original inline onclick/onchange handlers working after Vite moves
// the runtime into a module. Accessors preserve mutable state (files, query, etc.).
export function bridgeInlineEvents(source) {
  const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module' });
  const bindings = new Map();
  for (const statement of ast.body) {
    if (statement.type === 'FunctionDeclaration' && statement.id) {
      bindings.set(statement.id.name, true);
    }
    if (statement.type === 'VariableDeclaration') {
      for (const declaration of statement.declarations) {
        if (declaration.id.type === 'Identifier') {
          bindings.set(declaration.id.name, statement.kind !== 'const');
        }
      }
    }
  }
  const descriptors = [...bindings].map(([name, mutable]) =>
    `${JSON.stringify(name)}: { configurable: true, enumerable: true, get: () => ${name}${mutable ? `, set: (value) => { ${name} = value; }` : ''} }`
  ).join(',\n');
  return `${source}\n\n// Compatibility for the prototype's existing inline event attributes.\nif (typeof window !== 'undefined') {\nObject.defineProperties(window, {\n${descriptors}\n});\n}\n`;
}
