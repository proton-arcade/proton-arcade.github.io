# Games library

Games for the arcade's home page — the hero banner, the browse rows and the
collections. Adding a game is the same job as adding a media item: drop a
folder here, add one block to the catalog, reload. No build step, no backend,
nothing leaves this origin.

```
website/data/applications.js   the catalog — plain text, edit by hand
website/data/collections.js    home-page rows, one [collection] block per row
website/games/<name>/          one folder per game, index.html inside
website/game.html              the player page (?id=… from the catalog)
```

## Adding a game

1. Drop the game in `website/games/<name>/` with an `index.html` entry point
   (and an `icon.png` beside it if you have card art).
2. Add an `[application]` block with `location=games` to
   `website/data/applications.js`:

   ```
   [application]
   location=games
   id=my-game
   title=My Game
   path=games/my-game/index.html
   icon=games/my-game/icon.png
   version=Version 1.0
   description=A short pitch, shown on the card.
   tags=Arcade, Skill, Keyboard required
   hero=false
   ```

3. Reload. The game is in the Games row on the home page, in a row for each
   of its tags, and in search.
4. Optional: add its `id` to a `[collection]` block in
   `website/data/collections.js` to give it a home-page row of its own.

`path=` and `icon=` are relative to `website/`, exactly like the media
catalog. There is nothing else to wire up. A folder in here is not a game
until it has a catalog block — files alone never show up.

| Field | Used for |
|---|---|
| `location` | `games` or `tools` — which section the application appears in. Optional: a missing location defaults to `games` |
| `id` | the key used by `website/game.html?id=…` and by collections; must be unique |
| `title` | card title, player title |
| `path` | the game page, relative to `website/` |
| `icon` | optional card/poster art, relative to `website/`; falls back to `assets/images/default-game.svg` |
| `version` | optional small meta text on cards and the player page |
| `description` | optional card and details text |
| `tags` | comma-separated chips; each tag also becomes a browse row on the home page and is searchable |
| `hero` | `hero=true` puts the game in the home banner carousel |

`featured` and `badge` are legacy fields and are not used. The legacy
`[game]` block name is still accepted. An invalid `location` or a duplicate
`id` produces a catalog warning on the page.

## Where things show up

* **Home** banner carousel → games with `hero=true`.
* **Home** rows → a "Games" row with every game, one row per tag, and one row
  per collection that lists the game.
* **Search** (bottom bar) → matching games; videos and music appear in a
  separate "Videos & music" row.
* **website/game.html?id=…** → the player, with a back arrow to the home page,
  fullscreen, reload, and a direct link.

The `openMode` preference in **prefs** applies to games too: open in the
player (default), replace this tab with the game file itself, or open it in a
new tab.

## Keeping a game offline

Games run as plain local files; nothing reaches the network at runtime. If
you vendor a build that phones home — ad snippets, analytics, cloud saves —
strip those requests before committing, or add the same short **offline
guard** the twelve Offline games pack builds carry near the top of their
page: a script that drops any request which would leave the arcade's own
origin while letting local files, `blob:` URLs and `data:` URLs through.

## File sizes and binary builds

GitHub rejects single files over 100 MB, warns above 50 MB, and keeps every
version of a file in history forever — a big build is a permanent weight on
the repository, not just on the download. Some games legitimately are one
big self-contained `.html` file (Granny's is 58 MB, almost all of it an
embedded zip). Those builds must be listed in the `-text -diff` binary rule at
the bottom of the root `.gitattributes`: a line-ending normalisation corrupts
the embedded payload and the game fails to boot with no warning at runtime.
The rule lists paths one by one on purpose — a blanket
`website/games/**/index.html` would also swallow the small hand-written pages
in this folder — so add a line for any new build you ship that way.

## What is already here

Most folders are complete, playable builds already wired into the catalog:
the five FNAF games, Ampler Launcher (the `Ealgercraft/` folder, a vendored
project with its own README), and the twelve Offline games pack builds — Kart
Bros, Football Bros, Retro Bowl, Pac-Man, Geometry Dash Lite, Flappy Bird,
Google Dino, Drift Boss, Backrooms, Bloxorz, Minesweeper and Granny.

Two entries are placeholder pages — Baldi's Basics and Spacebar Clicker say
so on the page itself. They are already in the catalog, so replacing the
file in place when a real build lands needs no catalog edit.

`gam temp/` is an archived handoff file, not part of the site. If the
catalog and a folder disagree, the player shows a "That application file is
missing" panel with the exact expected path.
