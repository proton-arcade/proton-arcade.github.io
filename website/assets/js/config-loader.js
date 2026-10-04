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
        item = names.includes(header[1].toLowerCase()) ? {} : null;
        if (item) records.push(item);
        return;
      }
      const at = line.indexOf('=');
      if (item && at > 0) item[line.slice(0, at).trim()] = line.slice(at + 1).trim();
    });
    return records;
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
  window.EXST_CATALOG_WARNINGS = warnings;
  const notice = document.getElementById('catalogNotice') || document.getElementById('gameNotice');
  if (notice && warnings.length) {
    notice.textContent = `Catalog needs attention: ${warnings.join(' ')}`;
    notice.setAttribute('role', 'status');
  }
})();
