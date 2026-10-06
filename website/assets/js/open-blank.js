/* Open an application the about:blank way.
 *
 * The prefs tab's `openMode` has a `blank` choice: the application should load
 * in a new tab whose address bar keeps showing about:blank instead of the
 * game's own URL. A window opened on about:blank can be written to while it
 * has no other history entry, so this writes a minimal page that frames the
 * player full-window.
 *
 * window.open() is called without `noopener` on purpose: the opener needs the
 * handle in order to write that document, and writing it is exactly what keeps
 * the tab on about:blank. Everything framed this way is a local file from this
 * repository, so the frame stays same-origin — and a document that never gets
 * the handle can never touch the opener's window.
 *
 * window.exstOpenBlank(url, title) returns true when the about:blank tab was
 * written, and falls back to navigating this tab when the pop-up is blocked.
 */
(function () {
  const SHELL =
    '<!doctype html><html lang="en"><head><meta charset="utf-8" />' +
    '<meta name="viewport" content="width=device-width, initial-scale=1" />' +
    '<meta name="theme-color" content="#101010" />' +
    '<title>Exst Arcade</title>' +
    '<style>' +
    'html,body{margin:0;height:100%;background:#101010;overflow:hidden}' +
    'iframe{display:block;width:100%;height:100%;border:0;background:#101010}' +
    '</style></head><body></body></html>';

  function openBlank(url, title) {
    let absolute = url;
    try { absolute = new URL(url, location.href).href; } catch (_) { /* keep url as-is */ }

    // `_blank` with no `noopener` hands back the new window so it can be written.
    const tab = window.open('about:blank', '_blank');
    if (!tab) { // Pop-up blocked: open the player in this tab instead.
      location.href = url;
      return false;
    }

    try {
      const doc = tab.document;
      doc.open();
      doc.write(SHELL);
      doc.close();
      doc.title = title ? `${title} — Exst Arcade` : 'Exst Arcade';
      const frame = doc.createElement('iframe');
      frame.src = absolute;
      frame.title = title || 'Application';
      frame.setAttribute('allow', 'fullscreen; gamepad; autoplay; clipboard-read; clipboard-write');
      frame.setAttribute('allowfullscreen', '');
      doc.body.append(frame);
    } catch (_) {
      // The blank tab would not let us write to it: point it at the player.
      try { tab.location.replace(absolute); } catch (_) { /* the tab stays blank */ }
    }

    try { tab.focus(); } catch (_) { /* focusing the new tab is a nicety */ }
    return true;
  }

  window.exstOpenBlank = openBlank;
})();
