/* Render the explainer to an MP4.
 *
 *   node tools/render-mp4.mjs [--out dist/ibrick-explainer.mp4] [--chrome <path>]
 *
 * There is no encoder dependency and no screen capture. This script serves the
 * site over loopback, opens tools/render.html in headless Chrome, and the page
 * steps assets/explainer.js one frame at a time into a canvas whose stream it
 * hands to MediaRecorder. Chrome encodes H.264 itself and POSTs the file back
 * here. The pixels come from the canvas, not from a window.
 *
 * Needs: Chrome (or Edge), and network access for the two webfonts the film is
 * set in. The script fails loudly rather than shipping a film in Arial.
 */
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, resolve, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function arg(name, fallback) {
  const i = process.argv.indexOf('--' + name);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const OUT = resolve(ROOT, arg('out', 'dist/ibrick-explainer.mp4'));

const CHROMES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'
];
function findChrome() {
  const given = arg('chrome', null);
  if (given) {
    if (!existsSync(given)) throw new Error('No Chrome at ' + given);
    return given;
  }
  for (const c of CHROMES) if (c && existsSync(c)) return c;
  throw new Error('Chrome not found. Pass --chrome <path> or set CHROME_PATH.');
}

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json'
};

function serve() {
  return new Promise((ok) => {
    let received = null, resolveFilm;
    const film = new Promise((r) => { resolveFilm = r; });

    const server = createServer(async (req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1');
      if (url.pathname === '/__upload' && req.method === 'POST') {
        const parts = [];
        for await (const c of req) parts.push(c);
        received = {
          buf: Buffer.concat(parts),
          type: url.searchParams.get('type') || '',
          frames: Number(url.searchParams.get('frames') || 0),
          fps: Number(url.searchParams.get('fps') || 0),
          path: url.searchParams.get('path') || '?'
        };
        res.writeHead(200).end('ok');
        resolveFilm(received);
        return;
      }
      /* static, confined to the site directory */
      const rel = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, '');
      const file = resolve(ROOT, rel === '' ? 'index.html' : rel);
      if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
      try {
        const body = await readFile(file);
        res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
        res.end(body);
      } catch { res.writeHead(404).end('not found'); }
    });
    server.listen(0, '127.0.0.1', () => ok({ server, port: server.address().port, film }));
  });
}

async function main() {
  const chrome = findChrome();
  const { server, port, film } = await serve();
  const profile = join(tmpdir(), 'ibrick-render-' + Date.now());
  const url = `http://127.0.0.1:${port}/tools/render.html?record=1`;

  console.log('chrome   ' + chrome);
  console.log('serving  ' + ROOT);
  console.log('render   ' + url);

  /* Headless with the GPU off is what measured best here: a real window gets
   * its compositor throttled when it is not in front, which drops frames and
   * stretches the gaps. --headful and --gpu are there for a machine where the
   * reverse turns out to be true; check the result with probe-mp4.mjs. */
  const headful = process.argv.includes('--headful');
  const proc = spawn(chrome, [
    ...(headful ? ['--window-position=0,0'] : ['--headless=new']),
    ...(process.argv.includes('--gpu') ? [] : ['--disable-gpu']),
    '--no-first-run', '--no-default-browser-check',
    '--hide-scrollbars', '--mute-audio', '--window-size=1920,1080',
    '--force-device-scale-factor=1', '--autoplay-policy=no-user-gesture-required',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--user-data-dir=' + profile, url
  ], { stdio: 'ignore' });

  const started = Date.now();
  const timeout = new Promise((_, bad) =>
    setTimeout(() => bad(new Error('Timed out after 240 s with no file from the page.')), 240000));

  let got;
  try {
    got = await Promise.race([film, timeout]);
  } finally {
    proc.kill();
    server.close();
  }

  if (!got.buf.length) throw new Error('The page sent an empty file.');
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, got.buf);
  await rm(profile, { recursive: true, force: true }).catch(() => {});

  console.log('');
  console.log('wrote    ' + OUT);
  console.log('size     ' + (got.buf.length / 1048576).toFixed(2) + ' MB');
  console.log('type     ' + got.type);
  console.log('frames   ' + got.frames + ' at ' + got.fps + ' fps');
  console.log('path     ' + got.path);
  console.log('took     ' + ((Date.now() - started) / 1000).toFixed(1) + ' s');
}

main().catch((e) => { console.error('render failed: ' + e.message); process.exit(1); });
