/* ============================================================
   ШКАФ — интерфейс: разметка, карточки, диалоги
   ============================================================ */

import {
  CATEGORIES, SUBCATEGORIES, STYLE_TAGS, OCCASIONS, PATTERNS,
  COLOR_NAMES, SEASONS, TREND_SOURCES, itemTitle, seasonForDate
} from './data.js';
import { paletteFromImage, colorName, bestTextColor } from './color.js';
import { requirementsFor, itemWarmthRange } from './engine.js';
import qrcode from './vendor/qrcode.mjs';

/* ---------- small helpers ---------- */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function plural(n, forms) {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b > 1 && b < 5) return forms[1];
  if (b === 1) return forms[0];
  return forms[2];
}

export function localDateISO(date = new Date()) {
  const d = new Date(date);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function formatToday(date = new Date()) {
  const s = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatTime(ts) {
  if (!ts) return '';
  try {
    return new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(new Date(ts));
  } catch { return ''; }
}

export function relativeWear(lastWorn, wearCount) {
  if (!lastWorn) return wearCount > 0 ? 'носили' : 'ещё не носили';
  const days = Math.floor((Date.now() - new Date(lastWorn).getTime()) / 86400000);
  if (days <= 0) return 'сегодня';
  if (days === 1) return 'вчера';
  if (days < 7) return `${days} ${plural(days, ['день', 'дня', 'дней'])} назад`;
  if (days < 30) {
    const w = Math.floor(days / 7);
    return `${w} ${plural(w, ['неделю', 'недели', 'недель'])} назад`;
  }
  const m = Math.floor(days / 30);
  return `${m} ${plural(m, ['месяц', 'месяца', 'месяцев'])} назад`;
}

export function roundTemp(t) {
  return `${Math.round(Number(t))}°`;
}

export function categoryById(id) {
  return CATEGORIES.find((c) => c.id === id) || CATEGORIES[0];
}

export function subcategoryById(category, id) {
  const list = SUBCATEGORIES[category] || [];
  return list.find((s) => s.id === id) || list[0] || null;
}

export function categoryIcon(id) {
  return Object.prototype.hasOwnProperty.call(ICON_PATHS, id) ? id : 'hanger';
}

export function itemShortName(item) {
  const sub = subcategoryById(item.category, item.subcategory);
  const color = item.colorName || colorName(item.colorHex).name;
  return `${color} ${sub ? sub.label.toLowerCase() : ''}`.trim();
}

export function itemPhotoHtml(item, { demoClass = true } = {}) {
  if (!item.photo) {
    return `<div class="shot--icon" style="height:100%">${icon(categoryIcon(item.category))}</div>`;
  }
  const demo = item.source === 'demo' && demoClass;
  return `<img src="${esc(item.photo)}" alt="${esc(item.name || itemShortName(item))}" loading="lazy" decoding="async" ${demo ? 'class="is-demo"' : ''}>`;
}

/* ---------- icons (24×24, stroke) ---------- */

const ICON_PATHS = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2.2M12 19.8V22M2 12h2.2M19.8 12H22M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M19.1 4.9l-1.6 1.6M6.5 17.5l-1.6 1.6"/>',
  moon: '<path d="M20.4 14.6A8.6 8.6 0 0 1 9.4 3.6a8.6 8.6 0 1 0 11 11Z"/>',
  'cloud-sun': '<circle cx="7.6" cy="8.4" r="2.4"/><path d="M7.6 3.3v1.2M7.6 12.3v1.2M2.5 8.4h1.2M12.3 8.4h1.2M3.9 4.7l.9.9M10.4 11.2l.9.9M11.3 4.7l-.9.9M4.8 11.2l-.9.9"/><path d="M9.8 19.6h7.7a3 3 0 0 0 .3-6 4.5 4.5 0 0 0-8.5-.8 3.3 3.3 0 0 0 .5 6.8Z"/>',
  cloud: '<path d="M7.4 18.2h9a3.4 3.4 0 0 0 .4-6.8 5.1 5.1 0 0 0-9.9-.7 3.8 3.8 0 0 0 .5 7.5Z"/>',
  fog: '<path d="M7.4 15.4h9a3.4 3.4 0 0 0 .4-6.8 5.1 5.1 0 0 0-9.9-.7 3.8 3.8 0 0 0 .5 7.5Z"/><path d="M5 19h9M8 21.6h9"/>',
  drizzle: '<path d="M7.4 15.2h9a3.4 3.4 0 0 0 .4-6.8 5.1 5.1 0 0 0-9.9-.7 3.8 3.8 0 0 0 .5 7.5Z"/><path d="M9 18.4l-.6 2M13 18.4l-.6 2M17 18.4l-.6 2"/>',
  rain: '<path d="M7.4 14.8h9a3.4 3.4 0 0 0 .4-6.8 5.1 5.1 0 0 0-9.9-.7 3.8 3.8 0 0 0 .5 7.5Z"/><path d="M8.5 18l-1.2 2.4M12.5 18l-1.2 2.4M16.5 18l-1.2 2.4"/>',
  snow: '<path d="M7.4 14.4h9a3.4 3.4 0 0 0 .4-6.8 5.1 5.1 0 0 0-9.9-.7 3.8 3.8 0 0 0 .5 7.5Z"/><path d="M8.6 18.2v2.6M7.4 18.9l2.4 1.2M9.8 18.9l-2.4 1.2M15.4 18.2v2.6M14.2 18.9l2.4 1.2M16.6 18.9l-2.4 1.2"/>',
  storm: '<path d="M7.4 14.4h9a3.4 3.4 0 0 0 .4-6.8 5.1 5.1 0 0 0-9.9-.7 3.8 3.8 0 0 0 .5 7.5Z"/><path d="M12.8 16.4 10 21h3l-1 2.2"/><path d="M7.6 18.4l-.6 2M17 18.4l-.6 2"/>',
  pin: '<path d="M12 21s6.5-5.7 6.5-10.4A6.5 6.5 0 0 0 5.5 10.6C5.5 15.3 12 21 12 21Z"/><circle cx="12" cy="10.5" r="2.3"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.4 6.3"/><path d="M20 5v6h-6"/>',
  wind: '<path d="M3 8h9.5a2.5 2.5 0 1 0-2.4-3.2"/><path d="M3 12.5h14a2.6 2.6 0 1 1-2.5 3.3"/><path d="M3 17h6"/>',
  droplet: '<path d="M12 3.5c3.2 3.8 5.5 6.7 5.5 9.4a5.5 5.5 0 1 1-11 0c0-2.7 2.3-5.6 5.5-9.4Z"/>',
  thermo: '<path d="M10 13.5V5a2 2 0 1 1 4 0v8.5a4 4 0 1 1-4 0Z"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  bookmark: '<path d="M7 4.5h10a1 1 0 0 1 1 1V21l-6-3.6L6 21V5.5a1 1 0 0 1 1-1Z"/>',
  check: '<path d="M4.5 12.5 9.5 17.5 19.5 6.5"/>',
  trash: '<path d="M4 7h16M9 7V4.8A1.3 1.3 0 0 1 10.3 3.5h3.4A1.3 1.3 0 0 1 15 4.8V7M6.5 7l.8 12.2a1.5 1.5 0 0 0 1.5 1.5h6.4a1.5 1.5 0 0 0 1.5-1.5L17.5 7"/>',
  camera: '<path d="M4 8.5h2.6l1.3-2h8.2l1.3 2H20a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13.5" r="3.4"/>',
  image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="m4.5 17.5 4.8-4.4 3.2 2.9 2.6-2.4 4.4 4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  shuffle: '<path d="M3.5 7.5h3.2c1.4 0 2.2.6 3 1.8l4.6 6.4c.8 1.2 1.6 1.8 3 1.8h3.2"/><path d="M17.5 4.5l3 3-3 3M17.5 13.5l3 3-3 3"/>',
  sparkle: '<path d="M12 3.5 13.6 9l5.4 1.6-5.4 1.6L12 17.5l-1.6-5.3L5 10.6 10.4 9Z"/><path d="M18.5 16.5l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7Z"/>',
  hanger: '<path d="M12 7.5a2.2 2.2 0 1 1 2.2 2.2c-.8 0-1.2.6-1.2 1.3v.8"/><path d="M12 11.8 4 16.4c-.6.3-.6 1.2 0 1.5l7.4 2.2c.4.1.8.1 1.2 0l7.4-2.2c.6-.3.6-1.2 0-1.5l-8-4.6Z"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 10.8v5.2M12 7.8v.01"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  palette: '<path d="M12 3a9 9 0 0 0 0 18c1.6 0 2-1.1 1.6-2.2-.5-1.5.6-2.8 2.2-2.8H18a3 3 0 0 0 3-3A9 9 0 0 0 12 3Z"/><circle cx="7.6" cy="11.4" r="1"/><circle cx="10.4" cy="7.8" r="1"/><circle cx="15" cy="8.2" r="1"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  download: '<path d="M12 4v11M7.5 11.5 12 16l4.5-4.5M4 19.5h16"/>',
  upload: '<path d="M12 16V5M7.5 8.5 12 4l4.5 4.5M4 19.5h16"/>',
  share: '<path d="M12 3v11M8 6.5 12 3l4 3.5"/><path d="M5 12v7a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-7"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M6 15H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v1"/>',
  phone: '<rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M11 18h2"/>',
  qr: '<rect x="3.5" y="3.5" width="6" height="6" rx="1"/><rect x="14.5" y="3.5" width="6" height="6" rx="1"/><rect x="3.5" y="14.5" width="6" height="6" rx="1"/><path d="M14.5 14.5h2.5v2.5M20.5 14.5v6h-6M14.5 20.5v-1"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 1.8"/>',
  star: '<path d="M12 3.5 14.3 9l5.9.5-4.5 3.8 1.4 5.7-5.1-3.1-5.1 3.1 1.4-5.7L4 9.5 9.7 9Z"/>',
  // категории
  top: '<path d="M9 4.5 12 6l3-1.5 3.4 2-1.3 3-1.6-.7v9.7H8.5V8.8l-1.6.7-1.3-3Z"/>',
  bottom: '<path d="M8 4h8l1 16h-3.6l-1.4-8-1.4 8H7Z"/>',
  dress: '<path d="M9.5 4.5h5l1.5 6 3 8.5c-3.7 1.3-10.3 1.3-14 0l3-8.5Z"/><path d="M9.5 8.5h5"/>',
  outerwear: '<path d="M8.5 4.5 12 6.5l3.5-2 3 2.5v12H5.5v-12Z"/><path d="M12 6.5v12"/>',
  shoes: '<path d="M4 15.5c0-1.2.8-2 2-2h2.4c1 0 1.7.5 2.3 1.4l.8 1.2h6.5c1.4 0 2 1 2 2v1.4H4Z"/><path d="M8 13.5v-2"/>',
  bag: '<rect x="5" y="9" width="14" height="10.5" rx="2"/><path d="M8.5 9V7a3.5 3.5 0 0 1 7 0v2"/>',
  accessory: '<path d="M7 4.5h10v5.5a5 5 0 0 1-10 0Z"/><path d="M9.5 15.5 8 21M14.5 15.5 16 21"/>',
};

export function icon(name, cls = '') {
  const path = ICON_PATHS[name] || ICON_PATHS.sparkle;
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"${cls ? ` class="${esc(cls)}"` : ''} aria-hidden="true">${path}</svg>`;
}

export function weatherIcon(cond) {
  if (!cond) return icon('cloud');
  const map = {
    clear: 'sun', partly: 'cloud-sun', cloudy: 'cloud', overcast: 'cloud',
    fog: 'fog', drizzle: 'drizzle', rain: 'rain', 'heavy-rain': 'rain',
    snow: 'snow', sleet: 'drizzle', thunder: 'storm'
  };
  let name = map[cond.key] || cond.icon || 'cloud';
  if (cond.key === 'clear' && cond.icon === 'moon') name = 'moon';
  return icon(name);
}

/* ---------- colors / tints ---------- */

function rgbOf(hex) {
  const m = String(hex || '').replace('#', '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return { r: 107, g: 34, b: 51 };
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

export function tint(hex, alpha = 0.3, mixWith = '#F5F0E7') {
  const a = rgbOf(hex);
  const b = rgbOf(mixWith);
  const mix = (x, y) => Math.round(x * alpha + y * (1 - alpha));
  return `rgb(${mix(a.r, b.r)}, ${mix(a.g, b.g)}, ${mix(a.b, b.b)})`;
}

function mediaBackground(items) {
  const colors = items.map((i) => i.colorHex).filter(Boolean);
  const c1 = colors[0] || '#EFE5D2';
  const c2 = colors[1] || colors[0] || '#D9CBB4';
  return `linear-gradient(140deg, ${tint(c1, 0.42)}, ${tint(c2, 0.5)} 55%, ${tint(c2, 0.3)})`;
}

/* ---------- shell ---------- */

export function setTheme(season) {
  const root = document.documentElement;
  const accent = (season && season.colors && season.colors[0] && season.colors[0].hex) || '#6B2233';
  root.style.setProperty('--season-accent', accent);
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) themeMeta.setAttribute('content', '#F5F0E7');
}

export function renderShell(state) {
  const chip = $('#seasonChip');
  if (chip && state.season) chip.textContent = state.season.title || `${state.season.label} 2026/27`;
  $$('.tab').forEach((tab) => {
    tab.classList.toggle('is-active', tab.dataset.view === state.view);
  });
  const fab = $('#addBtn');
  if (fab) fab.classList.toggle('hidden', state.view === 'style');
  if (state.season) setTheme(state.season);
}

/* ---------- main renders ---------- */

export function renderMain(state) {
  const main = $('#main');
  if (!main) return;
  let html = '';
  if (state.view === 'wardrobe') html = wardrobeView(state);
  else if (state.view === 'style') html = styleView(state);
  else html = looksView(state);
  main.innerHTML = html;
}

/* --- views --- */

function looksView(state) {
  const hasItems = state.items.length > 0;
  return `
    <section class="section">
      ${weatherBlock(state)}
      ${installBanner(state)}
      <div class="looks-toolbar">
        <div>
          <div class="eyebrow">${esc(formatToday())}</div>
          <h1 class="section-title">Образы на сегодня</h1>
          <p class="section-sub">${hasItems
            ? 'Собрано из ваших вещей — с учётом погоды, палитры сезона и того, что вы давно не носили.'
            : 'Добавьте вещи в шкаф — и приложение соберёт образы по погоде и трендам сезона.'}</p>
        </div>
        <div class="toolbar-actions">
          <button class="btn btn-primary" type="button" data-action="generate" ${!hasItems || state.generating ? 'disabled' : ''}>
            ${state.generating ? '<span class="spinner"></span> Собираем…' : `${icon('sparkle')} ${state.generated.length ? 'Пересобрать' : 'Собрать образ'}`}
          </button>
          ${state.generated.length && !state.generating ? `<button class="btn btn-ghost" type="button" data-action="more">${icon('shuffle')} Ещё варианты</button>` : ''}
        </div>
      </div>
      ${hasItems ? occasionPills(state) : ''}
      ${hasItems ? trendStrip(state) : ''}
      ${warningsBlock(state)}
      ${looksBody(state)}
    </section>
    ${savedLooksSection(state)}
  `;
}

const SHORT_OCCASION = { casual: 'Будни', work: 'Работа', evening: 'Вечер', sport: 'Спорт' };

function occasionPills(state) {
  return `
    <div class="segmented" role="tablist" aria-label="Повод">
      ${OCCASIONS.map((o) => `
        <button class="segmented-btn ${state.occasion === o.id ? 'is-on' : ''}" type="button"
          role="tab" aria-selected="${state.occasion === o.id}" data-action="set-occasion" data-occasion="${esc(o.id)}">
          <span class="seg-label-long">${esc(o.label)}</span><span class="seg-label-short">${esc(SHORT_OCCASION[o.id] || o.label)}</span>
        </button>`).join('')}
    </div>
  `;
}

function trendStrip(state) {
  if (!state.season || !state.season.colors) return '';
  const colors = state.season.colors.slice(0, 6);
  return `
    <div class="trend-strip">
      <b>Палитра сезона:</b>
      <span class="trend-colors" aria-hidden="true">
        ${colors.map((c) => `<span class="trend-dot" style="background:${esc(c.hex)}" title="${esc(c.name)}"></span>`).join('')}
      </span>
      <span>${colors.map((c) => esc(c.name.toLowerCase())).join(' · ')}</span>
      <button class="link-btn" type="button" data-view="style">разобрать сочетания</button>
    </div>
  `;
}

function warningsBlock(state) {
  const warnings = Array.isArray(state.warnings) ? state.warnings : [];
  if (!warnings.length) return '';
  return `
    <div class="notice" role="status">
      ${icon('info')}
      <div>
        ${warnings.length === 1 ? esc(warnings[0]) : `<ul>${warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>`}
      </div>
    </div>
  `;
}

function looksBody(state) {
  if (state.items.length === 0) return onboardingEmpty();
  if (state.weatherStatus === 'error') {
    return emptyBlock({
      icon: 'sparkle',
      title: 'Нужна погода',
      text: 'Без прогноза образ не собрать. Повторите загрузку или укажите температуру вручную в настройках.',
      actions: '<button class="btn btn-primary" type="button" data-action="refresh-weather">Повторить</button><button class="btn btn-ghost" type="button" data-action="open-settings">Настройки</button>'
    });
  }
  if (state.generating) return looksLoading();
  if (!state.generated.length) {
    return emptyBlock({
      icon: 'hanger',
      title: 'Готовы собрать образ',
      text: 'Нажмите «Собрать образ» — покажем варианты из вашего шкафа под сегодняшнюю погоду.',
      actions: '<button class="btn btn-primary" type="button" data-action="generate">Собрать образ</button>'
    });
  }
  const savedSet = state.savedHashes || new Set();
  const wornSet = state.wornTodayHashes || new Set();
  return `
    <div class="looks-grid">
      ${state.generated.map((look) => lookCard(look, state, savedSet, wornSet)).join('')}
    </div>
    <div class="looks-foot">
      <button class="btn btn-ghost" type="button" data-action="more">${icon('shuffle')} Показать другие варианты</button>
    </div>
  `;
}

function looksLoading() {
  return `
    <div class="looks-loading" aria-busy="true" aria-label="Собираем образы">
      <div class="skeleton look-skeleton"></div>
      <div class="skeleton look-skeleton" style="display:none"></div>
    </div>
  `;
}

function lookCard(look, state, savedSet, wornSet) {
  const items = Array.isArray(look.items) ? look.items.filter(Boolean) : [];
  const displayItems = items.slice(0, 3);
  const count = Math.max(1, Math.min(displayItems.length, 3));
  const hash = look.hash || (look.itemIds || []).slice().sort().join('|');
  const isSaved = savedSet.has(hash) || Boolean(look._saved);
  const isWorn = wornSet.has(hash) || Boolean(look._wornToday);
  const shots = displayItems.map((item, index) => {
    const demo = item.source === 'demo';
    return `
      <div class="shot ${demo ? 'shot--demo' : ''}" title="${esc(item.name || itemShortName(item))}">
        ${item.photo
          ? `<img src="${esc(item.photo)}" alt="${esc(item.name || itemShortName(item))}" loading="lazy" decoding="async">`
          : `<div class="shot--icon">${icon(categoryIcon(item.category))}</div>`}
        ${index === 0 ? `<span class="shot-label">${esc(item.name || itemShortName(item))}</span>` : ''}
      </div>`;
  }).join('');
  const chips = (look.chips || []).slice(0, 4).map((chip) => {
    const type = chip && chip.type ? String(chip.type) : '';
    const cls = type === 'palette' ? 'look-chip--palette'
      : type === 'weather' ? 'look-chip--weather'
        : type === 'fresh' ? 'look-chip--fresh' : '';
    return `<span class="look-chip ${cls}">${esc(chip.label || chip)}</span>`;
  }).join('');
  const itemNames = items.map((item) => esc(itemShortName(item))).join('');
  const score = Number.isFinite(look.score) ? Math.round(look.score) : null;
  return `
    <article class="look-card" data-look-id="${esc(look.id || hash)}">
      <div class="look-media" data-count="${count}" style="--media-bg:${mediaBackground(items)}">
        ${isWorn ? '<span class="look-flag">Носите сегодня</span>' : ''}
        ${shots || `<div class="shot shot--icon">${icon('hanger')}</div>`}
      </div>
      <div class="look-body">
        <div class="look-head">
          <h2 class="look-title">${esc(look.title || 'Образ')}</h2>
          ${score != null ? `<span class="look-score" title="Оценка сочетания">${score}</span>` : ''}
        </div>
        <p class="look-why">${esc(look.why || '')}</p>
        ${chips ? `<div class="look-chips">${chips}</div>` : ''}
        ${itemNames ? `<div class="look-items">${items.map((i) => `<span>${esc(itemShortName(i))}</span>`).join('')}</div>` : ''}
        <div class="look-actions">
          <button class="btn ${isWorn ? 'btn-ghost' : 'btn-primary'}" type="button" data-action="wear" data-look-id="${esc(look.id || hash)}" ${isWorn ? 'disabled' : ''}>
            ${icon('check')} ${isWorn ? 'Надето' : 'Надеть'}
          </button>
          <button class="icon-btn ${isSaved ? 'is-saved' : ''}" type="button" data-action="save-look" data-look-id="${esc(look.id || hash)}" aria-label="${isSaved ? 'Убрать из сохранённых' : 'Сохранить образ'}" title="${isSaved ? 'В сохранённых' : 'Сохранить образ'}">
            ${icon('bookmark')}
          </button>
          <button class="icon-btn" type="button" data-action="dislike" data-look-id="${esc(look.id || hash)}" aria-label="Больше не предлагать" title="Больше не предлагать">
            ${icon('close')}
          </button>
        </div>
      </div>
    </article>
  `;
}

function savedLooksSection(state) {
  if (!state.looks || !state.looks.length) return '';
  return `
    <section class="section">
      <div class="section-head">
        <div>
          <div class="eyebrow">Сохранённое</div>
          <h2 class="section-title">Мои образы</h2>
        </div>
        <span class="muted">${state.looks.length} ${plural(state.looks.length, ['образ', 'образа', 'образов'])}</span>
      </div>
      <div class="mini-list">
        ${state.looks.slice(0, 12).map((look) => {
          const first = (look.items || [])[0];
          const titleText = look.title || 'Образ';
          const sub = (look.items || []).map((i) => itemShortName(i)).slice(0, 3).join(' · ');
          return `
            <div class="mini-row" style="cursor:default">
              <div class="mini-thumb ${first && first.source === 'demo' ? 'mini-thumb--demo' : ''}">
                ${first ? (first.photo ? `<img src="${esc(first.photo)}" alt="">` : icon('hanger')) : icon('hanger')}
              </div>
              <div class="mini-info">
                <div class="mini-name">${esc(titleText)}</div>
                <div class="mini-sub">${esc(sub)}</div>
              </div>
              <button class="btn btn-soft btn-sm" type="button" data-action="wear-saved" data-look-id="${esc(look.id)}">Надеть</button>
              <button class="icon-btn" type="button" data-action="delete-look" data-look-id="${esc(look.id)}" aria-label="Удалить образ">${icon('trash')}</button>
            </div>`;
        }).join('')}
      </div>
    </section>
  `;
}

function onboardingEmpty() {
  return emptyBlock({
    icon: 'hanger',
    title: 'Шкаф пока пуст',
    text: 'Сфотографируйте вещи, которые носите, — приложение соберёт образы по погоде и палитре сезона. Фото остаются только на вашем устройстве.',
    actions: `<button class="btn btn-primary" type="button" data-action="open-add">${icon('plus')} Добавить первую вещь</button>
      <button class="btn btn-ghost" type="button" data-action="load-demo">Посмотреть на демо-шкафу</button>`
  });
}

function emptyBlock({ icon: iconName, title, text, actions }) {
  return `
    <div class="empty">
      <div class="empty-art">${icon(iconName)}</div>
      <div class="empty-title">${esc(title)}</div>
      <p class="empty-text">${esc(text)}</p>
      <div class="empty-actions">${actions || ''}</div>
    </div>
  `;
}


/* --- установка приложения --- */

export function installBanner(state) {
  const install = state.install || {};
  if (install.standalone || install.dismissed) return '';
  return `
    <div class="install-banner" role="note">
      <span class="install-banner-icon">${icon('download')}</span>
      <span class="install-banner-text">
        <b>Установите «ШКАФ» на экран</b>
        <span>Откроется как приложение — с иконкой, без адресной строки</span>
      </span>
      <button class="btn btn-accent btn-sm" type="button" data-action="install">Установить</button>
      <button class="icon-btn" type="button" data-action="dismiss-install" aria-label="Скрыть">${icon('close')}</button>
    </div>
  `;
}

function qrSvg(text) {
  try {
    const qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    return qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
  } catch (error) {
    console.warn('QR не построился', error);
    return '';
  }
}

function installSteps({ isIOS, isAndroid, canPrompt }) {
  if (isIOS) {
    return [
      'Откройте эту ссылку в Safari — на iPhone установка работает только там (не в Chrome и не в Instagram).',
      'Нажмите «Поделиться» — квадрат со стрелкой внизу экрана.',
      'Выберите «На экран «Домой»» и подтвердите «Добавить».',
      'Запускайте «ШКАФ» с иконки: он откроется без адресной строки, а шкаф останется на месте.'
    ];
  }
  if (isAndroid) {
    return [
      canPrompt
        ? 'Нажмите кнопку «Установить приложение» выше — Chrome попросит подтверждение.'
        : 'Откройте меню Chrome (⋮) в правом верхнем углу.',
      'Выберите «Установить приложение» или «Добавить на главный экран».',
      'Подтвердите — иконка «ШКАФ» появится на экране телефона.',
      canPrompt
        ? 'Готово: приложение откроется отдельным окном, без адресной строки.'
        : 'Если пункта нет — страница открыта по обычному http. Откройте HTTPS-ссылку из QR-кода выше: по ней установка доступна.'
    ];
  }
  return [
    'В Chrome или Edge нажмите иконку установки в адресной строке (справа, рядом со звёздочкой).',
    'Или нажмите «Установить приложение» выше, если кнопка доступна.',
    'В Safari на macOS: меню «Файл» → «Добавить в Dock».',
    'Готово: приложение откроется в отдельном окне, без вкладок и адресной строки.'
  ];
}

export function openInstallSheet({
  url = '',
  canPrompt = false,
  standalone = false,
  isIOS = false,
  isAndroid = false,
  onInstall = null
} = {}) {
  const shareUrl = url || (typeof location !== 'undefined' ? location.href : '');
  const qr = shareUrl ? qrSvg(shareUrl) : '';
  const steps = installSteps({ isIOS, isAndroid, canPrompt });
  const localHosts = ['localhost', '127.0.0.1', '[::1]'];
  const isLocal = typeof location !== 'undefined' && localHosts.includes(location.hostname);
  const isHttp = typeof location !== 'undefined' && location.protocol === 'http:';
  const differentOrigin = shareUrl && typeof location !== 'undefined' && !shareUrl.startsWith(location.origin);

  const { dialog, close } = openDialog(`
    <div class="sheet-head">
      <div>
        <div class="sheet-title">Установить «ШКАФ»</div>
        <div class="sheet-sub">Иконка на экране, запуск в один тап</div>
      </div>
      <button class="icon-btn" type="button" data-close aria-label="Закрыть">${icon('close')}</button>
    </div>
    <div class="sheet-body form">
      <div class="install-lead">
        <span class="install-lead-icon">${icon(standalone ? 'check' : 'download')}</span>
        <span>
          <span class="install-lead-title">${standalone ? 'Уже установлено' : (canPrompt ? 'Один тап — и на экране' : 'На домашний экран')}</span>
          <span class="install-lead-sub">${standalone
            ? 'Вы открыли приложение с экрана — всё работает.'
            : 'После установки «ШКАФ» открывается отдельным окном, без адресной строки. Шкаф и фото остаются в этом браузере.'}</span>
        </span>
      </div>
      ${standalone ? '' : `
        ${canPrompt ? `<button class="btn btn-primary btn-lg" type="button" data-native>${icon('download')} Установить приложение</button>` : ''}
        ${qr ? `
          <div class="install-qr">
            <div class="install-qr-box" aria-label="QR-код со ссылкой">${qr}</div>
            <div class="install-qr-copy">
              <b>С телефона — быстрее</b>
              <span>Наведите камеру: откроется эта же страница. Дальше — кнопка «Поделиться» на iPhone или «Установить» на Android.</span>
            </div>
          </div>` : ''}
        <div class="field">
          <span class="field-label">Ссылка для установки</span>
          <div class="install-link">
            <input class="input" type="text" readonly data-url value="${esc(shareUrl)}">
            <button class="btn btn-ghost btn-sm" type="button" data-copy>${icon('copy')} Копировать</button>
          </div>
          ${differentOrigin ? '<span class="field-hint">Это адрес, по которому телефон откроет шкаф. На ноутбуке приложение уже доступно по текущему адресу.</span>' : ''}
          ${isHttp && !isLocal && !differentOrigin ? '<span class="field-hint">Открыто по http: Android установит ярлык, полноценная установка — по HTTPS-ссылке.</span>' : ''}
        </div>
        <div class="field">
          <span class="field-label">Как установить</span>
          <div class="install-steps">
            ${steps.map((text, index) => `<div class="install-step"><span class="install-step-num">${index + 1}</span><span>${esc(text)}</span></div>`).join('')}
          </div>
        </div>
        <div class="install-hint">iPhone: устанавливать нужно из Safari. Android: из Chrome. После установки приложение работает и без интернета — погода подтянется, когда сеть появится.</div>
      `}
    </div>
    <div class="sheet-foot">
      <button class="btn btn-ghost" type="button" data-close>Закрыть</button>
      ${standalone ? '' : `<div class="spacer"></div><button class="btn btn-soft" type="button" data-share>${icon('share')} Поделиться ссылкой</button>`}
    </div>
  `, {
    onMount(dialogEl, closeFn) {
      const copy = async () => {
        try {
          if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(shareUrl);
          } else {
            const input = $('[data-url]', dialogEl);
            if (!input) throw new Error('нет поля');
            input.focus();
            input.select();
            document.execCommand('copy');
          }
          toast('Ссылка скопирована');
        } catch {
          toast('Не удалось скопировать — выделите ссылку вручную', 'error');
        }
      };
      const native = async () => {
        closeFn();
        if (typeof onInstall === 'function') await onInstall();
      };
      dialogEl.addEventListener('click', async (event) => {
        if (event.target.closest('[data-close]')) { closeFn(); return; }
        if (event.target.closest('[data-copy]')) { await copy(); return; }
        if (event.target.closest('[data-native]')) { await native(); return; }
        if (event.target.closest('[data-share]')) {
          if (navigator.share) {
            try { await navigator.share({ title: 'ШКАФ — образы из ваших вещей', url: shareUrl }); } catch {}
          } else {
            await copy();
          }
        }
      });
    }
  });
  void close;
}

/* --- weather --- */

function weatherBlock(state) {
  if (state.weatherStatus === 'loading') {
    return '<div class="weather-card weather-skeleton" aria-label="Загружаем погоду"></div>';
  }
  if (state.weatherStatus === 'error' || !state.weather) {
    return `
      <div class="weather-error" role="status">
        <div>
          <div class="weather-error-title">Погода не загрузилась</div>
          <div class="weather-error-text">${esc(state.weatherError || 'Сеть недоступна. Можно указать температуру вручную в настройках — образы всё равно соберутся.')}</div>
        </div>
        <div class="toolbar-actions">
          <button class="btn btn-ghost btn-sm" type="button" data-action="refresh-weather">Повторить</button>
          <button class="btn btn-soft btn-sm" type="button" data-action="open-settings" data-focus="weather">Указать вручную</button>
        </div>
      </div>
    `;
  }
  const w = state.weather;
  const cond = w.condition || { label: 'Погода', icon: 'cloud' };
  const place = (w.location && (w.location.name || w.location.country)) || 'Ваш город';
  const req = requirementsFor(w);
  const facts = [];
  if (req && req.summary) facts.push(`<span class="fact">${icon('thermo')}${esc(req.summary)}</span>`);
  if (Number.isFinite(w.precipProb)) {
    const wet = ['drizzle', 'rain', 'heavy-rain', 'snow', 'sleet', 'thunder'].includes(cond.key);
    const label = w.precipProb >= 20
      ? `${wet ? cond.label : 'Осадки'} ${Math.round(w.precipProb)}%`
      : (wet ? `Возможен ${cond.key === 'snow' || cond.key === 'sleet' ? 'снег' : 'дождь'}` : 'Без осадков');
    facts.push(`<span class="fact">${icon('droplet')}${esc(label)}</span>`);
  }
  if (Number.isFinite(w.windSpeed)) facts.push(`<span class="fact">${icon('wind')}Ветер ${Math.round(w.windSpeed)} км/ч</span>`);
  if (Number.isFinite(w.uvIndex) && w.isDay) facts.push(`<span class="fact">${icon('sun')}UV ${Math.round(w.uvIndex)}</span>`);
  if (w.source === 'manual') facts.push(`<span class="fact">${icon('info')}погода вручную</span>`);
  const hours = (w.hourly || []).slice(0, 8).map((h) => {
    let label = '';
    if (h.time) {
      const iso = String(h.time);
      label = iso.length >= 16 ? iso.slice(11, 16) : '';
    }
    return `<div class="hour">
      <span class="hour-time">${esc(label)}</span>
      ${weatherIcon(h.condition)}
      <span class="hour-temp">${roundTemp(h.temp)}</span>
    </div>`;
  }).join('');
  return `
    <section class="weather-card" aria-label="Погода">
      <div class="weather-top">
        <button class="weather-place" type="button" data-action="open-settings" title="Сменить город и настройки погоды">${icon('pin')}<span>${esc(place)} · обновлено ${esc(formatTime(w.updatedAt))}</span></button>
        <button class="weather-refresh ${state.refreshing ? 'is-spinning' : ''}" type="button" data-action="refresh-weather">
          ${icon('refresh')} ${state.refreshing ? 'Обновляем' : 'Обновить'}
        </button>
      </div>
      <div class="weather-main">
        <div>
          <div class="weather-temp">${roundTemp(w.temp)}<span class="weather-deg">C</span></div>
          <div class="weather-cond">${esc(cond.label)}${w.isDay === false ? ' · ночь' : ''}</div>
          <div class="weather-feels">ощущается ${roundTemp(w.feelsLike)}</div>
        </div>
        <div class="weather-icon ${cond.icon === 'moon' ? 'weather-icon--moon' : ''}" aria-hidden="true">${weatherIcon(cond)}</div>
      </div>
      <div class="weather-facts">${facts.join('')}</div>
      ${hours ? `<div class="weather-hours" aria-label="Погода по часам">${hours}</div>` : ''}
    </section>
  `;
}

/* --- wardrobe --- */

function wardrobeView(state) {
  const items = state.items;
  const filter = state.filter || 'all';
  const filtered = filter === 'all' ? items : items.filter((i) => i.category === filter);
  const counts = {};
  items.forEach((i) => { counts[i.category] = (counts[i.category] || 0) + 1; });
  const neverWorn = items.filter((i) => !i.lastWorn).length;
  const cats = CATEGORIES.filter((c) => counts[c.id] || c.id === 'all');
  return `
    <section class="section">
      <div class="section-head">
        <div>
          <div class="eyebrow">Гардероб</div>
          <h1 class="section-title">Шкаф</h1>
          <p class="section-sub">${items.length
            ? 'Все ваши вещи — здесь. Чем больше шкаф, тем точнее образы.'
            : 'Сюда попадут вещи, которые вы сфотографируете. Пока пусто.'}</p>
        </div>
        <button class="btn btn-accent" type="button" data-action="open-add">${icon('plus')} Добавить вещь</button>
      </div>
      ${items.length ? `
        <div class="wardrobe-summary">
          <span><b>${items.length}</b> ${plural(items.length, ['вещь', 'вещи', 'вещей'])}</span>
          <span><b>${cats.length}</b> ${plural(cats.length, ['категория', 'категории', 'категорий'])}</span>
          <span><b>${neverWorn}</b> ${plural(neverWorn, ['вещь', 'вещи', 'вещей'])} ещё не носили</span>
        </div>
        <div class="filters" role="tablist" aria-label="Фильтр по категории">
          <button class="chip ${filter === 'all' ? 'is-on' : ''}" type="button" data-action="filter-category" data-category="all">Все</button>
          ${CATEGORIES.filter((c) => counts[c.id]).map((c) => `
            <button class="chip ${filter === c.id ? 'is-on' : ''}" type="button" data-action="filter-category" data-category="${esc(c.id)}">
              ${icon(categoryIcon(c.id))} ${esc(c.plural || c.label)} <span class="muted">${counts[c.id]}</span>
            </button>`).join('')}
        </div>
      ` : ''}
      <div class="wardrobe-grid">
        ${filtered.map((item) => itemCard(item)).join('')}
        ${filter === 'all' ? `
          <button class="item-add" type="button" data-action="open-add">
            ${icon('plus')}
            <span>Добавить вещь</span>
          </button>` : ''}
      </div>
      ${items.length ? '' : onboardingEmpty()}
    </section>
  `;
}

function itemCard(item) {
  const sub = subcategoryById(item.category, item.subcategory);
  const wornToday = item.lastWorn && localDateISO(item.lastWorn) === localDateISO();
  return `
    <button class="item-card" type="button" data-action="edit-item" data-item-id="${esc(item.id)}">
      <div class="item-photo ${item.source === 'demo' ? 'item-photo--demo' : ''}" style="--item-bg:${tint(item.colorHex, 0.3)}">
        ${item.photo
          ? `<img src="${esc(item.photo)}" alt="${esc(item.name || itemShortName(item))}" loading="lazy" decoding="async">`
          : `<div class="shot--icon" style="height:100%">${icon(categoryIcon(item.category))}</div>`}
        ${wornToday ? '<span class="item-worn">сегодня</span>' : ''}
        ${item.favorite ? `<span class="item-fav">${icon('bookmark')}</span>` : ''}
      </div>
      <div class="item-body">
        <span class="item-name">${esc(item.name || itemTitle(item))}</span>
        <span class="item-meta">
          <span class="color-dot" style="background:${esc(item.colorHex)}"></span>
          ${esc(item.colorName || colorName(item.colorHex).name)}${sub ? ` · ${esc(sub.label.toLowerCase())}` : ''}
        </span>
      </div>
    </button>
  `;
}

/* --- style --- */

function styleView(state) {
  const season = state.season || seasonForDate();
  const items = state.items || [];
  const stats = wardrobeStats(items, state);
  const neglected = [...items]
    .filter((i) => (!i.lastWorn || Date.now() - new Date(i.lastWorn).getTime() > 14 * 86400000))
    .sort((a, b) => (a.lastWorn || 0) - (b.lastWorn || 0))
    .slice(0, 5);
  const loved = [...items].sort((a, b) => (b.wearCount || 0) - (a.wearCount || 0)).filter((i) => (i.wearCount || 0) > 0).slice(0, 5);
  return `
    <section class="section">
      <div class="eyebrow">Сезон</div>
      <h1 class="section-title">${esc(season.title || season.label)}</h1>
      <p class="section-sub">${esc(season.summary || '')}</p>
      <div class="style-hero">
        <div class="palette-grid">
          ${(season.colors || []).map((c) => `
            <div class="swatch">
              <span class="swatch-color" style="background:${esc(c.hex)}"></span>
              <span>
                <span class="swatch-name">${esc(c.name)}</span><br>
                <span class="swatch-hex">${esc(c.hex)}</span>
              </span>
            </div>`).join('')}
        </div>
        <div class="eyebrow" style="margin-top:22px">Работающие сочетания</div>
        <div class="combos">
          ${(season.combos || []).map((combo) => `
            <div class="combo">
              <span class="combo-dots">
                <span class="combo-dot" style="background:${esc(combo.a)}"></span>
                <span class="combo-dot" style="background:${esc(combo.b)}"></span>
              </span>
              <span>
                <span class="combo-label">${esc(combo.label)}</span>
                <span class="combo-note">${esc(combo.note || '')}</span>
              </span>
            </div>`).join('')}
        </div>
        <div class="sources">
          ${season.source && season.source.url ? `<a href="${esc(season.source.url)}" target="_blank" rel="noopener">${esc(season.source.label)}</a>` : ''}
          ${(TREND_SOURCES || []).filter((s) => s.url && (!season.source || s.url !== season.source.url)).slice(0, 3).map((s) => `
            · <a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a>`).join('')}
        </div>
      </div>
    </section>

    <section class="section">
      <div class="eyebrow">Ваш гардероб</div>
      <h2 class="section-title">Немного статистики</h2>
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-num">${stats.items}</div><div class="stat-label">вещей в шкафу</div></div>
        <div class="stat-card"><div class="stat-num">${stats.looks}</div><div class="stat-label">образов сохранено</div></div>
        <div class="stat-card"><div class="stat-num">${stats.neverWorn}</div><div class="stat-label">ещё не носили</div></div>
      </div>
      ${items.length === 0 ? emptyBlock({
        icon: 'sparkle',
        title: 'Статистика появится позже',
        text: 'Добавьте вещи и отмечайте, что носите, — покажем, что пора разгрузить, а что вы незаслуженно забыли.',
        actions: '<button class="btn btn-primary" type="button" data-action="open-add">Добавить вещь</button>'
      }) : `
        <div class="section-head" style="margin-top:26px">
          <h3 class="section-title" style="font-size:22px">Пора надеть</h3>
          <span class="muted">давно не носили</span>
        </div>
        <div class="mini-list">
          ${(neglected.length ? neglected : items.slice(0, 3)).map((item) => miniItemRow(item, relativeWear(item.lastWorn, item.wearCount))).join('')}
        </div>
        ${loved.length ? `
          <div class="section-head" style="margin-top:26px">
            <h3 class="section-title" style="font-size:22px">Ваши любимцы</h3>
            <span class="muted">чаще всего носите</span>
          </div>
          <div class="mini-list">
            ${loved.map((item) => miniItemRow(item, `${item.wearCount} ${plural(item.wearCount, ['раз', 'раза', 'раз'])}`)).join('')}
          </div>` : ''}
      `}
      <div class="sources" style="margin-top:26px">
        Фото и вещи хранятся только в этом браузере${state.storageMode === 'localstorage' ? ' (запасное хранилище)' : ''}. Погода — Open-Meteo.
        Сделайте резервную копию в настройках, если не хотите потерять шкаф.
      </div>
    </section>
  `;
}

function miniItemRow(item, sub) {
  return `
    <button class="mini-row" type="button" data-action="edit-item" data-item-id="${esc(item.id)}">
      <span class="mini-thumb ${item.source === 'demo' ? 'mini-thumb--demo' : ''}">
        ${item.photo ? `<img src="${esc(item.photo)}" alt="" loading="lazy">` : icon(categoryIcon(item.category))}
      </span>
      <span class="mini-info">
        <span class="mini-name">${esc(item.name || itemTitle(item))}</span>
        <span class="mini-sub">${esc(sub)}</span>
      </span>
      <span class="mini-trailing">${icon('arrow')}</span>
    </button>
  `;
}

function wardrobeStats(items, state) {
  return {
    items: items.length,
    looks: (state.looks || []).length,
    neverWorn: items.filter((i) => !i.lastWorn).length
  };
}

/* ============================================================
   Dialogs
   ============================================================ */

function openDialog(html, { onMount, onClose } = {}) {
  const root = $('#dialogRoot') || document.body;
  const dialog = document.createElement('dialog');
  dialog.className = 'sheet';
  dialog.innerHTML = `<div class="sheet-inner">${html}</div>`;
  root.appendChild(dialog);
  let closed = false;
  const close = (value) => {
    if (closed) return;
    closed = true;
    try { dialog.close(); } catch {}
    dialog.remove();
    if (typeof onClose === 'function') onClose(value);
  };
  dialog.addEventListener('cancel', (event) => { event.preventDefault(); close(); });
  dialog.addEventListener('click', (event) => { if (event.target === dialog) close(); });
  dialog.addEventListener('close', () => { if (!closed) { closed = true; dialog.remove(); } });
  if (!dialog.open) dialog.showModal();
  if (typeof onMount === 'function') {
    // Микрозадача: onMount может ссылаться на `dialog`/`close`, объявленные после вызова openDialog.
    queueMicrotask(() => {
      if (closed) return;
      try { onMount(dialog, close); } catch (error) { console.error('dialog mount', error); }
    });
  }
  requestAnimationFrame(() => {
    const body = dialog.querySelector('.sheet-body');
    if (body) body.scrollTop = 0;
  });
  return { dialog, close };
}

export function toast(message, type = 'ok') {
  const root = $('#toastRoot');
  if (!root) return;
  const node = document.createElement('div');
  node.className = `toast${type === 'error' ? ' is-error' : ''}`;
  node.textContent = message;
  root.appendChild(node);
  const remove = () => {
    node.classList.add('is-out');
    setTimeout(() => node.remove(), 260);
  };
  setTimeout(remove, type === 'error' ? 4600 : 3200);
  node.addEventListener('click', remove);
}

export function confirmSheet({ title, text, confirmLabel = 'Удалить', cancelLabel = 'Отмена', danger = true }) {
  return new Promise((resolve) => {
    let answered = false;
    const { close } = openDialog(`
      <div class="sheet-head">
        <div>
          <div class="sheet-title">${esc(title)}</div>
          ${text ? `<div class="sheet-sub">${esc(text)}</div>` : ''}
        </div>
        <button class="icon-btn" type="button" data-close aria-label="Закрыть">${icon('close')}</button>
      </div>
      <div class="sheet-foot" style="border-top:0">
        <button class="btn btn-ghost" type="button" data-close>${esc(cancelLabel)}</button>
        <div class="spacer"></div>
        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" type="button" data-confirm>${esc(confirmLabel)}</button>
      </div>
    `, {
      onMount(dialog, closeFn) {
        dialog.addEventListener('click', (event) => {
          if (event.target.closest('[data-close]')) { answered = true; closeFn(false); }
          if (event.target.closest('[data-confirm]')) { answered = true; closeFn(true); }
        });
      },
      onClose(value) { if (!answered) resolve(false); else resolve(Boolean(value)); }
    });
    void close;
  });
}

/* --- photo helpers --- */

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Не удалось прочитать фото'));
    img.src = url;
  });
}

function colorPriority(color) {
  const share = Number(color && color.share) || 0.25;
  const hex = String((color && color.hex) || '').replace('#', '');
  if (hex.length !== 6) return 0;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const chroma = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
  const lightness = (Math.max(r, g, b) + Math.min(r, g, b)) / 510;
  // Фон обычно светлый и малокрасочный: вещь — это насыщеннее и/или темнее.
  const garment = chroma * 1.4 + (1 - lightness) * 0.7;
  return share * (0.55 + garment);
}

export async function preparePhoto(file) {
  if (!file) throw new Error('Файл не выбран');
  if (!/^image\//.test(file.type || '')) throw new Error('Это не фото — выберите файл изображения');
  if (file.size > 25 * 1024 * 1024) throw new Error('Фото слишком большое (больше 25 МБ)');
  let source;
  let width;
  let height;
  let revoke = null;
  try {
    if ('createImageBitmap' in window) {
      source = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => null);
    }
    if (!source) {
      const url = URL.createObjectURL(file);
      revoke = url;
      source = await loadImage(url);
    }
    width = source.width || source.naturalWidth;
    height = source.height || source.naturalHeight;
    if (!width || !height) throw new Error('Не удалось прочитать фото');
    const maxSide = 1000;
    const scale = Math.min(1, maxSide / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
    let palette = [];
    try {
      // Палитру снимаем с центральной части кадра: фон по краям не должен перебивать цвет вещи.
      const crop = document.createElement('canvas');
      crop.width = Math.max(24, Math.round(canvas.width * 0.62));
      crop.height = Math.max(24, Math.round(canvas.height * 0.72));
      const cropCtx = crop.getContext('2d');
      cropCtx.drawImage(
        canvas,
        Math.round((canvas.width - crop.width) / 2),
        Math.round((canvas.height - crop.height) / 2),
        crop.width,
        crop.height,
        0,
        0,
        crop.width,
        crop.height
      );
      palette = await paletteFromImage(crop, { count: 4 });
      palette = (palette || []).filter((p) => p && /^#[0-9a-f]{6}$/i.test(p.hex)).slice(0, 5);
      palette = palette.sort((a, b) => colorPriority(b) - colorPriority(a));
    } catch { palette = []; }
    return { dataUrl, palette };
  } finally {
    if (revoke) URL.revokeObjectURL(revoke);
    if (source && typeof source.close === 'function') { try { source.close(); } catch {} }
  }
}

/* --- add / edit item --- */

export function openItemSheet({ item = null, defaultCategory = 'top', onSave, onDelete, onWear } = {}) {
  const mode = item ? 'edit' : 'add';
  const startCategory = CATEGORIES.some((c) => c.id === defaultCategory) ? defaultCategory : 'top';
  const startSubcats = SUBCATEGORIES[item ? item.category : startCategory] || [];
  const model = {
    id: item ? item.id : null,
    name: item ? item.name || '' : '',
    category: item ? item.category : startCategory,
    subcategory: item ? item.subcategory : (startSubcats[0] ? startSubcats[0].id : ''),
    colorHex: item ? item.colorHex : '#6B2233',
    colorName: item ? item.colorName || colorName(item.colorHex).name : 'бордо',
    warmth: item ? Number(item.warmth) || 2 : 2,
    formality: item ? Number(item.formality) || 2.5 : 2.5,
    waterproof: item ? Boolean(item.waterproof) : false,
    styles: item && Array.isArray(item.styles) ? [...item.styles] : [],
    photo: item ? item.photo || '' : '',
    favorite: item ? Boolean(item.favorite) : false,
    wearCount: item ? item.wearCount || 0 : 0,
    lastWorn: item ? item.lastWorn || null : null,
    createdAt: item ? item.createdAt || Date.now() : Date.now(),
    source: item ? item.source || 'photo' : 'photo'
  };
  let palette = [];
  const warmthLabels = ['жарко', 'тепло', 'прохладно', 'холодно', 'мороз'];
  const formalityLabels = ['спорт', 'кэжуал', 'смарт', 'офис', 'формально'];
  const warmthRange = itemWarmthRange({ warmth: model.warmth });
  void warmthRange;

  const initialSubcats = SUBCATEGORIES[model.category] || [];
  const photoPreview = () => model.photo
    ? `<div class="photo-preview"><img src="${esc(model.photo)}" alt="Фото вещи"></div>`
    : `<div class="photo-zone-title">Добавьте фото вещи</div>
       <div class="photo-zone-sub">Сфотографируйте на вешалке или разложите на светлом фоне — так проще поймать цвет. Фото останется на устройстве.</div>
       <div class="photo-actions">
         <span class="btn btn-ghost btn-sm" data-camera>${icon('camera')} Сфотографировать</span>
         <span class="btn btn-ghost btn-sm" data-gallery>${icon('image')} Из галереи</span>
       </div>`;

  const { dialog, close } = openDialog(`
    <div class="sheet-head">
      <div>
        <div class="sheet-title">${mode === 'edit' ? 'Вещь в шкафу' : 'Новая вещь'}</div>
        <div class="sheet-sub">${mode === 'edit' ? 'Можно обновить фото, цвет и параметры.' : 'Категорию и теплоту выбираете вы, цвет подхватим с фото.'}</div>
      </div>
      <button class="icon-btn" type="button" data-close aria-label="Закрыть">${icon('close')}</button>
    </div>
    <form class="sheet-body form" id="itemForm" novalidate>
      <div class="photo-zone" data-photo-zone>${photoPreview()}</div>
      <input type="file" accept="image/*" capture="environment" data-camera-input hidden>
      <input type="file" accept="image/*" data-gallery-input hidden>
      <div class="field">
        <span class="field-label">Цвет</span>
        <div class="palette-pick" data-palette>
          ${palette.length ? '' : `<span class="field-hint" data-palette-hint>Добавьте фото — покажем палитру, или выберите цвет вручную.</span>`}
          <label class="color-input-wrap" title="Выбрать цвет">
            <input type="color" data-color-input value="${esc(toHex6(model.colorHex))}">
          </label>
          <span class="field-hint" data-color-name>${esc(model.colorName)}</span>
        </div>
      </div>
      <div class="field">
        <span class="field-label">Название</span>
        <input class="input" type="text" maxlength="60" data-name value="${esc(model.name)}" placeholder="Например, бордовый свитер">
      </div>
      <div class="field">
        <span class="field-label">Категория</span>
        <div class="chips" data-categories>
          ${CATEGORIES.map((c) => `<button class="chip ${c.id === model.category ? 'is-on' : ''}" type="button" data-cat="${esc(c.id)}">${icon(categoryIcon(c.id))} ${esc(c.label)}</button>`).join('')}
        </div>
      </div>
      <div class="field">
        <span class="field-label">Что это</span>
        <div class="chips" data-subcategories>
          ${initialSubcats.map((s) => `<button class="chip ${s.id === model.subcategory ? 'is-on' : ''}" type="button" data-sub="${esc(s.id)}">${esc(s.label)}</button>`).join('')}
        </div>
      </div>
      <div class="slider-row">
        <div class="slider-head"><span class="field-label">Насколько тёплая</span><span class="slider-value" data-warmth-value>${warmthLabels[model.warmth - 1]}</span></div>
        <input type="range" min="1" max="5" step="1" value="${model.warmth}" data-warmth aria-label="Теплота">
        <div class="slider-ticks">${warmthLabels.map((l) => `<span>${l}</span>`).join('')}</div>
      </div>
      <div class="slider-row">
        <div class="slider-head"><span class="field-label">Насколько формальная</span><span class="slider-value" data-formality-value>${formalityLabels[Math.round(model.formality) - 1] || 'кэжуал'}</span></div>
        <input type="range" min="1" max="5" step="0.5" value="${model.formality}" data-formality aria-label="Формальность">
        <div class="slider-ticks">${formalityLabels.map((l) => `<span>${l}</span>`).join('')}</div>
      </div>
      <div class="field">
        <span class="field-label">Стиль</span>
        <div class="chips" data-styles>
          ${STYLE_TAGS.map((t) => `<button class="chip ${model.styles.includes(t.id) ? 'is-on' : ''}" type="button" data-style="${esc(t.id)}">${esc(t.label)}</button>`).join('')}
        </div>
      </div>
      <div class="switch-row">
        <div>
          <div class="switch-text">Не боится дождя</div>
          <div class="switch-sub">Кожа, плащевка, резина, плотная шерсть</div>
        </div>
        <label class="switch">
          <input type="checkbox" data-waterproof ${model.waterproof ? 'checked' : ''} aria-label="Не боится дождя">
          <span class="switch-track"></span>
        </label>
      </div>
      ${mode === 'edit' ? `
        <div class="settings-section" style="border-top:1px solid var(--line);padding-top:16px">
          <div class="settings-note">Носили ${esc(relativeWear(model.lastWorn, model.wearCount))} · ${model.wearCount} ${plural(model.wearCount, ['раз', 'раза', 'раз'])}</div>
          <button class="btn btn-danger" type="button" data-delete>${icon('trash')} Удалить вещь</button>
        </div>` : ''}
    </form>
    <div class="sheet-foot">
      <button class="btn btn-ghost" type="button" data-close>Отмена</button>
      <div class="spacer"></div>
      ${mode === 'edit' ? `<button class="btn btn-soft" type="button" data-wear>${icon('check')} Носил(а) сегодня</button>` : ''}
      <button class="btn btn-primary" type="button" data-submit>${mode === 'edit' ? 'Сохранить' : 'В шкаф'}</button>
    </div>
  `, { onMount: wire, onClose: () => {} });

  function toHex6(value) {
    if (/^#[0-9a-f]{6}$/i.test(String(value || ''))) return value;
    if (/^#[0-9a-f]{3}$/i.test(String(value || ''))) {
      return `#${String(value).slice(1).split('').map((c) => c + c).join('')}`;
    }
    return '#6B2233';
  }

  function setColor(hex) {
    model.colorHex = toHex6(hex);
    model.colorName = colorName(model.colorHex).name;
    const colorNameEl = $('[data-color-name]', dialog);
    if (colorNameEl) colorNameEl.textContent = model.colorName;
    const input = $('[data-color-input]', dialog);
    if (input) input.value = model.colorHex;
    const nameInput = $('[data-name]', dialog);
    if (nameInput && !nameInput.value.trim()) {
      const sub = subcategoryById(model.category, model.subcategory);
      nameInput.value = `${model.colorName} ${sub ? sub.label.toLowerCase() : ''}`.trim();
      nameInput.placeholder = nameInput.value;
    }
    $$('[data-palette] [data-swatch]', dialog).forEach((el) => el.classList.toggle('is-on', el.dataset.swatch === model.colorHex));
  }

  function renderPaletteSwatches(colors) {
    const holder = $('[data-palette]', dialog);
    if (!holder) return;
    $$('[data-swatch]', holder).forEach((el) => el.remove());
    const hint = $('[data-palette-hint]', holder);
    if (hint) hint.remove();
    const colorInput = $('[data-color-input]', holder);
    colors.forEach((color) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.swatch = color.hex;
      btn.className = `palette-swatch ${color.hex.toLowerCase() === model.colorHex.toLowerCase() ? 'is-on' : ''}`;
      btn.style.background = color.hex;
      btn.title = colorName(color.hex).name;
      btn.setAttribute('aria-label', `Цвет ${colorName(color.hex).name}`);
      btn.addEventListener('click', () => setColor(color.hex));
      holder.insertBefore(btn, colorInput ? colorInput.parentElement : null);
    });
  }

  function renderSubcategories() {
    const holder = $('[data-subcategories]', dialog);
    if (!holder) return;
    const list = SUBCATEGORIES[model.category] || [];
    holder.innerHTML = list.map((s) => `<button class="chip ${s.id === model.subcategory ? 'is-on' : ''}" type="button" data-sub="${esc(s.id)}">${esc(s.label)}</button>`).join('');
  }

  function updateSlider(input) {
    if (!input) return;
    const min = Number(input.min);
    const max = Number(input.max);
    const value = Number(input.value);
    const pct = ((value - min) / (max - min)) * 100;
    input.style.setProperty('--fill', `${pct}%`);
  }

  function setDefaultsForSubcategory() {
    const sub = subcategoryById(model.category, model.subcategory);
    if (!sub) return;
    if (!item || !model._touchedSub) {
      model.warmth = Math.round(sub.warmth) || 2;
      model.formality = sub.formality || 2.5;
      const warmthInput = $('[data-warmth]', dialog);
      if (warmthInput) { warmthInput.value = model.warmth; updateSlider(warmthInput); }
      const formalityInput = $('[data-formality]', dialog);
      if (formalityInput) { formalityInput.value = model.formality; updateSlider(formalityInput); }
      const wv = $('[data-warmth-value]', dialog);
      if (wv) wv.textContent = warmthLabels[model.warmth - 1];
      const fv = $('[data-formality-value]', dialog);
      if (fv) fv.textContent = formalityLabels[Math.round(model.formality) - 1] || 'кэжуал';
      if (!model.styles.length) model.styles = [...(sub.styles || [])];
      renderStyles();
    }
  }

  function renderStyles() {
    const holder = $('[data-styles]', dialog);
    if (!holder) return;
    holder.innerHTML = STYLE_TAGS.map((t) => `<button class="chip ${model.styles.includes(t.id) ? 'is-on' : ''}" type="button" data-style="${esc(t.id)}">${esc(t.label)}</button>`).join('');
  }

  async function handleFile(file) {
    const zone = $('[data-photo-zone]', dialog);
    if (!zone) return;
    zone.innerHTML = `<span class="spinner spinner--dark"></span><div class="photo-zone-sub">Обрабатываем фото…</div>`;
    try {
      const result = await preparePhoto(file);
      model.photo = result.dataUrl;
      palette = result.palette || [];
      zone.innerHTML = `<div class="photo-preview"><img src="${esc(model.photo)}" alt="Фото вещи"></div>
        <div class="photo-actions">
          <span class="btn btn-ghost btn-sm" data-camera>${icon('camera')} Переснять</span>
          <span class="btn btn-ghost btn-sm" data-gallery>${icon('image')} Другое фото</span>
        </div>`;
      if (palette.length) setColor(palette[0].hex);
      renderPaletteSwatches(palette);
      const nameInput = $('[data-name]', dialog);
      if (nameInput && !nameInput.value.trim()) {
        const sub = subcategoryById(model.category, model.subcategory);
        nameInput.value = `${model.colorName} ${sub ? sub.label.toLowerCase() : ''}`.trim();
      }
    } catch (error) {
      zone.innerHTML = photoPreview();
      toast(error.message || 'Не удалось обработать фото', 'error');
    }
  }

  function wire() {
    const sheetBody = $('.sheet-body', dialog);
    if (sheetBody) sheetBody.scrollTop = 0;
    const form = $('#itemForm', dialog);
    if (form) form.addEventListener('submit', (event) => { event.preventDefault(); save(); });
    dialog.addEventListener('click', async (event) => {
      const closeBtn = event.target.closest('[data-close]');
      if (closeBtn) { close(); return; }
      const catBtn = event.target.closest('[data-cat]');
      if (catBtn) {
        model.category = catBtn.dataset.cat;
        const list = SUBCATEGORIES[model.category] || [];
        model.subcategory = list[0] ? list[0].id : '';
        $$('[data-categories] [data-cat]', dialog).forEach((el) => el.classList.toggle('is-on', el.dataset.cat === model.category));
        renderSubcategories();
        setDefaultsForSubcategory();
        return;
      }
      const subBtn = event.target.closest('[data-sub]');
      if (subBtn) {
        model.subcategory = subBtn.dataset.sub;
        $$('[data-subcategories] [data-sub]', dialog).forEach((el) => el.classList.toggle('is-on', el.dataset.sub === model.subcategory));
        model._touchedSub = true;
        setDefaultsForSubcategory();
        return;
      }
      const styleBtn = event.target.closest('[data-style]');
      if (styleBtn) {
        const id = styleBtn.dataset.style;
        model.styles = model.styles.includes(id) ? model.styles.filter((s) => s !== id) : [...model.styles, id];
        styleBtn.classList.toggle('is-on', model.styles.includes(id));
        return;
      }
      if (event.target.closest('[data-camera]')) {
        const input = $('[data-camera-input]', dialog);
        if (input) input.click();
        return;
      }
      if (event.target.closest('[data-gallery]') || (event.target.closest('[data-photo-zone]') && !event.target.closest('[data-camera]'))) {
        const input = $('[data-gallery-input]', dialog);
        if (input) input.click();
        return;
      }
      const deleteBtn = event.target.closest('[data-delete]');
      if (deleteBtn && typeof onDelete === 'function') {
        const ok = await confirmSheet({ title: 'Удалить вещь?', text: 'Она исчезнет из шкафа и из будущих образов. Это действие нельзя отменить.', confirmLabel: 'Удалить' });
        if (ok) { close(); await onDelete(model); }
        return;
      }
      const wearBtn = event.target.closest('[data-wear]');
      if (wearBtn && typeof onWear === 'function') {
        close();
        await onWear(item || model);
        return;
      }
      if (event.target.closest('[data-submit]')) save();
    });

    const cameraInput = $('[data-camera-input]', dialog);
    const galleryInput = $('[data-gallery-input]', dialog);
    [cameraInput, galleryInput].forEach((input) => {
      if (!input) return;
      input.addEventListener('change', () => {
        const file = input.files && input.files[0];
        input.value = '';
        if (file) handleFile(file);
      });
    });
    const zone = $('[data-photo-zone]', dialog);
    if (zone) {
      zone.addEventListener('dragover', (event) => { event.preventDefault(); zone.classList.add('is-drag'); });
      zone.addEventListener('dragleave', () => zone.classList.remove('is-drag'));
      zone.addEventListener('drop', (event) => {
        event.preventDefault();
        zone.classList.remove('is-drag');
        const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
        if (file) handleFile(file);
      });
    }
    const colorInput = $('[data-color-input]', dialog);
    if (colorInput) colorInput.addEventListener('input', () => setColor(colorInput.value));
    const warmthInput = $('[data-warmth]', dialog);
    if (warmthInput) {
      updateSlider(warmthInput);
      warmthInput.addEventListener('input', () => {
        model.warmth = Number(warmthInput.value);
        const label = $('[data-warmth-value]', dialog);
        if (label) label.textContent = warmthLabels[model.warmth - 1];
        updateSlider(warmthInput);
      });
    }
    const formalityInput = $('[data-formality]', dialog);
    if (formalityInput) {
      updateSlider(formalityInput);
      formalityInput.addEventListener('input', () => {
        model.formality = Number(formalityInput.value);
        const label = $('[data-formality-value]', dialog);
        if (label) label.textContent = formalityLabels[Math.round(model.formality) - 1] || 'кэжуал';
        updateSlider(formalityInput);
      });
    }
    const waterproof = $('[data-waterproof]', dialog);
    if (waterproof) waterproof.addEventListener('change', () => { model.waterproof = waterproof.checked; });
    const nameInput = $('[data-name]', dialog);
    if (nameInput) nameInput.addEventListener('input', () => { model.name = nameInput.value; });
    if (palette.length) renderPaletteSwatches(palette);
    renderStyles();
  }

  function save() {
    if (!model.subcategory) { toast('Выберите, что это за вещь', 'error'); return; }
    const sub = subcategoryById(model.category, model.subcategory);
    const nameInput = $('[data-name]', dialog);
    const name = (nameInput ? nameInput.value.trim() : model.name).slice(0, 60);
    const itemData = {
      id: model.id || undefined,
      name: name || `${model.colorName} ${sub ? sub.label.toLowerCase() : ''}`.trim(),
      category: model.category,
      subcategory: model.subcategory,
      colorHex: model.colorHex,
      secondaryHex: null,
      colorName: model.colorName,
      pattern: 'solid',
      warmth: Number(model.warmth) || 2,
      formality: Number(model.formality) || 2.5,
      waterproof: Boolean(model.waterproof),
      styles: model.styles.slice(),
      photo: model.photo || '',
      favorite: Boolean(model.favorite),
      wearCount: model.wearCount || 0,
      lastWorn: model.lastWorn || null,
      createdAt: model.createdAt || Date.now(),
      source: model.source || 'photo',
      notes: ''
    };
    close();
    try { onSave && onSave(itemData); } catch (error) { toast(error.message || 'Не удалось сохранить вещь', 'error'); }
  }
}

/* --- settings --- */

export function openSettingsSheet({
  settings = {},
  storageMode = 'indexeddb',
  onSave,
  onSearchPlaces,
  onGeolocate,
  onExport,
  onImport,
  onClear,
  onDemo,
  onInstall
} = {}) {
  const manual = Object.assign({ temp: 12, precipProb: 20, windSpeed: 5, conditionKey: 'cloudy' }, settings.manual || {});
  let pendingPlace = settings.place ? { ...settings.place } : null;
  let weatherMode = settings.weatherMode || 'auto';
  const conditions = [
    ['clear', 'Ясно'], ['partly', 'Переменная облачность'], ['cloudy', 'Облачно'],
    ['overcast', 'Пасмурно'], ['fog', 'Туман'], ['drizzle', 'Морось'],
    ['rain', 'Дождь'], ['snow', 'Снег'], ['thunder', 'Гроза']
  ];
  const placeLabel = pendingPlace
    ? [pendingPlace.name, pendingPlace.country].filter(Boolean).join(', ')
    : 'Не выбран';

  const { dialog, close } = openDialog(`
    <div class="sheet-head">
      <div>
        <div class="sheet-title">Настройки</div>
        <div class="sheet-sub">Погода, данные и внешний вид приложения</div>
      </div>
      <button class="icon-btn" type="button" data-close aria-label="Закрыть">${icon('close')}</button>
    </div>
    <div class="sheet-body">
      <section class="settings-section" data-weather-section>
        <div class="settings-title">Погода</div>
        <div class="settings-row">
          <div>
            <div class="switch-text">Город</div>
            <div class="switch-sub" data-place-label>${esc(placeLabel)}</div>
          </div>
          <button class="btn btn-ghost btn-sm" type="button" data-geo>${icon('pin')} Моё местоположение</button>
        </div>
        <div class="search-row">
          <input class="input" type="text" data-place-input placeholder="Найти город, например Берлин" autocomplete="off">
          <button class="btn btn-ghost" type="button" data-search>Найти</button>
        </div>
        <div class="search-results" data-search-results></div>
        <div class="radio-cards">
          <button class="radio-card ${weatherMode === 'auto' ? 'is-on' : ''}" type="button" data-mode="auto">
            <div class="radio-card-title">Из прогноза</div>
            <div class="radio-card-sub">Open-Meteo, каждые 15 минут</div>
          </button>
          <button class="radio-card ${weatherMode === 'manual' ? 'is-on' : ''}" type="button" data-mode="manual">
            <div class="radio-card-title">Вручную</div>
            <div class="radio-card-sub">Если нет интернета</div>
          </button>
        </div>
        <div class="form-grid ${weatherMode === 'manual' ? '' : 'hidden'}" data-manual-fields>
          <div class="field">
            <span class="field-label">Температура, °C</span>
            <input class="input" type="number" min="-35" max="42" step="1" value="${Number(manual.temp)}" data-manual-temp>
          </div>
          <div class="field">
            <span class="field-label">Осадки, %</span>
            <input class="input" type="number" min="0" max="100" step="5" value="${Number(manual.precipProb)}" data-manual-precip>
          </div>
          <div class="field">
            <span class="field-label">Ветер, км/ч</span>
            <input class="input" type="number" min="0" max="90" step="1" value="${Number(manual.windSpeed)}" data-manual-wind>
          </div>
          <div class="field">
            <span class="field-label">Небо</span>
            <select class="select" data-manual-condition>
              ${conditions.map(([key, label]) => `<option value="${key}" ${manual.conditionKey === key ? 'selected' : ''}>${label}</option>`).join('')}
            </select>
          </div>
        </div>
      </section>

      <section class="settings-section">
        <div class="settings-title">Данные</div>
        <div class="settings-note">Шкаф хранится в этом браузере${storageMode === 'localstorage' ? ' (резервный режим, лимит ~5 МБ)' : ' (IndexedDB)'}. Фото никуда не загружаются. Сделайте копию, чтобы не потерять шкаф при очистке браузера.</div>
        <div class="toolbar-actions">
          <button class="btn btn-ghost btn-sm" type="button" data-export>${icon('download')} Скачать копию</button>
          <button class="btn btn-ghost btn-sm" type="button" data-import>${icon('upload')} Загрузить копию</button>
          <button class="btn btn-ghost btn-sm" type="button" data-demo>${icon('sparkle')} Демо-шкаф</button>
          <button class="btn btn-danger btn-sm" type="button" data-clear>${icon('trash')} Очистить</button>
        </div>
        <input type="file" accept="application/json,.json" data-import-input hidden>
      </section>

      <section class="settings-section">
        <div class="settings-title">Установка</div>
        <div class="settings-note">Иконка на домашнем экране, запуск без адресной строки. Ссылка и QR-код для телефона — внутри.</div>
        <div class="toolbar-actions">
          <button class="btn btn-soft btn-sm" type="button" data-install-app>${icon('download')} Установить на экран</button>
        </div>
      </section>

      <section class="settings-section">
        <div class="settings-title">О приложении</div>
        <div class="settings-note">«ШКАФ» собирает образы из ваших вещей: учитывает погоду, формальность повода, палитру сезона и то, что вы давно не носили. Версия 1.0 · погода Open-Meteo · работает офлайн, кроме прогноза.</div>
      </section>
    </div>
    <div class="sheet-foot">
      <button class="btn btn-ghost" type="button" data-close>Закрыть</button>
      <div class="spacer"></div>
      <button class="btn btn-primary" type="button" data-save>Сохранить</button>
    </div>
  `, { onMount: wire });

  function wire() {
    const sheetBody = $('.sheet-body', dialog);
    if (sheetBody) sheetBody.scrollTop = 0;
    dialog.addEventListener('click', async (event) => {
      if (event.target.closest('[data-close]')) { close(); return; }
      if (event.target.closest('[data-install-app]')) { close(); if (typeof onInstall === 'function') onInstall(); return; }
      const modeBtn = event.target.closest('[data-mode]');
      if (modeBtn) {
        weatherMode = modeBtn.dataset.mode;
        $$('[data-mode]', dialog).forEach((el) => el.classList.toggle('is-on', el.dataset.mode === weatherMode));
        const fields = $('[data-manual-fields]', dialog);
        if (fields) fields.classList.toggle('hidden', weatherMode !== 'manual');
        return;
      }
      if (event.target.closest('[data-geo]')) {
        const btn = event.target.closest('[data-geo]');
        btn.disabled = true;
        try {
          const place = await onGeolocate();
          if (place) {
            pendingPlace = place;
            const label = $('[data-place-label]', dialog);
            if (label) label.textContent = [place.name, place.country].filter(Boolean).join(', ') || 'Моё местоположение';
            toast('Город обновлён по геолокации');
          }
        } catch (error) {
          toast(error.message || 'Не удалось определить местоположение', 'error');
        } finally { btn.disabled = false; }
        return;
      }
      if (event.target.closest('[data-search]')) { await search(); return; }
      if (event.target.closest('[data-export]')) { close(); onExport && onExport(); return; }
      if (event.target.closest('[data-demo]')) { close(); onDemo && onDemo(); return; }
      const importBtn = event.target.closest('[data-import]');
      if (importBtn) {
        const input = $('[data-import-input]', dialog);
        if (input) input.click();
        return;
      }
      if (event.target.closest('[data-clear]')) {
        const ok = await confirmSheet({ title: 'Очистить шкаф?', text: 'Удалятся все вещи, фото, сохранённые образы и история. Сначала можно скачать копию.', confirmLabel: 'Очистить всё' });
        if (ok) { close(); onClear && onClear(); }
        return;
      }
      const resultBtn = event.target.closest('[data-place]');
      if (resultBtn) {
        pendingPlace = JSON.parse(resultBtn.dataset.place);
        const label = $('[data-place-label]', dialog);
        if (label) label.textContent = [pendingPlace.name, pendingPlace.country].filter(Boolean).join(', ');
        const results = $('[data-search-results]', dialog);
        if (results) results.innerHTML = '';
        toast(`Город: ${pendingPlace.name}`);
        return;
      }
      if (event.target.closest('[data-save]')) { save(); }
    });
    const importInput = $('[data-import-input]', dialog);
    if (importInput) {
      importInput.addEventListener('change', () => {
        const file = importInput.files && importInput.files[0];
        importInput.value = '';
        if (file) { close(); onImport && onImport(file); }
      });
    }
    const placeInput = $('[data-place-input]', dialog);
    if (placeInput) {
      placeInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') { event.preventDefault(); search(); }
      });
    }
    async function search() {
      const query = ($('[data-place-input]', dialog) || {}).value || '';
      if (!query.trim()) return;
      const results = $('[data-search-results]', dialog);
      if (results) results.innerHTML = '<div class="settings-note" style="padding:8px">Ищем…</div>';
      try {
        const places = await onSearchPlaces(query.trim());
        if (!results) return;
        if (!places || !places.length) {
          results.innerHTML = '<div class="settings-note" style="padding:8px">Город не найден. Попробуйте другое название.</div>';
          return;
        }
        results.innerHTML = places.map((place) => `
          <button class="search-result" type="button" data-place="${esc(JSON.stringify(place))}">
            ${icon('pin')}
            <span>${esc(place.name)}${place.admin1 && place.admin1 !== place.name ? `, ${esc(place.admin1)}` : ''}</span>
            <small>${esc(place.country || '')}</small>
          </button>`).join('');
      } catch (error) {
        if (results) results.innerHTML = '<div class="settings-note" style="padding:8px">Поиск недоступен. Проверьте интернет.</div>';
      }
    }
  }

  function save() {
    const temp = Number(($('[data-manual-temp]', dialog) || {}).value);
    const precipProb = Number(($('[data-manual-precip]', dialog) || {}).value);
    const windSpeed = Number(($('[data-manual-wind]', dialog) || {}).value);
    const conditionKey = ($('[data-manual-condition]', dialog) || {}).value || 'cloudy';
    close();
    onSave && onSave({
      place: pendingPlace,
      weatherMode,
      manual: {
        temp: Number.isFinite(temp) ? temp : 12,
        precipProb: Number.isFinite(precipProb) ? precipProb : 0,
        windSpeed: Number.isFinite(windSpeed) ? windSpeed : 5,
        conditionKey
      }
    });
  }
}
