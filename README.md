# Exst Arcade

A static game arcade that runs on GitHub Pages (this repository is the
`proton-arcade.github.io` site, so `main` is what gets served). One home page
with a hero cover and collections, one player page with a full-screen frame,
and every game bundled in this repository — no build step, no backend, no
package manager.

Open it and press play. That is the whole product.

```
index.html              home (hero + collections + browse)
website/game.html       player page (loads ?id=… in a full-screen frame)
website/data/*.js       the catalog — plain text, edit by hand
website/games/          one folder per game
website/assets/         shared CSS, JS, icons, fallback art
```

## Run it locally

Any static server works, and so does opening the file straight off disk:

```bash
python3 -m http.server 8000      # then http://localhost:8000/
```

or just double-click `index.html`. Everything the arcade needs is a relative
path in this repo, and the catalog is loaded with plain `<script>` tags rather
than `fetch()`, so `file://` works too. (Ampler Launcher has its own optional
server, see below.)

## The catalog

Two files, both plain text read by `website/assets/js/config-loader.js`.
Neither needs a rebuild — edit, reload, done.

`website/data/games.js` — one `[game]` block per game:

```
[game]
id=FNAF-1
title=Five nights at Freddy's
path=games/Five-nights-at-Freddys/one/index.html
icon=games/Five-nights-at-Freddys/one/icon.png
version=version 1.1
description=Welcome to your new summer job at Freddy Fazbear's Pizza…
tags=Horror, Survival, Jump scare, Mouse only, First person
featured=true
hero=true
```

| Field | Used for |
|---|---|
| `id` | the key used by `?id=` in the player page and by collections |
| `title` | card title, player title |
| `path` | the game page, relative to `website/` |
| `icon` | card/poster art, relative to `website/` (falls back to `assets/images/default-game.svg`) |
| `version` | small meta text on cards |
| `description` | card and details text |
| `tags` | comma-separated chips, also used by the genre browse rows |
| `hero` | `hero=true` puts the game in the home banner carousel |

`featured` and `badge` still appear in the template comment at the top of
`data/games.js`, but nothing reads them — leave them out of new entries.

`website/data/folders.js` — one `[folder]` block per home-page collection, whose
`games=` value is a comma-separated list of game **ids** (not paths):

```
[folder]
available=true
id=Ealgercraft
title=Ealgercraft
games=Ampler-Launcher
```

Set `available=false` to hide a collection without deleting its games.

### Adding a game

1. Drop the game in `website/games/<name>/` with an `index.html` (and an
   `icon.png` if you have one).
2. Add a `[game]` block to `website/data/games.js`.
3. Add its `id` to a `[folder]` block in `website/data/folders.js` if it should
   sit in a collection.

The player page shows a "That game file is missing" panel with the exact path
it expected if step 1 and step 2 disagree.

## What is in here

| Path | Game | State |
|---|---|---|
| `website/games/Ealgercraft/Ampler-Launcher/` | Ampler Launcher (Minecraft via Eaglercraft) | full build, playable |
| `website/games/Five-nights-at-Freddys/` | FNAF 1–4 and Sister Location | full builds, playable |
| `website/games/Baldis-basics/` | Baldi's Basics | placeholder page, in the catalog |
| `website/games/Spacebar-clicker/` | Spacebar Clicker | placeholder page, in the catalog |
| `website/games/index.html` | test entry (`id=test`) | placeholder page, not in a collection |
| `website/games/gam temp/` | — | stray scratch folder (one 1-byte file), safe to delete |

The placeholder pages say so on the page itself. They are already wired into
the catalog, so replacing the file in place when a build lands needs no catalog
edit.

## Ampler Launcher

`website/games/Ealgercraft/Ampler-Launcher/` is the
[Ampler Launcher](https://github.com/proton-arcade/AmplerLauncher) — a
Minecraft-themed launcher for [Eaglercraft](https://github.com/lax1dude/eaglercraft)
that runs entirely offline: plain HTML/CSS/JS, no build step, no installer, no
network access at runtime.

It is a **byte-for-byte copy** of the `main` branch of that repository, except
for two deliberate differences:

* the repo-level `.gitattributes` / `.gitignore` stay upstream (this arcade has
  its own, see [Repo notes](#repo-notes));
* `icon.png` next to `index.html` is the launcher's `website/images/logo.png`,
  added because the arcade catalog needs card art.

Everything else — the launcher page, the five Eaglercraft builds, the skins, the
optional LAN server and the offline test suites — is identical to upstream, so
this folder can be re-synced any time by copying upstream over it.

### Layout

```
index.html            the launcher page
README.md             upstream's own README (how the launcher works, in detail)
icon.png              catalog card art (arcade addition)
website/mc/<id>/      the bundled Eaglercraft builds, one HTML file each
website/js/           launcher code + the client and skin manifests
website/skins/        one folder per skin
website/server/       optional offline multiplayer server (EaglerXServer)
website/tools/        optional local server + the offline verification suites
website/start-offline.*  one-click local server (needs python3)
```

### Bundled builds

| Version | Folder |
|---|---|
| 1.12.2-u3 | `website/mc/1.12.2/` |
| 1.12.2-u3 WASM | `website/mc/1.12.2-wasm/` |
| 1.8.8-u53 | `website/mc/1.8.8/` |
| 1.8.8-u53 WASM-GC | `website/mc/1.8.8-wasm/` |
| 1.5.2-sp2.01 | `website/mc/1.5.2/` |

Singleplayer works with no server. The WASM builds want `SharedArrayBuffer`,
which needs the two isolation headers the launcher's own server sends:

```bash
cd website/games/Ealgercraft/Ampler-Launcher
./website/start-offline.sh        # or .bat / .command, then http://localhost:8080/
```

Skins are folders: add `website/skins/<name>/<name>.png`, and it appears on the
Skins page. Upstream's `README.md` explains all of this properly.

### Updating it from upstream

The launcher is developed in
[proton-arcade/AmplerLauncher](https://github.com/proton-arcade/AmplerLauncher),
and the builds this arcade serves live under
[`website/mc`](https://github.com/proton-arcade/AmplerLauncher/tree/main/website/mc).
To pull a new release in:

```bash
git clone --depth 1 https://github.com/proton-arcade/AmplerLauncher.git /tmp/ampler
cd website/games/Ealgercraft/Ampler-Launcher
tar -C /tmp/ampler --exclude=./.git --exclude=./.gitattributes --exclude=./.gitignore -cf - . | tar -xf -
cp website/images/logo.png icon.png
```

Upstream's `.gitattributes`/`.gitignore` are excluded on purpose: they apply at
*its* repository root, and this repo's own files already cover the vendored
paths — including the important rule below, which is what actually keeps the
game builds intact through git.

Adding a build is a two-step change upstream (drop
`website/mc/<id>/index.html`, add an entry to `website/js/clients.js`); the
version dropdown and the Play button follow that manifest automatically.

## Repo notes

**The bundled games are binary blobs.** A build such as the FNAF pages or
Ampler Launcher's `website/mc/<id>/index.html` is a single 15–60 MB file whose
payload legitimately contains CRLF byte pairs. Normalising line endings
corrupts the archive and the game fails to boot, with no warning at runtime.
`.gitattributes` therefore marks exactly those paths `-text -diff`, with the
rule deliberately ordered last so nothing overrides it. If you add another
build that ships as one self-contained file, add its path to that rule — a
blanket `website/games/**/index.html` would also swallow the small hand-written
pages in that folder.

**Nothing reaches the network at runtime.** The catalog, the icons, the fonts
(the launcher self-hosts Roboto) and the game builds are all local files. The
only optional network use in the whole repo is Ampler Launcher's
`website/server/fetch-server.sh`, which a human runs deliberately to fetch the
multiplayer server jar; it is not part of the site.

**Verify a change** by serving the repo (`python3 -m http.server 8000`) and
walking the home page, a collection and a game. Ampler Launcher also ships two
checkers, both run from its own folder:

```bash
node website/tools/verify-offline.mjs     # static + jsdom checks: no network, references resolve
node website/tools/browser-test.mjs       # real browser: file:// and http://, boots the builds
```

`browser-test.mjs` needs `puppeteer-core` (plus a Chromium, e.g.
`@sparticuz/chromium`); `verify-offline.mjs` needs `jsdom` for its DOM half and
skips that part without it. Neither is required to use the arcade — install them
into a scratch folder or with `--no-save`, they are not part of the site.

## Credits

Eaglercraft and EaglerXServer by lax1dude and contributors; the Ampler Launcher
UI and this arcade's game bundles come from
[proton-arcade](https://github.com/proton-arcade). Games remain the property of
their respective authors — this repository only serves them.
