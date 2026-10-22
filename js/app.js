/* ============================================================
   ШКАФ — приложение: состояние, события, погода, сборка образов
   ============================================================ */

import { DEFAULT_SETTINGS, seasonForDate, demoWardrobe } from './data.js';
import { generateOutfits, outfitHash } from './engine.js';
import { db } from './db.js';
import { fetchWeather, searchPlaces, manualWeather, geolocate } from './weather.js';
import * as ui from './ui.js';

const { localDateISO } = ui;

const FALLBACK_PLACE = { name: 'Берлин', country: 'Германия', lat: 52.52437, lon: 13.41053 };
const BLOCKED_KEY = 'shkaf.blocked.v1';
const INSTALL_BANNER_KEY = 'shkaf.installBannerDismissed.v1';

let deferredInstallPrompt = null;

const state = {
  view: 'looks',
  items: [],
  looks: [],
  history: [],
  settings: { ...DEFAULT_SETTINGS },
  season: seasonForDate(),
  weather: null,
  weatherStatus: 'loading',
  weatherError: '',
  refreshing: false,
  occasion: 'casual',
  generated: [],
  warnings: [],
  generating: false,
  filter: 'all',
  seed: 1,
  blocked: new Set(),
  savedHashes: new Set(),
  wornTodayHashes: new Set(),
  storageMode: 'indexeddb',
  booted: false,
  install: {
    standalone: false,
    dismissed: false,
    canPrompt: false,
    isIOS: false,
    isAndroid: false
  }
};

function detectStandalone() {
  return Boolean(
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    window.navigator.standalone === true
  );
}

function detectIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

state.install.standalone = detectStandalone();
state.install.isIOS = detectIOS();
state.install.isAndroid = /android/i.test(navigator.userAgent);
try {
  state.install.dismissed = localStorage.getItem(INSTALL_BANNER_KEY) === '1';
} catch {}

/* ---------- boot ---------- */

init().catch((error) => {
  console.error(error);
  renderFatal(error);
});

async function init() {
  bindEvents();
  try {
    await db.init();
  } catch (error) {
    console.error('db init', error);
    ui.toast('Хранилище недоступно — изменения не сохранятся', 'error');
  }
  state.storageMode = db.storageMode || 'indexeddb';

  try {
    const settings = await db.getSettings();
    state.settings = Object.assign({}, DEFAULT_SETTINGS, settings || {});
  } catch {}

  if (!state.settings.place) {
    state.settings.place = { ...FALLBACK_PLACE };
    try { await db.saveSettings({ place: state.settings.place }); } catch {}
  }
  state.occasion = state.settings.selectedOccasion || 'casual';
  state.blocked = loadBlocked();

  await reloadData();
  refreshDerived();
  ui.renderShell(state);
  ui.renderMain(state);
  updateInstallUI();
  state.booted = true;

  await loadWeather({ initial: true });
  if (state.items.length && state.weatherStatus === 'ready') {
    await generate({ auto: true });
  }
  registerServiceWorker();
}

async function reloadData() {
  try {
    const [items, looks, history] = await Promise.all([db.getItems(), db.getLooks(), db.getHistory()]);
    state.items = items || [];
    state.looks = looks || [];
    state.history = history || [];
  } catch (error) {
    console.error('reload', error);
    ui.toast('Не удалось прочитать шкаф', 'error');
  }
}

function refreshDerived() {
  state.season = seasonForDate(new Date(), state.settings.hemisphere || 'north');
  state.savedHashes = new Set(
    (state.looks || []).map((look) => outfitHash(look.itemIds && look.itemIds.length ? look.itemIds : (look.items || []).map((item) => item.id)))
  );
  const today = localDateISO();
  const worn = new Set();
  (state.history || []).forEach((entry) => {
    const date = String(entry.date || '').slice(0, 10);
    if (date === today && Array.isArray(entry.itemIds)) worn.add(outfitHash(entry.itemIds));
  });
  state.wornTodayHashes = worn;
}

function loadBlocked() {
  try {
    const raw = JSON.parse(localStorage.getItem(BLOCKED_KEY) || '[]');
    return new Set(Array.isArray(raw) ? raw : []);
  } catch {
    return new Set();
  }
}

function saveBlocked() {
  try { localStorage.setItem(BLOCKED_KEY, JSON.stringify([...state.blocked].slice(-80))); } catch {}
}

function render() {
  ui.renderShell(state);
  ui.renderMain(state);
  updateInstallUI();
}

function renderFatal(error) {
  const main = document.getElementById('main');
  if (!main) return;
  main.innerHTML = `
    <div class="empty" style="margin-top:40px">
      <div class="empty-art">${ui.icon('info')}</div>
      <div class="empty-title">Приложение не запустилось</div>
      <p class="empty-text">${ui.esc(error && error.message ? error.message : 'Неизвестная ошибка')}. Попробуйте перезагрузить страницу — данные шкафа останутся на месте.</p>
      <div class="empty-actions"><button class="btn btn-primary" type="button" onclick="location.reload()">Перезагрузить</button></div>
    </div>`;
}

/* ---------- weather ---------- */

async function loadWeather({ initial = false, force = false } = {}) {
  if (state.settings.weatherMode === 'manual') {
    state.weather = manualWeather(state.settings.manual || {}, state.settings.place || null);
    state.weatherStatus = 'ready';
    state.weatherError = '';
    state.refreshing = false;
    render();
    return;
  }
  const place = state.settings.place || FALLBACK_PLACE;
  state.weatherStatus = initial && !state.weather ? 'loading' : state.weatherStatus;
  state.refreshing = true;
  if (!initial) render();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    let weather;
    try {
      weather = await fetchWeather(place, { signal: controller.signal, force });
    } finally {
      clearTimeout(timer);
    }
    state.weather = weather;
    state.weatherStatus = 'ready';
    state.weatherError = '';
  } catch (error) {
    console.error('weather', error);
    state.weatherStatus = 'error';
    state.weatherError = error && error.message
      ? error.message
      : 'Не удалось получить прогноз. Проверьте интернет или укажите погоду вручную.';
  } finally {
    state.refreshing = false;
    render();
  }
}

async function refreshWeather() {
  if (state.refreshing) return;
  if (state.settings.weatherMode === 'manual') {
    state.weather = manualWeather(state.settings.manual || {}, state.settings.place || null);
    state.weatherStatus = 'ready';
    state.weatherError = '';
    render();
    await generate({ auto: true });
    return;
  }
  state.refreshing = true;
  render();
  await loadWeather({ force: true });
  if (state.weatherStatus === 'ready' && state.items.length) await generate({ auto: true });
}

/* ---------- outfits ---------- */

async function generate({ auto = false, more = false } = {}) {
  if (state.generating) return;
  if (!state.items.length) {
    if (!auto) ui.toast('Сначала добавьте вещи в шкаф');
    return;
  }
  if (!state.weather) {
    ui.toast('Нет прогноза погоды — обновите или укажите её вручную', 'error');
    return;
  }
  state.generating = true;
  state.warnings = [];
  render();
  await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 260)));
  try {
    if (more) state.seed = (state.seed || 1) + 1;
    const recent = [
      ...state.looks.slice(0, 20).map((look) => outfitHash(look.itemIds || (look.items || []).map((i) => i.id))),
      ...state.generated.map((look) => look.hash || outfitHash(look.itemIds || []))
    ];
    const result = generateOutfits({
      items: state.items,
      weather: state.weather,
      occasion: state.occasion,
      season: state.season.key,
      count: 6,
      seed: state.seed,
      recentLookHashes: recent,
      blockedHashes: [...state.blocked]
    });
    const outfits = Array.isArray(result && result.outfits) ? result.outfits : [];
    state.generated = outfits.map((outfit) => {
      const itemIds = outfit.itemIds && outfit.itemIds.length
        ? outfit.itemIds
        : (outfit.items || []).map((item) => item.id);
      return { ...outfit, itemIds, hash: outfitHash(itemIds) };
    });
    state.warnings = Array.isArray(result && result.warnings) ? result.warnings : [];
    if (!state.generated.length) {
      ui.toast('Движок не смог собрать образ. Добавьте больше вещей — разных категорий.', 'error');
    }
  } catch (error) {
    console.error('generate', error);
    state.generated = [];
    ui.toast(`Не удалось собрать образы: ${error.message || 'ошибка'}`, 'error');
  } finally {
    state.generating = false;
    refreshDerived();
    render();
  }
}

/* ---------- wear / save / dislike ---------- */

async function wearLook(look) {
  const ids = (look.items || []).map((item) => item.id).filter(Boolean);
  if (!ids.length) return;
  try {
    await db.markWorn(ids, look.id || null, localDateISO());
    await reloadData();
    refreshDerived();
    render();
    ui.toast('Записано. Хорошего дня!');
  } catch (error) {
    ui.toast(error.message || 'Не удалось записать', 'error');
  }
}

async function toggleSavedLook(look) {
  const itemIds = look.itemIds && look.itemIds.length ? look.itemIds : (look.items || []).map((i) => i.id);
  const hash = outfitHash(itemIds);
  const existing = state.looks.find((saved) => outfitHash(saved.itemIds || (saved.items || []).map((i) => i.id)) === hash);
  try {
    if (existing) {
      await db.deleteLook(existing.id);
      ui.toast('Убрали из сохранённых');
    } else {
      const now = Date.now();
      await db.putLook({
        ...look,
        id: look.id || `look_${now.toString(36)}`,
        itemIds,
        savedAt: now,
        createdAt: look.createdAt || now,
        weatherSnapshot: look.weatherSnapshot || (state.weather ? snapshotWeather(state.weather) : null)
      });
      ui.toast('Образ сохранён');
    }
    await reloadData();
    refreshDerived();
    render();
  } catch (error) {
    ui.toast(error.message || 'Не удалось сохранить образ', 'error');
  }
}

function snapshotWeather(weather) {
  return {
    temp: weather.temp,
    feelsLike: weather.feelsLike,
    precipProb: weather.precipProb,
    windSpeed: weather.windSpeed,
    conditionLabel: weather.condition ? weather.condition.label : ''
  };
}

function dislikeLook(look) {
  const hash = look.hash || outfitHash(look.itemIds || []);
  state.blocked.add(hash);
  saveBlocked();
  state.generated = state.generated.filter((item) => (item.hash || outfitHash(item.itemIds || [])) !== hash);
  render();
  ui.toast('Больше не предложим этот вариант');
}

async function removeSavedLook(id) {
  const ok = await ui.confirmSheet({
    title: 'Удалить образ?',
    text: 'Он исчезнет из сохранённых. Вещи останутся в шкафу.',
    confirmLabel: 'Удалить',
    danger: true
  });
  if (!ok) return;
  try {
    await db.deleteLook(id);
    await reloadData();
    refreshDerived();
    render();
    ui.toast('Образ удалён');
  } catch (error) {
    ui.toast(error.message || 'Не удалось удалить образ', 'error');
  }
}

/* ---------- items ---------- */

function openAddSheet() {
  ui.openItemSheet({
    mode: 'add',
    defaultCategory: state.filter !== 'all' ? state.filter : 'top',
    onSave: async (item) => {
      try {
        const saved = await db.putItem(item);
        await reloadData();
        state.filter = 'all';
        refreshDerived();
        render();
        ui.toast(`«${saved.name || 'Вещь'}» в шкафу`);
        if (state.weatherStatus === 'ready') generate({ auto: true });
      } catch (error) {
        ui.toast(error.message || 'Не удалось сохранить вещь', 'error');
      }
    }
  });
}

function openEditSheet(id) {
  const item = state.items.find((entry) => entry.id === id);
  if (!item) return;
  ui.openItemSheet({
    item,
    onSave: async (next) => {
      try {
        await db.putItem(next);
        await reloadData();
        refreshDerived();
        render();
        ui.toast('Вещь обновлена');
        if (state.weatherStatus === 'ready') generate({ auto: true });
      } catch (error) {
        ui.toast(error.message || 'Не удалось сохранить вещь', 'error');
      }
    },
    onDelete: async (target) => {
      try {
        await db.deleteItem(target.id);
        await reloadData();
        refreshDerived();
        render();
        ui.toast('Вещь удалена');
        if (state.items.length && state.weatherStatus === 'ready') generate({ auto: true });
      } catch (error) {
        ui.toast(error.message || 'Не удалось удалить вещь', 'error');
      }
    },
    onWear: async (target) => {
      try {
        await db.markWorn([target.id], null, localDateISO());
        await reloadData();
        refreshDerived();
        render();
        ui.toast('Записано: вещь носите сегодня');
      } catch (error) {
        ui.toast(error.message || 'Не удалось записать', 'error');
      }
    }
  });
}

/* ---------- settings / data ---------- */

function openSettings() {
  ui.openSettingsSheet({
    settings: state.settings,
    storageMode: state.storageMode,
    onSave: async (patch) => {
      try {
        state.settings = await db.saveSettings(patch);
        if (state.settings.weatherMode === 'manual') {
          state.weather = manualWeather(state.settings.manual || {}, state.settings.place || null);
          state.weatherStatus = 'ready';
          state.weatherError = '';
          state.refreshing = false;
          render();
        } else {
          await loadWeather({ force: true });
        }
        if (state.items.length && state.weatherStatus === 'ready') await generate({ auto: true });
        ui.toast('Настройки сохранены');
      } catch (error) {
        ui.toast(error.message || 'Не удалось сохранить настройки', 'error');
      }
    },
    onSearchPlaces: async (query) => {
      return await searchPlaces(query, { limit: 6, lang: 'ru' });
    },
    onGeolocate: async () => {
      const position = await geolocate();
      return {
        name: 'Моё местоположение',
        country: '',
        lat: position.lat,
        lon: position.lon
      };
    },
    onExport: exportData,
    onImport: importData,
    onClear: async () => {
      try {
        await db.clearAll();
        await reloadData();
        state.generated = [];
        state.warnings = [];
        refreshDerived();
        render();
        ui.toast('Шкаф очищен');
      } catch (error) {
        ui.toast(error.message || 'Не удалось очистить', 'error');
      }
    },
    onDemo: loadDemo,
    onInstall: () => setTimeout(() => openInstallInfo(), 160)
  });
}

async function exportData() {
  try {
    const data = await db.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `shkaf-backup-${localDateISO()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    ui.toast('Копия скачана');
  } catch (error) {
    ui.toast(error.message || 'Не удалось скачать копию', 'error');
  }
}

async function importData(file) {
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    await db.importAll(data, { merge: true });
    await reloadData();
    refreshDerived();
    render();
    ui.toast('Копия загружена');
    if (state.items.length && state.weatherStatus === 'ready') generate({ auto: true });
  } catch (error) {
    ui.toast(error.message || 'Файл не подошёл — нужна копия «ШКАФа»', 'error');
  }
}

async function loadDemo() {
  try {
    ui.toast('Загружаем демо-шкаф…');
    const demo = demoWardrobe();
    for (const item of demo) {
      await db.putItem(item);
    }
    state.settings = await db.saveSettings({ demoLoaded: true, onboarded: true });
    await reloadData();
    refreshDerived();
    render();
    ui.toast('Демо-шкаф загружен — теперь можно собирать образы');
    if (state.weatherStatus !== 'ready') await loadWeather({ force: true });
    if (state.weatherStatus === 'ready') await generate({ auto: true });
  } catch (error) {
    console.error(error);
    ui.toast(error.message || 'Не удалось загрузить демо-шкаф', 'error');
  }
}

/* ---------- navigation & events ---------- */

function switchView(view) {
  if (!['looks', 'wardrobe', 'style'].includes(view)) return;
  state.view = view;
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function bindEvents() {
  document.addEventListener('click', (event) => {
    if (event.target.closest('#settingsBtn')) { openSettings(); return; }
    if (event.target.closest('#addBtn')) { openAddSheet(); return; }
    const viewTarget = event.target.closest('[data-view]');
    if (viewTarget) {
      event.preventDefault();
      switchView(viewTarget.dataset.view);
      return;
    }
    const target = event.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;
    switch (action) {
      case 'generate': generate({ more: false }); break;
      case 'more': generate({ more: true }); break;
      case 'refresh-weather': refreshWeather(); break;
      case 'set-occasion': {
        const occasion = target.dataset.occasion;
        if (occasion && occasion !== state.occasion) {
          state.occasion = occasion;
          db.saveSettings({ selectedOccasion: occasion }).catch(() => {});
          if (state.weatherStatus === 'ready' && state.items.length) generate({ auto: true });
          else render();
        }
        break;
      }
      case 'wear': {
        const look = findGeneratedLook(target.dataset.lookId);
        if (look) wearLook(look);
        break;
      }
      case 'wear-saved': {
        const look = state.looks.find((entry) => entry.id === target.dataset.lookId);
        if (look) wearLook(look);
        break;
      }
      case 'save-look': {
        const look = findGeneratedLook(target.dataset.lookId);
        if (look) toggleSavedLook(look);
        break;
      }
      case 'dislike': {
        const look = findGeneratedLook(target.dataset.lookId);
        if (look) dislikeLook(look);
        break;
      }
      case 'delete-look': removeSavedLook(target.dataset.lookId); break;
      case 'open-add': openAddSheet(); break;
      case 'load-demo': loadDemo(); break;
      case 'edit-item': openEditSheet(target.dataset.itemId); break;
      case 'filter-category': {
        state.filter = target.dataset.category || 'all';
        render();
        break;
      }
      case 'open-settings': openSettings(); break;
      case 'install': openInstallFlow(); break;
      case 'dismiss-install': dismissInstallBanner(); break;
      default: break;
    }
  });

  window.addEventListener('online', () => {
    if (weatherNeedsRetry()) loadWeather({ force: true });
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && weatherNeedsRetry()) {
      loadWeather({ force: true });
    }
  });

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    state.install.canPrompt = true;
    updateInstallUI();
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    state.install.canPrompt = false;
    state.install.standalone = true;
    updateInstallUI();
    refreshDerived();
    render();
    ui.toast('Готово — «ШКАФ» на экране');
  });
}

/* ---------- установка приложения ---------- */

function updateInstallUI() {
  const button = document.getElementById('installBtn');
  if (button) button.classList.toggle('hidden', Boolean(state.install.standalone));
}

function dismissInstallBanner() {
  state.install.dismissed = true;
  try { localStorage.setItem(INSTALL_BANNER_KEY, '1'); } catch {}
  render();
}

function cleanCurrentUrl() {
  return location.href
    .replace(/([?&])qa=[^&]*/g, '$1')
    .replace(/[?&]$/, '');
}

function shouldProbeInfo() {
  const host = location.hostname;
  if (['localhost', '127.0.0.1', '[::1]'].includes(host)) return true;
  return /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host);
}

async function resolveInstallUrl() {
  const current = cleanCurrentUrl();
  // /__info есть только у локального serve.py/туннеля; на обычном хостинге просто используем текущий адрес.
  if (!shouldProbeInfo()) return current;
  try {
    const response = await fetch('/__info', { cache: 'no-store' });
    if (response.ok) {
      const info = await response.json();
      if (info && info.public) return info.public;
      if (info && info.lan) return info.lan;
    }
  } catch {}
  return current;
}

async function promptNativeInstall() {
  if (!deferredInstallPrompt) return false;
  const prompt = deferredInstallPrompt;
  deferredInstallPrompt = null;
  state.install.canPrompt = false;
  try {
    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice && choice.outcome === 'accepted') {
      ui.toast('Устанавливаем «ШКАФ»…');
    } else {
      ui.toast('Хорошо, можно установить позже');
    }
  } catch (error) {
    console.warn('install prompt', error);
  }
  updateInstallUI();
  return true;
}

async function openInstallInfo() {
  delete state.install._opening;
  const url = await resolveInstallUrl();
  ui.openInstallSheet({
    url,
    canPrompt: Boolean(state.install.canPrompt && deferredInstallPrompt),
    standalone: state.install.standalone,
    isIOS: state.install.isIOS,
    isAndroid: state.install.isAndroid,
    onInstall: async () => {
      const prompted = await promptNativeInstall();
      if (!prompted) ui.toast('Системное окно недоступно — следуйте шагам из инструкции', 'error');
    }
  });
}

async function openInstallFlow() {
  if (state.install._opening) return;
  state.install._opening = true;
  try {
    if (state.install.standalone) {
      ui.toast('Приложение уже установлено');
      return;
    }
    if (await promptNativeInstall()) return;
    await openInstallInfo();
  } finally {
    state.install._opening = false;
  }
}

function weatherNeedsRetry() {
  return state.settings.weatherMode !== 'manual' &&
    (state.weatherStatus === 'error' || !state.weather);
}

function findGeneratedLook(id) {
  if (!id) return null;
  return state.generated.find((look) => (look.id || look.hash) === id) ||
    state.generated.find((look) => (look.hash || '') === id) || null;
}

/* ---------- service worker ---------- */

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (!/^https?:$/.test(location.protocol)) return;
  if (location.search.includes('qa=1')) return;
  navigator.serviceWorker.register('./sw.js').catch((error) => {
    console.warn('SW не зарегистрирован', error);
  });
}
