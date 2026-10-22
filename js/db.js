/**
 * js/db.js — хранилище «ШКАФ» (владелец: platform-dev).
 *
 * IndexedDB (база `shkaf`, version 1) с прозрачным fallback на localStorage,
 * если IndexedDB недоступен (приватный режим, старый браузер) или сломался.
 * В памяти всегда держится актуальная копия данных — чтение отдаёт клоны,
 * запись идёт в активное хранилище.
 *
 * Модуль браузерный, но импортируется в Node без падения: обращения к
 * `indexedDB` / `localStorage` спрятаны внутри функций.
 *
 * Все пользовательские тексты — на русском.
 */

const DB_NAME = "shkaf";
const DB_VERSION = 1;
const SETTINGS_ID = "app";
const STORES = ["items", "looks", "history", "settings"];
const LS_KEYS = {
  items: "shkaf.items",
  looks: "shkaf.looks",
  history: "shkaf.history",
  settings: "shkaf.settings",
};

const CATEGORY_IDS = new Set(["top", "bottom", "dress", "outerwear", "shoes", "bag", "accessory"]);

/** Резервные дефолты, если js/data.js ещё не загрузился/недоступен. */
const FALLBACK_SETTINGS = {
  place: null,
  weatherMode: "auto",
  manual: { temp: 12, precipProb: 0, windSpeed: 3, conditionKey: "cloudy" },
  selectedOccasion: "casual",
  demoLoaded: false,
  onboarded: false,
  hemisphere: "north",
  lookCount: 0,
};

const MSG_STORAGE = "Не удалось выполнить операцию с хранилищем. Попробуйте ещё раз.";
const MSG_QUOTA =
  "Не удалось сохранить данные: в браузере не хватает места. Удалите лишние вещи или уменьшите фото.";

// ---------------------------------------------------------------------------
// Состояние
// ---------------------------------------------------------------------------

let _mode = null; // "indexeddb" | "localstorage"
let _idb = null;
let _memory = null;
let _ready = false;
let _initPromise = null;
let _helpersPromise = null;

// ---------------------------------------------------------------------------
// Утилиты
// ---------------------------------------------------------------------------

function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  if (typeof structuredClone === "function") {
    try {
      return structuredClone(value);
    } catch {
      /* fallthrough */
    }
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

function toNum(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function str(value) {
  return typeof value === "string" ? value : "";
}

function uid(prefix) {
  let suffix = "";
  try {
    while (suffix.length < 6) {
      suffix += Math.random().toString(36).slice(2);
    }
  } catch {
    suffix = Date.now().toString(36);
  }
  return `${prefix}${suffix.slice(0, 6)}`;
}

function shortKey(ids) {
  let hash = 0;
  const source = [...ids].map(String).sort().join("|");
  for (let i = 0; i < source.length; i += 1) hash = (hash * 31 + source.charCodeAt(i)) >>> 0;
  return hash.toString(36);
}

function storageError(message = MSG_QUOTA) {
  return new Error(message);
}

function toRussianError(err) {
  if (err instanceof Error && /[А-Яа-яЁё]/.test(err.message)) return err;
  if (err instanceof Error && /quota/i.test(err.name + " " + err.message)) return new Error(MSG_QUOTA);
  return new Error(MSG_STORAGE);
}

function publicMethod(fn) {
  return async function wrapped(...args) {
    try {
      return await fn(...args);
    } catch (err) {
      throw toRussianError(err);
    }
  };
}

function sortItemsInPlace(list) {
  list.sort((a, b) => {
    const ca = toNum(a && a.createdAt) ?? 0;
    const cb = toNum(b && b.createdAt) ?? 0;
    if (cb !== ca) return cb - ca;
    return String((a && a.id) || "").localeCompare(String((b && b.id) || ""));
  });
  return list;
}

function sortLooksInPlace(list) {
  list.sort((a, b) => {
    const ca = toNum(a && a.createdAt) ?? 0;
    const cb = toNum(b && b.createdAt) ?? 0;
    if (cb !== ca) return cb - ca;
    return String((a && a.id) || "").localeCompare(String((b && b.id) || ""));
  });
  return list;
}

function sortHistoryInPlace(list) {
  list.sort((a, b) => {
    const da = str(a && a.date);
    const otherDate = str(b && b.date);
    if (da !== otherDate) return da < otherDate ? 1 : -1;
    const ca = toNum(a && a.createdAt) ?? 0;
    const cb = toNum(b && b.createdAt) ?? 0;
    if (cb !== ca) return cb - ca;
    return String((a && a.id) || "").localeCompare(String((b && b.id) || ""));
  });
  return list;
}

function localDateISO(date) {
  const d = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

function normalizeDateISO(value) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (raw) {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) return localDateISO(parsed);
  }
  return localDateISO(new Date());
}

function dateToMs(dateISO) {
  const ms = new Date(`${dateISO}T12:00:00`).getTime();
  return Number.isNaN(ms) ? Date.now() : ms;
}

function sameIdSet(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  const left = [...a].map(String).sort();
  const right = [...b].map(String).sort();
  return left.every((value, index) => value === right[index]);
}

// ---------------------------------------------------------------------------
// Загрузка дефолтов/хелперов из js/data.js и js/color.js
// ---------------------------------------------------------------------------

function loadHelpers() {
  if (!_helpersPromise) {
    _helpersPromise = (async () => {
      let data = null;
      let color = null;
      try {
        data = await import("./data.js");
      } catch {
        data = null;
      }
      try {
        color = await import("./color.js");
      } catch {
        color = null;
      }
      const helpers = {
        defaults: data && isPlainObject(data.DEFAULT_SETTINGS) ? data.DEFAULT_SETTINGS : null,
        itemTitle: data && typeof data.itemTitle === "function" ? data.itemTitle : null,
        colorName: color && typeof color.colorName === "function" ? color.colorName : null,
      };
      if (!helpers.defaults && !helpers.itemTitle && !helpers.colorName) {
        _helpersPromise = null; // попробуем позже (файлы могли появиться)
      }
      return helpers;
    })();
  }
  return _helpersPromise;
}

async function resolveDefaults() {
  const helpers = await loadHelpers();
  return sanitizeSettings(mergeSettings(FALLBACK_SETTINGS, helpers.defaults || {}));
}

/**
 * Глубокий мерж настроек: place/manual — по полям, остальное заменяется.
 * Значения проверяются, мусор игнорируется.
 */
function mergeSettings(base, patch) {
  const current = isPlainObject(base) ? base : {};
  const incoming = isPlainObject(patch) ? patch : {};
  const result = clone(current);
  for (const key of Object.keys(incoming)) {
    const value = incoming[key];
    if (key === "place") {
      if (value === null) {
        result.place = null;
      } else if (isPlainObject(value) && toNum(value.lat) !== null && toNum(value.lon) !== null) {
        result.place = {
          name: str(value.name).trim() || "Выбранное место",
          country: str(value.country),
          lat: toNum(value.lat),
          lon: toNum(value.lon),
        };
      }
    } else if (key === "manual") {
      if (isPlainObject(value)) {
        const baseManual = isPlainObject(current.manual) ? current.manual : FALLBACK_SETTINGS.manual;
        result.manual = { ...clone(baseManual), ...clone(value) };
      }
    } else if (key === "weatherMode") {
      if (value === "auto" || value === "manual") result.weatherMode = value;
    } else if (key === "hemisphere") {
      if (value === "north" || value === "south") result.hemisphere = value;
    } else {
      result[key] = clone(value);
    }
  }
  return sanitizeSettings(result);
}

function sanitizeSettings(settings) {
  const source = isPlainObject(settings) ? clone(settings) : {};
  const manual = isPlainObject(source.manual) ? source.manual : {};
  const defaults = FALLBACK_SETTINGS;
  const place = isPlainObject(source.place) && toNum(source.place.lat) !== null && toNum(source.place.lon) !== null
    ? {
        name: str(source.place.name).trim() || "Выбранное место",
        country: str(source.place.country),
        lat: toNum(source.place.lat),
        lon: toNum(source.place.lon),
      }
    : null;
  return {
    place,
    weatherMode: source.weatherMode === "manual" ? "manual" : "auto",
    manual: {
      temp: clampNumber(manual.temp, -60, 60, defaults.manual.temp),
      precipProb: clampNumber(manual.precipProb, 0, 100, defaults.manual.precipProb),
      windSpeed: clampNumber(manual.windSpeed, 0, 200, defaults.manual.windSpeed),
      conditionKey: str(manual.conditionKey) || defaults.manual.conditionKey,
    },
    selectedOccasion: str(source.selectedOccasion) || defaults.selectedOccasion,
    demoLoaded: source.demoLoaded === true,
    onboarded: source.onboarded === true,
    hemisphere: source.hemisphere === "south" ? "south" : "north",
    lookCount: Math.max(0, Math.round(toNum(source.lookCount) ?? 0)),
  };
}

function clampNumber(value, min, max, fallback) {
  const n = toNum(value);
  if (n === null) return fallback;
  return Math.min(max, Math.max(min, n));
}

// ---------------------------------------------------------------------------
// IndexedDB
// ---------------------------------------------------------------------------

function indexedDBAvailable() {
  try {
    return typeof indexedDB !== "undefined" && !!indexedDB;
  } catch {
    return false;
  }
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!indexedDBAvailable()) {
      reject(new Error("IndexedDB недоступен"));
      return;
    }
    let settled = false;
    let timer = null;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      fn(value);
    };
    timer = setTimeout(() => finish(reject, new Error("IndexedDB не ответил вовремя")), 3000);
    if (timer && typeof timer.unref === "function") timer.unref();

    let request;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (err) {
      finish(reject, err);
      return;
    }

    request.onupgradeneeded = () => {
      try {
        const database = request.result;
        if (!database.objectStoreNames.contains("items")) database.createObjectStore("items", { keyPath: "id" });
        if (!database.objectStoreNames.contains("looks")) database.createObjectStore("looks", { keyPath: "id" });
        if (!database.objectStoreNames.contains("history")) database.createObjectStore("history", { keyPath: "id" });
        if (!database.objectStoreNames.contains("settings")) database.createObjectStore("settings", { keyPath: "id" });
      } catch {
        /* ошибка апгрейда обработается через request.onerror */
      }
    };

    request.onsuccess = () => {
      const database = request.result;
      if (settled) {
        try {
          database.close();
        } catch {
          /* ignore */
        }
        return;
      }
      try {
        database.onversionchange = () => {
          try {
            database.close();
          } catch {
            /* ignore */
          }
        };
      } catch {
        /* ignore */
      }
      finish(resolve, database);
    };
    request.onerror = () => finish(reject, request.error || new Error("Не удалось открыть хранилище"));
    request.onblocked = () => finish(reject, new Error("Хранилище занято другой вкладкой"));
  });
}

function idbGetAll(storeName) {
  return new Promise((resolve, reject) => {
    let transaction;
    try {
      transaction = _idb.transaction(storeName, "readonly");
    } catch (err) {
      reject(err);
      return;
    }
    let request;
    try {
      request = transaction.objectStore(storeName).getAll();
    } catch (err) {
      reject(err);
      return;
    }
    request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result : []);
    request.onerror = () => reject(request.error || new Error("Ошибка чтения хранилища"));
  });
}

function idbWrite(storeName, value) {
  return new Promise((resolve, reject) => {
    let transaction;
    try {
      transaction = _idb.transaction(storeName, "readwrite");
    } catch (err) {
      reject(err);
      return;
    }
    let settled = false;
    const fail = (err) => {
      if (settled) return;
      settled = true;
      reject(err);
    };
    try {
      transaction.objectStore(storeName).put(value);
    } catch (err) {
      fail(err);
      return;
    }
    transaction.oncomplete = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };
    transaction.onerror = () => fail(transaction.error || new Error("Ошибка записи"));
    transaction.onabort = () => fail(transaction.error || new Error("Запись отменена"));
  });
}

function idbDelete(storeName, id) {
  return new Promise((resolve, reject) => {
    let transaction;
    try {
      transaction = _idb.transaction(storeName, "readwrite");
    } catch (err) {
      reject(err);
      return;
    }
    let settled = false;
    const fail = (err) => {
      if (settled) return;
      settled = true;
      reject(err);
    };
    try {
      transaction.objectStore(storeName).delete(id);
    } catch (err) {
      fail(err);
      return;
    }
    transaction.oncomplete = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };
    transaction.onerror = () => fail(transaction.error || new Error("Ошибка удаления"));
    transaction.onabort = () => fail(transaction.error || new Error("Удаление отменено"));
  });
}

function idbReplaceAll() {
  return new Promise((resolve, reject) => {
    let transaction;
    try {
      transaction = _idb.transaction(STORES, "readwrite");
    } catch (err) {
      reject(err);
      return;
    }
    let settled = false;
    const fail = (err) => {
      if (settled) return;
      settled = true;
      reject(err);
    };
    try {
      for (const name of STORES) transaction.objectStore(name).clear();
      for (const item of _memory.items) transaction.objectStore("items").put(item);
      for (const look of _memory.looks) transaction.objectStore("looks").put(look);
      for (const record of _memory.history) transaction.objectStore("history").put(record);
      transaction.objectStore("settings").put({ id: SETTINGS_ID, value: clone(_memory.settings) });
    } catch (err) {
      fail(err);
      return;
    }
    transaction.oncomplete = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };
    transaction.onerror = () => fail(transaction.error || new Error("Ошибка записи"));
    transaction.onabort = () => fail(transaction.error || new Error("Запись отменена"));
  });
}

async function loadFromIDB() {
  const items = await idbGetAll("items");
  const looks = await idbGetAll("looks");
  const history = await idbGetAll("history");
  const settingsRows = await idbGetAll("settings");
  const stored = settingsRows.find((row) => row && row.id === SETTINGS_ID);
  const settings = stored && isPlainObject(stored.value) ? stored.value : null;
  return {
    items: sortItemsInPlace(items.filter(isPlainObject)),
    looks: sortLooksInPlace(looks.filter(isPlainObject)),
    history: sortHistoryInPlace(history.filter(isPlainObject)),
    settings,
  };
}

// ---------------------------------------------------------------------------
// localStorage (fallback)
// ---------------------------------------------------------------------------

function localStorageAvailable() {
  try {
    return typeof localStorage !== "undefined" && !!localStorage;
  } catch {
    return false;
  }
}

function lsGet(key) {
  if (!localStorageAvailable()) return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function lsSet(key, value) {
  if (!localStorageAvailable()) throw storageError(MSG_QUOTA);
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    throw storageError(/quota/i.test(String(err && err.name) + String(err && err.message)) ? MSG_QUOTA : MSG_STORAGE);
  }
}

function lsParseArray(key) {
  const raw = lsGet(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isPlainObject) : [];
  } catch {
    return [];
  }
}

function lsParseObject(key) {
  const raw = lsGet(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return isPlainObject(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function loadFromLocalStorage() {
  return {
    items: sortItemsInPlace(lsParseArray(LS_KEYS.items)),
    looks: sortLooksInPlace(lsParseArray(LS_KEYS.looks)),
    history: sortHistoryInPlace(lsParseArray(LS_KEYS.history)),
    settings: lsParseObject(LS_KEYS.settings),
  };
}

function saveAllToLS() {
  // localStorage вообще недоступен (Safari file://, приватный режим) —
  // приложение продолжает работать в памяти, не роняя действия пользователя.
  if (!localStorageAvailable()) return;
  lsSet(LS_KEYS.items, JSON.stringify(_memory.items));
  lsSet(LS_KEYS.looks, JSON.stringify(_memory.looks));
  lsSet(LS_KEYS.history, JSON.stringify(_memory.history));
  lsSet(LS_KEYS.settings, JSON.stringify(_memory.settings));
}

function saveCollectionToLS(storeName) {
  if (!localStorageAvailable()) return;
  if (storeName === "settings") {
    lsSet(LS_KEYS.settings, JSON.stringify(_memory.settings));
    return;
  }
  lsSet(LS_KEYS[storeName], JSON.stringify(_memory[storeName]));
}

/** Переключает режим на localStorage (IDB сломался уже после init). */
function degradeToLocalStorage() {
  if (_mode === "localstorage") return;
  _mode = "localstorage";
  try {
    if (_idb && typeof _idb.close === "function") _idb.close();
  } catch {
    /* ignore */
  }
  _idb = null;
}

/**
 * Запись «через» активное хранилище: IDB → при ошибке fallback на localStorage.
 * Для localStorage пишет всю коллекцию (он не умеет частичные записи).
 */
async function writeThrough(storeName, idbAction) {
  if (_mode === "indexeddb" && _idb) {
    try {
      await idbAction();
      return;
    } catch {
      degradeToLocalStorage();
    }
  }
  saveCollectionToLS(storeName);
}

async function persistEverything() {
  if (_mode === "indexeddb" && _idb) {
    try {
      await idbReplaceAll();
      return;
    } catch {
      degradeToLocalStorage();
    }
  }
  saveAllToLS();
}

// ---------------------------------------------------------------------------
// Инициализация
// ---------------------------------------------------------------------------

async function initImpl() {
  if (_ready) return _mode;
  if (_initPromise) return _initPromise;
  _initPromise = (async () => {
    const defaults = await resolveDefaults();
    let loaded;
    if (indexedDBAvailable()) {
      try {
        _idb = await openDatabase();
        loaded = await loadFromIDB();
        _mode = "indexeddb";
      } catch {
        try {
          if (_idb && typeof _idb.close === "function") _idb.close();
        } catch {
          /* ignore */
        }
        _idb = null;
        _mode = "localstorage";
        loaded = loadFromLocalStorage();
      }
    } else {
      _mode = "localstorage";
      loaded = loadFromLocalStorage();
    }
    _memory = {
      items: loaded.items,
      looks: loaded.looks,
      history: loaded.history,
      settings: mergeSettings(defaults, loaded.settings || {}),
    };
    _ready = true;
    return _mode;
  })();
  try {
    return await _initPromise;
  } catch (err) {
    _initPromise = null;
    throw toRussianError(err);
  }
}

async function ready() {
  if (!_ready) await initImpl();
}

// ---------------------------------------------------------------------------
// Нормализация записей
// ---------------------------------------------------------------------------

async function fillItemMeta(raw) {
  const item = clone(raw);
  if (!isPlainObject(item)) throw new Error("Не удалось сохранить вещь: нужны данные вещи.");

  if (typeof item.id !== "string" || !item.id.trim()) item.id = uid("it_");
  else item.id = item.id.trim();

  if (toNum(item.createdAt) === null) item.createdAt = Date.now();
  else item.createdAt = Math.round(toNum(item.createdAt));

  if (typeof item.photo !== "string") item.photo = "";

  if (typeof item.name !== "string" || !item.name.trim()) {
    const helpers = await loadHelpers();
    let name = "";
    try {
      if (helpers.itemTitle) name = helpers.itemTitle(item);
    } catch {
      name = "";
    }
    if (!name) name = str(item.colorName).trim() || str(item.subcategory).trim() || "Вещь";
    item.name = name;
  }

  if (typeof item.colorName !== "string" || !item.colorName.trim()) {
    const helpers = await loadHelpers();
    let name = "";
    if (typeof item.colorHex === "string" && helpers.colorName) {
      try {
        const color = helpers.colorName(item.colorHex);
        name = color && typeof color.name === "string" ? color.name : "";
      } catch {
        name = "";
      }
    }
    item.colorName = name;
  }

  return item;
}

function normalizeLook(raw) {
  const look = clone(raw);
  if (!isPlainObject(look)) throw new Error("Не удалось сохранить образ: нужны данные образа.");
  if (typeof look.id !== "string" || !look.id.trim()) look.id = uid("look_");
  else look.id = look.id.trim();
  if (toNum(look.createdAt) === null) look.createdAt = Date.now();
  else look.createdAt = Math.round(toNum(look.createdAt));
  if (!Array.isArray(look.itemIds) && Array.isArray(look.items)) {
    look.itemIds = look.items.filter(isPlainObject).map((item) => item.id).filter((id) => typeof id === "string");
  }
  return look;
}

/** Валидация вещи при импорте: мусор отбрасывается, поля чинятся. */
function normalizeImportedItem(raw) {
  if (!isPlainObject(raw)) return null;
  if (!CATEGORY_IDS.has(raw.category)) return null;
  const item = clone(raw);
  if (typeof item.id !== "string" || !item.id.trim()) item.id = uid("it_");
  else item.id = item.id.trim();
  if (typeof item.name !== "string" || !item.name.trim()) item.name = "Вещь";
  if (typeof item.colorHex !== "string" || !/^#[0-9a-f]{6}$/i.test(item.colorHex)) item.colorHex = "#141414";
  if (typeof item.colorName !== "string") item.colorName = "";
  const warmth = toNum(item.warmth);
  item.warmth = warmth === null ? 3 : Math.min(5, Math.max(1, Math.round(warmth)));
  const formality = toNum(item.formality);
  item.formality = formality === null ? 3 : Math.min(5, Math.max(1, formality));
  item.photo = typeof item.photo === "string" ? item.photo : "";
  item.favorite = item.favorite === true;
  const wearCount = toNum(item.wearCount);
  item.wearCount = wearCount === null ? 0 : Math.max(0, Math.round(wearCount));
  item.lastWorn = toNum(item.lastWorn) === null ? null : Math.round(toNum(item.lastWorn));
  item.styles = Array.isArray(item.styles) ? item.styles.filter((s) => typeof s === "string") : [];
  item.waterproof = item.waterproof === true;
  item.notes = typeof item.notes === "string" ? item.notes : "";
  item.source = item.source === "demo" || item.source === "photo" ? item.source : "photo";
  if (toNum(item.createdAt) === null) item.createdAt = Date.now();
  else item.createdAt = Math.round(toNum(item.createdAt));
  return item;
}

function normalizeImportedLook(raw) {
  if (!isPlainObject(raw)) return null;
  const look = normalizeLook(raw);
  if (!Array.isArray(look.itemIds)) look.itemIds = [];
  look.itemIds = look.itemIds.filter((id) => typeof id === "string");
  return look;
}

function normalizeImportedHistory(raw) {
  if (!isPlainObject(raw)) return null;
  const date = normalizeDateISO(raw.date);
  const itemIds = Array.isArray(raw.itemIds) ? raw.itemIds.filter((id) => typeof id === "string") : [];
  const lookId = typeof raw.lookId === "string" && raw.lookId ? raw.lookId : null;
  if (!itemIds.length && !lookId) return null;
  let id = typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : "";
  if (!id) id = `hist_${date}_${lookId || shortKey(itemIds)}`;
  return {
    id,
    date,
    itemIds,
    lookId,
    createdAt: toNum(raw.createdAt) === null ? Date.now() : Math.round(toNum(raw.createdAt)),
  };
}

// ---------------------------------------------------------------------------
// Публичный API (CONTRACT.md §6)
// ---------------------------------------------------------------------------

async function getItemsImpl() {
  await ready();
  return _memory.items.map(clone);
}

async function putItemImpl(item) {
  await ready();
  const saved = await fillItemMeta(item);
  const index = _memory.items.findIndex((existing) => existing.id === saved.id);
  if (index >= 0) _memory.items[index] = saved;
  else _memory.items.push(saved);
  sortItemsInPlace(_memory.items);
  await writeThrough("items", () => idbWrite("items", saved));
  return clone(saved);
}

async function deleteItemImpl(id) {
  await ready();
  if (typeof id !== "string" || !id) return false;
  const before = _memory.items.length;
  _memory.items = _memory.items.filter((item) => item.id !== id);
  if (_memory.items.length === before) return false;
  await writeThrough("items", () => idbDelete("items", id));
  return true;
}

async function deleteItemsImpl(ids) {
  await ready();
  const wanted = new Set(Array.isArray(ids) ? ids.filter((id) => typeof id === "string" && id) : []);
  if (!wanted.size) return 0;
  const before = _memory.items.length;
  _memory.items = _memory.items.filter((item) => !wanted.has(item.id));
  let removed = before - _memory.items.length;
  if (!removed) return 0;
  await writeThrough("items", async () => {
    for (const id of wanted) await idbDelete("items", id);
  });
  return removed;
}

async function getLooksImpl() {
  await ready();
  return _memory.looks.map(clone);
}

async function putLookImpl(look) {
  await ready();
  const saved = normalizeLook(look);
  const index = _memory.looks.findIndex((existing) => existing.id === saved.id);
  if (index >= 0) _memory.looks[index] = saved;
  else _memory.looks.push(saved);
  sortLooksInPlace(_memory.looks);
  await writeThrough("looks", () => idbWrite("looks", saved));
  return clone(saved);
}

async function deleteLookImpl(id) {
  await ready();
  if (typeof id !== "string" || !id) return false;
  const before = _memory.looks.length;
  _memory.looks = _memory.looks.filter((look) => look.id !== id);
  if (_memory.looks.length === before) return false;
  await writeThrough("looks", () => idbDelete("looks", id));
  return true;
}

async function markWornImpl(itemIds, lookId, dateISO) {
  await ready();
  const ids = Array.isArray(itemIds)
    ? [...new Set(itemIds.filter((id) => typeof id === "string" && id.trim()))]
    : [];
  if (!ids.length) throw new Error("Не удалось отметить вещи: не переданы вещи образа.");
  const date = normalizeDateISO(dateISO);
  const look = typeof lookId === "string" && lookId ? lookId : null;

  const existing = _memory.history.find(
    (entry) => entry && entry.date === date && (look ? entry.lookId === look : sameIdSet(entry.itemIds, ids)),
  );
  if (existing) return { ...clone(existing), added: false };

  const lastWorn = dateToMs(date);
  const changed = [];
  for (const id of ids) {
    const index = _memory.items.findIndex((item) => item.id === id);
    if (index < 0) continue;
    const item = _memory.items[index];
    const wearCount = toNum(item.wearCount);
    _memory.items[index] = {
      ...item,
      wearCount: (wearCount !== null && wearCount > 0 ? Math.floor(wearCount) : 0) + 1,
      lastWorn,
    };
    changed.push(_memory.items[index]);
  }
  sortItemsInPlace(_memory.items);
  for (const item of changed) await writeThrough("items", () => idbWrite("items", item));

  const record = {
    id: `hist_${date}_${look || shortKey(ids)}`,
    date,
    itemIds: ids,
    lookId: look,
    createdAt: Date.now(),
  };
  while (_memory.history.some((entry) => entry.id === record.id)) record.id += "x";
  _memory.history.push(record);
  sortHistoryInPlace(_memory.history);
  await writeThrough("history", () => idbWrite("history", record));
  return { ...clone(record), added: true };
}

async function getHistoryImpl() {
  await ready();
  return _memory.history.map(clone);
}

async function getSettingsImpl() {
  await ready();
  return clone(_memory.settings);
}

async function saveSettingsImpl(patch) {
  await ready();
  if (!isPlainObject(patch)) throw new Error("Не удалось сохранить настройки: неверные данные.");
  _memory.settings = mergeSettings(_memory.settings, patch);
  await writeThrough("settings", () =>
    idbWrite("settings", { id: SETTINGS_ID, value: clone(_memory.settings) }),
  );
  return clone(_memory.settings);
}

async function exportAllImpl() {
  await ready();
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    items: _memory.items.map(clone),
    looks: _memory.looks.map(clone),
    history: _memory.history.map(clone),
    settings: clone(_memory.settings),
  };
}

async function importAllImpl(data, { merge = true } = {}) {
  await ready();
  if (!isPlainObject(data)) {
    throw new Error("Не удалось импортировать: файл повреждён или это не резервная копия «ШКАФА».");
  }
  const hasKnownKey = ["items", "looks", "history", "settings"].some((key) => key in data);
  if (!hasKnownKey) {
    throw new Error("Файл не похож на резервную копию «ШКАФА»: нет вещей, образов или настроек.");
  }

  if (!merge) {
    _memory.items = [];
    _memory.looks = [];
    _memory.history = [];
    _memory.settings = await resolveDefaults();
  }

  const itemsById = new Map(_memory.items.map((item) => [item.id, item]));
  const looksById = new Map(_memory.looks.map((look) => [look.id, look]));
  const historyById = new Map(_memory.history.map((entry) => [entry.id, entry]));

  let items = 0;
  for (const raw of Array.isArray(data.items) ? data.items : []) {
    const item = normalizeImportedItem(raw);
    if (!item) continue;
    itemsById.set(item.id, item);
    items += 1;
  }

  let looks = 0;
  for (const raw of Array.isArray(data.looks) ? data.looks : []) {
    const look = normalizeImportedLook(raw);
    if (!look) continue;
    looksById.set(look.id, look);
    looks += 1;
  }

  let history = 0;
  for (const raw of Array.isArray(data.history) ? data.history : []) {
    const entry = normalizeImportedHistory(raw);
    if (!entry) continue;
    if (historyById.has(entry.id)) continue;
    historyById.set(entry.id, entry);
    history += 1;
  }

  _memory.items = sortItemsInPlace([...itemsById.values()]);
  _memory.looks = sortLooksInPlace([...looksById.values()]);
  _memory.history = sortHistoryInPlace([...historyById.values()]);
  if (isPlainObject(data.settings)) {
    _memory.settings = mergeSettings(_memory.settings, data.settings);
  }

  await persistEverything();
  return { imported: { items, looks, history }, mode: merge ? "merge" : "replace" };
}

async function clearAllImpl({ keepDemo = false } = {}) {
  await ready();
  const demoItems = keepDemo ? _memory.items.filter((item) => item && item.source === "demo") : [];
  _memory.items = sortItemsInPlace(demoItems.map(clone));
  _memory.looks = [];
  _memory.history = [];
  _memory.settings = await resolveDefaults();
  await persistEverything();
  return { items: _memory.items.length, looks: 0, history: 0 };
}

/**
 * Публичное хранилище. Все методы безопасны при повторном вызове,
 * бросают Error с русским сообщением.
 */
export const db = {
  init: publicMethod(initImpl),
  getItems: publicMethod(getItemsImpl),
  putItem: publicMethod(putItemImpl),
  deleteItem: publicMethod(deleteItemImpl),
  deleteItems: publicMethod(deleteItemsImpl),
  getLooks: publicMethod(getLooksImpl),
  putLook: publicMethod(putLookImpl),
  deleteLook: publicMethod(deleteLookImpl),
  markWorn: publicMethod(markWornImpl),
  getHistory: publicMethod(getHistoryImpl),
  getSettings: publicMethod(getSettingsImpl),
  saveSettings: publicMethod(saveSettingsImpl),
  exportAll: publicMethod(exportAllImpl),
  importAll: publicMethod(importAllImpl),
  clearAll: publicMethod(clearAllImpl),
  get storageMode() {
    return _mode || "indexeddb";
  },
};
