(function () {
  const catalog = window.EXST_APPLICATIONS || [];
  const games = catalog.filter((app) => app.location === 'games');
  const tools = catalog.filter((app) => app.location === 'tools');
  function readPreference(key, fallback) {
    try { return localStorage.getItem(key) || fallback; } catch (_) { return fallback; }
  }
  const rows = document.getElementById('rows');
  const grid = document.getElementById('searchGrid');
  const storageKey = 'exstHomeSections';
  let settings = {};
  try { settings = JSON.parse(readPreference(storageKey, '{}')); } catch (_) { settings = {}; }
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) settings = {};

  function makeCard(game) {
    const link = document.createElement('a');
    link.className = 'game-card';
    link.href = '#detailsPage';
    link.dataset.details = game.id;
    const image = document.createElement('img');
    image.src = `website/${game.icon || 'assets/images/default-game.svg'}`;
    image.alt = '';
    image.onerror = () => { image.onerror = null; image.src = 'website/assets/images/default-game.svg'; };
    const title = document.createElement('span');
    title.textContent = game.title;
    link.append(image, title);
    return link;
  }

  function renderSections() {
    rows.replaceChildren();
    const groups = new Map();
    // Always include an "All Games" group so that every game appears
    // in the main Games section regardless of whether it has tags.
    groups.set('Games', []);
    games.forEach((game) => {
      groups.get('Games').push(game);
      (game.tags || '').split(',').map((tag) => tag.trim()).filter(Boolean).forEach((tag) => {
        if (settings[tag] === false) return;
        if (!groups.has(tag)) groups.set(tag, []);
        groups.get(tag).push(game);
      });
    });

    function appendRow(label, items) {
      const section = document.createElement('section');
      section.className = 'flix-row';
      const heading = document.createElement('h2');
      heading.textContent = label;
      const cards = document.createElement('div');
      cards.className = 'row-posters';
      items.forEach((game) => cards.append(makeCard(game)));
      section.append(heading, cards);
      rows.append(section);
    }
    (window.EXST_COLLECTIONS || []).forEach((folder) => {
      if (settings[`collection:${folder.id}`] === false) return;
      const collectionGames = folder.applications.map((id) => games.find((game) => game.id === id)).filter(Boolean);
      if (collectionGames.length) appendRow(folder.title, collectionGames);
    });
    // Render the "Games" row first, then other tag groups (respecting user visibility settings).
    if (settings['Games'] !== false) appendRow('Games', groups.get('Games'));
    groups.forEach((items, label) => {
      if (label === 'Games') return;
      appendRow(label, items);
    });
  }

  // Only games explicitly marked `hero=true` belong in the banner. Filtering
  // preserves their order in data/applications.js; all other catalog entries are skipped.
  const spotlightGames = games.filter((game) => game.hero === 'true');
  const heroDots = document.getElementById('heroDots');
  const heroCover = document.getElementById('heroCover');
  const heroTitle = document.getElementById('heroTitle');
  let activeSpotlight = 0;

  function showSpotlight(index) {
    if (!spotlightGames.length) return;
    activeSpotlight = (index + spotlightGames.length) % spotlightGames.length;
    const game = spotlightGames[activeSpotlight];
    heroTitle.textContent = game.title;
    document.getElementById('heroOverview').textContent = game.description || '';
    document.getElementById('heroKicker').textContent = game.version || 'Featured game';
    document.getElementById('heroMeta').textContent = (game.tags || '').split(',').map((tag) => tag.trim()).filter(Boolean).join(' · ');
    document.getElementById('heroCategories').textContent = '';
    document.getElementById('heroPlay').dataset.play = game.id;
    document.getElementById('heroDetails').dataset.details = game.id;
    heroCover.style.backgroundImage = `linear-gradient(90deg,#111,transparent),url("website/${game.icon || 'assets/images/default-game.svg'}")`;
    heroDots.querySelectorAll('button').forEach((dot, dotIndex) => {
      const selected = dotIndex === activeSpotlight;
      dot.classList.toggle('selected', selected);
      dot.setAttribute('aria-pressed', String(selected));
    });
  }

  spotlightGames.forEach((game, index) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.setAttribute('aria-label', `Show ${game.title}`);
    dot.setAttribute('aria-pressed', 'false');
    dot.addEventListener('click', () => {
      showSpotlight(index);
      restartSpotlightTimer();
    });
    heroDots.append(dot);
  });
  if (spotlightGames.length < 2) heroDots.hidden = true;
  showSpotlight(0);
  if (!spotlightGames.length) document.querySelector('.cover-wrapper').hidden = true;

  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let spotlightTimer;
  function restartSpotlightTimer() {
    window.clearInterval(spotlightTimer);
    if (reduceMotion || spotlightGames.length < 2) return;
    spotlightTimer = window.setInterval(() => {
      const home = document.getElementById('page-home');
      if (document.hidden || home.hidden || heroDots.matches(':hover') || heroDots.contains(document.activeElement)) return;
      showSpotlight(activeSpotlight + 1);
    }, 5000);
  }
  heroDots.addEventListener('mouseenter', () => window.clearInterval(spotlightTimer));
  heroDots.addEventListener('mouseleave', restartSpotlightTimer);
  heroDots.addEventListener('focusin', () => window.clearInterval(spotlightTimer));
  heroDots.addEventListener('focusout', restartSpotlightTimer);
  document.addEventListener('visibilitychange', restartSpotlightTimer);
  restartSpotlightTimer();

  renderSections();
  document.getElementById('toolsGrid').replaceChildren(...tools.map(makeCard));
  document.getElementById('toolsCount').textContent = `${tools.length} tools`;
  document.getElementById('toolsEmpty').hidden = tools.length > 0;
  (window.EXST_COLLECTIONS || []).forEach((collection) => {
    const members = collection.applications.map((id) => tools.find((app) => app.id === id)).filter(Boolean);
    if (!members.length) return;
    const section = document.createElement('section'); section.className = 'flix-row';
    const heading = document.createElement('h2'); heading.textContent = collection.title;
    const cards = document.createElement('div'); cards.className = 'row-posters';
    cards.append(...members.map(makeCard)); section.append(heading, cards);
    document.getElementById('toolsCollections').append(section);
  });
  function renderSearch() {
    const query = document.getElementById('searchInput').value.trim().toLowerCase();
    const direction = document.getElementById('sortSelect').value === 'za' ? -1 : 1;
    const matches = catalog.filter((app) => app.title.toLowerCase().includes(query))
      .sort((a, b) => direction * a.title.localeCompare(b.title));
    grid.replaceChildren(...matches.map(makeCard));
    // Media (videos and music) answer the same query; media-library.js owns that row.
    const mediaMatches = window.exstSearchMedia ? window.exstSearchMedia(query) : 0;
    document.getElementById('searchCount').textContent = mediaMatches
      ? `${matches.length} applications · ${mediaMatches} in media`
      : `${matches.length} applications (games and tools)`;
    document.getElementById('searchEmpty').hidden = matches.length + mediaMatches > 0;
  }
  renderSearch();
  // media-library.js loads after this file; it re-runs the search once its hook exists.
  window.exstRenderSearch = renderSearch;
  document.getElementById('searchInput').addEventListener('input', renderSearch);
  document.getElementById('sortSelect').addEventListener('change', renderSearch);

  // The spotlight is controlled only by the hero=true flag in data/applications.js.
  // This editor controls visibility of tag-based rows and collections only.
  document.getElementById('editSections')?.addEventListener('click', () => {
    const dialog = document.getElementById('sectionsDialog');
    const content = document.getElementById('sectionsEditor');
    content.replaceChildren();
    const heading = document.createElement('h3'); heading.textContent = 'Home page sections'; content.append(heading);
    const tags = [...new Set(['Games', ...games.flatMap((game) => (game.tags || '').split(',').map((tag) => tag.trim()).filter(Boolean))])];
    tags.forEach((tag) => {
      const label = document.createElement('label'); label.className = 'section-editor-toggle';
      const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = settings[tag] !== false;
      checkbox.dataset.section = tag;
      label.append(checkbox, document.createTextNode(` Show ${tag} section`)); content.append(label);
    });
    (window.EXST_COLLECTIONS || []).forEach((folder) => {
      const label = document.createElement('label'); label.className = 'section-editor-toggle';
      const checkbox = document.createElement('input'); checkbox.type = 'checkbox';
      checkbox.checked = settings[`collection:${folder.id}`] !== false;
      checkbox.dataset.collection = folder.id;
      label.append(checkbox, document.createTextNode(` Show collection: ${folder.title}`)); content.append(label);
    });
    dialog.showModal();
  });
  document.getElementById('saveSections')?.addEventListener('click', () => {
    const dialog = document.getElementById('sectionsDialog');
    const next = {};
    document.querySelectorAll('#sectionsEditor [data-section]').forEach((checkbox) => { next[checkbox.dataset.section] = checkbox.checked; });
    document.querySelectorAll('#sectionsEditor [data-collection]').forEach((checkbox) => { next[`collection:${checkbox.dataset.collection}`] = checkbox.checked; });
    settings = next;
    try { localStorage.setItem(storageKey, JSON.stringify(settings)); } catch (_) { /* session remains usable */ }
    location.reload();
  });
  document.getElementById('closeSections')?.addEventListener('click', () => document.getElementById('sectionsDialog').close());

  const SECTIONS = ['home', 'tools', 'media', 'search', 'about', 'notifications'];
  function navigate() {
    const requested = (location.hash.slice(1) || 'home').toLowerCase();
    const [section, sub] = requested.split('/');
    const name = SECTIONS.includes(section) ? section : 'home';
    // #media/videos and #media/music share one library page; #media is the picker.
    const library = name === 'media' && ['videos', 'music'].includes(sub) ? sub : '';
    const pageId = library ? 'page-media-library' : `page-${name}`;
    document.querySelectorAll('.flix-page').forEach((page) => { page.hidden = page.id !== pageId; });
    document.querySelectorAll('#footerBar button').forEach((item) => {
      const active = item.getAttribute('ref') === name;
      item.classList.toggle('active', active);
      if (active) item.setAttribute('aria-current', 'page'); else item.removeAttribute('aria-current');
    });
    document.dispatchEvent(new CustomEvent('exst:page', { detail: { name, library } }));
  }
  document.querySelectorAll('#footerBar button').forEach((button) => button.addEventListener('click', () => {
    location.hash = button.getAttribute('ref');
  }));
  document.querySelectorAll('[data-goto]').forEach((button) => button.addEventListener('click', () => {
    location.hash = button.dataset.goto;
  }));
  window.addEventListener('hashchange', navigate);
  navigate();
  let detailsReturnFocus;
  let detailsCloseTimer;
  function showDetails(game) {
    if (!game) return;
    clearTimeout(detailsCloseTimer);
    detailsReturnFocus = document.activeElement;
    document.getElementById('detailsHeadTitle').textContent = game.title;
    document.getElementById('detailsTitle').textContent = game.title;
    document.getElementById('detailsMeta').textContent = game.version || '';
    document.getElementById('detailsOverview').textContent = game.description || 'No description available.';
    const tags = document.getElementById('detailsTags');
    tags.replaceChildren(...(game.tags || '').split(',').map((tag) => tag.trim()).filter(Boolean).map((tag) => {
      const chip = document.createElement('span'); chip.textContent = tag; return chip;
    }));
    document.getElementById('detailsCover').style.backgroundImage = `linear-gradient(to bottom, transparent 45%, #101010 100%), url("website/${game.icon || 'assets/images/default-game.svg'}")`;
    document.getElementById('detailsDirect').href = `website/${game.path}`;
    const launch = document.getElementById('detailsPlay');
    launch.dataset.play = game.id;
    launch.lastChild.textContent = game.location === 'tools' ? 'Open tool' : 'Play';
    const panel = document.getElementById('detailsPage');
    panel.hidden = false;
    requestAnimationFrame(() => panel.classList.add('open'));
    document.body.classList.add('noscroll');
    document.getElementById('pages').inert = true;
    document.getElementById('headerBar').inert = true;
    document.getElementById('footerBar').inert = true;
    document.getElementById('detailsClose').focus();
  }
  function closeDetails() {
    const panel = document.getElementById('detailsPage');
    panel.classList.remove('open');
    document.body.classList.remove('noscroll');
    document.getElementById('pages').inert = false;
    document.getElementById('headerBar').inert = false;
    document.getElementById('footerBar').inert = false;
    detailsReturnFocus?.focus();
    detailsCloseTimer = window.setTimeout(() => { panel.hidden = true; }, 220);
  }
  document.getElementById('detailsClose')?.addEventListener('click', closeDetails);
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !document.getElementById('detailsPage').hidden) closeDetails(); });

  document.addEventListener('click', (event) => {
    const detailTarget = event.target.closest('[data-details]');
    if (detailTarget) {
      event.preventDefault();
      showDetails(catalog.find((game) => game.id === detailTarget.dataset.details));
      return;
    }
    const button = event.target.closest('[data-play]'); if (!button) return;
    const game = catalog.find((item) => item.id === button.dataset.play); if (!game) return;
    const mode = readPreference('openMode', 'page');
    const url = `website/${game.path}`;
    if (mode === 'same') location.href = url;
    else if (mode === 'new') window.open(url, '_blank', 'noopener');
    else location.href = `website/game.html?id=${encodeURIComponent(game.id)}`;
  });
  document.getElementById('openMode')?.addEventListener('change', (event) => { try { localStorage.setItem('openMode', event.target.value); } catch (_) { /* storage may be blocked */ } });
  const mode = document.getElementById('openMode'); if (mode) mode.value = readPreference('openMode', 'page');
})();
