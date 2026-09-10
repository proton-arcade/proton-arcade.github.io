# ROM Arcade

A retro-gaming website built on the **EmulatorJS v4.2.3** archive
(`https://github.com/EmulatorJS/EmulatorJS/archive/refs/tags/v4.2.3.zip`),
themed after romsgames.net.

## Run it

```bash
python3 serve.py            # http://localhost:8080
```

Options:

| Flag | What it does |
|------|--------------|
| `--port N` | listen port (default 8080) |
| `--coop-coep` | send COOP/COEP headers → enables threaded cores (PSP, DOS) |
| `--key SECRET` | require `X-Arcade-Key: SECRET` for the mutating API calls |

The site also works on any static host — ROM add/remove then falls back to
browser storage (IndexedDB) instead of the JSON API.

## Pages

| Page | Purpose |
|------|---------|
| `index.html` | Home screen — console sections, game library, “Add Your Own ROMs” |
| `search.html` | Search games **and** consoles by name |
| `console.html?system=nes` | One section per console (NES, SNES, …) |
| `play.html?src=base&file=Game.nes` | EmulatorJS player |
| `staff.html` | **Secret** owner sign-in + kill switch (not linked anywhere; the version text in the footer also opens it) |

## Kill switch

`staff.html` → sign in → flip the switch. Every page except `staff.html`
shows an “Arcade Offline” screen. With `serve.py` running the state is global
(`.arcade-state.json`); on a static host it’s per-browser (localStorage).

Default password: `retro-kill-9F42` — **change it on the staff page**.

## Adding / removing ROMs

No `roms.json` editing required:

- Drag & drop ROMs onto any dropzone, or use the ✕ on a game card to remove it.
- With `serve.py` running, files land in `roms/` and the manifest updates automatically
  (`POST /api/upload`, `POST /api/remove`, `POST /api/kill`, `GET /api/health`).
- Base library entries: `roms/roms.json` (plain JSON array of
  `{"file","name","size","core"}`).

## Cores

21 popular cores are bundled in `data/cores/` (NES, SNES, N64, GB, GBA, NDS,
Genesis/Master System/Game Gear, PSX, Atari 2600/5200/7800, TurboGrafx-16,
Neo Geo Pocket, WonderSwan, ColecoVision, Arcade FBNeo + MAME, 3DO, Jaguar,
Saturn). Any other system falls back to the official EmulatorJS CDN
automatically (built-in failsafe of EmulatorJS 4.2.3).

## Legal

Bring your own ROMs. No commercial ROMs are included. Only add games you
legally own or that are freely distributed (the bundled `Nestest (Homebrew).nes`
is a public-domain test ROM).
