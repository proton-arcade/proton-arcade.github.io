# Media library

Videos and music for the arcade's **Media** tab. Adding a track or a clip is the
same job as adding a game: drop the file in a folder here, add one block to the
catalog, reload. No build step, no backend, nothing leaves this origin.

```
website/data/media.js   the catalog — plain text, edit by hand
website/media/videos/   one file per video, plus optional poster art
website/media/music/    one file per track, plus optional cover art
website/media.html      the player page (?id=… from the catalog)
```

## Adding a video or a track

1. Put the file in `website/media/videos/` or `website/media/music/`
   (`.mp4`/`.webm` for video, `.mp3`/`.wav`/`.ogg`/`.m4a`/`.flac`/`.opus` for
   audio, or a self-contained `.html` page for either).
2. Add a `[media]` block to `website/data/media.js`:

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

3. Reload. It is on the Media page, in its Videos or Music shelf, in the genre
   rows, and in search.

`path=` and `icon=` are relative to `website/`, exactly like the application
catalog. There is nothing else to wire up.

| Field | Used for |
|---|---|
| `type` | `video` or `music` — which shelf it appears on. Optional: `[video]`, `[music]`, `[song]` and `[track]` block names set it, and a missing type is guessed from the file extension |
| `id` | the key used by `website/media.html?id=…`; must be unique |
| `title` | card title, player title |
| `artist` | artist (music) or channel (video); `channel=` is accepted as an alias |
| `album` | optional, music |
| `path` | the media file, relative to `website/` |
| `icon` | optional cover art or poster, relative to `website/`; falls back to `assets/images/default-music.svg` or `default-video.svg` |
| `genre` | comma-separated; drives the genre chips, the browse rows and search. `tags=` is merged into it |
| `year`, `duration` | optional text shown on cards and the player page |
| `description` | optional text on the player page |
| `featured` | `featured=true` puts it on the Media landing page |
| `available` | `available=false` hides the entry without deleting it |

`type=` decides where an item is filed; the file extension decides how it plays.
So a music video filed as `type=video` still plays in the video tag, and an
`.html` path is framed in both shelves.

## Where things show up

* **Media** (bottom bar) → landing page with the Videos and Music tiles and the
  featured rows.
* **Videos** / **Music** → search by name, artist or genre; genre chips; sort;
  browse as posters or as a list. With nothing typed, the page browses by genre
  in rows, like the home page.
* **Search** (bottom bar) → matching media appear in a "Videos & music" row
  under the games and tools.
* **website/media.html?id=…** → the player, with a back arrow that returns to
  the right shelf, fullscreen, reload, a direct link, the item's details and a
  "more like this" row.

The `openMode` preference in **prefs** applies to media too: open in the player
(default), replace this tab with the file itself, or open in a new tab.

## File sizes

GitHub rejects single files over 100 MB, warns above 50 MB, and keeps every
version of a file in history forever — so a big video is a permanent weight on
the repository, not just on the download. Keep clips small (short, 720p or
below, a modest bitrate), or host the heavy files elsewhere and point
`path=` at a small local `.html` page that plays them. `.gitattributes` already
marks the media extensions binary so git never touches their line endings.

## The demo entries

The five entries shipped in `data/media.js` — three short tracks in `music/` and
two short clips in `videos/` — are generated placeholders, here so the Media tab
is not empty on a fresh clone. Overwrite a file in place to keep its catalog
block, or delete the block and the files to remove it. The player shows a
"That media file is missing" panel with the exact expected path if the catalog
and the folder disagree, and a "This browser cannot play that file" panel if the
format is unsupported.
