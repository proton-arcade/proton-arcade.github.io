(function () {
  const paths = {
    home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
    tools: '<path d="m14 6 4 4M4 20l8-8M14 3a6 6 0 0 0-6 8L3 16a3 3 0 0 0 5 5l5-5a6 6 0 0 0 8-8l-4 4-5-5 4-4z"/>',
    search: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
    add: '<path d="M12 5v14M5 12h14"/>',
    play: '<path d="m8 5 12 7-12 7z" fill="currentColor" stroke="none"/>',
    sort: '<path d="M8 4v16m0 0-3-3m3 3 3-3M16 20V4m0 0 3 3m-3-3-3 3"/>',
    media: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 12h18M3 8h4M3 16h4M17 8h4M17 16h4"/>',
    video: '<rect x="2" y="5" width="14" height="14" rx="2"/><path d="m16 10 6-3v10l-6-3z"/>',
    music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
    arrow_back: '<path d="m15 18-6-6 6-6M9 12h12"/>',
    'arrow-up-right': '<path d="M7 17 17 7M7 7h10v10"/>',
    x: '<path d="m6 6 12 12M18 6 6 18"/>',
  };
  function icon(name) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.innerHTML = paths[name] || '<circle cx="12" cy="12" r="8"/>';
    return svg;
  }
  function paint(root) {
    (root || document).querySelectorAll('[data-icon]').forEach((element) => {
      if (element.childElementCount) return; // already filled in
      element.classList.add('icon');
      element.replaceChildren(icon(element.dataset.icon));
    });
  }
  // Cards and rows are built at runtime, so the icon helper is shared.
  window.exstIcon = icon;
  window.exstPaintIcons = paint;
  paint(document);
})();
