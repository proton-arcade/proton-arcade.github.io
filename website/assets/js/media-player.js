/* Media player page: loads ?id=… from data/media.js and plays it.
 * A .mp4/.webm plays in a video tag, an audio file in the now-playing panel,
 * and an .html path is framed — so a bundled clip page works too. */
(function () {
  const media = window.EXST_MEDIA || [];
  const item = media.find((entry) => entry.id === new URLSearchParams(location.search).get('id'));
  const title = document.getElementById('mediaTitle');
  const stage = document.getElementById('mediaStage');
  const notice = document.getElementById('mediaNotice');
  const info = document.getElementById('mediaInfo');
  const more = document.getElementById('mediaMore');
  const fallback = document.getElementById('mediaFallback');
  const fallbackTitle = document.getElementById('mediaFallbackTitle');
  const fallbackText = document.getElementById('mediaFallbackText');
  const missingPath = document.getElementById('missingPath');
  const direct = document.getElementById('openDirect');
  const fullscreen = document.getElementById('fullscreenMedia');
  const reload = document.getElementById('reloadMedia');
  const backLink = document.getElementById('backLink');

  function showFallback(heading, text, path) {
    stage.replaceChildren();
    info.hidden = true;
    more.hidden = true;
    fallbackTitle.textContent = heading;
    fallbackText.replaceChildren();
    fallbackText.append(document.createTextNode(text));
    if (path) {
      const code = document.createElement('code');
      code.textContent = path;
      fallbackText.append(document.createElement('br'), code);
    }
    missingPath.textContent = path || '';
    missingPath.hidden = !path;
    fallback.hidden = false;
    fullscreen.disabled = true;
    reload.disabled = true;
  }

  if (!item) {
    title.textContent = 'Media not found';
    backLink.href = '../index.html#media';
    direct.hidden = true;
    notice.textContent = 'This video or track is not in the media catalog (data/media.js).';
    showFallback('That media is not in the catalog', 'Return to the media library and pick another video or track.', '');
    return;
  }

  document.title = `${item.title} — Exst Arcade`;
  title.textContent = item.title;
  backLink.href = `../index.html#media/${item.type === 'music' ? 'music' : 'videos'}`;
  backLink.setAttribute('aria-label', `Back to ${item.type === 'music' ? 'music' : 'videos'}`);
  direct.href = item.path;
  document.getElementById('mediaMeta').textContent = [
    item.artist, item.album, item.genres[0], item.year, item.duration,
  ].filter(Boolean).join(' · ');

  const art = `../${item.icon || `assets/images/default-${item.type === 'music' ? 'music' : 'video'}.svg`}`;
  let player = null;

  if (item.kind === 'page') {
    const frame = document.createElement('iframe');
    frame.id = 'mediaFrame';
    frame.title = item.title;
    frame.src = item.path;
    frame.allow = 'fullscreen; autoplay; encrypted-media; picture-in-picture';
    frame.allowFullscreen = true;
    stage.className = 'media-stage-page';
    stage.append(frame);
    player = frame;
    reload.onclick = () => { frame.src = item.path; };
  } else if (item.kind === 'audio') {
    const panel = document.createElement('div');
    panel.className = 'media-now';
    const cover = document.createElement('div');
    cover.className = 'media-now-cover';
    const image = document.createElement('img');
    image.src = art;
    image.alt = `${item.title} cover art`;
    image.onerror = () => { image.onerror = null; image.src = '../assets/images/default-music.svg'; };
    cover.append(image);
    const heading = document.createElement('h2');
    heading.textContent = item.title;
    const meta = document.createElement('p');
    meta.className = 'media-now-meta';
    meta.textContent = [item.artist, item.album, item.year].filter(Boolean).join(' · ');
    const audio = document.createElement('audio');
    audio.controls = true;
    audio.preload = 'metadata';
    audio.src = item.path;
    panel.append(cover, heading, meta, audio);
    stage.className = 'media-stage-audio';
    stage.append(panel);
    player = audio;
    reload.onclick = () => { audio.load(); };
  } else {
    const video = document.createElement('video');
    video.controls = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.src = item.path;
    if (item.icon) video.poster = art;
    stage.className = 'media-stage-video';
    stage.append(video);
    player = video;
    reload.onclick = () => { video.load(); };
    // Autoplay is a nicety, not a requirement: browsers may refuse it.
    const started = video.play();
    if (started && started.catch) started.catch(() => { /* the controls are right there */ });
  }

  fullscreen.disabled = item.kind === 'audio';
  fullscreen.onclick = async () => {
    try { await player?.requestFullscreen?.(); }
    catch (_) { notice.textContent = 'Fullscreen is unavailable in this browser.'; }
  };

  // A codec the browser cannot play looks the same as a missing file, so say which it is.
  player?.addEventListener?.('error', () => {
    showFallback(
      'This browser cannot play that file',
      'The file is there, but the format is not supported here. Re-encode it (H.264/AAC in an .mp4, or .mp3 for audio) or open it directly.',
      item.path,
    );
  });

  /* ---------- Details ---------- */

  const chips = document.createElement('div');
  chips.className = 'chip-row media-chips';
  item.genres.forEach((genre) => {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = genre;
    chips.append(chip);
  });
  const facts = document.createElement('dl');
  facts.className = 'media-facts';
  [
    [item.type === 'music' ? 'Artist' : 'Channel', item.artist],
    ['Album', item.album],
    ['Year', item.year],
    ['Length', item.duration],
    ['Type', item.type === 'music' ? 'Music' : 'Video'],
  ].filter(([, value]) => value).forEach(([label, value]) => {
    const term = document.createElement('dt');
    term.textContent = label;
    const detail = document.createElement('dd');
    detail.textContent = value;
    facts.append(term, detail);
  });
  const overview = document.createElement('p');
  overview.className = 'media-overview';
  overview.textContent = item.description || '';
  info.append(chips, facts);
  if (item.description) info.append(overview);
  info.hidden = !info.childElementCount;

  /* ---------- More like this ---------- */

  const related = media.filter((entry) => entry.id !== item.id && entry.type === item.type)
    .sort((a, b) => {
      const shared = (entry) => entry.genres.filter((genre) => item.genres.includes(genre)).length;
      return shared(b) - shared(a);
    })
    .slice(0, 12);
  if (related.length && window.exstMediaCard) {
    const heading = document.createElement('h2');
    heading.textContent = item.genres[0] ? `More ${item.genres[0].toLowerCase()} ${item.type === 'music' ? 'tracks' : 'videos'}` : `More ${item.type === 'music' ? 'music' : 'videos'}`;
    const row = document.createElement('div');
    row.className = 'row-posters media-posters';
    related.forEach((entry) => row.append(window.exstMediaCard(entry, `media.html?id=${encodeURIComponent(entry.id)}`)));
    more.append(heading, row);
    more.hidden = false;
  }

  // A 404 cannot be detected from a media element's load event, so ask for the file.
  fetch(item.path, { method: 'HEAD' }).then((response) => {
    if (response.status !== 404) return;
    showFallback(
      'That media file is missing',
      'The catalog points at the file below (relative to the website/ folder), but it is not there. Drop the media file in that spot, or fix the path= line in data/media.js.',
      item.path,
    );
  }).catch(() => { /* file:// and offline loads cannot be checked this way */ });
})();
