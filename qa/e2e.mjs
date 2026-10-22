/* E2E-проверка «ШКАФ» в headless Chrome (puppeteer-core + системный Chrome). */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SHOTS = path.join(__dirname, 'shots');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8765/';
const MOBILE = { width: 390, height: 844, deviceScaleFactor: 2 };
const DESKTOP = { width: 1440, height: 1024, deviceScaleFactor: 1.5 };

fs.rmSync(SHOTS, { recursive: true, force: true });
fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
const consoleErrors = [];
const pageErrors = [];

function check(name, condition, detail = '') {
  results.push({ name, ok: Boolean(condition), detail });
  console.log(`${condition ? '✔' : '✘'} ${name}${detail ? ` — ${detail}` : ''}`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  fs.rmSync(path.join(ROOT, '.chrome-qa'), { recursive: true, force: true });
  fs.mkdirSync(path.join(ROOT, '.chrome-home'), { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    userDataDir: path.join(ROOT, '.chrome-qa'),
    env: { ...process.env, HOME: path.join(ROOT, '.chrome-home') },
    args: [
      '--no-sandbox',
      '--disable-crash-reporter',
      '--disable-breakpad',
      '--disable-gpu',
      '--hide-scrollbars',
      '--disable-dev-shm-usage',
      '--force-color-profile=srgb',
      '--lang=ru-RU',
      '--no-first-run'
    ]
  });

  const context = browser.defaultBrowserContext();
  await context.overridePermissions('http://127.0.0.1:8765', ['geolocation']);

  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (error) => pageErrors.push(String(error)));

  await page.setViewport(DESKTOP);
  console.log('→ Открываем', BASE);
  await page.goto(`${BASE}?qa=1`, { waitUntil: 'networkidle2', timeout: 45000 });
  await sleep(2500);
  await page.screenshot({ path: path.join(SHOTS, '01-first-run.png'), fullPage: true });

  await page.screenshot({ path: path.join(SHOTS, '01b-first-run-viewport.png') });

  const onboarding = await page.evaluate(() => document.body.innerText.includes('Шкаф пока пуст'));
  check('Первый запуск: пустое состояние шкафа', onboarding);

  const buttonReach = await page.evaluate(() => {
    const btn = document.querySelector('.empty-actions .btn-primary');
    if (!btn) return { ok: false, reason: 'нет кнопки' };
    btn.scrollIntoView({ block: 'center' });
    const rect = btn.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return { ok: Boolean(hit && (hit === btn || btn.contains(hit))), hit: hit && (hit.className || hit.tagName) };
  });
  check('Кнопка «Добавить вещь» не перекрыта таббаром', buttonReach.ok, buttonReach.ok ? '' : String(buttonReach.hit));

  const hero = await page.evaluate(() => {
    const el = document.querySelector('.weather-card');
    return el ? el.innerText.replace(/\s+/g, ' ').slice(0, 160) : '';
  });
  check('Погода загружена (Open-Meteo)', Boolean(hero), hero);
  await page.screenshot({ path: path.join(SHOTS, '02-weather.png') });

  // установка приложения
  const installUi = await page.evaluate(() => ({
    button: Boolean(document.querySelector('#installBtn')) && !document.querySelector('#installBtn').classList.contains('hidden'),
    banner: Boolean(document.querySelector('.install-banner'))
  }));
  check('Кнопка и баннер «Установить» видны', installUi.button && installUi.banner, JSON.stringify(installUi));

  const info = await page.evaluate(async () => {
    try {
      const response = await fetch('/__info', { cache: 'no-store' });
      return response.ok ? await response.json() : null;
    } catch { return null; }
  });
  check('Сервер отдаёт ссылки для телефона', Boolean(info && (info.public || info.lan)), JSON.stringify(info));

  await page.evaluate(() => document.querySelector('#settingsBtn').click());
  await page.waitForSelector('dialog[open]', { timeout: 5000 });
  await sleep(350);
  const hasInstallSection = await page.evaluate(() => Boolean(document.querySelector('dialog[open] [data-install-app]')));
  check('В настройках есть раздел установки', hasInstallSection);
  await page.evaluate(() => document.querySelector('dialog[open] [data-install-app]').click());
  await page.waitForSelector('.install-qr', { timeout: 10000 });
  await sleep(500);
  const installSheet = await page.evaluate(() => ({
    qr: Boolean(document.querySelector('.install-qr svg')),
    link: document.querySelector('[data-url]')?.value || '',
    steps: document.querySelectorAll('.install-step').length,
    copy: Boolean(document.querySelector('[data-copy]'))
  }));
  check('Установка: QR-код и ссылка для телефона', installSheet.qr && installSheet.link.startsWith('http') && installSheet.copy, installSheet.link);
  check('Установка: пошаговая инструкция', installSheet.steps >= 3, `${installSheet.steps} шагов`);
  await page.screenshot({ path: path.join(SHOTS, '02b-install.png') });
  await page.evaluate(() => document.querySelector('dialog[open] [data-close]')?.click());
  await sleep(350);

  // демо-шкаф
  const clickedDemo = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => /демо/i.test(b.textContent));
    if (!btn) return false;
    btn.click();
    return true;
  });
  check('Кнопка демо-шкафа найдена', clickedDemo);
  await page.waitForSelector('.look-card', { timeout: 45000 });
  await sleep(1200);
  await page.screenshot({ path: path.join(SHOTS, '03-looks-desktop.png'), fullPage: true });

  const lookInfo = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.look-card')];
    return {
      count: cards.length,
      titles: cards.map((c) => c.querySelector('.look-title')?.textContent.trim()).filter(Boolean),
      why: cards[0]?.querySelector('.look-why')?.textContent.trim(),
      chips: cards[0] ? [...cards[0].querySelectorAll('.look-chip')].map((c) => c.textContent.trim()) : [],
      images: cards[0] ? cards[0].querySelectorAll('.look-media img').length : 0,
      score: cards[0]?.querySelector('.look-score')?.textContent
    };
  });
  check('Образы собраны (≥4)', lookInfo.count >= 4, `${lookInfo.count} шт.`);
  check('У образа есть объяснение', Boolean(lookInfo.why && lookInfo.why.length > 20), lookInfo.why);
  check('У образа есть палитра/погодные чипы', lookInfo.chips.length > 0, lookInfo.chips.join(' | '));
  check('Фото вещей в образе отрисованы', lookInfo.images >= 2, `${lookInfo.images} фото`);
  check('Названия образов не пустые', lookInfo.titles.every((t) => t.length > 1), lookInfo.titles.join(', '));

  // «ещё варианты»
  const before = lookInfo.titles.join('|');
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => /Ещё варианты|Показать другие/.test(b.textContent));
    if (btn) btn.click();
  });
  await sleep(1600);
  await page.waitForSelector('.look-card', { timeout: 20000 });
  const afterTitles = await page.evaluate(() => [...document.querySelectorAll('.look-title')].map((t) => t.textContent.trim()));
  check('«Ещё варианты» даёт другие образы', afterTitles.join('|') !== before, afterTitles.join(', '));

  // надеть
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('[data-action="wear"]')][0];
    if (btn) btn.click();
  });
  await sleep(1400);
  const worn = await page.evaluate(() => ({
    flag: Boolean(document.querySelector('.look-flag')),
    disabled: Boolean(document.querySelector('[data-action="wear"][disabled]')),
    toast: document.querySelector('.toast')?.textContent || ''
  }));
  check('«Надеть» записывает образ', worn.flag || worn.disabled, worn.toast);

  // сохранить
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('[data-action="save-look"]')][0];
    if (btn) btn.click();
  });
  await sleep(1500);
  const saved = await page.evaluate(() => ({
    section: document.body.innerText.includes('Мои образы'),
    rows: document.querySelectorAll('.mini-row').length
  }));
  check('Образ сохраняется в «Мои образы»', saved.section && saved.rows > 0, `${saved.rows} строк`);

  // шкаф
  await page.evaluate(() => document.querySelector('.tab[data-view="wardrobe"]').click());
  await sleep(900);
  await page.screenshot({ path: path.join(SHOTS, '04-wardrobe-desktop.png'), fullPage: true });
  const wardrobe = await page.evaluate(() => ({
    count: document.querySelectorAll('.item-card').length,
    summary: document.querySelector('.wardrobe-summary')?.innerText.replace(/\s+/g, ' '),
    filters: document.querySelectorAll('.filters .chip').length
  }));
  check('В шкафу появились вещи (≥16)', wardrobe.count >= 16, `${wardrobe.count} шт.; ${wardrobe.summary}`);
  check('Фильтры по категориям есть', wardrobe.filters >= 4, `${wardrobe.filters}`);

  // карточка вещи
  await page.evaluate(() => document.querySelector('.item-card').click());
  await page.waitForSelector('dialog[open]', { timeout: 5000 });
  await sleep(500);
  await page.screenshot({ path: path.join(SHOTS, '05-item-edit.png') });
  const editSheet = await page.evaluate(() => ({
    title: document.querySelector('dialog[open] .sheet-title')?.textContent,
    hasDelete: Boolean(document.querySelector('dialog[open] [data-delete]')),
    hasPhoto: Boolean(document.querySelector('dialog[open] .photo-preview img'))
  }));
  check('Карточка вещи открывается', editSheet.title === 'Вещь в шкафу', editSheet.title);
  check('Есть фото и удаление', editSheet.hasPhoto && editSheet.hasDelete);
  await page.evaluate(() => document.querySelector('dialog[open] [data-close]').click());
  await sleep(400);

  // добавление вещи с фото
  const beforeAdd = await page.evaluate(() => document.querySelectorAll('.item-card').length);
  await page.evaluate(() => document.querySelector('[data-action="open-add"]').click());
  await page.waitForSelector('dialog[open]', { timeout: 5000 });
  await sleep(400);
  const input = await page.$('dialog[open] [data-gallery-input]');
  await input.uploadFile(path.join(__dirname, 'fixtures', 'test-sweater.jpg'));
  await sleep(2200);
  const addState = await page.evaluate(() => ({
    preview: Boolean(document.querySelector('dialog[open] .photo-preview img')),
    swatches: document.querySelectorAll('dialog[open] .palette-swatch').length,
    color: document.querySelector('dialog[open] [data-color-input]')?.value,
    name: document.querySelector('dialog[open] [data-name]')?.value
  }));
  check('Фото загружается в форму', addState.preview, addState.color);
  check('Палитра извлечена из фото', addState.swatches >= 2, `${addState.swatches} цветов`);
  check('Название подставляется', Boolean(addState.name), addState.name);
  await page.screenshot({ path: path.join(SHOTS, '06-add-item.png') });

  await page.evaluate(() => document.querySelector('dialog[open] [data-submit]').click());
  await sleep(1800);
  const afterAdd = await page.evaluate(() => document.querySelectorAll('.item-card').length);
  check('Вещь сохраняется в шкаф', afterAdd === beforeAdd + 1, `${beforeAdd} → ${afterAdd}`);

  // стиль
  await page.evaluate(() => document.querySelector('.tab[data-view="style"]').click());
  await sleep(900);
  await page.screenshot({ path: path.join(SHOTS, '07-style-desktop.png'), fullPage: true });
  const style = await page.evaluate(() => ({
    swatches: document.querySelectorAll('.swatch').length,
    combos: document.querySelectorAll('.combo').length,
    sources: document.querySelectorAll('.sources a').length,
    stats: document.querySelectorAll('.stat-num').length
  }));
  check('Палитра сезона и сочетания показаны', style.swatches >= 6 && style.combos >= 5, `${style.swatches} цветов, ${style.combos} сочетаний`);
  check('Источники трендов указаны', style.sources >= 2, `${style.sources} ссылок`);
  check('Статистика гардероба есть', style.stats >= 3);

  // ручная погода
  const settingsOpened = await page.evaluate(() => {
    document.querySelector('#settingsBtn').click();
    return true;
  });
  check('Настройки открываются', settingsOpened);
  await page.waitForSelector('dialog[open]', { timeout: 5000 });
  await sleep(500);
  await page.evaluate(() => {
    const manual = document.querySelector('dialog[open] [data-mode="manual"]');
    if (manual) manual.click();
    const temp = document.querySelector('dialog[open] [data-manual-temp]');
    if (temp) { temp.value = '-5'; temp.dispatchEvent(new Event('input', { bubbles: true })); }
    const condition = document.querySelector('dialog[open] [data-manual-condition]');
    if (condition) condition.value = 'snow';
  });
  await page.screenshot({ path: path.join(SHOTS, '08-settings.png') });
  await page.evaluate(() => document.querySelector('dialog[open] [data-save]').click());
  await sleep(2600);
  await page.evaluate(() => document.querySelector('.tab[data-view="looks"]').click());
  await sleep(1200);
  await page.screenshot({ path: path.join(SHOTS, '09-looks-cold.png'), fullPage: true });
  const cold = await page.evaluate(() => ({
    temp: document.querySelector('.weather-temp')?.textContent,
    cards: document.querySelectorAll('.look-card').length,
    why: document.querySelector('.look-why')?.textContent,
    items: [...document.querySelectorAll('.look-card')][0]?.innerText
  }));
  check('Ручная погода применяется', cold.temp && /-5/.test(cold.temp), cold.temp);
  check('Образы пересобраны под холод', cold.cards >= 4, cold.why);

  // сохранность после перезагрузки
  await page.reload({ waitUntil: 'networkidle2', timeout: 45000 });
  await sleep(3200);
  let reloadLooks = 0;
  try {
    await page.waitForSelector('.look-card', { timeout: 25000 });
    reloadLooks = await page.evaluate(() => document.querySelectorAll('.look-card').length);
  } catch {}
  check('После перезагрузки образы собрались автоматически', reloadLooks >= 4, `${reloadLooks} шт.`);
  await page.evaluate(() => document.querySelector('.tab[data-view="wardrobe"]').click());
  await sleep(900);
  const persistedWardrobe = await page.evaluate(() => document.querySelectorAll('.item-card').length);
  check('Шкаф на месте после перезагрузки', persistedWardrobe === afterAdd, `${persistedWardrobe} вещей`);
  await page.screenshot({ path: path.join(SHOTS, '10-wardrobe-reload.png'), fullPage: true });

  // резервная копия: экспорт → импорт без потерь
  const backup = await page.evaluate(async () => {
    const { db } = await import('./js/db.js');
    const data = await db.exportAll();
    await db.importAll(data, { merge: true });
    const items = await db.getItems();
    return { before: data.items.length, after: items.length, version: data.version, looks: data.looks.length };
  });
  check('Резервная копия: экспорт и импорт без потерь', backup.version === 1 && backup.before === backup.after && backup.after >= 21, JSON.stringify(backup));

  // мобильный вид
  const mobile = await browser.newPage();
  await mobile.setViewport({ ...MOBILE, isMobile: true, hasTouch: true });
  mobile.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(`[mobile] ${msg.text()}`); });
  await mobile.goto(`${BASE}?qa=1`, { waitUntil: 'networkidle2', timeout: 45000 });
  await sleep(2600);
  await mobile.screenshot({ path: path.join(SHOTS, '11-mobile-looks.png'), fullPage: false });
  const mobileMetrics = await mobile.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - window.innerWidth,
    cards: document.querySelectorAll('.look-card').length,
    tabbar: Boolean(document.querySelector('.tabbar'))
  }));
  check('Мобильный вид без горизонтального скролла', mobileMetrics.overflow <= 1, `overflow=${mobileMetrics.overflow}px`);
  check('На мобильном образы и таббар на месте', mobileMetrics.cards >= 4 && mobileMetrics.tabbar);

  const mobileInstall = await mobile.evaluate(() => ({
    banner: Boolean(document.querySelector('.install-banner')),
    button: Boolean(document.querySelector('#installBtn')) && !document.querySelector('#installBtn').classList.contains('hidden')
  }));
  check('Мобильный: установка на виду', mobileInstall.banner && mobileInstall.button);
  await mobile.evaluate(() => document.querySelector('.install-banner [data-action="dismiss-install"]')?.click());
  await sleep(350);
  const mobileDismissed = await mobile.evaluate(() => !document.querySelector('.install-banner'));
  check('Баннер установки скрывается', mobileDismissed);

  await mobile.evaluate(() => document.querySelector('.tab[data-view="wardrobe"]').click());
  await sleep(900);
  await mobile.screenshot({ path: path.join(SHOTS, '12-mobile-wardrobe.png') });
  const mobileWardrobe = await mobile.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - window.innerWidth,
    cards: document.querySelectorAll('.item-card').length
  }));
  check('Мобильный шкаф без горизонтального скролла', mobileWardrobe.overflow <= 1, `overflow=${mobileWardrobe.overflow}px`);
  await mobile.evaluate(() => document.querySelector('[data-action="open-add"]').click());
  await sleep(500);
  await mobile.screenshot({ path: path.join(SHOTS, '13-mobile-add.png') });
  const mobileSheet = await mobile.evaluate(() => {
    const dialog = document.querySelector('dialog[open]');
    if (!dialog) return null;
    const rect = dialog.getBoundingClientRect();
    return { width: rect.width, height: rect.height, viewport: [window.innerWidth, window.innerHeight] };
  });
  check('Форма добавления помещается на телефоне', mobileSheet && mobileSheet.width <= 390 && mobileSheet.height <= 900, JSON.stringify(mobileSheet));
  await mobile.evaluate(() => document.querySelector('dialog[open] [data-close]')?.click());

  // ошибки
  const appErrors = pageErrors.filter((e) => !/favicon/i.test(e));
  check('Нет необработанных ошибок страницы', appErrors.length === 0, appErrors.slice(0, 3).join(' | '));
  check('Нет console.error', consoleErrors.length === 0, consoleErrors.slice(0, 4).join(' | '));

  fs.writeFileSync(path.join(__dirname, 'report.json'), JSON.stringify({ results, consoleErrors, pageErrors }, null, 2));
  const failed = results.filter((r) => !r.ok);
  console.log(`\nИтого: ${results.length - failed.length}/${results.length} проверок. Скриншоты: qa/shots/`);
  if (failed.length) console.log('Провалено:', failed.map((f) => f.name).join('; '));
  await browser.close();
  process.exit(failed.length ? 1 : 0);
}

main().catch((error) => {
  console.error('E2E упал:', error);
  process.exit(2);
});
