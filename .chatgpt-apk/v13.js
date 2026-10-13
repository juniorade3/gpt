(() => {
  'use strict';

  const reader = document.getElementById('readerView');
  const stage = document.getElementById('readerStage');
  const wrap = document.getElementById('flipbookWrap');
  const flipbook = document.getElementById('flipbook');
  const titleEl = document.getElementById('readerTitle');
  const metaEl = document.getElementById('readerMeta');
  const pageEl = document.getElementById('pageIndicator');
  if (!reader || !stage || !wrap || !flipbook || !pageEl) return;

  const DB_NAME = 'minha-estante-annotations';
  const STORE = 'pages';
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  let db = null;
  let zoom = 1, panX = 0, panY = 0;
  let tool = 'read';
  let activeStroke = null, panStart = null, pinch = null;
  const pointers = new Map();
  const cache = new Map();
  let currentDocKey = '';

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'key' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function dbGet(key) {
    if (!db) return Promise.resolve([]);
    return new Promise((resolve) => {
      const req = db.transaction(STORE).objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result?.strokes || []);
      req.onerror = () => resolve([]);
    });
  }

  function dbPut(key, strokes) {
    if (!db) return;
    try { db.transaction(STORE, 'readwrite').objectStore(STORE).put({ key, strokes, updatedAt: Date.now() }); } catch (_) {}
  }

  function docKey() {
    const title = titleEl?.textContent?.trim() || 'PDF';
    const meta = metaEl?.textContent?.trim() || '';
    return `${title}|${meta}`;
  }

  function pageNumber() {
    const n = parseInt((pageEl.textContent || '1').split('/')[0], 10);
    return Number.isFinite(n) ? n : 1;
  }

  function storageKey(page) { return `${currentDocKey || docKey()}::${page}`; }

  function currentPdfPage() {
    return flipbook.querySelector(`.pdf-page[data-page="${pageNumber()}"]`);
  }

  function ensureCanvas(pageNode) {
    if (!pageNode) return null;
    let canvas = pageNode.querySelector('.v13-annotation-layer');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.className = 'v13-annotation-layer';
      canvas.setAttribute('aria-hidden', 'true');
      pageNode.appendChild(canvas);
    }
    const w = Math.max(1, pageNode.clientWidth || 600);
    const h = Math.max(1, pageNode.clientHeight || 900);
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const bw = Math.round(w * dpr), bh = Math.round(h * dpr);
    if (canvas.width !== bw || canvas.height !== bh) { canvas.width = bw; canvas.height = bh; }
    return canvas;
  }

  async function strokesFor(page) {
    const key = storageKey(page);
    if (cache.has(key)) return cache.get(key);
    const strokes = await dbGet(key);
    cache.set(key, strokes);
    return strokes;
  }

  async function drawPage(page = pageNumber()) {
    const node = flipbook.querySelector(`.pdf-page[data-page="${page}"]`);
    const canvas = ensureCanvas(node);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const strokes = await strokesFor(page);
    const minDim = Math.min(canvas.width, canvas.height);
    for (const s of strokes) {
      if (!s.points?.length) continue;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = s.tool === 'highlight' ? .36 : .95;
      ctx.strokeStyle = s.color || (s.tool === 'highlight' ? '#ffd84d' : '#e5484d');
      ctx.lineWidth = Math.max(2, (s.width || (s.tool === 'highlight' ? .035 : .006)) * minDim);
      ctx.beginPath();
      const p0 = s.points[0];
      ctx.moveTo(p0.x * canvas.width, p0.y * canvas.height);
      for (let i = 1; i < s.points.length; i++) {
        const p = s.points[i];
        ctx.lineTo(p.x * canvas.width, p.y * canvas.height);
      }
      if (s.points.length === 1) ctx.lineTo(p0.x * canvas.width + .01, p0.y * canvas.height + .01);
      ctx.stroke();
      ctx.restore();
    }
  }

  function pagePoint(e) {
    const node = currentPdfPage();
    if (!node) return null;
    const r = node.getBoundingClientRect();
    if (!r.width || !r.height || e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return null;
    return { page: pageNumber(), x: clamp((e.clientX - r.left) / r.width, 0, 1), y: clamp((e.clientY - r.top) / r.height, 0, 1) };
  }

  function clampPan() {
    const mx = innerWidth * (zoom - 1) / 2;
    const my = innerHeight * (zoom - 1) / 2;
    panX = clamp(panX, -mx, mx);
    panY = clamp(panY, -my, my);
  }

  function updateMode() {
    flipbook.style.pointerEvents = tool === 'read' && zoom <= 1.001 ? 'auto' : 'none';
    reader.classList.toggle('v13-zoomed', zoom > 1.001);
    reader.classList.toggle('v13-annotating', tool !== 'read');
    document.querySelectorAll('.v13-tool[data-tool]').forEach(b => b.classList.toggle('active', b.dataset.tool === tool));
  }

  function applyTransform() {
    clampPan();
    wrap.style.transform = `translate3d(${panX}px,${panY}px,0) scale(${zoom})`;
    const label = document.getElementById('v13ZoomLabel');
    if (label) label.textContent = `${Math.round(zoom * 100)}%`;
    updateMode();
  }

  function setZoom(next, ax = innerWidth / 2, ay = innerHeight / 2) {
    const old = zoom;
    next = clamp(Math.round(next * 100) / 100, 1, 4);
    if (Math.abs(next - old) < .001) return;
    const rx = ax - innerWidth / 2, ry = ay - innerHeight / 2;
    const ratio = next / old;
    panX = rx - (rx - panX) * ratio;
    panY = ry - (ry - panY) * ratio;
    zoom = next;
    if (zoom <= 1.001) { zoom = 1; panX = 0; panY = 0; }
    applyTransform();
  }

  function resetZoom() { zoom = 1; panX = 0; panY = 0; applyTransform(); }

  function setTool(next) {
    tool = next;
    updateMode();
    reader.classList.remove('controls-hidden');
  }

  function distance() {
    const p = [...pointers.values()];
    return p.length < 2 ? 0 : Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
  }
  function midpoint() {
    const p = [...pointers.values()];
    return p.length < 2 ? { x: innerWidth / 2, y: innerHeight / 2 } : { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 };
  }

  async function eraseAt(point) {
    if (!point) return;
    const key = storageKey(point.page);
    const list = await strokesFor(point.page);
    const radius = .036 / Math.max(1, zoom ** .3);
    const kept = list.filter(s => !s.points?.some(p => Math.hypot(p.x - point.x, p.y - point.y) <= radius));
    if (kept.length !== list.length) {
      cache.set(key, kept); dbPut(key, kept); drawPage(point.page);
    }
  }

  function buildToolbar() {
    if (document.getElementById('v13Toolbar')) return;
    const bar = document.createElement('div');
    bar.id = 'v13Toolbar';
    bar.className = 'v13-toolbar';
    bar.innerHTML = `
      <button class="v13-tool" id="v13ZoomOut" aria-label="Diminuir zoom">−</button>
      <button class="v13-zoom-label" id="v13ZoomLabel" aria-label="Restaurar zoom">100%</button>
      <button class="v13-tool" id="v13ZoomIn" aria-label="Aumentar zoom">+</button>
      <span class="v13-sep"></span>
      <button class="v13-tool active" data-tool="read" aria-label="Ler">☝</button>
      <button class="v13-tool" data-tool="highlight" aria-label="Marca-texto">▰</button>
      <button class="v13-tool" data-tool="pen" aria-label="Caneta">✎</button>
      <button class="v13-tool" data-tool="eraser" aria-label="Borracha">⌫</button>
      <span class="v13-sep"></span>
      <button class="v13-tool" id="v13Undo" aria-label="Desfazer">↶</button>
      <button class="v13-tool" id="v13Clear" aria-label="Limpar página">⌧</button>`;
    stage.appendChild(bar);
    document.getElementById('v13ZoomOut').onclick = () => setZoom(zoom - .25);
    document.getElementById('v13ZoomIn').onclick = () => setZoom(zoom + .25);
    document.getElementById('v13ZoomLabel').onclick = resetZoom;
    bar.querySelectorAll('[data-tool]').forEach(b => b.onclick = () => setTool(b.dataset.tool));
    document.getElementById('v13Undo').onclick = async () => {
      const page = pageNumber(), key = storageKey(page), list = await strokesFor(page);
      if (!list.length) return;
      list.pop(); cache.set(key, list); dbPut(key, list); drawPage(page);
    };
    document.getElementById('v13Clear').onclick = async () => {
      const page = pageNumber(), key = storageKey(page), list = await strokesFor(page);
      if (!list.length || !confirm('Apagar todas as marcações desta página?')) return;
      cache.set(key, []); dbPut(key, []); drawPage(page);
    };
  }

  stage.addEventListener('pointerdown', async e => {
    if (!reader.classList.contains('open')) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size >= 2) {
      activeStroke = null; panStart = null;
      pinch = { dist: Math.max(1, distance()), zoom, panX, panY };
      updateMode();
      e.preventDefault(); e.stopPropagation();
      return;
    }
    if (tool !== 'read') {
      const point = pagePoint(e);
      if (tool === 'eraser') await eraseAt(point);
      else if (point) {
        const key = storageKey(point.page), list = await strokesFor(point.page);
        const stroke = { tool, color: tool === 'highlight' ? '#ffd84d' : '#e5484d', width: tool === 'highlight' ? .035 : .006, points: [{ x: point.x, y: point.y }] };
        list.push(stroke); cache.set(key, list); activeStroke = { id: e.pointerId, page: point.page, stroke };
        drawPage(point.page);
      }
      try { stage.setPointerCapture(e.pointerId); } catch (_) {}
      e.preventDefault(); e.stopPropagation();
      return;
    }
    if (zoom > 1.001) {
      panStart = { id: e.pointerId, x: e.clientX, y: e.clientY, panX, panY };
      try { stage.setPointerCapture(e.pointerId); } catch (_) {}
      e.preventDefault(); e.stopPropagation();
    }
  }, true);

  stage.addEventListener('pointermove', e => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pointers.size >= 2) {
      const mid = midpoint();
      zoom = pinch.zoom; panX = pinch.panX; panY = pinch.panY;
      setZoom(pinch.zoom * distance() / pinch.dist, mid.x, mid.y);
      e.preventDefault(); e.stopPropagation(); return;
    }
    if (activeStroke?.id === e.pointerId) {
      const p = pagePoint(e);
      if (p && p.page === activeStroke.page) {
        const pts = activeStroke.stroke.points, last = pts[pts.length - 1];
        if (Math.hypot(last.x - p.x, last.y - p.y) > .002) { pts.push({ x: p.x, y: p.y }); drawPage(p.page); }
      }
      e.preventDefault(); e.stopPropagation(); return;
    }
    if (tool === 'eraser') { eraseAt(pagePoint(e)); e.preventDefault(); e.stopPropagation(); return; }
    if (panStart?.id === e.pointerId && zoom > 1.001) {
      panX = panStart.panX + e.clientX - panStart.x;
      panY = panStart.panY + e.clientY - panStart.y;
      applyTransform(); e.preventDefault(); e.stopPropagation();
    }
  }, true);

  function finishPointer(e) {
    pointers.delete(e.pointerId);
    if (pinch) {
      if (pointers.size < 2) pinch = null;
      updateMode(); e.stopPropagation(); return;
    }
    if (activeStroke?.id === e.pointerId) {
      const page = activeStroke.page, key = storageKey(page);
      activeStroke = null;
      const list = cache.get(key) || []; dbPut(key, list); drawPage(page);
      e.stopPropagation(); return;
    }
    if (panStart?.id === e.pointerId) { panStart = null; e.stopPropagation(); }
  }
  stage.addEventListener('pointerup', finishPointer, true);
  stage.addEventListener('pointercancel', finishPointer, true);

  const pageObserver = new MutationObserver(() => setTimeout(() => drawPage(), 50));
  pageObserver.observe(pageEl, { childList: true, characterData: true, subtree: true });
  const flipObserver = new MutationObserver(() => setTimeout(() => drawPage(), 80));
  flipObserver.observe(flipbook, { childList: true, subtree: true });

  const readerObserver = new MutationObserver(() => {
    if (reader.classList.contains('open')) {
      const key = docKey();
      if (key !== currentDocKey) { currentDocKey = key; cache.clear(); resetZoom(); setTool('read'); }
      setTimeout(() => drawPage(), 100);
    }
  });
  readerObserver.observe(reader, { attributes: true, attributeFilter: ['class'] });

  window.addEventListener('resize', () => { applyTransform(); setTimeout(() => drawPage(), 80); });

  openDB().then(x => { db = x; buildToolbar(); }).catch(() => buildToolbar());
})();
