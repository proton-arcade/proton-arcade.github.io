/* Media library: the Media tab, its Videos / Music pages, and media results on
 * the Search page. Everything is driven by data/media.js — no code edits needed
 * to add a video or a track.
 *
 * Cards use the canonical .game-card shape from flix.css. The library page is
 * split into #mediaBrowse (genre rows) and #mediaGrid (search-grid), mirroring
 * the #toolsCollections + #toolsGrid split on the Tools page. */
(function () {
  const media = window.EXST_MEDIA || [];
  const byType = {
    video: media.filter((item) => item.type === 'video'),
    music: media.filter((item) => item.type === 'music'),
  };
  const LABELS = {
    video: { page: 'Videos', one: 'video', many: 'videos', none: 'No videos yet' },
    music: { page: 'Music', one: 'track', many: 'tracks', none: 'No music yet' },
  };
  const fallbackArt = {
    video: 'assets/images/default-video.svg',
    music: 'assets/images/default-music.svg',
  };

  function count(items, type) {
    const label = LABELS[type];
    return `${items.length} ${items.length === 1 ? label.one : label.many}`;
  }
  function playerUrl(item) {
    return `website/media.html?id=${encodeURIComponent(item.id)}`;
  }

  /* ---------- Cards and rows ---------- */

  function makeCard(item, href = playerUrl(item)) {
    const link = document.createElement('a');
    link.className = 'game-card';
    link.href = href;
    link.dataset.media = item.id;
    link.title = [item.artist, item.genre, item.duration].filter(Boolean).join(' · ');
    const image = document.createElement('img');
    image.src = `website/${item.icon || fallbackArt[item.type]}`;
    image.alt = '';
    image.onerror = () => { image.onerror = null; image.src = `website/${fallbackArt[item.type]}`; };
    const title = document.createElement('span');
    title.textContent = item.title;
    link.append(image, title);
    return link;
  }

  function makeRow(heading, items) {
    const section = document.createElement('section');
    section.className = 'flix-row';
    const title = document.createElement('h2');
    title.textContent = heading;
    const cards = document.createElement('div');
    cards.className = 'row-posters';
    items.forEach((item) => cards.append(makeCard(item)));
    section.append(title, cards);
    return section;
  }

  /* ---------- Media landing page (#media) ---------- */

  const featured = document.getElementById('mediaFeatured');
  if (featured) {
    ['video', 'music'].forEach((type) => {
      const items = byType[type];
      if (!items.length) return;
      const picks = items.filter((item) => item.featured === 'true');
      featured.append(makeRow(picks.length ? `Featured ${LABELS[type].page.toLowerCase()}` : LABELS[type].page, picks.length ? picks : items));
    });
    featured.hidden = !featured.childElementCount;
  }
  const mediaCount = document.getElementById('mediaCount');
  if (mediaCount) {
    mediaCount.textContent = media.length
      ? `${count(byType.video, 'video')} · ${count(byType.music, 'music')}`
      : 'Nothing in the media library yet';
  }
  const videoTile = document.getElementById('videoTileCount');
  const musicTile = document.getElementById('musicTileCount');
  if (videoTile) videoTile.textContent = count(byType.video, 'video');
  if (musicTile) musicTile.textContent = count(byType.music, 'music');
  const mediaEmpty = document.getElementById('mediaEmpty');
  if (mediaEmpty) mediaEmpty.hidden = media.length > 0;

  /* ---------- Videos / Music library page (#media/videos, #media/music) ---------- */

  const browse = document.getElementById('mediaBrowse');
  const grid = document.getElementById('mediaGrid');
  const searchInput = document.getElementById('mediaSearch');
  const genreRow = document.getElementById('mediaGenres');
  const sortSelect = document.getElementById('mediaSort');
  const libraryEmpty = document.getElementById('libraryEmpty');
  const libraryNone = document.getElementById('libraryNone');
  let type = 'video';
  let genre = '';

  function haystack(item) {
    return [item.title, item.artist, item.album, item.genre, item.year, item.duration, item.description, item.id]
      .filter(Boolean).join(' ').toLowerCase();
  }
  function matchesQuery(item, query) {
    if (!query) return true;
    const text = haystack(item);
    // Every word has to appear somewhere, so "proton chill" finds the artist and the genre.
    return query.split(/\s+/).filter(Boolean).every((word) => text.includes(word));
  }
  function sortItems(items) {
    const mode = sortSelect ? sortSelect.value : 'az';
    const sorted = [...items];
    if (mode === 'za') sorted.sort((a, b) => b.title.localeCompare(a.title));
    else if (mode === 'artist') sorted.sort((a, b) => (a.artist || '~').localeCompare(b.artist || '~') || a.title.localeCompare(b.title));
    else if (mode === 'added') sorted.reverse(); // catalog order is the order things were added
    else sorted.sort((a, b) => a.title.localeCompare(b.title));
    return sorted;
  }
  function renderGenres(items) {
    if (!genreRow) return;
    const genres = new Map();
    items.forEach((item) => item.genres.forEach((name) => {
      genres.set(name, (genres.get(name) || 0) + 1);
    }));
    genreRow.hidden = genres.size === 0;
    if (!genres.size) return;
    if (genre && !genres.has(genre)) genre = '';
    const chips = [];
    const all = document.createElement('button');
    all.type = 'button';
    all.className = `chip${genre ? '' : ' active'}`;
    all.dataset.genre = '';
    all.textContent = `All ${items.length}`;
    all.addEventListener('click', () => { genre = ''; renderLibrary(); });
    chips.push(all);
    [...genres.entries()].sort((a, b) => a[0].localeCompare(b[0])).forEach(([name, total]) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = `chip${genre === name ? ' active' : ''}`;
      chip.dataset.genre = name;
      chip.textContent = `${name} ${total}`;
      chip.setAttribute('aria-pressed', String(genre === name));
      chip.addEventListener('click', () => { genre = genre === name ? '' : name; renderLibrary(); });
      chips.push(chip);
    });
    // Rebuilding the chips would drop keyboard focus, so hand it back.
    const focused = genreRow.contains(document.activeElement) ? document.activeElement.dataset.genre : null;
    genreRow.replaceChildren(...chips);
    if (focused !== null) [...genreRow.children].find((chip) => chip.dataset.genre === focused)?.focus();
  }
  function renderLibrary() {
    if (!browse || !grid) return;
    const label = LABELS[type];
    const items = byType[type];
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const filtered = sortItems(items.filter((item) => matchesQuery(item, query) && (!genre || item.genres.includes(genre))));

    const title = document.getElementById('libraryTitle');
    if (title) title.textContent = label.page;
    const heading = document.getElementById('libraryCount');
    if (heading) {
      heading.textContent = query || genre
        ? `${filtered.length} of ${items.length} ${label.many}${genre ? ` in ${genre}` : ''}`
        : count(items, type);
    }
    const noneMessage = document.getElementById('libraryNoneTitle');
    if (noneMessage) noneMessage.textContent = label.none;
    if (libraryNone) libraryNone.hidden = items.length > 0;
    renderGenres(items);
    browse.replaceChildren();
    grid.replaceChildren();

    if (!items.length) {
      browse.hidden = true;
      grid.hidden = true;
      if (libraryEmpty) libraryEmpty.hidden = true;
      return;
    }
    // Nothing typed and no genre picked: browse, grouped by genre like the home rows.
    if (!query && !genre) {
      browse.hidden = false;
      grid.hidden = true;
      if (libraryEmpty) libraryEmpty.hidden = true;
      browse.append(makeRow(`All ${label.page.toLowerCase()}`, filtered));
      const groups = new Map();
      items.forEach((item) => item.genres.forEach((name) => {
        if (!groups.has(name)) groups.set(name, []);
        groups.get(name).push(item);
      }));
      [...groups.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
        .forEach(([name, group]) => browse.append(makeRow(name, sortItems(group))));
      return;
    }
    browse.hidden = true;
    grid.hidden = false;
    filtered.forEach((item) => grid.append(makeCard(item)));
    if (libraryEmpty) libraryEmpty.hidden = filtered.length > 0;
  }

  function showLibrary(next) {
    if (next !== type) {
      type = next;
      genre = '';
      if (searchInput) searchInput.value = '';
      window.scrollTo({ top: 0 });
    }
    renderLibrary();
  }

  if (searchInput) {
    searchInput.addEventListener('input', renderLibrary);
    // "/" focuses the search box, like the rest of the arcade's keyboard shortcuts.
    document.addEventListener('keydown', (event) => {
      const page = document.getElementById('page-media-library');
      if (!page || page.hidden || event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
      const typing = /^(input|textarea|select)$/i.test(document.activeElement?.tagName || '');
      if (typing) return;
      event.preventDefault();
      searchInput.focus();
    });
  }
  if (sortSelect) sortSelect.addEventListener('change', renderLibrary);
  document.getElementById('libraryReset')?.addEventListener('click', () => {
    if (searchInput) searchInput.value = '';
    genre = '';
    renderLibrary();
    searchInput?.focus();
  });

  // flix.js owns page visibility and tells us which media page is showing.
  function applyHash() {
    const [section, sub] = (location.hash.slice(1) || '').toLowerCase().split('/');
    if (section !== 'media') return;
    if (sub === 'music') showLibrary('music');
    else if (sub === 'videos') showLibrary('video');
  }
  document.addEventListener('exst:page', applyHash);
  applyHash();

  /* ---------- Opening a media item ---------- */

  document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-media]');
    if (!target) return;
    const item = media.find((entry) => entry.id === target.dataset.media);
    if (!item) return;
    const mode = (() => { try { return localStorage.getItem('openMode') || 'page'; } catch (_) { return 'page'; } })();
    if (mode === 'page') return; // the card's own href already points at the player page
    event.preventDefault();
    const url = mode === 'same' ? `website/${item.path}` : playerUrl(item);
    if (mode === 'same') location.href = url;
    else window.open(url, '_blank', 'noopener');
  });

  // The player page builds its "more like this" row with the same cards.
  window.exstMediaCard = makeCard;

  /* ---------- Media results on the Search page ---------- */

  window.exstSearchMedia = function searchMedia(query) {
    const container = document.getElementById('searchMedia');
    if (!container) return 0;
    const matches = sortItems(media.filter((item) => matchesQuery(item, (query || '').trim().toLowerCase())));
    container.replaceChildren();
    if (!matches.length) return 0;
    container.append(makeRow('Videos & music', matches));
    return matches.length;
  };
  // flix.js rendered the search page before this hook existed; run it once more.
  window.exstRenderSearch?.();
})();