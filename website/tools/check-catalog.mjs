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
function load(applications, collections = '', media = '') {
  const context = { window: { EXST_APPLICATIONS_TEXT: applications, EXST_COLLECTIONS_TEXT: collections, EXST_MEDIA_TEXT: media }, document: { getElementById: () => null } };
  vm.runInNewContext(loader, context);
  return context.window;
}
const data = { window: {} };
vm.runInNewContext(source('website/data/applications.js'), data);
vm.runInNewContext(source('website/data/collections.js'), data);
vm.runInNewContext(source('website/data/media.js'), data);
const live = load(data.window.EXST_APPLICATIONS_TEXT, data.window.EXST_COLLECTIONS_TEXT, data.window.EXST_MEDIA_TEXT);
assert.equal(live.EXST_APPLICATIONS.length, 20);
assert.equal(live.EXST_COLLECTIONS.length, 3);
assert.equal(live.EXST_MEDIA.length, 5);
assert.equal(live.EXST_CATALOG_WARNINGS.length, 0);
for (const app of live.EXST_APPLICATIONS) {
  assert.ok(['games', 'tools'].includes(app.location));
  assert.ok(existsSync(resolve(root, 'website', app.path)));
}
for (const item of live.EXST_MEDIA) {
  assert.ok(['video', 'music'].includes(item.type), `${item.id}: type`);
  assert.ok(['audio', 'video', 'page'].includes(item.kind), `${item.id}: kind`);
  assert.ok(existsSync(resolve(root, 'website', item.path)), `${item.id}: missing ${item.path}`);
  if (item.icon) assert.ok(existsSync(resolve(root, 'website', item.icon)), `${item.id}: missing ${item.icon}`);
}
assert.equal(live.EXST_MEDIA.filter((item) => item.type === 'music').length, 3);
assert.equal(live.EXST_MEDIA.filter((item) => item.type === 'video').length, 2);
console.log('PASS media data: ' + live.EXST_MEDIA.length + ' live entries, types, kinds, paths and icons all resolve');
assert.equal(live.EXST_MEDIA_KIND('media/music/a.mp3'), 'audio');
assert.equal(live.EXST_MEDIA_KIND('media/videos/a.mp4'), 'video');
assert.equal(live.EXST_MEDIA_KIND('media/videos/clip/index.html'), 'page');
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
// Media: block names carry the type, genre/tags merge, channel= is an artist alias,
// available=false hides an entry, and a bad or missing type is guessed from the file.
const mediaMixed = load('', '', [
  '[media]\nid=t\ntitle=Track\npath=media/music/t.mp3\ngenre=Lo-fi, Chill\ntags=Focus\nartist=Me',
  '[video]\nid=v\ntitle=Vid\npath=media/videos/v.mp4\nchannel=Chan',
  '[song]\nid=s\ntitle=S\npath=media/music/s.wav',
  '[media]\nid=p\ntitle=Page\npath=media/videos/p.html\ntype=video',
  '[media]\nid=off\ntitle=Off\npath=media/music/off.mp3\navailable=false',
].join('\n'));
assert.equal(mediaMixed.EXST_MEDIA.length, 4);
assert.equal(mediaMixed.EXST_MEDIA.map((item) => item.type).join(','), 'music,video,music,video');
assert.equal(mediaMixed.EXST_MEDIA.map((item) => item.kind).join(','), 'audio,video,audio,page');
assert.equal(mediaMixed.EXST_MEDIA[0].genres.join(','), 'Lo-fi,Chill,Focus');
assert.equal(mediaMixed.EXST_MEDIA[1].artist, 'Chan');
assert.equal(mediaMixed.EXST_CATALOG_WARNINGS.length, 0);
const mediaBad = load('', '', '[media]\nid=x\ntitle=X\npath=media/music/a.mp3\ntype=typo\n[media]\nid=x\ntitle=Duplicate\npath=media/videos/b.mp4\n[media]\nid=incomplete\n[music]\nid=nopath\ntitle=No file');
assert.equal(mediaBad.EXST_MEDIA.length, 1);
assert.equal(mediaBad.EXST_MEDIA[0].type, 'music');
// bad type, duplicate id, and the two entries missing title/path.
assert.equal(mediaBad.EXST_CATALOG_WARNINGS.length, 4);
assert.equal(load('', '', '').EXST_MEDIA.length, 0);
console.log('PASS media syntax: block-name types, genre merging, channel alias, available=false, guessed types, validation warnings');
for (const page of ['index.html', 'website/game.html', 'website/media.html']) {
  const html = source(page);
  for (const [, src] of html.matchAll(/(?:src|href)="([^"#?]+)(?:\?[^"#]*)?"/g)) {
    if (/^(https?:|#)/.test(src)) continue;
    assert.ok(existsSync(resolve(root, dirname(page), src)), `${page}: missing ${src}`);
  }
  assert.ok(!/data\/(games|folders)\.js/.test(html));
}
// The pages that show media have to load the media catalog before the loader runs.
for (const page of ['index.html', 'website/media.html']) {
  const html = source(page);
  assert.ok(html.indexOf('data/media.js') < html.indexOf('config-loader.js'), `${page}: data/media.js must load before config-loader.js`);
}
console.log('PASS catalog: live data, locations, legacy syntax, comments, validation, media types and paths, empty data, and page asset references');
