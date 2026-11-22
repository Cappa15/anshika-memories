/* =========================================================
   Anshika — gallery logic
   - Cloud: Supabase (free tier) with graceful device fallback
   - Device: IndexedDB (photos + full videos, no file limit)
   - PIN gate: SHA-256, shared through Supabase when connected
   ========================================================= */

(function () {
  'use strict';

  const STORE = {
    url: 'anshika.sb.url',
    key: 'anshika.sb.key',
    bucket: 'anshika.sb.bucket',
    pin: 'anshika.pin.hash',
    learning: 'anshika.learning',
    playlist: 'anshika.playlist',
    wishes: 'anshika.wishes',
    voiceUrl: 'anshika.voiceUrl',
    voiceCustom: 'anshika.voiceCustom',
    disableCloud: 'anshika.disableCloud'
  };

  // Edit these to personalise the story sections.
  const CONTENT = {
    birthday: '2008-09-24',
    firstStage: '2016-08-15',
    mudras: [
      { name: 'Anjali', symbol: '🙏', meaning: 'Palms meeting — a greeting, a prayer, a quiet hello.' },
      { name: 'Abhaya', symbol: '✋', meaning: 'The raised palm that says: be fearless, I am with you.' },
      { name: 'Gajahasta', symbol: '🐘', meaning: 'The elephant hand — grace with a gentle, sweeping strength.' },
      { name: 'Shikhara', symbol: '⛰', meaning: 'A mountain peak — devotion reaching upward.' },
      { name: 'Katakamukha', symbol: '🌸', meaning: 'A flower being plucked — the smallest, sweetest expression.' }
    ],
    ragas: [
      { name: 'Yaman', mood: 'Soft & glowing', notes: [66, 69, 71, 73, 76, 74, 71, 69] },
      { name: 'Bhairavi', mood: 'Devotional & deep', notes: [62, 63, 65, 67, 69, 70, 72, 67] },
      { name: 'Malkauns', mood: 'Mysterious & calm', notes: [61, 64, 68, 72, 68, 64, 63, 61] },
      { name: 'Khamaj', mood: 'Playful & light', notes: [67, 69, 71, 72, 74, 72, 71, 67] }
    ],
    timeline: [
      { year: 'The first class', title: 'Small feet, big dreams', text: 'The very first adavu, the first aching ankles, the first "I want to do it again".' },
      { year: 'The first stage', title: 'Lights, and a deep breath', text: 'The first time the ghungroo sounded for an audience instead of a mirror.' },
      { year: "Guruji's blessing", title: 'A quiet yes', text: 'A nod, a smile, a correction — and suddenly the steps made sense.' },
      { year: 'The biggest night', title: 'She forgot the audience', text: 'Just music, mudra and a girl completely at home in her own rhythm.' }
    ],
    inspirations: [
      { quote: 'Dance is the hidden language of the soul.', by: 'Martha Graham' },
      { quote: 'The body says what words cannot.', by: 'Martha Graham' },
      { quote: 'Learn the steps, then forget them — and become the music.', by: 'Every guruji, everywhere' }
    ],
    places: [
      { name: 'Her first school stage', note: 'Where the nerves and the love began together.' },
      { name: 'The city auditorium', note: 'Lights, ghungroo, and a front row full of proud faces.' },
      { name: 'The temple courtyard', note: 'The oldest kind of stage, and somehow the easiest to breathe on.' }
    ],
    testimonials: [
      { quote: 'She doesn’t just dance the raga — she becomes it.', by: 'Her guruji' },
      { quote: 'I have never seen someone light up quite like that before the first beat.', by: 'A friend' },
      { quote: 'The bells stop, the room goes quiet, and you still feel the dance.', by: 'Someone in the front row' }
    ],
    learning: 'A new adavu, and the patience to make it look effortless.',
    playlist: '',
    reasons: [
      'The way your face changes a half second before the first beat.',
      'How a whole room goes quiet when you begin.',
      'Your hands say things words never could.',
      'The sound of your ghungroo in an empty practice room.',
      'That you keep going when nobody is clapping.',
      'How you turn a mistake into a moment.',
      'Your laugh at the end of a hard rehearsal.',
      'The way you fix one pleat like it is serious art.',
      'How you make something ancient feel brand new.',
      'Your patience with people who do not know the raga yet.',
      'The way you thank the accompanists before anyone else.',
      'How you light up when somebody finally gets it.',
      'Your stubbornness — but the lovely, graceful kind.',
      'The way you hold a pause like it is part of the dance.',
      'That you remember every small kindness.',
      'How you make an old song feel written for you.',
      'The way you say "one more time".',
      'Your eyes when you are really inside the music.',
      'How you make everyone around you feel a little braver.',
      'That you still get nervous, and still walk on stage.',
      'The way you carry your gurus with you everywhere.',
      'How you turn a small stage into a temple.',
      'The 2am messages about one tiny step that mattered.',
      'Just you. Exactly as you are.'
    ],
    letter: [
      'I don’t understand every raga, but I always understood the way your face lights up before you begin.',
      'I don’t know the names of all the steps, but I know the way you make a room feel like it is holding its breath.',
      'I will never put my ego in front of your happiness. Every year I’ll set it aside, quietly and completely, and wish you everything good — because you deserve it, and because I’m just a man in love.',
      'This corner of the internet is just for that.'
    ]
  };

  const CLOUD_FILE_LIMIT = 50 * 1024 * 1024;   // Supabase free: 50 MB per file
  const CLOUD_TOTAL_LIMIT = 1024 * 1024 * 1024; // Supabase free: 1 GB total
  const MAX_IMAGE_EDGE = 1800;                  // resize big photos before upload
  const JPEG_QUALITY = 0.84;
  const DEFAULT_VOICE = 'anshika-voice-note.mp3'; // bundled voice note — plays out of the box

  // Cloud is built in, so every device shares the same memories and PIN.
  // Changing these later only requires editing this file and re-uploading it.
  const BAKED_CLOUD = {
    url: 'https://cecggykisnuxbvgbmfh.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlZ2NnZ3lraXNudXhidmdibWZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUzNjMxMzAsImV4cCI6MjExMDkzOTEzMH0.IBhIB34887-QmHhda2r_4oijadri8c-IjiZlX5zSM9g'
  };

  const el = (id) => document.getElementById(id);

  const state = {
    supabase: null,
    sbUrl: null,
    sbKey: null,
    bucket: 'anshika-media',
    mode: 'local',
    cloudIssue: '',
    pinHash: null,
    pinEntry: '',
    items: [],
    filter: 'all',
    query: '',
    lightId: null,
    pendingFiles: [],
    objectUrls: new Map()
  };

  /* -------------------------------------------------------
     Small helpers
  ------------------------------------------------------- */

  function uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'm-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
  }

  function formatBytes(bytes) {
    const n = Number(bytes) || 0;
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1024 / 1024).toFixed(1) + ' MB';
  }

  function formatDate(value) {
    try {
      return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
    } catch (_) { return ''; }
  }

  function toast(message, isError) {
    const node = document.createElement('div');
    node.className = 'toast' + (isError ? ' is-error' : '');
    node.textContent = message;
    el('toastContainer').appendChild(node);
    setTimeout(() => {
      node.style.opacity = '0';
      node.style.transform = 'translateX(18px)';
      node.style.transition = 'opacity .3s, transform .3s';
      setTimeout(() => node.remove(), 320);
    }, 4200);
  }

  async function hashPin(pin) {
    const text = 'anshika::' + pin;
    if (window.crypto && crypto.subtle && window.TextEncoder) {
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return 's:' + Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
    }
    let hash = 5381;
    for (let i = 0; i < text.length; i++) hash = ((hash << 5) + hash + text.charCodeAt(i)) >>> 0;
    return 'f:' + hash.toString(16);
  }

  /* -------------------------------------------------------
     IndexedDB (device storage)
  ------------------------------------------------------- */

  function openDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('anshika-gallery', 2);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains('media')) request.result.createObjectStore('media', { keyPath: 'id' });
        if (!request.result.objectStoreNames.contains('misc')) request.result.createObjectStore('misc');
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function idbAll() {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction('media', 'readonly').objectStore('media').getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async function idbPut(record) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('media', 'readwrite');
      tx.objectStore('media').put(record);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  async function idbRemove(id) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('media', 'readwrite');
      tx.objectStore('media').delete(id);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  async function miscPut(key, value) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('misc', 'readwrite');
      tx.objectStore('misc').put(value, key);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  async function miscGet(key) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction('misc', 'readonly').objectStore('misc').get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /* -------------------------------------------------------
     Supabase
  ------------------------------------------------------- */

  function savedCloudConfig() {
    if (localStorage.getItem(STORE.disableCloud) === '1') return { url: '', key: '' };
    return {
      url: localStorage.getItem(STORE.url) || BAKED_CLOUD.url,
      key: localStorage.getItem(STORE.key) || BAKED_CLOUD.key
    };
  }

  async function ensureClient() {
    const cfg = savedCloudConfig();
    if (!cfg.url || !cfg.key || !window.supabase) return false;
    if (!state.supabase || state.sbUrl !== cfg.url || state.sbKey !== cfg.key) {
      state.supabase = window.supabase.createClient(cfg.url, cfg.key);
      state.sbUrl = cfg.url;
      state.sbKey = cfg.key;
    }
    state.bucket = localStorage.getItem(STORE.bucket) || 'anshika-media';
    return true;
  }

  async function cloudPin() {
    const { data, error } = await state.supabase
      .from('anshika_config')
      .select('value')
      .eq('key', 'pin_hash')
      .maybeSingle();
    if (error) throw error;
    return data ? data.value : null;
  }

  async function savePin(hash) {
    state.pinHash = hash;
    localStorage.setItem(STORE.pin, hash);
    if (state.mode === 'cloud' && state.supabase) {
      const { error } = await state.supabase
        .from('anshika_config')
        .upsert({ key: 'pin_hash', value: hash, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (error) toast('PIN saved here, but could not sync it to the cloud.', true);
    }
  }

  async function currentPinHash() {
    if (state.mode === 'cloud' && state.supabase) {
      try {
        const hash = await cloudPin();
        if (hash) {
          localStorage.setItem(STORE.pin, hash);
          return hash;
        }
      } catch (_) { /* fall back to device PIN */ }
    }
    return localStorage.getItem(STORE.pin);
  }

  function publicUrl(filePath) {
    if (!state.supabase || !filePath) return '';
    const { data } = state.supabase.storage.from(state.bucket).getPublicUrl(filePath);
    return data ? data.publicUrl : '';
  }

  /* -------------------------------------------------------
     Media loading & rendering
  ------------------------------------------------------- */

  async function loadItems() {
    let cloudItems = [];
    if (state.mode === 'cloud' && state.supabase) {
      const { data, error } = await state.supabase
        .from('anshika_media')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        cloudItems = data.map((row) => ({
          ...row,
          source: 'cloud',
          url: publicUrl(row.file_path)
        }));
      } else if (error) {
        toast('Could not refresh cloud memories: ' + error.message, true);
      }
    }

    let deviceItems = [];
    try { deviceItems = await idbAll(); } catch (_) { /* private mode can block IndexedDB */ }

    state.items = [...cloudItems, ...deviceItems].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    revokeUnusedUrls();
    render();
  }

  function revokeUnusedUrls() {
    state.objectUrls.forEach((url, id) => {
      if (id === state.lightId) return;
      if (!state.items.some((item) => item.id === id)) {
        URL.revokeObjectURL(url);
        state.objectUrls.delete(id);
      }
    });
  }

  function itemUrl(item) {
    if (item.source === 'cloud') return item.url || publicUrl(item.file_path);
    if (!state.objectUrls.has(item.id) && item.blob) {
      state.objectUrls.set(item.id, URL.createObjectURL(item.blob));
    }
    return state.objectUrls.get(item.id) || '';
  }

  function visibleItems() {
    const query = state.query.trim().toLowerCase();
    return state.items.filter((item) => {
      switch (state.filter) {
        case 'photos': if (item.kind !== 'photo') return false; break;
        case 'videos': if (item.kind !== 'video') return false; break;
        case 'behind': if (item.tag !== 'behind') return false; break;
        case 'practice': if (item.tag !== 'practice') return false; break;
        case 'costume': if (item.tag !== 'costume') return false; break;
        default: break;
      }
      if (!query) return true;
      return (item.caption || '').toLowerCase().includes(query) || (item.file_name || '').toLowerCase().includes(query);
    });
  }

  function render() {
    const all = state.items;
    const dance = all.filter((i) => i.category === 'dance').length;
    const personal = all.length - dance;

    el('statAll').textContent = all.length;
    el('statDance').textContent = dance;
    el('statPersonal').textContent = personal;
    el('countDance').textContent = dance;
    el('countPersonal').textContent = personal;

    const names = {
      all: 'All memories', photos: 'Photos', videos: 'Videos',
      behind: 'Behind the Stage', practice: 'Practice Room', costume: 'Costume & Jewellery'
    };
    el('galleryTitle').textContent = names[state.filter];

    const items = visibleItems();
    const grid = el('galleryGrid');
    grid.innerHTML = '';

    items.forEach((item) => {
      const url = itemUrl(item);
      const card = document.createElement('article');
      card.className = 'media-card' + (item.kind === 'video' ? ' media-card--video' : '');
      card.dataset.id = item.id;

      const media = document.createElement(item.kind === 'video' ? 'video' : 'img');
      media.src = item.kind === 'video' ? url + '#t=0.1' : url;
      media.loading = 'lazy';
      media.alt = item.caption || item.file_name || 'A memory';
      if (item.kind === 'video') {
        media.muted = true;
        media.preload = 'metadata';
        media.playsInline = true;
      }
      media.onerror = () => {
        media.remove();
        const fallback = document.createElement('div');
        fallback.style.cssText = 'display:grid;place-items:center;height:100%;color:var(--muted);font-size:12px;padding:16px;text-align:center';
        fallback.textContent = item.file_name || 'Could not load this memory';
        card.prepend(fallback);
      };
      card.appendChild(media);

      const badge = document.createElement('span');
      badge.className = 'media-card__badge';
      badge.textContent = item.category === 'dance' ? 'Classical Dance' : 'Personal';
      card.appendChild(badge);

      if (item.kind === 'video') {
        const play = document.createElement('div');
        play.className = 'media-card__play';
        play.innerHTML = '<span><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></span>';
        card.appendChild(play);
      }

      const overlay = document.createElement('div');
      overlay.className = 'media-card__overlay';
      const caption = escapeHtml(item.caption || item.file_name || 'Untitled memory');
      overlay.innerHTML = '<p class="media-card__caption">' + caption + '</p>' +
        '<div class="media-card__meta">' + escapeHtml(formatDate(item.created_at)) + ' · ' + escapeHtml(formatBytes(item.size_bytes)) + '</div>';
      card.appendChild(overlay);

      const open = document.createElement('button');
      open.className = 'media-card__open';
      open.type = 'button';
      open.setAttribute('aria-label', 'Open ' + (item.caption || item.file_name || 'memory'));
      card.appendChild(open);

      grid.appendChild(card);
    });

    const empty = el('emptyState');
    empty.hidden = items.length > 0;
    if (items.length === 0) {
      const searching = state.query.trim().length > 0;
      el('emptyTitle').textContent = searching
        ? 'Nothing by that name.'
        : (state.filter === 'practice' ? 'Back to the practice room.' : 'The stage is yours.');
      el('emptyText').textContent = searching
        ? 'Try a different word, or add a new memory.'
        : 'Add a photo or video and it will appear right here.';
      el('emptyUploadBtn').hidden = searching;
    }

    updateStorageMeter();
  }

  function updateStorageMeter() {
    const meter = el('storageMeter');
    if (state.mode !== 'cloud') { meter.hidden = true; return; }
    const used = state.items.filter((i) => i.source === 'cloud').reduce((sum, i) => sum + (Number(i.size_bytes) || 0), 0);
    meter.hidden = false;
    el('storageUsed').textContent = formatBytes(used) + ' / 1 GB';
    el('storageBar').style.width = Math.min(100, (used / CLOUD_TOTAL_LIMIT) * 100).toFixed(1) + '%';
    el('storageTip').textContent = used > CLOUD_TOTAL_LIMIT * 0.8
      ? 'Almost full — new large videos will be kept on this device instead.'
      : 'Photos are shrunk before upload, so your free space goes a long way.';
  }

  /* -------------------------------------------------------
     Image preparation (compress before upload)
  ------------------------------------------------------- */

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read image')); };
      img.src = url;
    });
  }

  async function prepareImage(file) {
    const original = { blob: file, fileName: file.name, mimeType: file.type || 'image/jpeg', compressed: false };
    if (file.type === 'image/gif' || file.type === 'image/svg+xml' || file.type === 'image/heic' || file.type === 'image/heif') return original;

    let source;
    try {
      source = window.createImageBitmap ? await createImageBitmap(file) : await loadImage(file);
    } catch (_) { return original; }

    const width = source.width || source.naturalWidth;
    const height = source.height || source.naturalHeight;
    if (!width || !height) return original;

    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height);
    if (source.close) source.close();

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
    if (!blob || blob.size >= file.size) return original;

    const base = (file.name.replace(/\.[^.]+$/, '') || 'photo').slice(0, 80);
    return { blob, fileName: base + '.jpg', mimeType: 'image/jpeg', compressed: true, originalSize: file.size };
  }

  /* -------------------------------------------------------
     Uploading
  ------------------------------------------------------- */

  async function uploadToCloud(payload, category, caption, tag) {
    const path = category + '/' + Date.now() + '-' + uid() + '.' + (payload.fileName.split('.').pop() || 'bin');
    const { error: uploadError } = await state.supabase.storage
      .from(state.bucket)
      .upload(path, payload.blob, { contentType: payload.mimeType, upsert: false });
    if (uploadError) throw uploadError;

    const row = {
      category: category,
      kind: payload.kind,
      file_name: payload.fileName,
      file_path: path,
      mime_type: payload.mimeType,
      size_bytes: payload.blob.size,
      caption: caption || '',
      tag: tag || 'stage'
    };
    const { error: rowError } = await state.supabase.from('anshika_media').insert(row);
    if (rowError) {
      await state.supabase.storage.from(state.bucket).remove([path]);
      throw rowError;
    }
  }

  async function saveToDevice(payload, category, caption, tag) {
    await idbPut({
      id: uid(),
      source: 'local',
      category: category,
      kind: payload.kind,
      file_name: payload.fileName,
      mime_type: payload.mimeType,
      size_bytes: payload.blob.size,
      caption: caption || '',
      tag: tag || 'stage',
      created_at: new Date().toISOString(),
      blob: payload.blob
    });
  }

  async function storeFile(file, category, caption, tag) {
    const kind = file.type.startsWith('video/') ? 'video' : 'photo';
    let payload;
    if (kind === 'photo') {
      payload = await prepareImage(file);
    } else {
      payload = { blob: file, fileName: file.name || 'video.mp4', mimeType: file.type || 'video/mp4', compressed: false };
    }
    payload.kind = kind;

    if (state.mode === 'cloud' && payload.blob.size <= CLOUD_FILE_LIMIT) {
      try {
        await uploadToCloud(payload, category, caption, tag);
        return { where: 'cloud', compressed: !!payload.compressed };
      } catch (error) {
        console.warn('Cloud upload failed, keeping it on this device:', error);
      }
    }
    await saveToDevice(payload, category, caption, tag);
    return { where: 'device', compressed: !!payload.compressed };
  }

  /* -------------------------------------------------------
     Lightbox
  ------------------------------------------------------- */

  function openLightbox(id) {
    state.lightId = id;
    renderLightbox();
    el('lightboxModal').hidden = false;
  }

  function currentLightItem() {
    return state.items.find((item) => item.id === state.lightId) || null;
  }

  function renderLightbox() {
    const item = currentLightItem();
    if (!item) { closeModal('lightboxModal'); return; }
    const list = visibleItems();
    const position = list.findIndex((i) => i.id === item.id);
    const url = itemUrl(item);

    const stage = el('lightStage');
    stage.innerHTML = '';
    const media = document.createElement(item.kind === 'video' ? 'video' : 'img');
    media.src = item.kind === 'video' ? url : url;
    media.alt = item.caption || item.file_name || 'Memory';
    if (item.kind === 'video') {
      media.controls = true;
      media.autoplay = true;
      media.playsInline = true;
    }
    stage.appendChild(media);

    el('lightCategory').textContent = item.category === 'dance' ? 'Classical Dance' : 'Personal Moments';
    el('lightCaption').textContent = item.caption || item.file_name || 'Untitled memory';
    el('lightMeta').textContent = formatDate(item.created_at) + ' · ' + formatBytes(item.size_bytes) + ' · ' + (position + 1) + ' of ' + list.length;
    el('lightPrev').hidden = list.length < 2;
    el('lightNext').hidden = list.length < 2;
  }

  function stepLightbox(direction) {
    const list = visibleItems();
    if (list.length < 2) return;
    const index = list.findIndex((i) => i.id === state.lightId);
    const next = (index + direction + list.length) % list.length;
    state.lightId = list[next].id;
    renderLightbox();
  }

  async function editCaption() {
    const item = currentLightItem();
    if (!item) return;
    const value = window.prompt('Write a little caption for this memory:', item.caption || '');
    if (value === null) return;
    const caption = value.trim().slice(0, 120);
    if (item.source === 'cloud') {
      const { error } = await state.supabase.from('anshika_media').update({ caption }).eq('id', item.id);
      if (error) { toast('Could not update caption: ' + error.message, true); return; }
    } else {
      const records = await idbAll();
      const record = records.find((r) => r.id === item.id);
      if (record) { record.caption = caption; await idbPut(record); }
    }
    item.caption = caption;
    render();
    renderLightbox();
    toast('Caption updated.');
  }

  async function downloadCurrent() {
    const item = currentLightItem();
    if (!item) return;
    try {
      let url = itemUrl(item);
      if (item.source === 'cloud') {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Download failed');
        url = URL.createObjectURL(await response.blob());
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      }
      const link = document.createElement('a');
      link.href = url;
      link.download = item.file_name || 'memory';
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast('Could not download this memory.', true);
    }
  }

  async function deleteCurrent() {
    const item = currentLightItem();
    if (!item) return;
    if (!window.confirm('Delete this memory forever? This cannot be undone.')) return;
    try {
      if (item.source === 'cloud') {
        const { error: fileError } = await state.supabase.storage.from(state.bucket).remove([item.file_path]);
        if (fileError) throw fileError;
        const { error: rowError } = await state.supabase.from('anshika_media').delete().eq('id', item.id);
        if (rowError) throw rowError;
      } else {
        await idbRemove(item.id);
      }
      closeModal('lightboxModal');
      await loadItems();
      toast('Memory deleted.');
    } catch (error) {
      toast('Could not delete: ' + error.message, true);
    }
  }

  /* -------------------------------------------------------
     Screens & modals
  ------------------------------------------------------- */

  function showApp() {
    el('setupScreen').hidden = true;
    el('lockScreen').hidden = true;
    el('app').hidden = false;
    renderCountdowns();
    renderWishes();
    loadItems();
  }

  function showLock(message) {
    el('setupScreen').hidden = true;
    el('app').hidden = true;
    el('lockScreen').hidden = false;
    state.pinEntry = '';
    renderPinDots();
    el('lockError').hidden = !message;
    el('lockError').textContent = message || '';
    el('cloudWarning').hidden = !state.cloudIssue;
    el('cloudWarning').textContent = state.cloudIssue;
  }

  function showSetup() {
    el('lockScreen').hidden = true;
    el('app').hidden = true;
    el('setupScreen').hidden = false;
  }

  function openModal(id) {
    el(id).hidden = false;
  }

  function closeModal(id) {
    el(id).hidden = true;
  }

  function renderPinDots() {
    const dots = el('pinDots');
    dots.innerHTML = '';
    for (let i = 0; i < Math.max(4, state.pinEntry.length); i++) {
      const dot = document.createElement('i');
      if (i < state.pinEntry.length) dot.className = 'is-filled';
      dots.appendChild(dot);
    }
  }

  function updateModePill() {
    const pill = el('modePill');
    pill.textContent = state.mode === 'cloud' ? 'Synced everywhere' : 'This device';
    pill.classList.toggle('is-cloud', state.mode === 'cloud');
  }

  /* -------------------------------------------------------
     Upload modal helpers
  ------------------------------------------------------- */

  function resetUploadModal() {
    state.pendingFiles = [];
    el('fileInput').value = '';
    el('uploadCaption').value = '';
    el('uploadError').hidden = true;
    renderFileList();
  }

  function openUpload(category) {
    resetUploadModal();
    if (category) el('uploadCategory').value = category;
    el('sizeHint').textContent = state.mode === 'cloud'
      ? 'Photos are compressed automatically · Videos over 50 MB stay safely on this device.'
      : 'Everything stays on this device. Photos are compressed first.';
    openModal('uploadModal');
  }

  function renderFileList() {
    const list = el('fileList');
    list.innerHTML = '';
    state.pendingFiles.forEach((file, index) => {
      const li = document.createElement('li');
      const name = document.createElement('span');
      name.textContent = (file.type.startsWith('video/') ? '▶ ' : '▣ ') + file.name;
      li.appendChild(name);
      const size = document.createElement('small');
      size.textContent = formatBytes(file.size);
      li.appendChild(size);
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = '✕';
      remove.setAttribute('aria-label', 'Remove ' + file.name);
      remove.addEventListener('click', () => {
        state.pendingFiles.splice(index, 1);
        renderFileList();
      });
      li.appendChild(remove);
      list.appendChild(li);
    });
    const button = el('doUploadBtn');
    button.disabled = state.pendingFiles.length === 0;
    el('uploadCount').textContent = state.pendingFiles.length ? '(' + state.pendingFiles.length + ')' : '';
  }

  function addFiles(fileList) {
    const incoming = Array.from(fileList).filter((file) => file.type.startsWith('image/') || file.type.startsWith('video/'));
    state.pendingFiles = state.pendingFiles.concat(incoming).slice(0, 60);
    renderFileList();
    const skipped = fileList.length - incoming.length;
    if (skipped > 0) toast(skipped + ' file(s) skipped — only photos and videos are supported.', true);
  }

  /* -------------------------------------------------------
     Story sections, wishes and little delights
  ------------------------------------------------------- */

  function renderCountdowns() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [by, bm, bd] = CONTENT.birthday.split('-').map(Number);
    let next = new Date(today.getFullYear(), bm - 1, bd);
    if (next < today) next = new Date(today.getFullYear() + 1, bm - 1, bd);
    const daysToBirthday = Math.round((next - today) / 86400000);
    const [sy, sm, sd] = CONTENT.firstStage.split('-').map(Number);
    const daysOnStage = Math.max(0, Math.round((today - new Date(sy, sm - 1, sd)) / 86400000));
    el('birthdayCountdown').textContent = daysToBirthday;
    el('statDays').textContent = daysOnStage.toLocaleString('en-IN');
  }

  function renderMudras() {
    const list = el('mudraList');
    list.innerHTML = '';
    CONTENT.mudras.forEach((mudra, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'mudra-btn' + (index === 0 ? ' is-active' : '');
      button.textContent = mudra.name;
      button.addEventListener('click', () => {
        list.querySelectorAll('.mudra-btn').forEach((b) => b.classList.remove('is-active'));
        button.classList.add('is-active');
        el('mudraName').textContent = mudra.name;
        el('mudraMeaning').textContent = mudra.meaning;
        el('mudraSymbol').textContent = mudra.symbol;
      });
      list.appendChild(button);
    });
  }

  function playRaga(notes, button) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) { toast('Audio is not supported in this browser.', true); return; }
      const ctx = playRaga.ctx || (playRaga.ctx = new AudioCtx());
      if (ctx.state === 'suspended') ctx.resume();
      button.classList.add('is-playing');
      notes.forEach((midi, index) => {
        const start = ctx.currentTime + index * 0.26;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.09, start + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);
        osc.connect(gain).connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.32);
      });
      setTimeout(() => button.classList.remove('is-playing'), notes.length * 260 + 300);
    } catch (_) { toast('Could not play that raga right now.', true); }
  }

  function renderRagas() {
    const wall = el('ragaWall');
    wall.innerHTML = '';
    CONTENT.ragas.forEach((raga) => {
      const card = document.createElement('article');
      card.className = 'raga-card';
      card.innerHTML = '<div class="raga-card__top"><strong>' + escapeHtml(raga.name) + '</strong>' +
        '<button class="raga-play" type="button" aria-label="Play ' + escapeHtml(raga.name) + '">▶</button></div>' +
        '<p>' + escapeHtml(raga.mood) + '</p><small>' + escapeHtml(raga.name) + ' · a tiny taste</small>';
      card.querySelector('.raga-play').addEventListener('click', (event) => playRaga(raga.notes, event.currentTarget));
      wall.appendChild(card);
    });
  }

  function renderStory() {
    const timeline = el('timeline');
    timeline.innerHTML = '';
    CONTENT.timeline.forEach((item) => {
      const node = document.createElement('div');
      node.className = 'timeline-item';
      node.innerHTML = '<span>' + escapeHtml(item.year) + '</span><strong>' + escapeHtml(item.title) + '</strong><p>' + escapeHtml(item.text) + '</p>';
      timeline.appendChild(node);
    });

    const inspirations = el('inspirationGrid');
    inspirations.innerHTML = '';
    CONTENT.inspirations.forEach(item => {
      const node = document.createElement('div');
      node.className = 'quote-card';
      node.innerHTML = '<p>“' + escapeHtml(item.quote) + '”</p><small>— ' + escapeHtml(item.by) + '</small>';
      inspirations.appendChild(node);
    });

    const places = el('placeList');
    places.innerHTML = '';
    CONTENT.places.forEach((place, index) => {
      const node = document.createElement('div');
      node.className = 'place-item';
      node.innerHTML = '<span aria-hidden="true">📍</span><div><strong>' + escapeHtml(place.name) + '</strong>' + escapeHtml(place.note) + '</div>';
      places.appendChild(node);
    });

    const track = el('testimonialTrack');
    track.innerHTML = '';
    CONTENT.testimonials.forEach(item => {
      const node = document.createElement('div');
      node.className = 'testimonial-card';
      node.innerHTML = '<p>“' + escapeHtml(item.quote) + '”</p><small>— ' + escapeHtml(item.by) + '</small>';
      track.appendChild(node);
    });
  }

  function renderLearning() {
    el('currentLearning').textContent = localStorage.getItem(STORE.learning) || CONTENT.learning;
    el('learningInput').value = localStorage.getItem(STORE.learning) || CONTENT.learning;
    el('playlistInput').value = localStorage.getItem(STORE.playlist) || CONTENT.playlist;
    const box = el('playlistBox');
    const url = localStorage.getItem(STORE.playlist) || CONTENT.playlist;
    if (url) {
      const match = url.match(/(?:list=|v=)([\w-]+)/);
      const embed = match ? 'https://www.youtube.com/embed?listType=playlist&list=' + match[1] : url;
      box.innerHTML = '<iframe src="' + escapeHtml(embed) + '" title="Pre-stage playlist" allowfullscreen loading="lazy"></iframe>';
    } else {
      box.innerHTML = '<div class="playlist-empty">A playlist goes here — add a YouTube link in Settings ✦</div>';
    }
  }

  async function loadWishes() {
    let wishes = [];
    if (state.mode === 'cloud' && state.supabase) {
      const { data, error } = await state.supabase.from('anshika_wishes').select('*').order('created_at', { ascending: false });
      if (!error && data) wishes = data;
    }
    try {
      const local = JSON.parse(localStorage.getItem(STORE.wishes) || '[]');
      wishes = wishes.concat(local);
    } catch (_) { /* ignore broken local data */ }
    return wishes;
  }

  async function renderWishes() {
    const wishes = await loadWishes();
    ['wishList', 'publicWishList'].forEach((id) => {
      const wall = el(id);
      wall.innerHTML = '';
      if (!wishes.length) {
        const empty = document.createElement('p');
        empty.className = 'playlist-empty';
        empty.style.width = '100%';
        empty.textContent = 'No wishes yet — be the first to leave a petal 🌸';
        wall.appendChild(empty);
        return;
      }
      wishes.forEach((wish, index) => {
        const note = document.createElement('div');
        note.className = 'wish-note';
        note.style.setProperty('--tilt', ((index % 5) - 2) + 'deg');
        note.innerHTML = '<p>' + escapeHtml(wish.message) + '</p><strong>— ' + escapeHtml(wish.name) + '</strong>' +
          '<small>' + escapeHtml(formatDate(wish.created_at)) + '</small>';
        wall.appendChild(note);
      });
    });
  }

  async function addWish(name, message, errorBox) {
    if (!name.trim() || !message.trim()) {
      errorBox.textContent = 'Please add your name and a wish.';
      errorBox.hidden = false;
      return;
    }
    const wish = {
      id: uid(), name: name.trim().slice(0, 40), message: message.trim().slice(0, 300),
      created_at: new Date().toISOString()
    };
    let saved = false;
    if (state.mode === 'cloud' && state.supabase) {
      const { error } = await state.supabase.from('anshika_wishes').insert({
        name: wish.name, message: wish.message, created_at: wish.created_at
      });
      saved = !error;
    }
    if (!saved) {
      const local = JSON.parse(localStorage.getItem(STORE.wishes) || '[]');
      local.unshift(wish);
      localStorage.setItem(STORE.wishes, JSON.stringify(local.slice(0, 200)));
    }
    await renderWishes();
    toast('Your wish is on the wall 🌸');
  }

  function playChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = playChime.ctx || (playChime.ctx = new AudioCtx());
      if (ctx.state === 'suspended') ctx.resume();
      [0, 0.13, 0.28].forEach((delay, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = ctx.currentTime + delay;
        osc.type = 'sine';
        osc.frequency.value = [1320, 1760, 2200][i];
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.045, start + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.4);
        osc.connect(gain).connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.42);
      });
    } catch (_) { /* audio is a bonus */ }
  }

  /* -------------------------------------------------------
     24 reasons, raga quiz, time capsule, letter & voice note
  ------------------------------------------------------- */

  function renderReasons() {
    const grid = el('reasonGrid');
    grid.innerHTML = '';
    CONTENT.reasons.forEach((reason, index) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'reason-card';
      card.setAttribute('aria-label', 'Reason ' + (index + 1) + ' — tap to turn it over');
      card.innerHTML =
        '<span class="reason-card__inner">' +
          '<span class="reason-card__face reason-card__face--front">' +
            '<span>' + String(index + 1).padStart(2, '0') + '</span><small>tap to reveal</small>' +
          '</span>' +
          '<span class="reason-card__face reason-card__face--back">' +
            '<p>' + escapeHtml(reason) + '</p><small>♥</small>' +
          '</span>' +
        '</span>';
      card.addEventListener('click', () => card.classList.toggle('is-flipped'));
      grid.appendChild(card);
    });
  }

  function initQuiz() {
    if (initQuiz.ready) return;
    initQuiz.ready = true;
    const options = el('quizOptions');
    const feedback = el('quizFeedback');
    const scoreBox = el('quizScore');
    const playButton = el('quizPlay');
    let round = 0;
    let score = 0;
    let current = null;
    let locked = false;

    function nextQuestion() {
      if (round >= 5) {
        options.innerHTML = '';
        feedback.textContent = score === 5
          ? 'Perfect — you know your ragas better than you think! 🎶'
          : (score >= 3 ? 'Lovely ear! ' + score + ' out of 5 🎶' : 'You got ' + score + ' out of 5 — now go listen to them again 🎶');
        playButton.disabled = true;
        const again = document.createElement('button');
        again.type = 'button';
        again.className = 'quiz-option';
        again.textContent = 'Play again ↻';
        again.addEventListener('click', () => {
          round = 0; score = 0; current = null;
          scoreBox.textContent = '0';
          playButton.disabled = false;
          feedback.textContent = 'Press play to begin 🎶';
          options.innerHTML = '';
        });
        options.appendChild(again);
        return;
      }

      locked = false;
      round++;
      current = CONTENT.ragas[Math.floor(Math.random() * CONTENT.ragas.length)];
      feedback.textContent = 'Raga ' + round + ' of 5 — play, then choose.';
      options.innerHTML = '';
      CONTENT.ragas.forEach((raga) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'quiz-option';
        button.textContent = raga.name;
        button.addEventListener('click', () => answer(button, raga));
        options.appendChild(button);
      });
    }

    function answer(button, raga) {
      if (locked) return;
      locked = true;
      if (raga === current) {
        score++;
        scoreBox.textContent = score;
        button.classList.add('is-correct');
        feedback.textContent = 'Yes! It was ' + current.name + ' 🎶';
      } else {
        button.classList.add('is-wrong');
        feedback.textContent = 'Not quite — it was ' + current.name + '.';
        Array.from(options.children).forEach((node) => {
          if (node.textContent === current.name) node.classList.add('is-correct');
        });
      }
      Array.from(options.children).forEach((node) => { node.disabled = true; });
      setTimeout(nextQuestion, 1500);
    }

    playButton.addEventListener('click', () => {
      if (!current || feedback.textContent === 'Press play to begin 🎶') nextQuestion();
      if (current) playRaga(current.notes, playButton);
    });
  }

  function initCapsule() {
    const capsule = el('capsule');
    const now = new Date();
    const isBirthday = now.getMonth() === 8 && now.getDate() === 24;
    const forced = new URLSearchParams(window.location.search).get('capsule') === 'open';
    const open = isBirthday || forced;
    capsule.classList.toggle('is-ready', open);
    el('capsuleHint').textContent = open
      ? 'the seal is broken — open me 🎂'
      : 'sealed until 24 September · (peek? 😉)';
    capsule.addEventListener('click', () => {
      if (open) { openModal('capsuleModal'); return; }
      if (window.confirm('It’s sealed until 24 September… but I left you a little peek. Open it early? 😉')) {
        const eyebrow = document.querySelector('#capsuleModal .eyebrow');
        if (eyebrow) eyebrow.textContent = 'A sneak peek, just for you 😉';
        openModal('capsuleModal');
      }
    });
  }

  function initLetter() {
    const lines = el('letterLines');
    lines.innerHTML = CONTENT.letter.map((line) => '<p>' + escapeHtml(line) + '</p>').join('');
    const letter = el('letter');
    if (!('IntersectionObserver' in window)) {
      letter.classList.add('is-visible');
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          letter.classList.add('is-visible');
          observer.disconnect();
        }
      });
    }, { threshold: 0.2 });
    observer.observe(letter);
  }

  function readLetterAloud() {
    const button = el('readLetterBtn');
    if (!('speechSynthesis' in window)) {
      toast('Read-aloud is not supported in this browser.', true);
      return;
    }
    const reset = () => {
      button.textContent = '▶ Read me aloud';
      button.classList.remove('is-speaking');
    };
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
      reset();
      return;
    }
    const utterance = new SpeechSynthesisUtterance(CONTENT.letter.join(' '));
    utterance.rate = 0.92;
    utterance.pitch = 1.02;
    utterance.lang = 'en-IN';
    utterance.onend = reset;
    utterance.onerror = reset;
    button.textContent = '■ Stop reading';
    button.classList.add('is-speaking');
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  }

  let voiceObjectUrl = null;

  function formatTime(seconds) {
    const n = Math.max(0, Math.floor(Number(seconds) || 0));
    return Math.floor(n / 60) + ':' + String(n % 60).padStart(2, '0');
  }

  function setVoiceSource(src, hint) {
    const audio = el('voiceAudio');
    audio.src = src;
    el('voiceNote').classList.remove('is-empty');
    el('voiceNoteHint').textContent = hint || 'If you hear this, press play — it’s me, saying what I mean.';
    el('voicePlayBtn').textContent = '▶ Play voice note';
    el('voiceSeek').value = 0;
    el('voiceTime').textContent = '0:00';
  }

  async function initVoiceNote() {
    const audio = el('voiceAudio');
    if (!audio.dataset.bound) {
      audio.dataset.bound = '1';
      audio.addEventListener('timeupdate', () => {
        const percent = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
        el('voiceSeek').value = percent;
        el('voiceTime').textContent = formatTime(audio.currentTime) +
          (audio.duration ? ' / ' + formatTime(audio.duration) : '');
      });
      audio.addEventListener('loadedmetadata', () => {
        el('voiceTime').textContent = '0:00 / ' + formatTime(audio.duration);
      });
      audio.addEventListener('ended', () => {
        el('voicePlayBtn').textContent = '▶ Play voice note';
      });
      el('voiceSeek').addEventListener('input', (event) => {
        if (audio.duration) audio.currentTime = (Number(event.target.value) / 100) * audio.duration;
      });
      el('voicePlayBtn').addEventListener('click', async () => {
        if (!audio.src) { toast('Add a voice note in Settings first 🎧'); return; }
        if (audio.paused) {
          try {
            await audio.play();
            el('voicePlayBtn').textContent = '❚❚ Pause';
          } catch (_) { toast('Could not play the voice note.', true); }
        } else {
          audio.pause();
          el('voicePlayBtn').textContent = '▶ Play voice note';
        }
      });
    }

    // A newer upload in Settings wins; otherwise play the bundled note.
    if (localStorage.getItem(STORE.voiceCustom) === '1') {
      const url = localStorage.getItem(STORE.voiceUrl);
      if (url) { setVoiceSource(url); return; }
      try {
        const saved = await miscGet('voiceBlob');
        if (saved && saved.blob) {
          if (voiceObjectUrl) URL.revokeObjectURL(voiceObjectUrl);
          voiceObjectUrl = URL.createObjectURL(saved.blob);
          setVoiceSource(voiceObjectUrl, 'Your new voice note — press play 🎧');
          return;
        }
      } catch (_) { /* fall through to the bundled note */ }
    }

    setVoiceSource(DEFAULT_VOICE, 'I made this for you — press play whenever you like 🎧');
  }

  async function uploadVoiceFile(file) {
    if (!file) return;
    if (!/^audio\//.test(file.type) && !/\.(mp3|m4a|wav|ogg|aac)$/i.test(file.name)) {
      toast('Please choose an audio file.', true);
      return;
    }
    try {
      if (state.mode === 'cloud' && state.supabase) {
        const extension = (file.name.split('.').pop() || 'mp3').toLowerCase();
        const path = 'voice/anshika-voice.' + extension;
        const { error } = await state.supabase.storage.from(state.bucket)
          .upload(path, file, { contentType: file.type || 'audio/mpeg', upsert: true });
        if (error) throw error;
        const { data } = state.supabase.storage.from(state.bucket).getPublicUrl(path);
        localStorage.setItem(STORE.voiceUrl, data.publicUrl);
        localStorage.setItem(STORE.voiceCustom, '1');
        setVoiceSource(data.publicUrl, 'Your voice note — saved to the cloud 🎧');
      } else {
        await miscPut('voiceBlob', { blob: file, name: file.name });
        localStorage.removeItem(STORE.voiceUrl);
        localStorage.setItem(STORE.voiceCustom, '1');
        if (voiceObjectUrl) URL.revokeObjectURL(voiceObjectUrl);
        voiceObjectUrl = URL.createObjectURL(file);
        setVoiceSource(voiceObjectUrl, 'Your voice note — saved on this device 🎧');
      }
      toast('Voice note saved 🎧');
    } catch (error) {
      toast('Could not save the voice note: ' + error.message, true);
    }
  }

  /* -------------------------------------------------------
     Boot & bindings
  ------------------------------------------------------- */

  async function boot() {
    bindEvents();

    const cfg = savedCloudConfig();
    if (cfg.url && cfg.key && await ensureClient()) {
      try {
        await cloudPin();
        state.mode = 'cloud';
        state.cloudIssue = '';
      } catch (error) {
        state.mode = 'local';
        state.cloudIssue = 'Cloud not reachable (' + (error.message || 'check setup') + '). Using this device for now.';
      }
    }
    updateModePill();
    renderCountdowns();
    renderMudras();
    renderRagas();
    renderStory();
    renderLearning();
    renderWishes();
    renderReasons();
    initQuiz();
    initCapsule();
    initLetter();
    initVoiceNote();
    const hash = await currentPinHash();
    if (hash) { state.pinHash = hash; showLock(); } else { showSetup(); }
  }

  function bindEvents() {
    /* Gate */
    el('setupForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const pin = el('setupPin').value.trim();
      const confirm = el('setupPinConfirm').value.trim();
      const error = el('setupError');
      if (!/^\d{4,6}$/.test(pin)) { error.textContent = 'Please use 4 to 6 digits.'; error.hidden = false; return; }
      if (pin !== confirm) { error.textContent = 'Those PINs do not match.'; error.hidden = false; return; }
      error.hidden = true;
      await savePin(await hashPin(pin));
      el('setupForm').reset();
      showApp();
      toast('Your private space is ready. Welcome, Anshika ♥');
    });

    el('keypad').addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (!button) return;
      if (button.dataset.key !== undefined) {
        if (state.pinEntry.length >= 6) return;
        state.pinEntry += button.dataset.key;
      } else if (button.dataset.action === 'delete') {
        state.pinEntry = state.pinEntry.slice(0, -1);
      } else if (button.dataset.action === 'clear') {
        state.pinEntry = '';
      }
      el('lockError').hidden = true;
      renderPinDots();
    });

    document.addEventListener('keydown', (event) => {
      if (!el('lockScreen').hidden) {
        if (/^\d$/.test(event.key) && state.pinEntry.length < 6) {
          state.pinEntry += event.key;
          renderPinDots();
        } else if (event.key === 'Backspace') {
          state.pinEntry = state.pinEntry.slice(0, -1);
          renderPinDots();
        } else if (event.key === 'Enter') {
          unlock();
        }
        return;
      }
      if (event.key === 'Escape') {
        ['uploadModal', 'lightboxModal', 'settingsModal', 'noteModal', 'capsuleModal'].forEach(closeModal);
      }
      if (el('lightboxModal').hidden) return;
      if (event.key === 'ArrowLeft') stepLightbox(-1);
      if (event.key === 'ArrowRight') stepLightbox(1);
    });

    el('unlockBtn').addEventListener('click', unlock);

    el('forgotPinBtn').addEventListener('click', async () => {
      if (!window.confirm('Reset your PIN? Your memories will stay exactly where they are.')) return;
      localStorage.removeItem(STORE.pin);
      if (state.mode === 'cloud' && state.supabase) {
        await state.supabase.from('anshika_config').delete().eq('key', 'pin_hash');
      }
      showSetup();
    });

    /* Navigation */
    document.querySelectorAll('[data-filter]').forEach((button) => {
      button.addEventListener('click', () => {
        state.filter = button.dataset.filter;
        document.querySelectorAll('[data-filter]').forEach((b) => b.classList.toggle('is-active', b === button));
        render();
      });
    });

    document.querySelectorAll('[data-jump]').forEach((button) => {
      button.addEventListener('click', () => el(button.dataset.jump).scrollIntoView({ behavior: 'smooth' }));
    });

    document.querySelectorAll('[data-upload-category]').forEach((button) => {
      button.addEventListener('click', () => openUpload(button.dataset.uploadCategory));
    });

    ['uploadBtn', 'heroUploadBtn', 'emptyUploadBtn'].forEach((id) => el(id).addEventListener('click', () => openUpload()));
    el('refreshBtn').addEventListener('click', async () => { await loadItems(); toast('Gallery refreshed.'); });
    el('searchInput').addEventListener('input', (event) => { state.query = event.target.value; render(); });

    /* Modals */
    document.querySelectorAll('[data-close]').forEach((node) => {
      node.addEventListener('click', () => closeModal(node.dataset.close));
    });
    el('settingsBtn').addEventListener('click', () => {
      const cfg = savedCloudConfig();
      el('supabaseUrl').value = cfg.url;
      el('supabaseKey').value = cfg.key;
      el('supabaseBucket').value = localStorage.getItem(STORE.bucket) || 'anshika-media';
      el('learningInput').value = localStorage.getItem(STORE.learning) || CONTENT.learning;
      el('playlistInput').value = localStorage.getItem(STORE.playlist) || CONTENT.playlist;
      el('cloudError').hidden = true;
      openModal('settingsModal');
    });

    /* Upload */
    const dropzone = el('dropzone');
    dropzone.addEventListener('click', () => el('fileInput').click());
    dropzone.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); el('fileInput').click(); }
    });
    ['dragenter', 'dragover'].forEach((type) => dropzone.addEventListener(type, (event) => {
      event.preventDefault(); dropzone.classList.add('is-dragging');
    }));
    ['dragleave', 'drop'].forEach((type) => dropzone.addEventListener(type, (event) => {
      event.preventDefault(); dropzone.classList.remove('is-dragging');
    }));
    dropzone.addEventListener('drop', (event) => addFiles(event.dataTransfer.files));
    el('fileInput').addEventListener('change', (event) => addFiles(event.target.files));

    el('uploadForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!state.pendingFiles.length) return;
      const category = el('uploadCategory').value;
      const tag = el('uploadTag').value;
      const caption = el('uploadCaption').value.trim().slice(0, 120);
      const button = el('doUploadBtn');
      button.disabled = true;
      const notes = { cloud: 0, device: 0, compressed: 0 };

      for (let i = 0; i < state.pendingFiles.length; i++) {
        el('uploadBtnLabel').textContent = 'Uploading ' + (i + 1) + ' of ' + state.pendingFiles.length + '…';
        try {
          const result = await storeFile(state.pendingFiles[i], category, caption, tag);
          notes[result.where]++;
          if (result.compressed) notes.compressed++;
        } catch (error) {
          console.error(error);
          toast('Could not save "' + state.pendingFiles[i].name + '".', true);
        }
      }

      el('uploadBtnLabel').textContent = 'Upload';
      resetUploadModal();
      closeModal('uploadModal');
      await loadItems();

      const parts = [];
      if (notes.cloud) parts.push(notes.cloud + ' to your cloud');
      if (notes.device) parts.push(notes.device + ' on this device');
      if (notes.compressed) parts.push(notes.compressed + ' photo(s) made smaller');
      toast('Saved: ' + (parts.join(' · ') || 'nothing'));
    });

    /* Lightbox */
    el('galleryGrid').addEventListener('click', (event) => {
      const card = event.target.closest('.media-card');
      if (card) openLightbox(card.dataset.id);
    });
    el('lightPrev').addEventListener('click', () => stepLightbox(-1));
    el('lightNext').addEventListener('click', () => stepLightbox(1));
    el('editCaptionBtn').addEventListener('click', editCaption);
    el('downloadBtn').addEventListener('click', downloadCurrent);
    el('deleteBtn').addEventListener('click', deleteCurrent);

    /* Settings */
    el('cloudForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const url = el('supabaseUrl').value.trim().replace(/\/+$/, '');
      const key = el('supabaseKey').value.trim();
      const bucket = el('supabaseBucket').value.trim() || 'anshika-media';
      const errorBox = el('cloudError');
      errorBox.hidden = true;

      if (!/^https:\/\/.+\.supabase\.co$/i.test(url)) {
        errorBox.textContent = 'Enter your project URL like https://abcd.supabase.co';
        errorBox.hidden = false; return;
      }
      if (key.length < 30) {
        errorBox.textContent = 'That anon key looks too short. Copy it from Project Settings → API.';
        errorBox.hidden = false; return;
      }

      const client = window.supabase.createClient(url, key);
      try {
        const { data, error } = await client.from('anshika_config').select('value').eq('key', 'pin_hash').maybeSingle();
        if (error) throw error;
        if (!data && state.pinHash) {
          const { error: pinError } = await client.from('anshika_config')
            .upsert({ key: 'pin_hash', value: state.pinHash, updated_at: new Date().toISOString() }, { onConflict: 'key' });
          if (pinError) throw pinError;
        }
        localStorage.removeItem(STORE.disableCloud);
        localStorage.setItem(STORE.url, url);
        localStorage.setItem(STORE.key, key);
        localStorage.setItem(STORE.bucket, bucket);
        state.supabase = client;
        state.sbUrl = url;
        state.sbKey = key;
        state.bucket = bucket;
        state.mode = 'cloud';
        state.cloudIssue = '';
        updateModePill();
        closeModal('settingsModal');
        await loadItems();
        toast('Connected! Your gallery now travels with you.');
      } catch (error) {
        errorBox.textContent = 'Could not connect: ' + error.message + '. Did you run the setup SQL?';
        errorBox.hidden = false;
      }
    });

    el('useLocalBtn').addEventListener('click', () => {
      [STORE.url, STORE.key, STORE.bucket].forEach((key) => localStorage.removeItem(key));
      localStorage.setItem(STORE.disableCloud, '1');
      state.supabase = null; state.mode = 'local'; state.cloudIssue = '';
      closeModal('settingsModal');
      updateModePill();
      loadItems();
      toast('Switched to device-only storage.');
    });

    el('pinChangeForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const oldPin = el('oldPin').value.trim();
      const newPin = el('newPin').value.trim();
      const errorBox = el('pinChangeError');
      errorBox.hidden = true;
      if ((await hashPin(oldPin)) !== state.pinHash) {
        errorBox.textContent = 'That current PIN is not right.'; errorBox.hidden = false; return;
      }
      if (!/^\d{4,6}$/.test(newPin)) {
        errorBox.textContent = 'New PIN must be 4 to 6 digits.'; errorBox.hidden = false; return;
      }
      await savePin(await hashPin(newPin));
      el('pinChangeForm').reset();
      toast('PIN updated.');
    });

    el('lockNowBtn').addEventListener('click', () => {
      closeModal('settingsModal');
      showLock();
    });

    /* Delights */
    el('soundToggle').addEventListener('click', () => {
      state.soundOn = !state.soundOn;
      el('soundToggle').textContent = state.soundOn ? '🔔' : '🔕';
      if (state.soundOn) playChime();
    });
    el('diyaTrigger').addEventListener('click', () => openModal('noteModal'));
    el('testPrev').addEventListener('click', () => el('testimonialTrack').scrollBy({ left: -320, behavior: 'smooth' }));
    el('testNext').addEventListener('click', () => el('testimonialTrack').scrollBy({ left: 320, behavior: 'smooth' }));

    /* Wishes */
    el('wishForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      await addWish(el('wishName').value, el('wishMessage').value, el('wishError'));
      event.target.reset();
      el('wishError').hidden = true;
    });
    el('publicWishForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      await addWish(el('publicWishName').value, el('publicWishMessage').value, el('publicWishError'));
      event.target.reset();
      el('publicWishError').hidden = true;
    });
    el('publicWishBtn').addEventListener('click', () => {
      el('lockScreen').hidden = true;
      el('publicWishes').hidden = false;
      renderWishes();
    });
    el('backToLockBtn').addEventListener('click', () => {
      el('publicWishes').hidden = true;
      showLock();
    });

    /* Little details */
    el('detailsForm').addEventListener('submit', (event) => {
      event.preventDefault();
      localStorage.setItem(STORE.learning, el('learningInput').value.trim());
      localStorage.setItem(STORE.playlist, el('playlistInput').value.trim());
      renderLearning();
      toast('Little details saved.');
    });

    /* Letter + voice note */
    el('readLetterBtn').addEventListener('click', readLetterAloud);
    el('voiceInput').addEventListener('change', (event) => {
      uploadVoiceFile(event.target.files[0]);
      event.target.value = '';
    });
  }

  async function unlock() {
    if (!state.pinEntry) { el('lockError').textContent = 'Enter your PIN first.'; el('lockError').hidden = false; return; }
    const hash = await hashPin(state.pinEntry);
    if (hash === state.pinHash) {
      el('lockError').hidden = true;
      showApp();
    } else {
      el('lockError').textContent = 'Not quite. Try again, love.';
      el('lockError').hidden = false;
      el('pinDots').classList.remove('is-error');
      void el('pinDots').offsetWidth;
      el('pinDots').classList.add('is-error');
      state.pinEntry = '';
      setTimeout(() => { renderPinDots(); el('pinDots').classList.remove('is-error'); }, 450);
    }
  }

  boot();
})();
