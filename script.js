/* ==========================================================
   Mesa Tática — A Guerra da Feitiçaria
   VTT simples em JavaScript puro (sem dependências)
   Tudo é salvo no localStorage do navegador.
   ========================================================== */
(() => {
  'use strict';

  /* ---------------------------------------------------------
     Utilidades
  --------------------------------------------------------- */
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const num = (v, d = 0) => { const n = parseFloat(v); return Number.isFinite(n) ? n : d; };
  const STORE_KEY = 'vtt-rpg-v1';
  const SLOT_NAMES = ['Normal / Retrato', 'Transformação / Ação', 'Caído / Morto'];
  const STATUS_GLYPH = { bem: '✓', machucado: '!', morto: '✖' };
  const PALETTE = ['#5b4bd6', '#d6453f', '#1f9d6b', '#d98a1b', '#2c7bd6', '#b13fc4', '#0e9aa7', '#8a5a2b'];

  let toastTimer = null;
  function toast(msg, ms = 3200) {
    const el = $('toast');
    el.textContent = msg; el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, ms);
  }

  /* ---------------------------------------------------------
     Estado
  --------------------------------------------------------- */
  function defaultState() {
    return {
      v: 1,
      map: {
        src: '', natW: 0, natH: 0,
        cell: 70, offX: 0, offY: 0, cols: 30, rows: 20, mpc: 1.5,
        gridOn: true, gridColor: '#ffffff', gridOpacity: 0.25, snap: true,
      },
      tokens: [],
      nextId: 1,
      view: { x: 40, y: 40, k: 1, fitted: false },
      opts: { hideNpc: true },
    };
  }

  function normalizeToken(t, i = 0) {
    const photos = Array.isArray(t.photos) ? t.photos.slice(0, 3) : [];
    while (photos.length < 3) photos.push('');
    return {
      id: t.id ?? ('t' + Date.now() + i),
      name: String(t.name ?? 'Token').slice(0, 40),
      gx: num(t.gx, 0), gy: num(t.gy, 0),
      size: clamp(Math.round(num(t.size, 1)), 1, 4),
      photos: photos.map((p) => (typeof p === 'string' ? p : '')),
      photoIndex: clamp(Math.round(num(t.photoIndex, 0)), 0, 2),
      status: ['bem', 'machucado', 'morto'].includes(t.status) ? t.status : 'bem',
      hp: num(t.hp, 0), hpMax: Math.max(0, num(t.hpMax, 0)),
      ea: num(t.ea, 0), eaMax: Math.max(0, num(t.eaMax, 0)),
      color: /^#[0-9a-f]{6}$/i.test(t.color || '') ? t.color : PALETTE[i % PALETTE.length],
      notes: String(t.notes ?? ''),
      tipo: t.tipo === 'npc' ? 'npc' : 'jogador',
    };
  }

  function normalizeState(raw) {
    const d = defaultState();
    if (!raw || typeof raw !== 'object') return d;
    const m = Object.assign({}, d.map, raw.map || {});
    m.cell = clamp(num(m.cell, 70), 16, 400);
    m.cols = clamp(Math.round(num(m.cols, 30)), 4, 200);
    m.rows = clamp(Math.round(num(m.rows, 20)), 4, 200);
    m.mpc = clamp(num(m.mpc, 1.5), 0.1, 100);
    m.offX = num(m.offX, 0); m.offY = num(m.offY, 0);
    m.gridOpacity = clamp(num(m.gridOpacity, 0.25), 0.05, 1);
    m.natW = num(m.natW, 0); m.natH = num(m.natH, 0);
    m.src = typeof m.src === 'string' ? m.src : '';
    m.gridOn = m.gridOn !== false; m.snap = m.snap !== false;
    if (!/^#[0-9a-f]{6}$/i.test(m.gridColor || '')) m.gridColor = '#ffffff';
    const tokens = Array.isArray(raw.tokens) ? raw.tokens.map(normalizeToken) : [];
    const maxN = tokens.reduce((a, t) => Math.max(a, parseInt(String(t.id).replace(/\D/g, ''), 10) || 0), 0);
    const view = Object.assign({}, d.view, raw.view || {});
    const opts = { hideNpc: !(raw.opts && raw.opts.hideNpc === false) };
    return { v: 1, map: m, tokens, nextId: Math.max(num(raw.nextId, 1), maxN + 1), view, opts };
  }

  let state = defaultState();
  let hadSavedState = false;

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) { state = normalizeState(JSON.parse(raw)); hadSavedState = true; }
    } catch (e) { console.warn('Não foi possível ler o localStorage', e); }
  }

  let saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 200);
  }
  function saveNow() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
    catch (e) {
      console.warn(e);
      toast('⚠ Armazenamento do navegador cheio. Use imagens do repositório (caminho) em vez de enviar arquivos.', 6000);
    }
  }
  window.addEventListener('beforeunload', saveNow);

  /* ---------------------------------------------------------
     Geometria do mundo / transformação
  --------------------------------------------------------- */
  const viewport = $('viewport');
  const mapLayer = $('mapLayer');
  const tokenLayer = $('tokenLayer');
  const mapImg = $('mapImg');
  const mapBlank = $('mapBlank');
  const gridCanvas = $('gridCanvas');
  const fxCanvas = $('fxCanvas');

  function worldSize() {
    const m = state.map;
    if (m.src && m.natW > 0 && m.natH > 0) return { w: m.natW, h: m.natH };
    return { w: m.cols * m.cell, h: m.rows * m.cell };
  }
  const gridToWorld = (gx, gy) => ({ x: state.map.offX + gx * state.map.cell, y: state.map.offY + gy * state.map.cell });
  const worldToGrid = (x, y) => ({ gx: (x - state.map.offX) / state.map.cell, gy: (y - state.map.offY) / state.map.cell });

  function screenToWorld(sx, sy) {
    const v = state.view;
    return { x: (sx - v.x) / v.k, y: (sy - v.y) / v.k };
  }
  function vpPoint(e) {
    const r = viewport.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function applyView() {
    const v = state.view;
    const tf = `translate(${v.x}px, ${v.y}px) scale(${v.k})`;
    mapLayer.style.transform = tf;
    tokenLayer.style.transform = tf;
    tokenLayer.style.setProperty('--inv', String(1 / v.k));
    $('zoomLabel').textContent = Math.round(v.k * 100) + '%';
    drawGrid();
    drawFx();
    save();
  }

  function applyMapLayout() {
    const m = state.map;
    const { w, h } = worldSize();
    if (m.src && m.natW > 0) {
      mapImg.hidden = false;
      mapImg.style.width = w + 'px'; mapImg.style.height = h + 'px';
      mapBlank.style.display = 'none';
    } else {
      mapImg.hidden = true;
      mapBlank.style.display = 'block';
      mapBlank.style.width = w + 'px'; mapBlank.style.height = h + 'px';
    }
  }

  function fitView() {
    const { w, h } = worldSize();
    const vw = viewport.clientWidth, vh = viewport.clientHeight;
    if (!vw || !vh) return;
    const pad = 24;
    const k = clamp(Math.min((vw - pad * 2) / w, (vh - pad * 2) / h), 0.05, 4);
    state.view.k = k;
    state.view.x = (vw - w * k) / 2;
    state.view.y = (vh - h * k) / 2;
    state.view.fitted = true;
    applyView();
  }

  function zoomAt(factor, sx, sy) {
    const v = state.view;
    const nk = clamp(v.k * factor, 0.05, 6);
    const wx = (sx - v.x) / v.k, wy = (sy - v.y) / v.k;
    v.k = nk; v.x = sx - wx * nk; v.y = sy - wy * nk;
    applyView();
  }
  function zoomCenter(factor) { zoomAt(factor, viewport.clientWidth / 2, viewport.clientHeight / 2); }

  /* ---------------------------------------------------------
     Canvas: grade + régua
  --------------------------------------------------------- */
  function sizeCanvas(c) {
    const dpr = window.devicePixelRatio || 1;
    const w = viewport.clientWidth, h = viewport.clientHeight;
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    }
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return ctx;
  }

  function drawGrid() {
    const ctx = sizeCanvas(gridCanvas);
    const m = state.map, v = state.view;
    const { w, h } = worldSize();
    // borda do mapa
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(v.x) + .5, Math.round(v.y) + .5, Math.round(w * v.k), Math.round(h * v.k));
    if (!m.gridOn) return;
    const step = m.cell * v.k;
    if (step < 7) return; // denso demais para desenhar
    ctx.strokeStyle = m.gridColor; ctx.globalAlpha = m.gridOpacity; ctx.lineWidth = 1;
    ctx.beginPath();
    const i0 = Math.ceil((0 - m.offX) / m.cell), i1 = Math.floor((w - m.offX) / m.cell);
    const j0 = Math.ceil((0 - m.offY) / m.cell), j1 = Math.floor((h - m.offY) / m.cell);
    const top = v.y, bottom = v.y + h * v.k, left = v.x, right = v.x + w * v.k;
    for (let i = i0; i <= i1; i++) {
      const sx = Math.round(v.x + (m.offX + i * m.cell) * v.k) + .5;
      ctx.moveTo(sx, top); ctx.lineTo(sx, bottom);
    }
    for (let j = j0; j <= j1; j++) {
      const sy = Math.round(v.y + (m.offY + j * m.cell) * v.k) + .5;
      ctx.moveTo(left, sy); ctx.lineTo(right, sy);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // régua
  let rulerMode = false;
  let ruler = null; // {a:{x,y}, b:{x,y}} em coordenadas do mundo

  function drawFx() {
    const ctx = sizeCanvas(fxCanvas);
    const label = $('rulerLabel');
    if (!ruler) { label.hidden = true; return; }
    const v = state.view, m = state.map;
    const ax = v.x + ruler.a.x * v.k, ay = v.y + ruler.a.y * v.k;
    const bx = v.x + ruler.b.x * v.k, by = v.y + ruler.b.y * v.k;
    ctx.lineWidth = 3; ctx.strokeStyle = '#ffd166'; ctx.lineCap = 'round';
    ctx.shadowColor = '#000'; ctx.shadowBlur = 6;
    ctx.setLineDash([10, 7]);
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffd166';
    ctx.beginPath(); ctx.arc(ax, ay, 6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(bx, by, 6, 0, Math.PI * 2); ctx.fill();
    const dist = Math.hypot(ruler.b.x - ruler.a.x, ruler.b.y - ruler.a.y) / m.cell;
    const fmt = (n) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1, minimumFractionDigits: 0 });
    label.textContent = `${fmt(dist)} casas · ${fmt(dist * m.mpc)} m`;
    label.style.left = (bx) + 'px'; label.style.top = (by) + 'px';
    label.hidden = false;
  }

  /* ---------------------------------------------------------
     Tokens (renderização)
  --------------------------------------------------------- */
  const tokenEls = new Map();
  let selectedId = null;

  function faceSlot(t) {
    if (t.status === 'morto' && t.photos[2]) return 2;
    if (t.photos[t.photoIndex]) return t.photoIndex;
    const first = t.photos.findIndex(Boolean);
    return first; // -1 se nenhuma
  }

  // tokens NPC/vilão têm PV, EA e anotações escondidos quando a opção global está ligada
  const isHidden = (t) => t.tipo === 'npc' && state.opts.hideNpc;

  function findToken(id) { return state.tokens.find((t) => String(t.id) === String(id)); }

  function renderToken(t) {
    const m = state.map;
    let el = tokenEls.get(t.id);
    if (!el) {
      el = document.createElement('div');
      el.className = 'token';
      el.dataset.id = t.id;
      tokenEls.set(t.id, el);
      tokenLayer.appendChild(el);
    }
    const px = t.size * m.cell;
    const pos = gridToWorld(t.gx, t.gy);
    el.style.left = pos.x + 'px'; el.style.top = pos.y + 'px';
    el.style.width = px + 'px'; el.style.height = px + 'px';
    el.style.setProperty('--tcolor', t.color);
    el.style.setProperty('--bw', Math.max(3, px * 0.055) + 'px');
    el.style.setProperty('--fs', px * 0.42 + 'px');
    el.style.setProperty('--bs', Math.max(18, px * 0.28) + 'px');
    el.style.setProperty('--barh', Math.max(4, px * 0.07) + 'px');
    el.className = 'token st-' + t.status + (t.id === selectedId ? ' selected' : '');

    const slot = faceSlot(t);
    const src = slot >= 0 ? t.photos[slot] : '';
    const key = src + '|' + t.name.charAt(0);
    let html = '';
    if (el.dataset.face !== key || !el.firstChild) {
      el.dataset.face = key;
      el.innerHTML = '<div class="face"></div><div class="badge"></div><div class="bars"></div><div class="label"></div>';
      const face = el.firstChild;
      if (src) {
        const img = new Image();
        img.draggable = false; img.alt = '';
        img.onerror = () => { img.remove(); face.insertAdjacentHTML('beforeend', `<span class="initial">${escapeHtml((t.name || '?').charAt(0).toUpperCase())}</span>`); };
        img.src = src;
        face.appendChild(img);
      } else {
        face.innerHTML = `<span class="initial">${escapeHtml((t.name || '?').charAt(0).toUpperCase())}</span>`;
      }
    }
    el.querySelector('.badge').textContent = STATUS_GLYPH[t.status];
    const lab = el.querySelector('.label');
    lab.textContent = t.name;
    lab.style.fontSize = `calc(12px * var(--inv, 1))`;
    lab.style.padding = `calc(1px * var(--inv, 1)) calc(8px * var(--inv, 1))`;
    const bars = el.querySelector('.bars');
    let b = '';
    if (!isHidden(t) && t.hpMax > 0) b += `<div class="bar hp"><i style="width:${clamp((t.hp / t.hpMax) * 100, 0, 100)}%"></i></div>`;
    if (!isHidden(t) && t.eaMax > 0) b += `<div class="bar ea"><i style="width:${clamp((t.ea / t.eaMax) * 100, 0, 100)}%"></i></div>`;
    bars.innerHTML = b;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function renderAllTokens() {
    const ids = new Set(state.tokens.map((t) => t.id));
    for (const [id, el] of tokenEls) if (!ids.has(id)) { el.remove(); tokenEls.delete(id); }
    state.tokens.forEach((t) => { renderToken(t); tokenLayer.appendChild(tokenEls.get(t.id)); });
    $('emptyHint').hidden = state.tokens.length > 0;
  }

  function snapToken(t) {
    if (!state.map.snap) return;
    t.gx = Math.round(t.gx); t.gy = Math.round(t.gy);
  }

  function createToken(base = {}) {
    const c = screenToWorld(viewport.clientWidth / 2, viewport.clientHeight / 2);
    const g = worldToGrid(c.x, c.y);
    const t = normalizeToken(Object.assign({
      id: 't' + state.nextId++, name: 'Novo token',
      gx: Math.floor(g.gx), gy: Math.floor(g.gy),
      color: PALETTE[state.tokens.length % PALETTE.length],
    }, base), state.tokens.length);
    // evita empilhar exatamente no mesmo lugar
    let guard = 0;
    while (state.tokens.some((o) => o.gx === t.gx && o.gy === t.gy) && guard++ < 50) { t.gx += 1; if (guard % 6 === 0) { t.gx -= 6; t.gy += 1; } }
    state.tokens.push(t);
    renderAllTokens();
    save();
    return t;
  }

  /* ---------------------------------------------------------
     Interação: pan, zoom, arrastar tokens, régua
  --------------------------------------------------------- */
  const pointers = new Map();
  let mode = 'none'; // 'pan' | 'drag' | 'ruler' | 'pinch'
  let panStart = null, dragState = null, pinch = null;

  viewport.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.panel') || e.target.closest('#rulerLabel')) return;
    pointers.set(e.pointerId, vpPoint(e));
    try { viewport.setPointerCapture(e.pointerId); } catch (_) {}

    if (pointers.size === 2) { // pinça
      cancelCurrent();
      const [p1, p2] = [...pointers.values()];
      const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      pinch = { d0: Math.hypot(p1.x - p2.x, p1.y - p2.y) || 1, k0: state.view.k, w: screenToWorld(mid.x, mid.y) };
      mode = 'pinch';
      return;
    }
    if (pointers.size > 2) return;

    const p = vpPoint(e);
    const tokEl = e.target.closest('.token');

    if (rulerMode && (e.button === 0 || e.pointerType !== 'mouse')) {
      let w = screenToWorld(p.x, p.y);
      if (tokEl) {
        const t = findToken(tokEl.dataset.id);
        const pos = gridToWorld(t.gx, t.gy), half = (t.size * state.map.cell) / 2;
        w = { x: pos.x + half, y: pos.y + half };
      } else if (state.map.snap) {
        w = snapPointToCellCenter(w);
      }
      ruler = { a: w, b: w };
      mode = 'ruler'; drawFx();
      return;
    }

    if (tokEl && e.button === 0) {
      const t = findToken(tokEl.dataset.id);
      if (!t) return;
      selectToken(t.id);
      dragState = { id: t.id, sx: p.x, sy: p.y, gx0: t.gx, gy0: t.gy, moved: false, el: tokEl };
      mode = 'drag';
      return;
    }

    if (e.button === 0 || e.button === 1 || e.button === 2 || e.pointerType !== 'mouse') {
      if (!tokEl) selectToken(null);
      panStart = { sx: p.x, sy: p.y, vx: state.view.x, vy: state.view.y };
      mode = 'pan';
      viewport.classList.add('panning');
    }
  });

  function snapPointToCellCenter(w) {
    const m = state.map;
    const gx = Math.floor((w.x - m.offX) / m.cell), gy = Math.floor((w.y - m.offY) / m.cell);
    return { x: m.offX + (gx + 0.5) * m.cell, y: m.offY + (gy + 0.5) * m.cell };
  }

  viewport.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    const p = vpPoint(e);
    pointers.set(e.pointerId, p);

    if (mode === 'pinch' && pointers.size >= 2 && pinch) {
      const [p1, p2] = [...pointers.values()];
      const d = Math.hypot(p1.x - p2.x, p1.y - p2.y) || 1;
      const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      const k = clamp(pinch.k0 * (d / pinch.d0), 0.05, 6);
      state.view.k = k;
      state.view.x = mid.x - pinch.w.x * k;
      state.view.y = mid.y - pinch.w.y * k;
      applyView();
      return;
    }
    if (pointers.size > 1) return;

    if (mode === 'drag' && dragState) {
      const dx = p.x - dragState.sx, dy = p.y - dragState.sy;
      if (!dragState.moved && Math.hypot(dx, dy) < 5) return;
      if (!dragState.moved) { dragState.moved = true; dragState.el.classList.add('dragging'); }
      const t = findToken(dragState.id);
      t.gx = dragState.gx0 + dx / state.view.k / state.map.cell;
      t.gy = dragState.gy0 + dy / state.view.k / state.map.cell;
      const pos = gridToWorld(t.gx, t.gy);
      dragState.el.style.left = pos.x + 'px'; dragState.el.style.top = pos.y + 'px';
    } else if (mode === 'pan' && panStart) {
      state.view.x = panStart.vx + (p.x - panStart.sx);
      state.view.y = panStart.vy + (p.y - panStart.sy);
      applyView();
    } else if (mode === 'ruler' && ruler) {
      let w = screenToWorld(p.x, p.y);
      if (state.map.snap) w = snapPointToCellCenter(w);
      ruler.b = w; drawFx();
    }
  });

  function endPointer(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    try { viewport.releasePointerCapture(e.pointerId); } catch (_) {}

    if (mode === 'drag' && dragState) {
      const t = findToken(dragState.id);
      const el = dragState.el;
      el.classList.remove('dragging');
      if (dragState.moved && t) {
        snapToken(t);
        // traz para a frente
        state.tokens = state.tokens.filter((o) => o !== t).concat(t);
        renderAllTokens(); save();
      } else if (t && e.type === 'pointerup') {
        openModal(t.id);
      }
      dragState = null;
    }
    if (mode === 'pan') { viewport.classList.remove('panning'); panStart = null; }
    if (mode === 'pinch') { if (pointers.size < 2) { pinch = null; mode = 'none'; } }
    else mode = 'none';
  }
  viewport.addEventListener('pointerup', endPointer);
  viewport.addEventListener('pointercancel', endPointer);

  function cancelCurrent() {
    if (dragState) {
      const t = findToken(dragState.id);
      if (t) { t.gx = dragState.gx0; t.gy = dragState.gy0; renderToken(t); }
      dragState.el.classList.remove('dragging'); dragState = null;
    }
    panStart = null; viewport.classList.remove('panning');
  }

  viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const p = vpPoint(e);
    const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0016));
    zoomAt(factor, p.x, p.y);
  }, { passive: false });
  viewport.addEventListener('contextmenu', (e) => e.preventDefault());

  function selectToken(id) {
    selectedId = id;
    for (const t of state.tokens) { const el = tokenEls.get(t.id); if (el) el.classList.toggle('selected', t.id === id); }
  }

  function setRulerMode(on) {
    rulerMode = on;
    $('btnRuler').classList.toggle('on', on);
    viewport.classList.toggle('ruler', on);
    if (!on) { ruler = null; drawFx(); }
  }

  /* ---------------------------------------------------------
     Imagens: upload com compressão
  --------------------------------------------------------- */
  function fileToDataURL(file, maxDim, mime, quality) {
    return new Promise((resolve, reject) => {
      if (file.type === 'image/svg+xml' && file.size < 400 * 1024) {
        const r = new FileReader();
        r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(file); return;
      }
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const s = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.naturalWidth * s));
        c.height = Math.max(1, Math.round(img.naturalHeight * s));
        const ctx = c.getContext('2d');
        if (mime === 'image/jpeg') { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, c.width, c.height); }
        ctx.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL(mime, quality));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('imagem inválida')); };
      img.src = url;
    });
  }

  /* ---------------------------------------------------------
     Mapa: painel
  --------------------------------------------------------- */
  function setMapSource(src) {
    const m = state.map;
    if (!src) {
      m.src = ''; m.natW = 0; m.natH = 0;
      mapImg.removeAttribute('src');
      applyMapLayout(); renderAllTokens(); fitView(); save();
      return;
    }
    const probe = new Image();
    probe.onload = () => {
      m.src = src; m.natW = probe.naturalWidth || 1400; m.natH = probe.naturalHeight || 1000;
      mapImg.src = src;
      applyMapLayout(); renderAllTokens(); fitView(); save(); syncMapPanel();
    };
    probe.onerror = () => toast('Não consegui carregar a imagem: ' + (src.length > 60 ? src.slice(0, 57) + '…' : src), 5000);
    probe.src = src;
  }

  function syncMapPanel() {
    const m = state.map;
    $('mapSrc').value = m.src.startsWith('data:') ? '' : m.src;
    $('mapSrc').placeholder = m.src.startsWith('data:') ? '(imagem enviada do computador)' : 'img/mapas/meu-mapa.png';
    $('cellSize').value = m.cell; $('metersPerCell').value = m.mpc;
    $('offX').value = m.offX; $('offY').value = m.offY;
    $('cols').value = m.cols; $('rows').value = m.rows;
    $('gridColor').value = m.gridColor; $('gridOpacity').value = m.gridOpacity;
    $('snap').checked = m.snap;
    $('btnGrid').classList.toggle('on', m.gridOn);
    const noImg = !(m.src && m.natW > 0);
    $('cols').disabled = !noImg; $('rows').disabled = !noImg;
  }

  function bindMapPanel() {
    const M = () => state.map;
    const upd = () => { applyMapLayout(); renderAllTokens(); drawGrid(); drawFx(); save(); };
    $('cellSize').addEventListener('input', (e) => { M().cell = clamp(num(e.target.value, 70), 16, 400); upd(); });
    $('metersPerCell').addEventListener('input', (e) => { M().mpc = clamp(num(e.target.value, 1.5), 0.1, 100); save(); });
    $('offX').addEventListener('input', (e) => { M().offX = num(e.target.value); upd(); });
    $('offY').addEventListener('input', (e) => { M().offY = num(e.target.value); upd(); });
    $('cols').addEventListener('input', (e) => { M().cols = clamp(Math.round(num(e.target.value, 30)), 4, 200); upd(); });
    $('rows').addEventListener('input', (e) => { M().rows = clamp(Math.round(num(e.target.value, 20)), 4, 200); upd(); });
    $('gridColor').addEventListener('input', (e) => { M().gridColor = e.target.value; drawGrid(); save(); });
    $('gridOpacity').addEventListener('input', (e) => { M().gridOpacity = num(e.target.value, .25); drawGrid(); save(); });
    $('snap').addEventListener('change', (e) => { M().snap = e.target.checked; save(); });
    $('btnMapApply').addEventListener('click', () => { const v = $('mapSrc').value.trim(); if (v) setMapSource(v); else toast('Digite o caminho da imagem (ex.: img/mapas/coliseu.png).'); });
    $('mapSrc').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('btnMapApply').click(); });
    $('btnMapClear').addEventListener('click', () => setMapSource(''));
    $('mapFile').addEventListener('change', async (e) => {
      const f = e.target.files[0]; e.target.value = '';
      if (!f) return;
      try {
        const data = await fileToDataURL(f, 2600, 'image/jpeg', 0.86);
        setMapSource(data);
      } catch (err) { toast('Não foi possível ler essa imagem.'); }
    });
    $('libMaps').addEventListener('change', (e) => {
      const i = e.target.value; e.target.value = '';
      if (i === '') return;
      const item = library.mapas[+i];
      if (!item) return;
      if (item.cell) M().cell = clamp(num(item.cell, 70), 16, 400);
      if (item.metrosPorQuadrado) M().mpc = num(item.metrosPorQuadrado, 1.5);
      M().offX = num(item.offX, 0); M().offY = num(item.offY, 0);
      setMapSource(item.src); syncMapPanel();
    });
  }

  /* ---------------------------------------------------------
     Biblioteca (data/biblioteca.json)
  --------------------------------------------------------- */
  let library = { mapas: [], personagens: [] };
  async function loadLibrary() {
    try {
      const r = await fetch('data/biblioteca.json', { cache: 'no-store' });
      if (!r.ok) return;
      const j = await r.json();
      library.mapas = Array.isArray(j.mapas) ? j.mapas : [];
      library.personagens = Array.isArray(j.personagens) ? j.personagens : [];
    } catch (e) { /* sem biblioteca: tudo bem (ex.: abrindo via file://) */ }
    library.mapas.forEach((mp, i) => $('libMaps').add(new Option(mp.nome || mp.src, i)));
    // personagens agrupados (campo "grupo" no JSON); sem grupo ficam soltos no menu
    const sel = $('libChars'), groups = new Map();
    library.personagens.forEach((p, i) => {
      const g = p.grupo || '';
      let parent = sel;
      if (g) {
        if (!groups.has(g)) { const og = document.createElement('optgroup'); og.label = g; sel.appendChild(og); groups.set(g, og); }
        parent = groups.get(g);
      }
      parent.appendChild(new Option(p.nome || 'Personagem', i));
    });
  }

  // testa se uma imagem existe (evita fotos quebradas quando o arquivo ainda não foi enviado)
  function probeImage(src) {
    // tenta o caminho informado e, se falhar, as outras extensões comuns (png, jpg, jpeg, webp)
    const m = /^(.*)\.(png|jpe?g|webp)$/i.exec(src || '');
    const candidates = m ? [src, ...['png', 'jpg', 'jpeg', 'webp'].map((x) => `${m[1]}.${x}`).filter((c) => c !== src)] : [src];
    const tryOne = (c) => new Promise((resolve) => {
      if (!c) return resolve('');
      const im = new Image();
      im.onload = () => resolve(c);
      im.onerror = () => resolve('');
      im.src = c;
    });
    return candidates.reduce((p, c) => p.then((found) => found || tryOne(c)), Promise.resolve(''));
  }

  /* ---------------------------------------------------------
     Modal do personagem
  --------------------------------------------------------- */
  let curId = null, curSlot = 0, modalReveal = false;
  const modal = $('modal');

  function openModal(id) {
    const t = findToken(id); if (!t) return;
    curId = id;
    const s = faceSlot(t);
    curSlot = s >= 0 ? s : 0;
    modalReveal = false; // dados de NPC sempre abrem ocultos
    modal.hidden = false;
    renderModal();
  }
  function closeModal() { modal.hidden = true; curId = null; modalReveal = false; }

  function renderModal(onlyGallery = false) {
    const t = findToken(curId); if (!t) return;
    const src = t.photos[curSlot];
    const big = $('mBigImg');
    if (src) { big.hidden = false; big.src = src; $('mBigEmpty').hidden = true; }
    else { big.hidden = true; big.removeAttribute('src'); $('mBigEmpty').hidden = false; }
    big.onerror = () => { big.hidden = true; $('mBigEmpty').hidden = false; $('mBigEmpty').textContent = 'Imagem não encontrada'; };
    big.onload = () => { big.hidden = false; $('mBigEmpty').hidden = true; };
    $('mBigEmpty').textContent = 'Sem foto';
    const prev = document.querySelector('.m-preview');
    prev.className = 'm-preview st-' + t.status;
    $('mSlotBadge').textContent = `${curSlot + 1}/3 · ${SLOT_NAMES[curSlot]}`;
    $('mSlotName').textContent = `Foto ${curSlot + 1} — ${SLOT_NAMES[curSlot]}`;
    const isData = (src || '').startsWith('data:');
    $('mSlotSrc').value = isData ? '' : (src || '');
    $('mSlotSrc').placeholder = isData ? '(imagem enviada do computador)' : 'caminho (img/personagens/nome.png) ou URL';

    const onMap = faceSlot(t);
    const th = $('mThumbs'); th.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const b = document.createElement('button');
      b.className = 'thumb' + (i === curSlot ? ' active' : '') + (i === onMap ? ' onmap' : '');
      b.title = SLOT_NAMES[i];
      b.innerHTML = t.photos[i] ? `<img src="${escapeHtml(t.photos[i])}" alt="" draggable="false">` : '<span class="empty">＋</span>';
      b.innerHTML += `<span class="cap">${SLOT_NAMES[i].split(' / ')[0]}</span>`;
      const im = b.querySelector('img'); if (im) im.onerror = () => { im.remove(); };
      b.addEventListener('click', () => { curSlot = i; renderModal(true); });
      th.appendChild(b);
    }
    document.querySelectorAll('#mStatus .st').forEach((b) => b.classList.toggle('active', b.dataset.status === t.status));
    if (onlyGallery) return;
    $('mName').value = t.name;
    $('mHp').value = t.hp; $('mHpMax').value = t.hpMax;
    $('mEa').value = t.ea; $('mEaMax').value = t.eaMax;
    $('mSize').value = String(t.size);
    $('mColor').value = t.color;
    $('mNotes').value = t.notes;
    $('mTipo').value = t.tipo;
    applyPrivacy(t);
  }

  // mostra/esconde PV, EA e anotações no modal conforme o tipo do token e a opção global
  function applyPrivacy(t) {
    const npcMode = t.tipo === 'npc' && state.opts.hideNpc;
    const hide = npcMode && !modalReveal;
    $('mPrivacy').hidden = !npcMode;
    $('mStatsBox').hidden = hide;
    $('mNotesBox').hidden = hide;
    $('mPrivacyText').textContent = hide ? '🔒 PV, EA e anotações ocultos para a mesa.' : '🔓 Dados do mestre visíveis (some ao fechar a ficha).';
    $('mReveal').textContent = hide ? '👁 Mostrar (mestre)' : '🙈 Ocultar';
  }

  function touch(t) { renderToken(t); save(); }

  function bindModal() {
    const T = () => findToken(curId);
    $('mClose').addEventListener('click', closeModal);
    $('mDone').addEventListener('click', closeModal);
    modal.addEventListener('pointerdown', (e) => { if (e.target === modal) closeModal(); });
    $('mPrev').addEventListener('click', () => { curSlot = (curSlot + 2) % 3; renderModal(true); });
    $('mNext').addEventListener('click', () => { curSlot = (curSlot + 1) % 3; renderModal(true); });

    $('mName').addEventListener('input', (e) => { const t = T(); if (!t) return; t.name = e.target.value || 'Sem nome'; touch(t); });
    $('mHp').addEventListener('input', (e) => { const t = T(); if (!t) return; t.hp = num(e.target.value); touch(t); });
    $('mHpMax').addEventListener('input', (e) => { const t = T(); if (!t) return; t.hpMax = Math.max(0, num(e.target.value)); touch(t); });
    $('mEa').addEventListener('input', (e) => { const t = T(); if (!t) return; t.ea = num(e.target.value); touch(t); });
    $('mEaMax').addEventListener('input', (e) => { const t = T(); if (!t) return; t.eaMax = Math.max(0, num(e.target.value)); touch(t); });
    $('mSize').addEventListener('change', (e) => { const t = T(); if (!t) return; t.size = +e.target.value; touch(t); });
    $('mColor').addEventListener('input', (e) => { const t = T(); if (!t) return; t.color = e.target.value; touch(t); });
    $('mNotes').addEventListener('input', (e) => { const t = T(); if (!t) return; t.notes = e.target.value; save(); });
    $('mTipo').addEventListener('change', (e) => {
      const t = T(); if (!t) return;
      t.tipo = e.target.value === 'npc' ? 'npc' : 'jogador';
      modalReveal = false; touch(t); applyPrivacy(t);
    });
    $('mReveal').addEventListener('click', () => { const t = T(); if (!t) return; modalReveal = !modalReveal; applyPrivacy(t); });

    $('mStatus').addEventListener('click', (e) => {
      const b = e.target.closest('.st'); const t = T(); if (!b || !t) return;
      t.status = b.dataset.status;
      if (t.status === 'morto' && t.photos[2]) curSlot = 2;
      touch(t); renderModal(true);
    });

    const setSlot = (value) => {
      const t = T(); if (!t) return;
      t.photos[curSlot] = value;
      if (value && !t.photos[t.photoIndex]) t.photoIndex = curSlot;
      touch(t); renderModal(true);
    };
    $('mSlotSrc').addEventListener('change', (e) => setSlot(e.target.value.trim()));
    $('mSlotSrc').addEventListener('keydown', (e) => { if (e.key === 'Enter') e.target.blur(); });
    $('mSlotClear').addEventListener('click', () => setSlot(''));
    $('mSlotFile').addEventListener('change', async (e) => {
      const f = e.target.files[0]; e.target.value = ''; if (!f) return;
      try { setSlot(await fileToDataURL(f, 420, 'image/webp', 0.86)); }
      catch (err) { toast('Não foi possível ler essa imagem.'); }
    });
    $('mUseOnMap').addEventListener('click', () => {
      const t = T(); if (!t) return;
      if (!t.photos[curSlot]) { toast('Essa posição ainda não tem foto.'); return; }
      t.photoIndex = curSlot;
      if (t.status === 'morto' && curSlot !== 2) toast('Obs.: enquanto o estado for "Morto", o mapa mostra a foto 3 (se existir).');
      touch(t); renderModal(true);
    });

    $('mDuplicate').addEventListener('click', () => {
      const t = T(); if (!t) return;
      const c = createToken(Object.assign({}, JSON.parse(JSON.stringify(t)), { id: 't' + state.nextId++, name: t.name + ' (cópia)', gx: t.gx + t.size, gy: t.gy }));
      openModal(c.id);
    });
    $('mDelete').addEventListener('click', () => {
      const t = T(); if (!t) return;
      if (!confirm(`Remover "${t.name}" do mapa?`)) return;
      removeToken(t.id); closeModal();
    });
  }

  function removeToken(id) {
    state.tokens = state.tokens.filter((t) => String(t.id) !== String(id));
    if (selectedId === id) selectedId = null;
    renderAllTokens(); save();
  }

  /* ---------------------------------------------------------
     Dados
  --------------------------------------------------------- */
  const rollRe = /^\s*(\d*)d(\d+)(?:(kh|kl)(\d*))?\s*([+-]\s*\d+)?\s*$/i;
  function rollDice(expr) {
    const m = rollRe.exec(expr);
    if (!m) return null;
    const n = clamp(parseInt(m[1] || '1', 10), 1, 100);
    const sides = clamp(parseInt(m[2], 10), 2, 1000);
    const mod = m[5] ? parseInt(m[5].replace(/\s+/g, ''), 10) : 0;
    const rolls = Array.from({ length: n }, () => 1 + Math.floor(Math.random() * sides));
    let kept = rolls.map((v, i) => ({ v, i, keep: true }));
    if (m[3]) {
      const k = clamp(parseInt(m[4] || '1', 10), 1, n);
      const order = [...kept].sort((a, b) => (m[3].toLowerCase() === 'kh' ? b.v - a.v : a.v - b.v));
      const keepIdx = new Set(order.slice(0, k).map((o) => o.i));
      kept = kept.map((o) => ({ ...o, keep: keepIdx.has(o.i) }));
    }
    const sum = kept.filter((o) => o.keep).reduce((a, o) => a + o.v, 0);
    return { n, sides, mod, kept, total: sum + mod, label: `${n}d${sides}${m[3] ? m[3].toLowerCase() + (m[4] || '1') : ''}${mod ? (mod > 0 ? '+' + mod : mod) : ''}` };
  }
  function doRoll(expr) {
    const r = rollDice(expr);
    if (!r) { toast('Fórmula inválida. Exemplos: 1d20, 4d20kh1+9, 3d10+9'); return; }
    const li = document.createElement('li');
    const detail = r.kept.map((o) => (o.keep ? `${o.v}` : `<s>${o.v}</s>`)).join(', ');
    let cls = '';
    if (r.n === 1 && r.sides === 20) cls = r.kept[0].v === 20 ? 'crit' : (r.kept[0].v === 1 ? 'fail' : '');
    li.innerHTML = `<span class="total ${cls}">${r.total}</span><span class="expr">${escapeHtml(r.label)}</span><span class="detail">[${detail}]${r.mod ? ' ' + (r.mod > 0 ? '+' : '−') + Math.abs(r.mod) : ''}</span>`;
    const log = $('diceLog');
    log.prepend(li);
    while (log.children.length > 30) log.lastChild.remove();
  }

  /* ---------------------------------------------------------
     Cena: exportar / importar / publicar / reset
  --------------------------------------------------------- */
  function exportScene() {
    saveNow();
    const blob = new Blob([JSON.stringify(state, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    const d = new Date();
    a.href = URL.createObjectURL(blob);
    a.download = `cena-vtt-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  function replaceState(raw, keepView = false) {
    const old = state.view;
    state = normalizeState(raw);
    if (keepView) state.view = old;
    for (const el of tokenEls.values()) el.remove();
    tokenEls.clear();
    selectedId = null;
    bootView();
    syncMapPanel();
    saveNow();
  }

  function syncHideButton() {
    const on = state.opts.hideNpc;
    const b = $('btnHide');
    b.classList.toggle('on', on);
    b.textContent = on ? '🔒 NPCs ocultos' : '🔓 NPCs visíveis';
  }

  function bootView() {
    syncHideButton();
    const m = state.map;
    if (m.src) { mapImg.src = m.src; }
    else mapImg.removeAttribute('src');
    applyMapLayout();
    renderAllTokens();
    if (!state.view.fitted) fitView(); else applyView();
  }

  async function loadPublished(silent = false) {
    try {
      const r = await fetch('data/cena.json', { cache: 'no-store' });
      if (!r.ok) throw new Error(r.status);
      const j = await r.json();
      replaceState(j);
      fitView();
      if (!silent) toast('Cena do mestre carregada.');
      return true;
    } catch (e) {
      if (!silent) toast('Não encontrei data/cena.json. O mestre precisa publicar a cena no repositório primeiro.', 5000);
      return false;
    }
  }

  function bindScene() {
    $('btnExport').addEventListener('click', exportScene);
    $('importFile').addEventListener('change', async (e) => {
      const f = e.target.files[0]; e.target.value = ''; if (!f) return;
      try {
        const j = JSON.parse(await f.text());
        if (!j || typeof j !== 'object' || !('tokens' in j || 'map' in j)) throw new Error('formato');
        replaceState(j); fitView(); toast('Cena importada.');
      } catch (err) { toast('Arquivo inválido: não é uma cena exportada por esta mesa.'); }
    });
    $('btnLoadPublished').addEventListener('click', () => {
      if (state.tokens.length && !confirm('Isso substitui a sua cena atual pela do mestre. Continuar?')) return;
      loadPublished(false);
    });
    $('btnReset').addEventListener('click', () => {
      if (!confirm('Apagar mapa, tokens e posições deste navegador? (Exporte a cena antes se quiser guardar.)')) return;
      localStorage.removeItem(STORE_KEY);
      replaceState(defaultState()); fitView(); toast('Mesa limpa.');
    });
  }

  /* ---------------------------------------------------------
     Painéis / barra / atalhos
  --------------------------------------------------------- */
  function togglePanel(id, force) {
    const el = $(id);
    const show = force ?? el.hidden;
    ['mapPanel', 'scenePanel'].forEach((p) => { if (p !== id) $(p).hidden = true; });
    el.hidden = !show;
    if (id === 'mapPanel') $('btnMap').classList.toggle('on', show);
    if (id === 'dicePanel') $('btnDice').classList.toggle('on', show);
    if (id === 'mapPanel' && show) syncMapPanel();
  }

  function bindToolbar() {
    $('btnAddToken').addEventListener('click', () => { const t = createToken(); selectToken(t.id); openModal(t.id); });
    $('libChars').addEventListener('change', async (e) => {
      const i = e.target.value; e.target.value = '';
      if (i === '') return;
      const p = library.personagens[+i]; if (!p) return;
      const lista = Array.isArray(p.fotos) ? p.fotos : [];
      const fotos = await Promise.all([0, 1, 2].map((k) => probeImage(lista[k] || '')));
      const t = createToken({
        name: p.nome, photos: fotos, size: p.tamanho || 1,
        hp: p.pv ?? p.pvMax ?? 0, hpMax: p.pvMax ?? p.pv ?? 0, ea: p.ea ?? p.eaMax ?? 0, eaMax: p.eaMax ?? p.ea ?? 0,
        color: p.cor, notes: p.notas || '',
        tipo: p.tipo || (p.grupo === 'Jogadores' ? 'jogador' : 'npc'),
      });
      selectToken(t.id);
      toast(`"${t.name}" adicionado ao mapa.`);
    });
    $('btnArrange').addEventListener('click', () => {
      if (!state.tokens.length) return;
      const tl = screenToWorld(20, 20);
      const g = worldToGrid(tl.x, tl.y);
      const maxCols = Math.max(1, Math.floor((viewport.clientWidth - 40) / state.view.k / state.map.cell));
      let cx = Math.ceil(g.gx), cy = Math.ceil(g.gy), rowH = 1;
      state.tokens.forEach((t) => {
        if (cx - Math.ceil(g.gx) + t.size > maxCols) { cx = Math.ceil(g.gx); cy += rowH; rowH = 1; }
        t.gx = cx; t.gy = cy; cx += t.size; rowH = Math.max(rowH, t.size);
      });
      renderAllTokens(); save();
    });
    $('btnMap').addEventListener('click', () => togglePanel('mapPanel'));
    $('btnScene').addEventListener('click', () => togglePanel('scenePanel'));
    $('btnHide').addEventListener('click', () => {
      state.opts.hideNpc = !state.opts.hideNpc;
      syncHideButton(); renderAllTokens();
      const t = findToken(curId); if (!modal.hidden && t) { modalReveal = false; applyPrivacy(t); }
      save();
      toast(state.opts.hideNpc ? 'Dados de NPCs e vilões ocultos.' : 'Dados de NPCs e vilões visíveis para todos.');
    });
    $('btnDice').addEventListener('click', () => togglePanel('dicePanel'));
    $('btnGrid').addEventListener('click', () => { state.map.gridOn = !state.map.gridOn; $('btnGrid').classList.toggle('on', state.map.gridOn); drawGrid(); save(); });
    $('btnRuler').addEventListener('click', () => setRulerMode(!rulerMode));
    $('btnZoomIn').addEventListener('click', () => zoomCenter(1.25));
    $('btnZoomOut').addEventListener('click', () => zoomCenter(1 / 1.25));
    $('btnFit').addEventListener('click', fitView);
    document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => {
      togglePanel(b.dataset.close, false);
    }));
    document.querySelectorAll('[data-die]').forEach((b) => b.addEventListener('click', () => doRoll(b.dataset.die)));
    $('diceForm').addEventListener('submit', (e) => { e.preventDefault(); const v = $('diceExpr').value.trim(); if (v) doRoll(v); });

    document.addEventListener('keydown', (e) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '');
      if (e.key === 'Escape') {
        if (!modal.hidden) closeModal();
        else { ['mapPanel', 'scenePanel', 'dicePanel'].forEach((p) => togglePanel(p, false)); setRulerMode(false); }
        return;
      }
      if (typing || !modal.hidden || e.ctrlKey || e.metaKey || e.altKey) return;
      switch (e.key) {
        case 'g': case 'G': $('btnGrid').click(); break;
        case 'r': case 'R': $('btnRuler').click(); break;
        case '+': case '=': zoomCenter(1.25); break;
        case '-': case '_': zoomCenter(1 / 1.25); break;
        case '0': fitView(); break;
        case 'Delete': case 'Backspace': {
          const t = selectedId && findToken(selectedId);
          if (t && confirm(`Remover "${t.name}" do mapa?`)) removeToken(t.id);
          break;
        }
      }
    });
  }

  /* ---------------------------------------------------------
     Inicialização
  --------------------------------------------------------- */
  async function init() {
    load();
    bindToolbar(); bindMapPanel(); bindModal(); bindScene();
    new ResizeObserver(() => { drawGrid(); drawFx(); }).observe(viewport);

    if (!hadSavedState) {
      // primeira visita: tenta carregar a cena publicada pelo mestre (se existir)
      const ok = await loadPublished(true);
      if (ok) toast('Cena do mestre carregada automaticamente.');
    }
    bootView();
    syncMapPanel();
    loadLibrary();
    window.VTT = { get state() { return state; }, rollDice };
  }
  init();
})();
