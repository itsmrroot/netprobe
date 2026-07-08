<div align="center">

# 🛰️ Net Probe
### Speed Scanner

A monochrome, animated internet speed scanner built with pure HTML, CSS, and JavaScript.
No frameworks, no dependencies, no build tools required.

![No Dependencies](https://img.shields.io/badge/dependencies-none-000000?style=flat-square)
![Vanilla JS](https://img.shields.io/badge/javascript-vanilla-000000?style=flat-square)
![No Build Step](https://img.shields.io/badge/build_step-none-000000?style=flat-square)
![Made with HTML CSS JS](https://img.shields.io/badge/made_with-HTML%20%C2%B7%20CSS%20%C2%B7%20JS-000000?style=flat-square)

**🌐 [Live Demo](https://itsmrroot.github.io/netprobe/)**

![Net Probe screenshot](screenshot.png)

</div>

---

## Contents

- [Features](#features)
- [How to run](#how-to-run)
- [How the speed test works](#how-the-speed-test-works)
- [IP detection](#ip-detection)
- [Browser support](#browser-support)
- [Customization](#customization)
- [Files](#files)
- [License](#license)

---

## Features

| Feature | Details |
|---|---|
| Animated radar sweep | Canvas-based rotating sweep with trailing blips |
| Live speed counter | Number updates in real time as bytes actually move |
| Live download/upload graphs | Line chart traces throughput as it's measured, sample by sample |
| Download / Upload / Ping | All three are real measurements, run in sequence |
| Real public IP detection | Tries 3 APIs in order — `free.freeipapi.com`, `ipwho.is`, `ipify.org` |
| Public IP, Country | Auto-detected alongside IP |
| Stop button | Aborts all in-flight network requests immediately |
| Retry button | Resets and re-runs a fresh scan |
| Star background | 120 randomly placed twinkling stars |

---

## How to run

### Option 1 — Open directly in browser
Double-click `index.html` — it opens instantly in any browser. No server needed.

### Option 2 — Local server (recommended for IP detection)
If Public IP shows N/A, run a local server so the IP APIs are not blocked by browser security:

**Using Python:**
```bash
cd netprobe
python3 -m http.server 8080
```
Then open `http://localhost:8080` in your browser.

**Using Node.js (npx):**
```bash
cd netprobe
npx serve .
```
Then open the URL shown in the terminal.

---

## How the speed test works

This is a static, backend-less page, so it measures against Cloudflare's public
speed-test endpoint (`speed.cloudflare.com/__down` and `/__up` — the same
backend speed.cloudflare.com itself uses, open to cross-origin requests).

- **Ping** — median of 5 near-zero-byte round trips.
- **Download** — real bytes streamed for a fixed 4-second window across 2
  parallel connections; the counter reflects actual throughput, not a canned
  animation.
- **Upload** — real bytes POSTed for a fixed 4-second window in 1MB chunks
  across 2 parallel connections. Chunks are intentionally not tracked via
  `xhr.upload.onprogress` — that API forces a CORS preflight, and Cloudflare's
  `/__up` endpoint doesn't answer preflights, so attaching it makes every
  upload fail. Progress instead updates each time a chunk completes.

Every request is bounded to the remaining time budget regardless of how slow
the connection is, so a single stalled connection can't hang the test. If the
test server is unreachable, the UI shows an explicit error rather than a
fabricated number.

---

## IP detection

The app tries these APIs in order. If the first one fails, it automatically falls back to the next:

1. `https://free.freeipapi.com/api/json` — IP, country
2. `https://ipwho.is/` — IP, country
3. `https://api.ipify.org?format=json` — IP only (fallback)

---

## Browser support

Works in all modern browsers: Chrome, Firefox, Safari, Edge. Requires
`fetch` with streaming response bodies (`ReadableStream`) and
`AbortController`, both supported in all evergreen browsers.

---

## Customization

**Change colors** — the UI is monochrome (black background, white text/accents at varying opacity). Open `style.css` and edit:
- `#000` — background
- `#fff` — text / accents
- `rgba(255,255,255,0.1–0.6)` — borders, dimmed labels, muted states

**Change test duration / concurrency** — open `app.js` and edit these constants:
```js
const TEST_DURATION_MS = 4000; // how long each of download/upload runs
const STREAM_COUNT     = 2;    // parallel connections per phase
```
Raising `STREAM_COUNT` can better saturate very fast connections, but the
public test endpoint may throttle or reject bursts of many simultaneous
connections — 2 is a reasonably safe default.

---

## Files

```
netprobe/
├── index.html    — Page structure and layout
├── style.css     — All styling and animations
├── app.js        — Radar drawing, IP detection, real speed test
├── favicon.svg   — Tab icon / header mark
├── screenshot.png — Preview image used above
└── README.md     — This file
```

---

## License

Free to use and modify for personal and commercial projects.
