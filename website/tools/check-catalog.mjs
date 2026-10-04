#!/usr/bin/env node
// Run with: node website/tools/check-catalog.mjs (no dependencies).
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import vm from 'node:vm';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const source = (path) => readFileSync(resolve(root, path), 'utf8');
const loader = source('website/assets/js/config-loader.js');
function load(applications, collections = '') {
  const context = { window: { EXST_APPLICATIONS_TEXT: applications, EXST_COLLECTIONS_TEXT: collections }, document: { getElementById: () => null } };
  vm.runInNewContext(loader, context);
  return context.window;
}
const data = { window: {} };
vm.runInNewContext(source('website/data/applications.js'), data);
vm.runInNewContext(source('website/data/collections.js'), data);
const live = load(data.window.EXST_APPLICATIONS_TEXT, data.window.EXST_COLLECTIONS_TEXT);
assert.equal(live.EXST_APPLICATIONS.length, 20);
assert.equal(live.EXST_COLLECTIONS.length, 3);
assert.equal(live.EXST_CATALOG_WARNINGS.length, 0);
for (const app of live.EXST_APPLICATIONS) {
  assert.ok(['games', 'tools'].includes(app.location));
  assert.ok(existsSync(resolve(root, 'website', app.path)));
}
const mixed = load('[application]\r\nid=tool\r\ntitle=Tool\r\npath=tools/demo.html\r\nlocation=TOOLS\r\nhero=true\r\n# location=games\r\n[game]\r\nid=game\r\ntitle=Game\r\npath=games/demo.html', '[collection]\nid=mixed\ntitle=Mixed\napplications=tool,game\n[folder]\nid=legacy\ntitle=Legacy\ngames=game\n[collection]\nid=hidden\ntitle=Hidden\navailable=false');
assert.equal(mixed.EXST_APPLICATIONS[0].location, 'tools');
assert.equal(mixed.EXST_APPLICATIONS[1].location, 'games');
assert.equal(mixed.EXST_COLLECTIONS[0].applications.join(','), 'tool,game');
assert.equal(mixed.EXST_COLLECTIONS[1].applications.join(','), 'game');
assert.equal(mixed.EXST_COLLECTIONS.length, 2);
assert.equal(mixed.EXST_CATALOG_WARNINGS.length, 0);
const invalid = load('[application]\nid=x\ntitle=X\npath=x.html\nlocation=typo\n[application]\nid=x\ntitle=Duplicate\npath=x.html\n[application]\nid=incomplete', '[collection]\nid=c\ntitle=C\napplications=unknown');
assert.equal(invalid.EXST_APPLICATIONS.length, 1);
assert.equal(invalid.EXST_APPLICATIONS[0].location, 'games');
assert.equal(invalid.EXST_CATALOG_WARNINGS.length, 4);
assert.equal(load('').EXST_APPLICATIONS.length, 0);
for (const page of ['index.html', 'website/game.html']) {
  const html = source(page);
  for (const [, src] of html.matchAll(/(?:src|href)="([^"#?]+)(?:\?[^"#]*)?"/g)) {
    if (/^(https?:|#)/.test(src)) continue;
    assert.ok(existsSync(resolve(root, dirname(page), src)), `${page}: missing ${src}`);
  }
  assert.ok(!/data\/(games|folders)\.js/.test(html));
}
console.log('PASS catalog: live data, locations, legacy syntax, comments, validation, empty data, and page asset references');
