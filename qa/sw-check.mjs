import puppeteer from 'puppeteer-core';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8765/';

fs.rmSync(path.join(ROOT, '.chrome-qa4'), { recursive: true, force: true });
fs.mkdirSync(path.join(ROOT, '.chrome-home'), { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  userDataDir: path.join(ROOT, '.chrome-qa4'),
  env: { ...process.env, HOME: path.join(ROOT, '.chrome-home') },
  args: ['--no-sandbox', '--disable-crash-reporter', '--disable-breakpad', '--disable-gpu', '--no-first-run']
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto(BASE, { waitUntil: 'networkidle2' });
await sleep(4000);

const sw = await page.evaluate(async () => {
  const regs = await navigator.serviceWorker.getRegistrations();
  const keys = await caches.keys();
  let cached = 0;
  if (keys.length) {
    const cache = await caches.open(keys[0]);
    cached = (await cache.keys()).length;
  }
  return { regs: regs.length, keys, cached, controlled: Boolean(navigator.serviceWorker.controller) };
});
console.log('BASE:', BASE);
console.log('SW:', JSON.stringify(sw));

await page.setOfflineMode(true);
await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch((e) => console.log('reload err', e.message));
await sleep(2500);
const offline = await page.evaluate(() => ({
  brand: document.querySelector('.brand-word')?.textContent,
  main: document.querySelector('#main')?.innerText.slice(0, 120),
  weatherError: Boolean(document.querySelector('.weather-error')),
  cssLoaded: getComputedStyle(document.body).backgroundColor
}));
console.log('OFFLINE:', JSON.stringify(offline, null, 2));
await page.screenshot({ path: path.join(__dirname, 'shots', '14-offline.png') });
console.log('errors:', errors.slice(0, 5));
await browser.close();
