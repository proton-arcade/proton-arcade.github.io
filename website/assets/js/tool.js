(function () {
  const tool = (window.EXST_APPLICATIONS || []).find((app) => app.id === new URLSearchParams(location.search).get('id'));
  const title = document.getElementById('toolTitle');
  const frame = document.getElementById('toolFrame');
  const notice = document.getElementById('toolNotice');
  if (!tool) {
    title.textContent = 'Tool not found';
    frame.hidden = true;
    document.getElementById('fullscreenTool').disabled = true;
    document.getElementById('reloadTool').disabled = true;
    notice.textContent = 'This tool is not in the catalog. Return to the arcade to choose another.';
    return;
  }
  document.title = `${tool.title} — Exst Arcade`;
  title.textContent = tool.title;
  frame.title = tool.title;
  document.getElementById('toolMeta').textContent = tool.version || '';
  frame.src = tool.path;
  document.getElementById('openDirect').href = tool.path;
  document.getElementById('fullscreenTool').onclick = async () => {
    try { await frame.requestFullscreen?.(); }
    catch (_) { notice.textContent = 'Fullscreen is unavailable in this browser.'; }
  };
  document.getElementById('reloadTool').onclick = () => { frame.src = tool.path; };
  // An iframe load event cannot distinguish an HTTP 404 from a successful load.
  fetch(tool.path, { method: 'HEAD' }).then((response) => {
    if (response.status !== 404) return;
    frame.hidden = true;
    document.getElementById('missingPath').textContent = tool.path;
    document.getElementById('toolFallback').hidden = false;
  }).catch(() => { /* Let the frame handle offline/network errors. */ });
})();