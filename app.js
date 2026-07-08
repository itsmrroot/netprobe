/* =========================================================
   Net Probe — Speed Scanner
   app.js
   ========================================================= */

/* ── Stars ── */
(function generateStars() {
  const container = document.getElementById('stars');
  for (let i = 0; i < 120; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    const size = Math.random() * 2 + 0.5;
    star.style.cssText = [
      `width:${size}px`,
      `height:${size}px`,
      `top:${Math.random() * 100}%`,
      `left:${Math.random() * 100}%`,
      `--d:${2 + Math.random() * 4}s`,
      `--o:${(0.3 + Math.random() * 0.6).toFixed(2)}`,
      `animation-delay:${(Math.random() * 4).toFixed(2)}s`
    ].join(';');
    container.appendChild(star);
  }
})();

/* ── Radar canvas ── */
const canvas = document.getElementById('radar');
const ctx    = canvas.getContext('2d');
const W = 560, H = 560, cx = W / 2, cy = H / 2, R = 220;

let angle    = 0;
let scanning = false;
let animFrame;

function drawRadar(a) {
  ctx.clearRect(0, 0, W, H);

  /* Grid rings */
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth   = 1;
  [0.25, 0.5, 0.75, 1].forEach(function(r) {
    ctx.beginPath();
    ctx.arc(cx, cy, R * r, 0, Math.PI * 2);
    ctx.stroke();
  });

  /* Grid spokes */
  for (let i = 0; i < 12; i++) {
    const spoke = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(spoke) * R, cy + Math.sin(spoke) * R);
    ctx.stroke();
  }

  /* Sweep arc + line (only while scanning) */
  if (scanning) {
    /* Sweep fill */
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, a - Math.PI / 2, a);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();

    /* Sweep line */
    ctx.save();
    ctx.globalAlpha   = 0.8;
    ctx.strokeStyle   = '#ffffff';
    ctx.lineWidth     = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
    ctx.stroke();
    ctx.restore();

    /* Trailing blips */
    for (let b = 0; b < 6; b++) {
      const blipAngle  = a - (b / 6) * (Math.PI / 2);
      const blipRadius = R * (0.25 + Math.random() * 0.65);
      ctx.save();
      ctx.globalAlpha = 0.45 - (b / 6) * 0.35;
      ctx.fillStyle   = '#ffffff';
      ctx.beginPath();
      ctx.arc(
        cx + Math.cos(blipAngle) * blipRadius,
        cy + Math.sin(blipAngle) * blipRadius,
        2, 0, Math.PI * 2
      );
      ctx.fill();
      ctx.restore();
    }
  }

  /* Outer ring */
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.strokeStyle  = '#ffffff';
  ctx.lineWidth    = 1.5;
  ctx.globalAlpha  = 0.35;
  ctx.stroke();
  ctx.globalAlpha  = 1;
}

drawRadar(0);

function animateSweep() {
  if (!scanning) return;
  angle += 0.04;
  drawRadar(angle);
  animFrame = requestAnimationFrame(animateSweep);
}

/* ── Live speed graphs ── */
const graphDL = { canvas: document.getElementById('graph-dl'), samples: [] };
const graphUL = { canvas: document.getElementById('graph-ul'), samples: [] };
[graphDL, graphUL].forEach((g) => { g.ctx = g.canvas.getContext('2d'); });

function drawGraph(g) {
  const { ctx: gctx, canvas: gcanvas, samples } = g;
  const w = gcanvas.width, h = gcanvas.height;
  gctx.clearRect(0, 0, w, h);

  if (samples.length < 2) return;

  const maxT = Math.max(TEST_DURATION_MS, samples[samples.length - 1].t);
  const maxV = Math.max(...samples.map((s) => s.v), 10) * 1.2;
  const toX = (t) => (t / maxT) * w;
  const toY = (v) => h - (v / maxV) * h * 0.9;

  gctx.beginPath();
  gctx.moveTo(toX(samples[0].t), toY(samples[0].v));
  samples.forEach((s) => gctx.lineTo(toX(s.t), toY(s.v)));
  gctx.lineTo(toX(samples[samples.length - 1].t), h);
  gctx.lineTo(toX(samples[0].t), h);
  gctx.closePath();
  gctx.fillStyle = 'rgba(255,255,255,0.08)';
  gctx.fill();

  gctx.beginPath();
  gctx.moveTo(toX(samples[0].t), toY(samples[0].v));
  samples.forEach((s) => gctx.lineTo(toX(s.t), toY(s.v)));
  gctx.strokeStyle = '#ffffff';
  gctx.lineWidth = 2;
  gctx.lineJoin = 'round';
  gctx.stroke();

  const last = samples[samples.length - 1];
  gctx.beginPath();
  gctx.arc(toX(last.t), toY(last.v), 3, 0, Math.PI * 2);
  gctx.fillStyle = '#ffffff';
  gctx.fill();
}

function resetGraphs() {
  [graphDL, graphUL].forEach((g) => {
    g.samples = [];
    g.ctx.clearRect(0, 0, g.canvas.width, g.canvas.height);
  });
}

/* ── IP detection ── */
function setIP(id, value) {
  const el = document.getElementById(id);
  el.textContent = value;
  el.classList.remove('loading');
}

async function fetchIP() {
  const apis = [
    async function() {
      const res = await fetch('https://free.freeipapi.com/api/json');
      const d   = await res.json();
      return { ip: d.ipAddress, country: d.countryName, code: d.countryCode };
    },
    async function() {
      const res = await fetch('https://ipwho.is/');
      const d   = await res.json();
      return { ip: d.ip, country: d.country, code: d.country_code };
    },
    async function() {
      const res = await fetch('https://api.ipify.org?format=json');
      const d   = await res.json();
      return { ip: d.ip, country: 'N/A', code: '' };
    }
  ];

  for (let i = 0; i < apis.length; i++) {
    try {
      const d = await apis[i]();
      setIP('ip-addr',   d.ip || 'N/A');
      setIP('ip-country', [d.country, d.code ? '(' + d.code + ')' : ''].filter(Boolean).join(' ') || 'N/A');
      return;
    } catch (err) {
      continue;
    }
  }

  setIP('ip-addr',   'Unavailable');
  setIP('ip-country','--');
}

fetchIP();

/* ── Real speed test ──
   Uses Cloudflare's public, CORS-open speed-test endpoint (the same
   backend speed.cloudflare.com itself uses) since this is a static,
   backend-less page. Download/upload each run real bytes over a fixed
   time budget across parallel streams, so speed is measured, not
   guessed. */
const TEST_HOST         = 'https://speed.cloudflare.com';
const PING_SAMPLES       = 5;
const TEST_DURATION_MS   = 4000;
const STREAM_COUNT       = 2;
const DOWNLOAD_CHUNK     = 10_000_000;
/* Kept small and sent as discrete requests (rather than tracked via
   xhr.upload.onprogress) because Cloudflare's /__up endpoint doesn't
   answer CORS preflights — and attaching an upload-progress listener
   is exactly what forces the browser to preflight a cross-origin
   request, which then gets rejected outright. */
const UPLOAD_CHUNK       = 1_000_000;
const uploadBlob         = new Blob([new Uint8Array(UPLOAD_CHUNK)]);

/* Bounds a single request to `ms`, regardless of how slow the
   connection is, without mistaking that internal cutoff for a real
   failure or a user-initiated Stop (only `signal` aborting means that). */
async function withDeadline(run, ms, signal) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  const onExternal = () => ctrl.abort();
  signal.addEventListener('abort', onExternal, { once: true });
  try {
    return await run(ctrl.signal);
  } catch (err) {
    /* Swallow only our own deadline cutoff. A real Stop (signal.aborted)
       or a genuine failure (network error, bad status) must propagate. */
    if (ctrl.signal.aborted && !signal.aborted) return null;
    throw err;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', onExternal);
  }
}

async function measurePing(signal) {
  const samples = [];
  for (let i = 0; i < PING_SAMPLES; i++) {
    const t0 = performance.now();
    const ok = await withDeadline(
      (s) => fetch(`${TEST_HOST}/__down?bytes=0&t=${Math.random()}`, { signal: s, cache: 'no-store' }),
      5000,
      signal
    );
    if (signal.aborted) throw new DOMException('aborted', 'AbortError');
    if (ok) samples.push(performance.now() - t0);
  }
  if (!samples.length) throw new Error('ping failed');
  samples.sort((a, b) => a - b);
  const warm = samples.slice(1).length ? samples.slice(1) : samples;
  return warm[Math.floor(warm.length / 2)];
}

async function measureThroughput(kind, durationMs, onTick, signal) {
  const counter = { bytes: 0 };
  const start = performance.now();

  async function downloadStream() {
    while (performance.now() - start < durationMs) {
      const remaining = durationMs - (performance.now() - start);
      await withDeadline(async (s) => {
        const res = await fetch(`${TEST_HOST}/__down?bytes=${DOWNLOAD_CHUNK}&t=${Math.random()}`, { signal: s, cache: 'no-store' });
        if (!res.ok) throw new Error(`download failed: ${res.status}`);
        const reader = res.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          counter.bytes += value.length;
          if (performance.now() - start >= durationMs) { reader.cancel(); break; }
        }
      }, remaining, signal);
      if (signal.aborted) throw new DOMException('aborted', 'AbortError');
    }
  }

  async function uploadStream() {
    while (performance.now() - start < durationMs) {
      const remaining = durationMs - (performance.now() - start);
      const sent = await withDeadline((s) => new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${TEST_HOST}/__up`);
        xhr.onload  = () => (xhr.status >= 200 && xhr.status < 300) ? resolve(UPLOAD_CHUNK) : reject(new Error(`upload failed: ${xhr.status}`));
        xhr.onerror = () => reject(new Error('upload failed'));
        xhr.onabort = () => resolve(0);
        s.addEventListener('abort', () => xhr.abort(), { once: true });
        xhr.send(uploadBlob);
      }), remaining, signal);
      if (sent) counter.bytes += sent;
      if (signal.aborted) throw new DOMException('aborted', 'AbortError');
    }
  }

  const runStream = kind === 'download' ? downloadStream : uploadStream;

  const sampler = setInterval(() => {
    const elapsedMs = performance.now() - start;
    if (elapsedMs > 0) onTick((counter.bytes * 8) / (elapsedMs / 1000) / 1e6, elapsedMs);
  }, 150);

  try {
    await Promise.all(Array.from({ length: STREAM_COUNT }, runStream));
  } finally {
    clearInterval(sampler);
  }

  const elapsed = (performance.now() - start) / 1000;
  return (counter.bytes * 8) / elapsed / 1e6;
}

let scanController;

/* ── UI helpers ── */
function resetUI() {
  ['val-dl', 'val-ul', 'val-ping'].forEach(function(id) {
    document.getElementById(id).textContent = '--';
  });
  document.getElementById('speedNum').textContent    = '--';
  document.getElementById('speedNum').style.color    = '#fff';
  document.getElementById('speedLabel').textContent  = 'ready';
  ['card-dl', 'card-ul', 'card-ping'].forEach(function(id) {
    document.getElementById(id).classList.remove('active');
  });
  const fill = document.getElementById('progressFill');
  fill.classList.remove('stopped');
  fill.style.width = '0%';
  resetGraphs();
}

function showButtons(state) {
  document.getElementById('scanBtn').disabled = (state === 'scanning');
  document.getElementById('stopBtn').classList.toggle('visible',  state === 'scanning');
  document.getElementById('retryBtn').classList.toggle('visible', state === 'done' || state === 'stopped');
}

/* ── Stop ── */
function stopScan() {
  if (!scanning) return;
  scanning = false;
  if (scanController) scanController.abort();
  cancelAnimationFrame(animFrame);
  drawRadar(angle);

  document.getElementById('speedNum').textContent   = '--';
  document.getElementById('speedNum').style.color   = '#fff';
  document.getElementById('speedLabel').textContent = 'stopped';

  document.getElementById('statusDot').className  = 'status-dot stopped';
  document.getElementById('statusText').className = 'status-text stopped';
  document.getElementById('statusText').textContent = 'Scan stopped — press Retry to run again';
  document.getElementById('progressFill').classList.add('stopped');

  showButtons('stopped');
}

/* ── Retry ── */
function retryScan() {
  resetUI();
  document.getElementById('statusDot').className    = 'status-dot';
  document.getElementById('statusText').className   = 'status-text';
  document.getElementById('statusText').textContent = 'Ready to scan your connection';
  showButtons('idle');
  setTimeout(startScan, 150);
}

/* ── Start scan ── */
async function startScan() {
  if (scanning) return;
  scanning = true;
  resetUI();
  showButtons('scanning');

  const dot   = document.getElementById('statusDot');
  const txt   = document.getElementById('statusText');
  const fill  = document.getElementById('progressFill');
  const label = document.getElementById('speedLabel');

  dot.className = 'status-dot active';
  txt.className = 'status-text active';

  animateSweep();

  scanController = new AbortController();
  const signal = scanController.signal;

  try {
    /* Phase 1 — Ping */
    txt.textContent   = 'Pinging server...';
    label.textContent = 'pinging';
    fill.style.width  = '10%';
    document.getElementById('card-ping').classList.add('active');

    const pingMs = await measurePing(signal);
    document.getElementById('val-ping').textContent = Math.round(pingMs);

    /* Phase 2 — Download */
    txt.textContent   = 'Measuring download speed...';
    label.textContent = 'download';
    document.getElementById('card-dl').classList.add('active');

    const dlSpeed = await measureThroughput('download', TEST_DURATION_MS, function(mbps, elapsedMs) {
      document.getElementById('speedNum').textContent = Math.round(mbps);
      document.getElementById('val-dl').textContent   = Math.round(mbps);
      fill.style.width = (15 + Math.min(elapsedMs / TEST_DURATION_MS, 1) * 45) + '%';
      graphDL.samples.push({ t: elapsedMs, v: mbps });
      drawGraph(graphDL);
    }, signal);
    document.getElementById('val-dl').textContent = Math.round(dlSpeed);

    /* Phase 3 — Upload */
    txt.textContent   = 'Measuring upload speed...';
    label.textContent = 'upload';
    document.getElementById('card-ul').classList.add('active');

    const ulSpeed = await measureThroughput('upload', TEST_DURATION_MS, function(mbps, elapsedMs) {
      document.getElementById('speedNum').textContent = Math.round(mbps);
      document.getElementById('val-ul').textContent   = Math.round(mbps);
      fill.style.width = (60 + Math.min(elapsedMs / TEST_DURATION_MS, 1) * 36) + '%';
      graphUL.samples.push({ t: elapsedMs, v: mbps });
      drawGraph(graphUL);
    }, signal);
    document.getElementById('val-ul').textContent = Math.round(ulSpeed);
    fill.style.width = '100%';

    scanning = false;
    cancelAnimationFrame(animFrame);
    drawRadar(angle);

    /* Final result */
    document.getElementById('speedNum').textContent = Math.round(dlSpeed);
    document.getElementById('speedNum').style.color = '#fff';
    label.textContent =
      dlSpeed > 100 ? 'excellent' :
      dlSpeed > 50  ? 'good'      : 'moderate';

    dot.className = 'status-dot done';
    txt.className = 'status-text done';
    txt.textContent = 'Scan complete — press Retry to scan again';

    showButtons('done');
  } catch (err) {
    if (!scanning) return; /* user pressed Stop — stopScan() already updated the UI */

    scanning = false;
    cancelAnimationFrame(animFrame);
    drawRadar(angle);

    document.getElementById('speedNum').textContent   = '--';
    document.getElementById('speedNum').style.color   = '#fff';
    document.getElementById('speedLabel').textContent = 'error';

    dot.className = 'status-dot stopped';
    txt.className = 'status-text stopped';
    txt.textContent = 'Speed-test server unreachable — press Retry';
    fill.classList.add('stopped');

    showButtons('stopped');
  }
}
