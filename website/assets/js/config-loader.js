/* Human-editable catalogs. Legacy block names remain supported. */
(function () {
  const warnings = [];
  function parse(text, names) {
    const records = [];
    let item;
    String(text || '').split(/\r?\n/).forEach((raw) => {
      const line = raw.trim();
      if (!line || line.startsWith('#') || line.startsWith('//')) return;
      const header = /^\[([^\]]+)\]$/.exec(line);
      if (header) {
        item = names.includes(header[1].toLowerCase()) ? { block: header[1].toLowerCase() } : null;
        if (item) records.push(item);
        return;
      }
      const at = line.indexOf('=');
      if (item && at > 0) item[line.slice(0, at).trim()] = line.slice(at + 1).trim();
    });
    return records;
  }
  function list(value) {
    return String(value || '').split(',').map((part) => part.trim()).filter(Boolean);
  }
  const ids = new Set();
  window.EXST_APPLICATIONS = parse(window.EXST_APPLICATIONS_TEXT, ['application', 'game']).filter((item) => {
    if (!item.id || !item.title || !item.path) {
      warnings.push(`Application ${item.id || '(unnamed)'} needs id, title, and path.`);
      return false;
    }
    if (ids.has(item.id)) {
      warnings.push(`Duplicate application ID: ${item.id}. Only the first entry is used.`);
      return false;
    }
    item.location = (item.location || 'games').toLowerCase();
    if (!['games', 'tools'].includes(item.location)) {
      warnings.push(`${item.id}: location must be games or tools; using games.`);
      item.location = 'games';
    }
    ids.add(item.id);
    return true;
  });
  window.EXST_COLLECTIONS = parse(window.EXST_COLLECTIONS_TEXT, ['collection', 'folder']).filter((item) => item.id && item.title && item.available !== 'false').map((item) => {
    item.applications = (item.applications || item.games || '').split(',').map((id) => id.trim()).filter(Boolean);
    item.applications.forEach((id) => {
      if (!ids.has(id)) warnings.push(`Collection ${item.id}: unknown application ${id}.`);
    });
    return item;
  });

  /* ---- Media (videos and music), catalogued in data/media.js ---- */

  const AUDIO_FILES = /\.(mp3|wav|wave|ogg|oga|opus|m4a|aac|flac|weba)$/i;
  const PAGE_FILES = /\.(html?|xhtml)$/i;
  // How a media file is played: audio and video go in their own tag, an .html
  // path is framed (handy for a local player page or a bundled clip).
  function mediaKind(path) {
    const file = String(path || '').split(/[?#]/)[0];
    if (AUDIO_FILES.test(file)) return 'audio';
    if (PAGE_FILES.test(file)) return 'page';
    return 'video';
  }
  window.EXST_MEDIA_KIND = mediaKind;

  const mediaIds = new Set();
  window.EXST_MEDIA = parse(window.EXST_MEDIA_TEXT, ['media', 'video', 'music', 'song', 'track'])
    .filter((item) => item.available !== 'false')
    .filter((item) => {
      if (!item.id || !item.title || !item.path) {
        warnings.push(`Media ${item.id || '(unnamed)'} needs id, title, and path.`);
        return false;
      }
      if (mediaIds.has(item.id)) {
        warnings.push(`Duplicate media ID: ${item.id}. Only the first entry is used.`);
        return false;
      }
      mediaIds.add(item.id);
      return true;
    })
    .map((item) => {
      // [video]/[music]/[song]/[track] blocks carry their type in the header;
      // anything else is guessed from the file extension.
      const fromBlock = { video: 'video', music: 'music', song: 'music', track: 'music' }[item.block];
      const declared = (item.type || '').toLowerCase();
      const guessed = mediaKind(item.path) === 'audio' ? 'music' : 'video';
      if (declared && !['video', 'music'].includes(declared)) {
        warnings.push(`Media ${item.id}: type must be video or music; using ${guessed}.`);
        item.type = guessed;
      } else item.type = declared || fromBlock || guessed;
      item.artist = item.artist || item.channel || item.creator || '';
      item.genres = [...new Set([...list(item.genre), ...list(item.tags)])];
      item.genre = item.genres.join(', ');
      item.kind = mediaKind(item.path);
      return item;
    });

  window.EXST_CATALOG_WARNINGS = warnings;
  const notice = document.getElementById('catalogNotice') || document.getElementById('gameNotice') || document.getElementById('toolNotice') || document.getElementById('mediaNotice');
  if (notice && warnings.length) {
    notice.textContent = `Catalog needs attention: ${warnings.join(' ')}`;
    notice.setAttribute('role', 'status');
  }
})();
