/*
Collection catalog. Add one [collection] block per collection:

[collection]
available=true
id=collection-id
title=Collection title
applications=application-id,another-application-id

The applications value uses IDs from data/applications.js, not file paths.
Members with location=games appear on Home; location=tools members appear in Tools.
*/
window.EXST_COLLECTIONS_TEXT = `
[collection]
available=true
id=Ealgercraft
title=Ealgercraft
applications=Ampler-Launcher

[collection]
available=true
id=FNAFS
title=FNAF games
applications=FNAF-1, FNAF-2, FNAF-3, FNAF-4, FNAF-SL

[collection]
available=true
id=Offline-games-pack
title=Offline games pack
applications=kart-bros, retro-bowl, football-bros, pac-man, geometry-dash-lite, flappy-bird, drift-boss, backrooms, bloxorz, minesweeper, google-dino, granny
`;
