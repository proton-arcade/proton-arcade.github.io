/*
Media catalog — copy the template below for each video or track.
Set type=video or type=music (no parentheses).
Paths and icons are relative to website/; type does not change the path.
Missing type is guessed from the file extension (.mp3/.wav/… = music).
featured=true puts an item on the Media landing page.
available=false hides an item without deleting it.
Supported video formats: .mp4, .webm, .mkv (MKV via mpegts.js; needs one
online load to cache the library, then works offline).
Supported audio formats: .mp3, .wav, .ogg, .opus, .m4a, .aac, .flac.

Template:
[media]
type=music
id=
title=
artist=
album=
path=
icon=
genre=
year=
duration=
description=
featured=
*/

window.EXST_MEDIA_TEXT = `

[media]
type=music
id=arcade-warmup
title=Arcade Warmup
artist=Exst Arcade
album=Demo Tapes
path=media/music/arcade-warmup.mp3
icon=media/music/arcade-warmup.svg
genre=Chiptune, Upbeat
year=2026
duration=0:12
description=A short square-wave warmup loop. Demo track — replace the file, or copy this block for your own.
featured=true

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
description=Mellow chords over a soft beat. Demo track — swap the mp3 for your own and keep the block.
featured=true

[media]
type=music
id=sunrise-drive
title=Sunrise Drive
artist=Proton
album=Demo Tapes
path=media/music/sunrise-drive.mp3
icon=media/music/sunrise-drive.svg
genre=Synthwave, Chill
year=2026
duration=0:14
description=A second demo artist, so searching by name has something to find.
featured=false

[media]
type=video
id=neon-loop
title=Neon Loop
artist=Exst Arcade
path=media/videos/neon-loop.mp4
icon=media/videos/neon-loop.svg
genre=Motion, Loop
year=2026
duration=0:10
description=Silent animated gradient. Demo clip — point path= at your own .mp4, .webm or .mkv to replace it.
featured=true

[media]
type=video
id=test-pattern
title=Test Pattern
artist=Exst Arcade
path=media/videos/test-pattern.mp4
icon=media/videos/test-pattern.svg
genre=Demo, Loop
year=2026
duration=0:08
description=Picture and tone, for checking that video playback works. Demo clip.
featured=false

# DEMO MEDIA: the five entries above are generated placeholders so the Media
# tab is not empty on a fresh clone. Delete a block (and its files under
# website/media/) to remove it, or overwrite the file in place to keep the
# catalog entry.

`;
