# Exst Arcade

A static game arcade that runs on GitHub Pages (this repository is the
`proton-arcade.github.io` site, so `main` is what gets served). One home page
with a hero cover and collections, a Media tab for videos and music, one player
page per kind of thing (a full-screen frame for games, a video/audio player for
media), and every game and media file bundled in this repository — no build
step, no backend, no package manager.

Open it and press play. That is the whole product.

```
index.html              home (hero + collections + browse) and the Tools, Media, Search and prefs tabs
website/game.html       game player page (loads ?id=… in a full-screen frame)
website/media.html      media player page (loads ?id=… as a video, a track or a framed page)
website/data/*.js       the catalogs — plain text, edit by hand
website/games/          one folder per game
website/media/          videos/ and music/, one file per item
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

Three files, all plain text read by `website/assets/js/config-loader.js`:
`applications.js` (games and tools), `collections.js` (home-page rows) and
`media.js` (videos and music). None needs a rebuild — edit, reload, done.

`website/data/applications.js` — one `[application]` block per game or tool:

```
[application]
location=games
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
| `location` | `games` or `tools`; controls where the application appears (defaults to `games`) |
| `id` | the key used by `?id=` in the player page and by collections |
| `title` | card title, player title |
| `path` | the game page, relative to `website/` |
| `icon` | card/poster art, relative to `website/` (falls back to `assets/images/default-game.svg`) |
| `version` | small meta text on cards |
| `description` | card and details text |
| `tags` | comma-separated chips, also used by the genre browse rows |
| `hero` | `hero=true` puts the game in the home banner carousel |

`featured` and `badge` are legacy fields and are not used.

To add a tool, copy the template in `applications.js` and set `location=tools`.
Keep its actual `path` and `icon` relative to `website/`; moving an entry between
sections does not require moving its files. Tools appear in the Tools tab and
global search, but not the games spotlight or home rows. Collections are split
by each member’s location. Legacy `[game]`, `[folder]`, and `games=` syntax
is still accepted. Invalid locations and duplicate IDs produce catalog warnings.

`website/data/collections.js` — one `[collection]` block per home-page collection, whose
`applications=` value is a comma-separated list of game **ids** (not paths):

```
[collection]
available=true
id=Ealgercraft
title=Ealgercraft
applications=Ampler-Launcher
```

Set `available=false` to hide a collection without deleting its games.

### Adding a game

1. Drop the game in `website/games/<name>/` with an `index.html` (and an
   `icon.png` if you have one).
2. Add a `[application]` block to `website/data/applications.js`.
3. Add its `id` to a `[collection]` block in `website/data/collections.js` if it should
   sit in a collection.

The player page shows a "That application file is missing" panel with the exact path
it expected if step 1 and step 2 disagree.

## Media (videos and music)

The **Media** tab in the bottom bar is a page of its own: a back arrow, two
shelves (**Videos** and **Music**), and inside each shelf a search box, genre
chips, a sort menu and a posters/list browse switch. With nothing typed, a shelf
browses in rows — "All videos", then one row per genre, like the home page.
Typing searches the title, artist or channel, album, genre, year and
description, and every word has to match, so `proton chill` finds the artist and
the genre at once. Matching media also turn up on the **Search** tab in a
"Videos & music" row.

Clicking an item opens `website/media.html?id=…`: a video plays full-bleed in a
video tag, a track plays in a now-playing panel with its cover art, and an
`.html` path is framed. The page has a back arrow to the right shelf, fullscreen,
reload, a direct link, the item's details and a "more like this" row. The
`openMode` preference in **prefs** applies here too.

Adding media is the same job as adding a game: drop the file in
`website/media/videos/` or `website/media/music/`, then add one block to
`website/data/media.js`.

```
[media]
type=music
id=late-night-loop
title=Late Night Loop
artist=Exst Arcade
album=Demo Tapes
path=media/music/late-night-loop.mp3
icon=media/music/late-night-loop.svg
genre=Lo-fi, Chill
year=2026
duration=0:16
description=Mellow chords over a soft beat.
featured=true
```

| Field | Used for |
|---|---|
| `type` | `video` or `music`; which shelf it appears on. Optional — `[video]`, `[music]`, `[song]` and `[track]` block names set it, and a missing type is guessed from the extension |
| `id` | the key used by `website/media.html?id=…` |
| `title` | card title, player title |
| `artist` | artist (music) or channel (video); `channel=` is accepted as an alias |
| `album` | optional, music |
| `path` | the media file, relative to `website/` |
| `icon` | optional cover art or poster, relative to `website/`; falls back to `assets/images/default-music.svg` or `default-video.svg` |
| `genre` | comma-separated; drives the chips, the browse rows and search. `tags=` is merged into it |
| `year`, `duration` | optional text on cards and the player page |
| `description` | optional text on the player page |
| `featured` | `featured=true` puts the item on the Media landing page |
| `available` | `available=false` hides the entry without deleting it |

`type=` decides where an item is filed; the extension decides how it plays, so a
music video filed as `type=video` still plays in the video tag. Supported files
are `.mp4`/`.webm`/`.ogv`/`.mov` for video, `.mp3`/`.wav`/`.ogg`/`.m4a`/`.flac`/
`.opus`/`.aac` for audio, and `.html` for a framed page. `website/media/README.md`
covers the same ground, including the size limits GitHub puts on committed
video. Invalid types, duplicate IDs and missing files produce catalog warnings
on the page, and the player shows a "That media file is missing" panel with the
exact path it expected.

The five entries shipped in `data/media.js` — three short tracks and two short
clips — are generated placeholders so the Media tab is not empty on a fresh
clone. Overwrite a file in place to keep its catalog block, or delete the block
and the files to remove it.

## What is in here

| Path | Game | State |
|---|---|---|
| `website/games/Ealgercraft/Ampler-Launcher/` | Ampler Launcher (Minecraft via Eaglercraft) | full build, playable |
| `website/games/Five-nights-at-Freddys/` | FNAF 1–4 and Sister Location | full builds, playable |
| `website/games/Baldis-basics/` | Baldi's Basics | placeholder page, in the catalog |
| `website/games/Spacebar-clicker/` | Spacebar Clicker | placeholder page, in the catalog |
| `website/games/{Kart-bros,Football-bros,Retro-bowl,Pac-man,Geometry-Dash-Lite,Flappy-bird,Google-dino,Drift-boss,Backrooms,Bloxorz,Minesweeper}/` | Offline games pack | full builds, playable |
| `website/games/index.html` | test entry (`id=test`) | placeholder page, not in a collection |
| `website/games/gam temp/` | — | archived handoff file; not part of the site |
| `website/media/music/` | three demo tracks (mp3 + cover art) | generated placeholders, in the media catalog |
| `website/media/videos/` | two demo clips (mp4 + poster art) | generated placeholders, in the media catalog |

The placeholder pages say so on the page itself. They are already wired into
the catalog, so replacing the file in place when a build lands needs no catalog
edit. Spacebar Clicker and Baldi's Basics each have their own card art; neither
uses the generic fallback tile.

## Ampler Launcher

`website/games/Ealgercraft/Ampler-Launcher/` is the
[Ampler Launcher](https://github.com/proton-arcade/AmplerLauncher) — a
Minecraft-themed launcher for [Eaglercraft](https://github.com/lax1dude/eaglercraft)
that runs entirely offline: plain HTML/CSS/JS, no build step, no installer, no
network access at runtime.

It is vendored from the `main` branch of that repository. Most upstream files
are kept byte-for-byte; the intentional arcade-specific additions and fixes
are:

* the repository-level `.gitattributes` / `.gitignore` live at this repo's
  root, not inside the vendor folder;
* `icon.png` next to `index.html` uses the launcher's `website/images/logo.png`
  as arcade card art;
* `website/images/m-logo1.png` and `m-logo2.png` are true PNGs, re-encoded
  pixel-identically because the upstream files contained WebP bytes with a
  `.png` extension;
* two single-file builds from
  [Offline-HTML-Games-Pack](https://github.com/CoolDude2349/Offline-HTML-Games-Pack)
  are added to the version list: Beta 1.3 and Alpha 1.2.6. Each source file's
  injected Cloudflare Web Analytics script was removed; it is not part of the
  game and would otherwise make an off-site request;
* `website/skins/list.js` is baked for plain static hosts such as GitHub Pages,
  and `website/tools/verify-offline.mjs` has a declaration-order fix for its
  baked-skins check.

`website/tools/check-images.mjs` audits the card and launcher images, catalog
paths, and committed artwork. The upstream launcher page, five original
Eaglercraft builds, skins and optional LAN server remain in place. Re-syncing
from upstream should therefore be followed by the image and offline audits.

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
| Beta 1.3 | `website/mc/Beta-1.3/` |
| Alpha 1.2.6 | `website/mc/Alpha-1.2.6/` |

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

## Offline games pack

`website/games/` also carries eleven standalone builds from the
[Offline-HTML-Games-Pack](https://github.com/CoolDude2349/Offline-HTML-Games-Pack):
Kart Bros, Football Bros, Retro Bowl, Pac-Man, Geometry Dash Lite, Flappy Bird,
Google Dino, Drift Boss, Backrooms, Bloxorz and Minesweeper. Each is one
self-contained HTML file in its own folder, so a game is one file plus its card
art — no extra assets to chase.

They are vendored from that pack's `offline/` folder and each file is kept byte
for byte apart from a short, explicit list of edits. The pack wraps its files
for an ad-supported site, so the arcade strips what would phone home and points
the broken externals at local files:

| Game | Edits on top of the offline guard |
|---|---|
| Kart Bros | removed the AdinPlay ad snippet, the Google Tag Manager container and loader, the GA/gtag config, the MSN/MS-Start loader and the `recordsession.php` session tracker (`SendEvent`/`GA4_SendEvent` stay as inert helpers). Also removed the `TemplateData/sw.js` service-worker registration, which only ever 404s |
| Football Bros | the same ad, analytics and `recordsession.php` removals as Kart Bros |
| Drift Boss | removed the GA stub, re-pointed the engine's sound paths from a dead `editmysite.com` host to local `media/audio/…` paths (the audio itself is already inline), and guarded a Google Gadgets relay call that used to throw |
| Google Dino | dropped the remote `google.com/jsapi` script tag and guarded the `parent.maeExportApis_()` call that threw outside its original portal |
| Geometry Dash Lite | removed the `<base href="https://ixl.com/">` that pointed relative URLs at another site |
| Pac-Man, Flappy Bird | removed the TurboWarp cloud-variable WebSocket provider |
| Backrooms, Bloxorz, Retro Bowl, Minesweeper | vendored unchanged apart from the offline guard |

Every one of the eleven additionally gets the same **offline guard** near the
top of the page: a short script that drops any request which would leave the
arcade's own origin (http/https/ws/wss to another host) while letting local
files, `blob:` URLs and `data:` URLs through untouched. That is what keeps the
builds honest with the "nothing reaches the network at runtime" rule below —
Unity analytics beacons, TurboWarp cloud variables, the football game's server
pings and Firebase sign-in are inert rather than merely failing. None of this
touches the game payload itself: engine code inside each build is unmodified,
and the guard is the only thing added to four of the eleven files.

Features that genuinely need the internet are unavailable offline, and say so
on screen: online multiplayer in Kart Bros and Football Bros, Google sign-in in
Football Bros, and cloud-variable leaderboards in the TurboWarp builds. Local
saves (Retro Bowl, Minesweeper, Football Bros) continue to work in the browser.
Card art for these eleven is a screenshot of each game's own title screen,
captured at the catalog's 1272×787.

A couple of the builds also probe files that the single-file exports never
shipped — Retro Bowl asks for `/js/all.js` and `html/settings/js/index.js` at
the server root, Backrooms asks for a relative `ee`. Those are upstream
behaviour, they stay inside this origin and 404 harmlessly, and they do not
affect play.

## Repo notes

**The bundled games are binary blobs.** A build such as the FNAF pages or
Ampler Launcher's `website/mc/<id>/index.html` is a single 15–60 MB file whose
payload legitimately contains CRLF byte pairs. Normalising line endings
corrupts the archive and the game fails to boot, with no warning at runtime.
`.gitattributes` therefore marks exactly those builds `-text -diff`, with the
rule deliberately ordered last so nothing overrides it. The short `README.md`
provenance notes beside the two added builds have a later text/diffable rule.
If you add another build that ships as one self-contained file, add its path to
the binary rule — a blanket `website/games/**/index.html` would also swallow
the small hand-written pages in that folder. Media needs no rule of its own:
the video and audio extensions (`.mp4`, `.webm`, `.mp3`, `.wav` and the rest)
are marked binary by extension, so a new track or clip is safe as soon as it
lands in `website/media/`.

**Nothing reaches the network at runtime.** The catalogs, the icons, the fonts
(the launcher self-hosts Roboto), the game builds and the media library are all
local files. The
only optional network use in the whole repo is Ampler Launcher's
`website/server/fetch-server.sh`, which a human runs deliberately to fetch the
multiplayer server jar; it is not part of the site. The eleven Offline games
pack builds carry the same rule with their own offline guard — see above.

**Verify a change** by serving the repo (`python3 -m http.server 8000`) and
walking the home page, a collection, a game, the Media tab and a video or
track. The repo also has a
zero-dependency image/catalog audit; run it from the repo root, then run the
launcher checks from the vendored launcher folder:

```bash
node website/tools/check-images.mjs
cd website/games/Ealgercraft/Ampler-Launcher
node website/tools/verify-offline.mjs     # static + jsdom checks: no network, references resolve
node website/tools/browser-test.mjs       # real browser: file:// and http://, boots the builds
```

`browser-test.mjs` needs `puppeteer-core` (plus a Chromium, e.g.
`@sparticuz/chromium`); `verify-offline.mjs` needs `jsdom` for its DOM half and
skips that part without it. Neither is required to use the arcade — install them
into a scratch folder or with `--no-save`, they are not part of the site.

## Credits

Eaglercraft and EaglerXServer by lax1dude and contributors; the Ampler Launcher
UI and original game bundles come from
[proton-arcade](https://github.com/proton-arcade). The Beta 1.3 and Alpha 1.2.6
builds, and all eleven games in the Offline games pack, are sourced from
[CoolDude2349/Offline-HTML-Games-Pack](https://github.com/CoolDude2349/Offline-HTML-Games-Pack).
The arcade card illustrations are original artwork; the pack games' card art is
a screenshot of each game's own title screen. Games remain the property of
their respective authors — this repository only serves them.

### Catalog validation

Run `node website/tools/check-catalog.mjs` to check locations, legacy syntax,
validation warnings, catalog paths, media types and paths, and page asset
references. Run `node website/tools/check-images.mjs` to audit catalog images
(games and media) and file signatures.

`check-catalog.mjs` currently fails on one pre-existing item: `index.html`,
`website/game.html` and `website/media.html` all reference a `favicon.ico` that
is not committed. The media checks print their own `PASS` lines before that
point, so they can be read separately.
