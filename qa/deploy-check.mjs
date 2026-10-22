/* Проверка задеплоенной версии на GitHub Pages (или любом HTTPS-хостинге).
   BASE_URL=https://vavkaiser-web.github.io/shkaf/ node qa/deploy-check.mjs */
import puppeteer from 'puppeteer-core';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = process.env.BASE_URL || 'https://vavkaiser-web.github.io/shkaf/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];
const checks = [];
const check = (name, ok, detail = '') => {
  checks.push({ name, ok });
  console.log(`${ok ? '✔' : '✘'} ${name}${detail ? ` — ${detail}` : ''}`);
};

fs.rmSync(path.join(ROOT, '.chrome-deploy'), { recursive: true, force: true });
fs.mkdirSync(path.join(ROOT, '.chrome-home'), { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  userDataDir: path.join(ROOT, '.chrome-deploy'),
  env: { ...process.env, HOME: path.join(ROOT, '.chrome-home') },
  args: ['--no-sandbox', '--disable-crash-reporter', '--disable-breakpad', '--disable-gpu', '--hide-scrollbars', '--no-first-run']
});

try {
  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  await page.evaluateOnNewDocument(() => {
    window.__bip = false;
    window.addEventListener('beforeinstallprompt', (event) => {
      window.__bip = true;
      event.preventDefault();
    });
  });
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('requestfailed', (req) => errors.push(`FAILED ${req.url()} — ${req.failure()?.errorText || ''}`));

  console.log('→', BASE);
  const response = await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 45000 });
  await sleep(3500);

  const basics = await page.evaluate(() => ({
    title: document.title,
    brand: document.querySelector('.brand-word')?.textContent,
    weather: document.querySelector('.weather-card')?.innerText.replace(/\s+/g, ' ').slice(0, 90),
    installButton: Boolean(document.querySelector('#installBtn')) && !document.querySelector('#installBtn').classList.contains('hidden'),
    banner: Boolean(document.querySelector('.install-banner')),
    manifest: document.querySelector('link[rel="manifest"]')?.href,
    bip: Boolean(window.__bip),
    errors: document.querySelector('.weather-error')?.innerText || ''
  }));
  check('Страница отдалась (HTTP 200)', response.status() === 200, String(response.status()));
  check('ШКАФ загрузился', basics.brand === 'ШКАФ' && basics.title.includes('ШКАФ'), basics.title);
  check('Погода работает на хостинге', Boolean(basics.weather) && !basics.errors, basics.weather);
  check('Манифест подключён', Boolean(basics.manifest && basics.manifest.includes('manifest')), basics.manifest);
  check('Кнопка и баннер установки видны', basics.installButton && basics.banner);
  check('Chrome считает приложение устанавливаемым', basics.bip);

  await page.evaluate(() => document.querySelector('#settingsBtn').click());
  await page.waitForSelector('dialog[open]', { timeout: 5000 });
  await sleep(300);
  await page.evaluate(() => document.querySelector('dialog[open] [data-install-app]').click());
  await page.waitForSelector('.install-qr', { timeout: 10000 });
  await sleep(500);
  const sheet = await page.evaluate(() => ({
    qr: Boolean(document.querySelector('.install-qr svg')),
    link: document.querySelector('[data-url]')?.value || '',
    steps: document.querySelectorAll('.install-step').length
  }));
  check('QR-код построен', sheet.qr);
  check('Ссылка в QR ведёт на этот же сайт', sheet.link.replace(/\/$/, '') === BASE.replace(/\/$/, ''), sheet.link);
  check('Инструкция установки есть', sheet.steps >= 3, `${sheet.steps} шагов`);
  await page.screenshot({ path: path.join(__dirname, 'shots', '16-pages-install.png') });
  await page.evaluate(() => document.querySelector('dialog[open] [data-close]')?.click());

  await page.reload({ waitUntil: 'networkidle2' });
  await sleep(2500);
  const sw = await page.evaluate(async () => {
    const registrations = await navigator.serviceWorker.getRegistrations();
    const keys = await caches.keys();
    return { regs: registrations.length, controlled: Boolean(navigator.serviceWorker.controller), cache: keys[0] || null };
  });
  check('Service worker активен', sw.regs > 0 && sw.controlled, JSON.stringify(sw));

  const mobile = await browser.newPage();
  await mobile.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  mobile.on('pageerror', (error) => errors.push(`[mobile] ${error}`));
  await mobile.goto(BASE, { waitUntil: 'networkidle2', timeout: 45000 });
  await sleep(2500);
  await mobile.screenshot({ path: path.join(__dirname, 'shots', '17-pages-mobile.png') });
  const mobileInfo = await mobile.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - window.innerWidth,
    banner: Boolean(document.querySelector('.install-banner')),
    brand: document.querySelector('.brand-word')?.textContent
  }));
  check('Мобильная версия без горизонтального скролла', mobileInfo.overflow <= 1, `overflow=${mobileInfo.overflow}`);
  check('На телефоне виден баннер установки', mobileInfo.banner && mobileInfo.brand === 'ШКАФ');

  check('Нет ошибок в консоли', errors.length === 0, errors.slice(0, 3).join(' | '));

  const failed = checks.filter((item) => !item.ok);
  console.log(`\nИтого: ${checks.length - failed.length}/${checks.length}`);
  if (failed.length) {
    console.log('Провалено:', failed.map((item) => item.name).join('; '));
    process.exitCode = 1;
  }
} finally {
  await browser.close();
  fs.rmSync(path.join(ROOT, '.chrome-deploy'), { recursive: true, force: true });
  fs.rmSync(path.join(ROOT, '.chrome-home'), { recursive: true, force: true });
}
