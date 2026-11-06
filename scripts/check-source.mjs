import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { parse } from 'acorn';
import { bridgeInlineEvents } from './inline-event-bridge.mjs';

const source = readFileSync(new URL('../src/prototype.js', import.meta.url), 'utf8');
const bridged = bridgeInlineEvents(source);
parse(bridged, { ecmaVersion: 'latest', sourceType: 'module' });
assert(bridged.startsWith(source), 'Compatibility layer must not rewrite prototype logic');

// Verify global inline handlers and reassignment behave like the former classic script.
const fixture = `let files = []; let query = ''; function add(value) { files.push(value); }`;
const context = { window: {} };
vm.createContext(context);
vm.runInContext(`'use strict';\n${bridgeInlineEvents(fixture)}`, context);
context.window.add('material');
assert.equal(context.window.files[0], 'material');
context.window.files = ['changed'];
assert.equal(vm.runInContext('files[0]', context), 'changed');
context.window.query = 'search';
assert.equal(vm.runInContext('query', context), 'search');
console.log('PASS: source syntax and module/inline-event compatibility.');
