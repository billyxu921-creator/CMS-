import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { parse } from 'acorn';

const dist = path.resolve(fileURLToPath(new URL('../dist/', import.meta.url)));
assert(existsSync(path.join(dist, 'index.html')), 'dist/index.html is missing');
const html = readFileSync(path.join(dist, 'index.html'), 'utf8');
const references = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)].map(match => match[1]);
assert(references.some(ref => ref.endsWith('.js')), 'Missing JavaScript entry');
assert(references.some(ref => ref.endsWith('.css')), 'Missing stylesheet');
for (const ref of references) {
  assert(!/^(?:file:|\/Users\/|[A-Za-z]:\\)/.test(ref), `Local machine path: ${ref}`);
  if (/^(?:https?:|data:|blob:|#)/.test(ref)) continue;
  assert(ref.startsWith('./'), `Expected a relative build asset URL: ${ref}`);
  const pathname = ref.split(/[?#]/)[0];
  const asset = path.resolve(dist, decodeURIComponent(pathname));
  assert(asset.startsWith(dist + path.sep), `Asset escapes dist: ${ref}`);
  assert(existsSync(asset) && statSync(asset).isFile(), `Asset missing: ${ref}`);
  // Resolve the same build under a domain root and an arbitrary directory.
  for (const base of ['https://example.test/', 'https://example.test/reviews/prototype/']) {
    const resolved = new URL(ref, base);
    assert(resolved.pathname.startsWith(new URL(base).pathname), `Bad nested base: ${ref}`);
  }
  if (asset.endsWith('.js')) parse(readFileSync(asset, 'utf8'), { ecmaVersion: 'latest', sourceType: 'module' });
}
assert(!html.includes('/src/'), 'Production HTML still references source files');
assert(existsSync(path.join(dist, '_headers')), 'Static cache header example is missing');
console.log(`PASS: production HTML, JavaScript syntax and ${references.length} asset references; root/subdirectory URLs are valid.`);
console.log('dist:', readdirSync(dist).join(', '));
