(function () {
  const game = (window.EXST_APPLICATIONS || []).find((app) => app.id === new URLSearchParams(location.search).get('id'));
  const title = document.getElementById('gameTitle');
  const frame = document.getElementById('gameFrame');
  const notice = document.getElementById('gameNotice');
  if (!game) {
    title.textContent = 'Application not found';
    frame.hidden = true;
    document.getElementById('fullscreenGame').disabled = true;
    document.getElementById('reloadGame').disabled = true;
    notice.textContent = 'This application is not in the catalog. Return to the arcade to choose another.';
    return;
  }
  document.title = `${game.title} — Exst Arcade`;
  title.textContent = game.title;
  frame.title = game.title;
  document.getElementById('gameMeta').textContent = game.version || '';
  document.getElementById('backLink').href = game.location === 'tools' ? '../index.html#tools' : '../index.html#home';
  frame.src = game.path;
  document.getElementById('openDirect').href = game.path;
  document.getElementById('fullscreenGame').onclick = async () => {
    try { await frame.requestFullscreen?.(); }
    catch (_) { notice.textContent = 'Fullscreen is unavailable in this browser.'; }
  };
  // Reset the source rather than reading cross-origin iframe.location.
  document.getElementById('reloadGame').onclick = () => { frame.src = game.path; };
  // An iframe load event cannot distinguish an HTTP 404 from a successful load.
  fetch(game.path, { method: 'HEAD' }).then((response) => {
    if (response.status !== 404) return;
    frame.hidden = true;
    document.getElementById('missingPath').textContent = game.path;
    document.getElementById('gameFallback').hidden = false;
  }).catch(() => { /* Let the frame handle offline/network errors. */ });
})();
