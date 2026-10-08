# Tools library

Utility pages for the arcade's **Tools** tab. Adding a tool is the same job as
adding a game: drop a folder here, add one block to the catalog, reload. No
build step, no backend, nothing leaves this origin.

```
website/data/applications.js   the catalog — plain text, edit by hand
website/data/collections.js    rows on the Tools tab, one [collection] block per row
website/tools/<name>/          one folder per tool, index.html inside
website/tool.html              the tool player page (?id=… from the catalog)
check-catalog.mjs              repo audit of the catalogs and page assets — not part of the site
check-images.mjs               repo audit of the card art — not part of the site
```

## Adding a tool

1. Drop the tool in `website/tools/<name>/` with an `index.html` entry point
   (and an `icon.png` beside it if you have card art). Tool pages live two
   levels below `website/`, so shared assets are reached as `../../assets/…` —
   `Test-Tool/index.html` shows the pattern.
2. Add an `[application]` block with `location=tools` to
   `website/data/applications.js`:

   ```
   [application]
   location=tools
   id=my-tool
   title=My Tool
   path=tools/my-tool/index.html
   icon=tools/my-tool/icon.png
   version=Version 1.0
   description=What it does, shown on the card.
   tags=Utility, Demo
   ```

3. Reload. The tool is in the Tools tab and in search.
4. Optional: add its `id` to a `[collection]` block in
   `website/data/collections.js` — collections whose members are tools appear
   as rows on the Tools tab.

`path=` and `icon=` are relative to `website/`, exactly like the games and
media catalogs. Moving an entry between sections is a one-line edit: change
`location=` and leave the files where they are.

| Field | Used for |
|---|---|
| `location` | `games` or `tools` — which section the application appears in |
| `id` | the key used by `website/tool.html?id=…` and by collections; must be unique |
| `title` | card title, player title |
| `path` | the tool page, relative to `website/` |
| `icon` | optional card art, relative to `website/`; falls back to `assets/images/default-game.svg` |
| `version` | optional small meta text on cards and the player page |
| `description` | optional card and details text |
| `tags` | comma-separated chips, searchable |
| `hero` | games only — tools never appear in the home banner or the home rows |

`featured` and `badge` are legacy fields and are not used. The legacy
`[game]` block name is still accepted. An invalid `location` or a duplicate
`id` produces a catalog warning on the page.

## Where things show up

* **Tools** (bottom bar) → a grid of every tool, plus one row per collection
  whose members are tools.
* **Search** (bottom bar) → matching tools, next to the games.
* **website/tool.html?id=…** → the tool player, with a back arrow to the
  Tools tab, fullscreen, reload, and a direct link.

The `openMode` preference in **prefs** applies to tools too: open in the
player (default), replace this tab with the tool file itself, or open it in
a new tab.

## The demo entry

`Test-Tool/` is a demo page that reads out the browser, the screen and the
page context. It is a starting point, not a catalog entry — nothing in
`data/applications.js` points at it yet. Copy the folder for your own tool,
or add a block with `location=tools` and `id=Test-Tool` to put it on the
Tools tab.

## The check scripts

`check-catalog.mjs` and `check-images.mjs` are dependency-free Node audits of
the catalogs, the page assets and the card art. They are repository
maintenance, not part of the site — no page loads them — and run from the
repo root:

```bash
node website/tools/check-catalog.mjs
node website/tools/check-images.mjs
```

## File sizes

GitHub rejects single files over 100 MB, warns above 50 MB, and keeps every
version of a file in history forever. Keep a tool small; if it has to ship
as one big self-contained file, list it in the `-text -diff` binary rule in
the root `.gitattributes` the same way the bundled game builds are (see
`website/games/README.md`).
