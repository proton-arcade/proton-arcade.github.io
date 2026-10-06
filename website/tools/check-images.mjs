#!/usr/bin/env node
/*
 * Dependency-free image and catalog audit for the static arcade.
 *
 * Checks real file signatures (not extensions alone), walks PNG chunks to
 * catch truncation and Git LFS pointer files, verifies every catalog path and
 * icon exists, and warns if distinct catalog entries reuse identical art.
 * Run from anywhere inside the checkout:
 *
 *     node website/tools/check-images.mjs
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const WEBSITE = join(ROOT, 'website');
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']);
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
let passed = 0;
let failed = 0;

function ok(message) {
    passed++;
    console.log('PASS ' + message);
}

function bad(message) {
    failed++;
    console.error('FAIL ' + message);
}

function warn(message) {
    console.warn('WARN ' + message);
}

function rel(file) {
    return relative(ROOT, file).split(sep).join('/');
}

function walk(dir) {
    const files = [];
    for (const name of readdirSync(dir).sort()) {
        const file = join(dir, name);
        const stat = statSync(file);
        if (stat.isDirectory()) files.push(...walk(file));
        else if (stat.isFile() && IMAGE_EXTENSIONS.has(extname(name).toLowerCase())) files.push(file);
    }
    return files;
}

function isLfsPointer(bytes) {
    return bytes.subarray(0, 100).toString('utf8').startsWith('version https://git-lfs.github.com/spec/v1');
}

function hasSignature(file, bytes) {
    const ext = extname(file).toLowerCase();
    if (ext === '.png') return bytes.length >= PNG_SIGNATURE.length && bytes.subarray(0, 8).equals(PNG_SIGNATURE);
    if (ext === '.jpg' || ext === '.jpeg')
        return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    if (ext === '.gif') {
        const sig = bytes.subarray(0, 6).toString('ascii');
        return sig === 'GIF87a' || sig === 'GIF89a';
    }
    if (ext === '.webp')
        return bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
    if (ext === '.svg') {
        const head = bytes.subarray(0, 4096).toString('utf8').replace(/^\uFEFF/, '');
        return /<svg(?:\s|>)/i.test(head);
    }
    return false;
}

function inspectPng(bytes) {
    if (bytes.length < 33 || !bytes.subarray(0, 8).equals(PNG_SIGNATURE))
        throw new Error('missing or incomplete PNG signature/header');

    let offset = 8;
    let sawHeader = false;
    let endOfImage = -1;
    let bitDepth = null;
    while (offset < bytes.length) {
        if (offset + 12 > bytes.length) throw new Error('truncated PNG chunk header');
        const length = bytes.readUInt32BE(offset);
        const type = bytes.toString('ascii', offset + 4, offset + 8);
        if (length > bytes.length - offset - 12) throw new Error('truncated ' + type + ' chunk');
        if (!sawHeader) {
            if (type !== 'IHDR' || length !== 13) throw new Error('first PNG chunk is not a 13-byte IHDR');
            bitDepth = bytes[offset + 16];
            sawHeader = true;
        }
        offset += length + 12;
        if (type === 'IEND') {
            if (length !== 0) throw new Error('IEND chunk is not empty');
            endOfImage = offset;
            break;
        }
    }

    if (!sawHeader) throw new Error('PNG has no IHDR chunk');
    if (endOfImage < 0) throw new Error('PNG has no complete IEND chunk');
    const trailing = bytes.length - endOfImage;
    // A few upstream launcher PNGs have one harmless byte after IEND. Allow a
    // small amount of this known browser-tolerated padding, but reject junk.
    if (trailing > 64) throw new Error(trailing + ' unexplained bytes after IEND');
    return { bitDepth, trailing };
}

function catalogRecords() {
    const catalogPath = join(WEBSITE, 'data', 'applications.js');
    const source = readFileSync(catalogPath, 'utf8');
    const match = source.match(/window\.EXST_APPLICATIONS_TEXT\s*=\s*`([\s\S]*?)`\s*;/);
    if (!match) throw new Error('could not find window.EXST_APPLICATIONS_TEXT template in ' + rel(catalogPath));

    return match[1].split(/^\[(?:application|game)\]\s*$/m).slice(1).map((block) => {
        const fields = {};
        for (const line of block.split(/\r?\n/)) {
            const field = /^(id|path|icon)=(.*)$/.exec(line.trim());
            if (field) fields[field[1]] = field[2].trim();
        }
        return fields;
    }).filter((entry) => entry.id || entry.path || entry.icon);
}

function mediaRecords() {
    const catalogPath = join(WEBSITE, 'data', 'media.js');
    if (!existsSync(catalogPath)) return [];
    const source = readFileSync(catalogPath, 'utf8');
    const match = source.match(/window\.EXST_MEDIA_TEXT\s*=\s*`([\s\S]*?)`\s*;/);
    if (!match) throw new Error('could not find window.EXST_MEDIA_TEXT template in ' + rel(catalogPath));

    return match[1].split(/^\[(?:media|video|music|song|track)\]\s*$/m).slice(1).map((block) => {
        const fields = {};
        for (const line of block.split(/\r?\n/)) {
            if (line.trim().startsWith('available=false')) fields.available = 'false';
            const field = /^(id|path|icon)=(.*)$/.exec(line.trim());
            if (field) fields[field[1]] = field[2].trim();
        }
        return fields;
    }).filter((entry) => entry.id || entry.path || entry.icon);
}

const images = walk(WEBSITE);
const imageBytes = new Map();
const signatureIssues = [];
for (const file of images) {
    let bytes;
    try { bytes = readFileSync(file); }
    catch (error) { signatureIssues.push(rel(file) + ': cannot read (' + error.message + ')'); continue; }
    imageBytes.set(file, bytes);
    if (bytes.length === 0) signatureIssues.push(rel(file) + ': empty file');
    else if (isLfsPointer(bytes)) signatureIssues.push(rel(file) + ': Git LFS pointer, not image data');
    else if (!hasSignature(file, bytes)) signatureIssues.push(rel(file) + ': extension does not match image bytes');
}
if (signatureIssues.length) signatureIssues.forEach(bad);
else if (images.length) ok('real image signatures match all ' + images.length + ' website image extensions');
else bad('no website image files found');

const pngFiles = images.filter((file) => extname(file).toLowerCase() === '.png');
const pngIssues = [];
for (const file of pngFiles) {
    const bytes = imageBytes.get(file);
    if (!bytes || !bytes.subarray(0, 8).equals(PNG_SIGNATURE)) continue;
    try {
        const png = inspectPng(bytes);
        // The card art is deliberately kept in broadly compatible 8-bit PNG.
        if ((file.endsWith('/Spacebar-clicker/icon.png') || file.endsWith('/Baldis-basics/icon.png')) && png.bitDepth !== 8)
            pngIssues.push(rel(file) + ': game-card PNG uses ' + png.bitDepth + '-bit samples, expected 8-bit');
    } catch (error) {
        pngIssues.push(rel(file) + ': ' + error.message);
    }
}
if (pngIssues.length) pngIssues.forEach(bad);
else if (pngFiles.length) ok('all ' + pngFiles.length + ' PNG chunk streams are complete (allowing at most 64 trailing bytes)');
else bad('no PNG files found to inspect');

let records = [];
let committed = new Set();
try {
    records = catalogRecords();
    committed = new Set(execFileSync('git', ['ls-tree', '-r', '--name-only', 'HEAD'], {
        cwd: ROOT,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe']
    }).split(/\r?\n/).filter(Boolean));
} catch (error) {
    bad('could not read catalog or committed file list: ' + error.message);
}

const catalogIssues = [];
const iconFingerprints = new Map();
let referenceCount = 0;
if (records.length === 0) catalogIssues.push('catalog contains no [application] entries');
for (const entry of records) {
    if (!entry.id) catalogIssues.push('catalog entry is missing id');
    for (const key of ['path', 'icon']) {
        const value = entry[key];
        if (!value) {
            catalogIssues.push((entry.id || 'unnamed game') + ': missing ' + key + '= value');
            continue;
        }
        referenceCount++;
        const file = resolve(WEBSITE, value);
        if (file !== WEBSITE && !file.startsWith(WEBSITE + sep)) {
            catalogIssues.push((entry.id || 'unnamed game') + ': ' + key + ' escapes website/: ' + value);
            continue;
        }
        if (!statSafe(file)) {
            catalogIssues.push((entry.id || 'unnamed game') + ': ' + key + ' does not exist: website/' + value);
            continue;
        }
        if (key === 'icon') {
            const committedPath = rel(file);
            if (!committed.has(committedPath))
                catalogIssues.push((entry.id || 'unnamed game') + ': icon is not in HEAD (GitHub Pages would 404): ' + committedPath);
            // The generic game fallback is intentionally shared by entries
            // without custom card art; only compare custom catalog artwork.
            if (committedPath !== 'website/assets/images/default-game.svg') {
                const bytes = imageBytes.get(file) || readFileSync(file);
                const hash = createHash('sha256').update(bytes).digest('hex');
                const prior = iconFingerprints.get(hash) || [];
                prior.push((entry.id || 'unnamed game') + ' -> ' + committedPath);
                iconFingerprints.set(hash, prior);
            }
        }
    }
}
if (catalogIssues.length) catalogIssues.forEach(bad);
else ok(records.length + ' catalog entries: all ' + referenceCount + ' path/icon references exist and every icon is committed');

// Media catalog: the file itself is required, cover art is optional (the
// player falls back to assets/images/default-video.svg / default-music.svg).
let mediaList = [];
try { mediaList = mediaRecords(); }
catch (error) { bad('could not read media catalog: ' + error.message); }
const mediaIssues = [];
let mediaReferences = 0;
for (const entry of mediaList) {
    if (!entry.id) mediaIssues.push('media entry is missing id');
    if (entry.available === 'false') continue;
    for (const key of ['path', 'icon']) {
        const value = entry[key];
        if (!value) {
            if (key === 'path') mediaIssues.push((entry.id || 'unnamed media') + ': missing path= value');
            continue;
        }
        mediaReferences++;
        const file = resolve(WEBSITE, value);
        if (file !== WEBSITE && !file.startsWith(WEBSITE + sep)) {
            mediaIssues.push((entry.id || 'unnamed media') + ': ' + key + ' escapes website/: ' + value);
            continue;
        }
        if (!statSafe(file)) {
            mediaIssues.push((entry.id || 'unnamed media') + ': ' + key + ' does not exist: website/' + value);
            continue;
        }
        if (key === 'icon') {
            const committedPath = rel(file);
            if (!committed.has(committedPath))
                mediaIssues.push((entry.id || 'unnamed media') + ': icon is not in HEAD (GitHub Pages would 404): ' + committedPath);
            const bytes = imageBytes.get(file) || readFileSync(file);
            const hash = createHash('sha256').update(bytes).digest('hex');
            const prior = iconFingerprints.get(hash) || [];
            prior.push((entry.id || 'unnamed media') + ' -> ' + committedPath);
            iconFingerprints.set(hash, prior);
        }
    }
}
if (mediaIssues.length) mediaIssues.forEach(bad);
else if (mediaList.length) ok(mediaList.length + ' media entries: all ' + mediaReferences + ' path/icon references exist');
else warn('no media entries in website/data/media.js');

let duplicateGroups = 0;
for (const matches of iconFingerprints.values()) {
    if (matches.length > 1) {
        duplicateGroups++;
        warn('identical icon content shared by catalog entries: ' + matches.join('; '));
    }
}
if (duplicateGroups === 0) ok('catalog art (games and media) does not reuse identical icon bytes');
else ok('duplicate-art warning emitted for ' + duplicateGroups + ' icon group(s)');

console.log('\ncheck-images: passed ' + passed + ', failed ' + failed);
if (failed) process.exitCode = 1;

function statSafe(file) {
    try { return statSync(file).isFile(); }
    catch { return false; }
}
