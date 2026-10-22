/**
 * js/weather.js — погодный слой «ШКАФ» (владелец: platform-dev).
 *
 * Источник данных — только Open-Meteo (без API-ключей):
 *   • геокодинг: https://geocoding-api.open-meteo.com/v1/search
 *   • прогноз:   https://api.open-meteo.com/v1/forecast
 *
 * Модуль браузерный, но импортируется в Node без падения: обращения к
 * `fetch` / `localStorage` / `navigator` происходят только внутри функций.
 *
 * Все пользовательские тексты — на русском.
 */

const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

/** Время жизни кэша погоды: 15 минут. */
export const CACHE_TTL_MS = 15 * 60 * 1000;

const CACHE_PREFIX = "shkaf.weather.v1";
const FORECAST_TIMEOUT_MS = 12000;
const GEO_TIMEOUT_MS = 10000;

const MSG_NETWORK = "Не удалось получить погоду. Проверьте подключение к интернету.";
const MSG_TIMEOUT = "Сервис погоды не ответил вовремя. Попробуйте ещё раз.";
const MSG_BAD_RESPONSE = "Сервис погоды вернул неполные данные. Попробуйте позже.";
const MSG_GEO = "Не удалось найти город. Проверьте подключение к интернету.";
const MSG_NO_PLACE = "Не выбрано место для прогноза. Укажите город в настройках.";

/**
 * WMO weather code → { key, label, icon } (см. CONTRACT.md §7.1).
 * key:  clear|partly|cloudy|overcast|fog|drizzle|rain|heavy-rain|snow|sleet|thunder
 * icon: sun|moon|cloud-sun|cloud|fog|drizzle|rain|snow|storm
 */
export const WEATHER_CODES = {
  0: { key: "clear", label: "Ясно", icon: "sun" },
  1: { key: "partly", label: "Переменная облачность", icon: "cloud-sun" },
  2: { key: "cloudy", label: "Облачно", icon: "cloud" },
  3: { key: "overcast", label: "Пасмурно", icon: "cloud" },
  45: { key: "fog", label: "Туман", icon: "fog" },
  48: { key: "fog", label: "Изморозь и туман", icon: "fog" },
  51: { key: "drizzle", label: "Слабая морось", icon: "drizzle" },
  53: { key: "drizzle", label: "Морось", icon: "drizzle" },
  55: { key: "drizzle", label: "Сильная морось", icon: "drizzle" },
  56: { key: "drizzle", label: "Ледяная морось", icon: "drizzle" },
  57: { key: "drizzle", label: "Сильная ледяная морось", icon: "drizzle" },
  61: { key: "rain", label: "Небольшой дождь", icon: "rain" },
  63: { key: "rain", label: "Дождь", icon: "rain" },
  66: { key: "rain", label: "Ледяной дождь", icon: "rain" },
  65: { key: "heavy-rain", label: "Сильный дождь", icon: "rain" },
  67: { key: "heavy-rain", label: "Сильный ледяной дождь", icon: "rain" },
  71: { key: "snow", label: "Небольшой снег", icon: "snow" },
  73: { key: "snow", label: "Снег", icon: "snow" },
  75: { key: "snow", label: "Сильный снег", icon: "snow" },
  77: { key: "snow", label: "Снежная крупа", icon: "snow" },
  80: { key: "rain", label: "Ливень", icon: "rain" },
  81: { key: "rain", label: "Сильный ливень", icon: "rain" },
  82: { key: "heavy-rain", label: "Очень сильный ливень", icon: "rain" },
  85: { key: "snow", label: "Снегопад", icon: "snow" },
  86: { key: "snow", label: "Сильный снегопад", icon: "snow" },
  95: { key: "thunder", label: "Гроза", icon: "storm" },
  96: { key: "thunder", label: "Гроза с градом", icon: "storm" },
  99: { key: "thunder", label: "Сильная гроза с градом", icon: "storm" },
};

const DEFAULT_CONDITION = { key: "cloudy", label: "Облачно", icon: "cloud" };

const WEATHER_ICONS = new Set(["sun", "moon", "cloud-sun", "cloud", "fog", "drizzle", "rain", "snow", "storm"]);

/** Условие по ключу — для manualWeather (ключ важнее кода). */
const CONDITION_BY_KEY = {
  clear: { key: "clear", label: "Ясно", icon: "sun" },
  partly: { key: "partly", label: "Переменная облачность", icon: "cloud-sun" },
  cloudy: { key: "cloudy", label: "Облачно", icon: "cloud" },
  overcast: { key: "overcast", label: "Пасмурно", icon: "cloud" },
  fog: { key: "fog", label: "Туман", icon: "fog" },
  drizzle: { key: "drizzle", label: "Морось", icon: "drizzle" },
  rain: { key: "rain", label: "Дождь", icon: "rain" },
  "heavy-rain": { key: "heavy-rain", label: "Сильный дождь", icon: "rain" },
  snow: { key: "snow", label: "Снег", icon: "snow" },
  sleet: { key: "sleet", label: "Мокрый снег", icon: "snow" },
  thunder: { key: "thunder", label: "Гроза", icon: "storm" },
};

/** Ручная погода: conditionKey → WMO code (CONTRACT.md §7.2). */
const MANUAL_CODES = {
  clear: 0,
  partly: 2,
  cloudy: 3,
  overcast: 3,
  fog: 45,
  drizzle: 51,
  rain: 61,
  "heavy-rain": 65,
  snow: 71,
  sleet: 77,
  thunder: 95,
};

/** Влажность/облачность/UV для ручного режима — по ключу условия. */
const MANUAL_MOOD = {
  clear: { humidity: 45, cloudCover: 5, uv: 3 },
  partly: { humidity: 55, cloudCover: 40, uv: 2 },
  cloudy: { humidity: 65, cloudCover: 65, uv: 1 },
  overcast: { humidity: 75, cloudCover: 90, uv: 1 },
  fog: { humidity: 95, cloudCover: 85, uv: 0 },
  drizzle: { humidity: 85, cloudCover: 75, uv: 1 },
  rain: { humidity: 85, cloudCover: 85, uv: 1 },
  "heavy-rain": { humidity: 92, cloudCover: 95, uv: 0 },
  snow: { humidity: 80, cloudCover: 90, uv: 1 },
  sleet: { humidity: 85, cloudCover: 90, uv: 0 },
  thunder: { humidity: 85, cloudCover: 95, uv: 0 },
};

// ---------------------------------------------------------------------------
// Мелкие утилиты
// ---------------------------------------------------------------------------

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

/** Округление до одного знака (для температур и осадков). */
function r1(value) {
  const n = toNum(value);
  return n === null ? null : Math.round(n * 10) / 10;
}

/** Округление до целого (влажность, ветер, вероятности). */
function ri(value) {
  const n = toNum(value);
  return n === null ? null : Math.round(n);
}

function clampInt(value, min, max) {
  const n = ri(value);
  if (n === null) return 0;
  return Math.min(max, Math.max(min, n));
}

function clone(value) {
  if (typeof structuredClone === "function") {
    try {
      return structuredClone(value);
    } catch {
      /* fallthrough */
    }
  }
  return JSON.parse(JSON.stringify(value));
}

function weatherError(message) {
  const err = new Error(message);
  err.name = "WeatherError";
  return err;
}

/** Оставить только известные UI иконки. */
export function conditionIcon(condition) {
  if (!condition || typeof condition !== "object") return "cloud";
  if (typeof condition.icon === "string" && WEATHER_ICONS.has(condition.icon)) return condition.icon;
  const byKey = CONDITION_BY_KEY[condition.key];
  return byKey ? byKey.icon : "cloud";
}

/**
 * WMO-код + день/ночь → { key, label, icon }.
 * @param {number} code
 * @param {boolean} [isDay=true]
 */
export function describeWeather(code, isDay = true) {
  const numeric = toNum(code);
  const base = (numeric !== null && WEATHER_CODES[Math.round(numeric)]) || DEFAULT_CONDITION;
  if (!isDay && base.key === "clear") {
    return { key: base.key, label: base.label, icon: "moon" };
  }
  return { key: base.key, label: base.label, icon: base.icon };
}

// ---------------------------------------------------------------------------
// AbortSignal + таймаут для fetch
// ---------------------------------------------------------------------------

/**
 * Объединяет внешний AbortSignal с внутренним таймаутом.
 * @returns {{ signal: AbortSignal|null, cleanup: () => void, didTimeout: () => boolean }}
 */
function combineSignal(signal, timeoutMs) {
  if (typeof AbortController !== "function") {
    return { signal: signal || null, cleanup: () => {}, didTimeout: () => false };
  }
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    try {
      controller.abort();
    } catch {
      /* ignore */
    }
  }, Math.max(1000, timeoutMs || FORECAST_TIMEOUT_MS));
  if (typeof timer.unref === "function") timer.unref();

  const onAbort = () => {
    try {
      controller.abort(signal.reason);
    } catch {
      try {
        controller.abort();
      } catch {
        /* ignore */
      }
    }
  };

  if (signal && typeof signal.addEventListener === "function") {
    if (signal.aborted) onAbort();
    else signal.addEventListener("abort", onAbort, { once: true });
  }

  const cleanup = () => {
    clearTimeout(timer);
    if (signal && typeof signal.removeEventListener === "function") {
      signal.removeEventListener("abort", onAbort);
    }
  };
  return { signal: controller.signal, cleanup, didTimeout: () => timedOut };
}

/**
 * fetch + JSON + русские ошибки. Пробрасывает AbortError как есть.
 * @returns {Promise<any>}
 */
async function fetchJson(url, { signal, timeoutMs, networkMessage }) {
  if (typeof fetch !== "function") {
    throw weatherError("Браузер не поддерживает сетевые запросы. Обновите браузер.");
  }
  const combined = combineSignal(signal, timeoutMs);
  try {
    let response;
    try {
      response = await fetch(url, { signal: combined.signal, headers: { Accept: "application/json" } });
    } catch (err) {
      if (err && err.name === "AbortError") {
        const userAborted = !!(signal && signal.aborted);
        if (!userAborted && combined.didTimeout()) throw weatherError(MSG_TIMEOUT);
        throw err;
      }
      throw weatherError(networkMessage || MSG_NETWORK);
    }
    if (!response || !response.ok) {
      throw weatherError(networkMessage || MSG_NETWORK);
    }
    try {
      return await response.json();
    } catch {
      throw weatherError(MSG_BAD_RESPONSE);
    }
  } finally {
    combined.cleanup();
  }
}

// ---------------------------------------------------------------------------
// Кэш в localStorage (15 минут, по округлённым координатам)
// ---------------------------------------------------------------------------

function getLocalStorage() {
  try {
    if (typeof localStorage === "undefined" || !localStorage) return null;
    return localStorage;
  } catch {
    return null;
  }
}

/** Ключ кэша по округлённым до ~1 км координатам. */
export function weatherCacheKey(place) {
  const lat = toNum(place && place.lat);
  const lon = toNum(place && place.lon);
  const latKey = lat === null ? "0.00" : lat.toFixed(2);
  const lonKey = lon === null ? "0.00" : lon.toFixed(2);
  return `${CACHE_PREFIX}:${latKey}:${lonKey}`;
}

/**
 * @param {string} key
 * @param {{ allowStale?: boolean }} [options]
 * @returns {{ at: number, weather: object } | null}
 */
function readCache(key, { allowStale = false } = {}) {
  const storage = getLocalStorage();
  if (!storage) return null;
  let raw;
  try {
    raw = storage.getItem(key);
  } catch {
    return null;
  }
  if (!raw) return null;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    removeCache(key);
    return null;
  }
  if (!parsed || typeof parsed !== "object" || !parsed.weather || typeof parsed.weather !== "object") {
    removeCache(key);
    return null;
  }
  const at = toNum(parsed.at);
  if (at === null) {
    removeCache(key);
    return null;
  }
  if (!allowStale && Date.now() - at > CACHE_TTL_MS) return null;
  return { at, weather: parsed.weather };
}

function writeCache(key, weather) {
  const storage = getLocalStorage();
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify({ at: Date.now(), weather }));
  } catch {
    // Квота/приватный режим — кэш не критичен, продолжаем без него.
  }
}

function removeCache(key) {
  const storage = getLocalStorage();
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Геокодинг
// ---------------------------------------------------------------------------

function toPlace(raw) {
  if (!raw || typeof raw !== "object") return null;
  const name = str(raw.name).trim();
  const lat = toNum(raw.latitude);
  const lon = toNum(raw.longitude);
  if (!name || lat === null || lon === null) return null;
  /** @type {{name: string, country: string, admin1?: string, lat: number, lon: number, timezone: string|null}} */
  const place = {
    name,
    country: str(raw.country),
    lat,
    lon,
    timezone: str(raw.timezone) || null,
  };
  const admin1 = str(raw.admin1).trim();
  if (admin1) place.admin1 = admin1;
  return place;
}

/**
 * Поиск города через Open-Meteo Geocoding API.
 * @param {string} query
 * @param {{ limit?: number, lang?: string, signal?: AbortSignal }} [options]
 * @returns {Promise<Array<{name: string, country: string, admin1?: string, lat: number, lon: number, timezone: string|null}>>}
 */
export async function searchPlaces(query, { limit = 6, lang = "ru", signal } = {}) {
  const q = typeof query === "string" ? query.trim() : "";
  if (q.length < 2) return [];

  const count = Math.min(20, Math.max(1, Math.round(toNum(limit) ?? 6)));
  const url = new URL(GEO_URL);
  url.searchParams.set("name", q);
  url.searchParams.set("count", String(count));
  url.searchParams.set("language", lang || "ru");
  url.searchParams.set("format", "json");

  const data = await fetchJson(url.toString(), {
    signal,
    timeoutMs: GEO_TIMEOUT_MS,
    networkMessage: MSG_GEO,
  });
  const results = data && Array.isArray(data.results) ? data.results : [];
  return results.map(toPlace).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Прогноз
// ---------------------------------------------------------------------------

function buildForecastUrl(place) {
  const url = new URL(FORECAST_URL);
  url.searchParams.set("latitude", String(place.lat));
  url.searchParams.set("longitude", String(place.lon));
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "6");
  url.searchParams.set(
    "current",
    [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "is_day",
      "precipitation",
      "rain",
      "showers",
      "snowfall",
      "weather_code",
      "cloud_cover",
      "wind_speed_10m",
      "wind_gusts_10m",
      "uv_index",
    ].join(","),
  );
  url.searchParams.set(
    "hourly",
    ["temperature_2m", "apparent_temperature", "precipitation_probability", "weather_code", "wind_speed_10m"].join(","),
  );
  url.searchParams.set(
    "daily",
    [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "apparent_temperature_max",
      "precipitation_probability_max",
      "wind_speed_10m_max",
      "sunrise",
      "sunset",
    ].join(","),
  );
  return url.toString();
}

/** Час дня/ночи по времени часа и восходу/закату (строки ISO без зоны). */
function isDayAt(hourTime, sunrise, sunset) {
  if (!sunrise || !sunset) return true;
  const hour = String(hourTime).slice(0, 16);
  return hour >= String(sunrise).slice(0, 16) && hour <= String(sunset).slice(0, 16);
}

function buildHourly(data, startIdx, sunrise, sunset) {
  const hourly = data && data.hourly && typeof data.hourly === "object" ? data.hourly : {};
  const times = Array.isArray(hourly.time) ? hourly.time : [];
  const out = [];
  for (let i = startIdx; i < times.length && out.length < 12; i += 1) {
    const code = toNum(hourly.weather_code?.[i]) ?? 0;
    const time = String(times[i]);
    const day = isDayAt(time, sunrise, sunset);
    out.push({
      time,
      temp: r1(hourly.temperature_2m?.[i]),
      feelsLike: r1(hourly.apparent_temperature?.[i]),
      precipProb: clampInt(hourly.precipitation_probability?.[i], 0, 100),
      code,
      condition: describeWeather(code, day),
    });
  }
  return out;
}

function buildDaily(data) {
  const daily = data && data.daily && typeof data.daily === "object" ? data.daily : {};
  const times = Array.isArray(daily.time) ? daily.time : [];
  const out = [];
  for (let i = 0; i < times.length && out.length < 5; i += 1) {
    const code = toNum(daily.weather_code?.[i]) ?? 0;
    out.push({
      date: String(times[i]),
      code,
      condition: describeWeather(code, true),
      tMax: r1(daily.temperature_2m_max?.[i]),
      tMin: r1(daily.temperature_2m_min?.[i]),
      feelsLikeMax: r1(daily.apparent_temperature_max?.[i]),
      precipProbMax: clampInt(daily.precipitation_probability_max?.[i], 0, 100),
      windMax: ri(daily.wind_speed_10m_max?.[i]) ?? 0,
    });
  }
  return out;
}

/** Приводит ответ Open-Meteo к форме Weather из CONTRACT.md §1. */
function normalizeForecast(place, data) {
  if (!data || typeof data !== "object" || !data.current || typeof data.current !== "object") {
    throw weatherError(MSG_BAD_RESPONSE);
  }
  const current = data.current;
  const temp = r1(current.temperature_2m);
  if (temp === null) throw weatherError(MSG_BAD_RESPONSE);

  const code = toNum(current.weather_code) ?? 0;
  const isDay = toNum(current.is_day) === 0 ? false : true;
  const currentTime = str(current.time);

  const sunrise = str(data.daily?.sunrise?.[0]);
  const sunset = str(data.daily?.sunset?.[0]);
  const daily = buildDaily(data);

  const hourlyTimes = data.hourly && Array.isArray(data.hourly.time) ? data.hourly.time : [];
  let startIdx = 0;
  if (currentTime) {
    const idx = hourlyTimes.findIndex((t) => String(t) >= currentTime);
    startIdx = idx >= 0 ? idx : 0;
  }

  // current не содержит вероятность осадков — берём из ближайшего (текущего/следующего) часа.
  const precipProb = clampInt(
    startIdx < hourlyTimes.length ? data.hourly?.precipitation_probability?.[startIdx] : null,
    0,
    100,
  );
  const hourly = buildHourly(data, startIdx, sunrise, sunset);

  return {
    temp,
    feelsLike: r1(current.apparent_temperature),
    humidity: ri(current.relative_humidity_2m),
    precipMm: r1(current.precipitation) ?? 0,
    precipProb,
    rain: r1(current.rain) ?? 0,
    showers: r1(current.showers) ?? 0,
    snowfall: r1(current.snowfall) ?? 0,
    code,
    isDay,
    condition: describeWeather(code, isDay),
    windSpeed: ri(current.wind_speed_10m) ?? 0,
    windGust: ri(current.wind_gusts_10m) ?? 0,
    cloudCover: clampInt(current.cloud_cover, 0, 100),
    uvIndex: r1(current.uv_index) ?? 0,
    location: {
      name: str(place.name) || "Текущее местоположение",
      country: str(place.country),
      lat: toNum(place.lat),
      lon: toNum(place.lon),
    },
    updatedAt: Date.now(),
    source: "open-meteo",
    hourly,
    daily,
    today: sunrise || sunset ? { sunrise: sunrise || null, sunset: sunset || null } : null,
  };
}

/**
 * Прогноз на 6 дней (5 дней в daily, 12 часов в hourly) с кэшем на 15 минут.
 * При сетевой ошибке возвращает устаревший кэш с source="cache", иначе бросает
 * Error с русским сообщением. AbortError пробрасывается без подмены.
 *
 * @param {{name?: string, country?: string, admin1?: string, lat: number, lon: number, timezone?: string|null}} place
 * @param {{ signal?: AbortSignal, force?: boolean }} [options]
 * @returns {Promise<object>} Weather
 */
export async function fetchWeather(place, { signal, force = false } = {}) {
  const lat = toNum(place && place.lat);
  const lon = toNum(place && place.lon);
  if (lat === null || lon === null || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    throw weatherError(MSG_NO_PLACE);
  }
  const normalizedPlace = {
    name: str(place.name).trim() || "Текущее местоположение",
    country: str(place.country),
    lat,
    lon,
    timezone: str(place.timezone) || null,
  };
  if (str(place.admin1)) normalizedPlace.admin1 = str(place.admin1);

  const cacheKey = weatherCacheKey(normalizedPlace);

  if (!force) {
    const fresh = readCache(cacheKey);
    if (fresh) return clone(fresh.weather);
  }

  try {
    const data = await fetchJson(buildForecastUrl(normalizedPlace), {
      signal,
      timeoutMs: FORECAST_TIMEOUT_MS,
      networkMessage: MSG_NETWORK,
    });
    const weather = normalizeForecast(normalizedPlace, data);
    writeCache(cacheKey, weather);
    return weather;
  } catch (err) {
    if (err && err.name === "AbortError") throw err;
    if (signal && signal.aborted) throw err;
    const stale = readCache(cacheKey, { allowStale: true });
    if (stale) {
      const cached = clone(stale.weather);
      return { ...cached, source: "cache" };
    }
    if (err && err.name === "WeatherError") throw err;
    throw weatherError(MSG_NETWORK);
  }
}

// ---------------------------------------------------------------------------
// Ручная погода
// ---------------------------------------------------------------------------

function feelsLikeManual(temp, windSpeed, humidity) {
  const t = toNum(temp) ?? 0;
  const wind = Math.max(0, toNum(windSpeed) ?? 0);
  const hum = clampInt(humidity, 0, 100);
  if (t <= 10 && wind >= 5) {
    const v = Math.pow(wind, 0.16);
    return 13.12 + 0.6215 * t - 11.37 * v + 0.3965 * t * v;
  }
  if (t >= 26) return t + (hum - 40) * 0.05;
  if (t <= 10 && hum >= 85) return t - 0.5;
  return t;
}

/**
 * Синтетическая погода из настроек (weatherMode="manual").
 * @param {{ temp?: number, precipProb?: number, windSpeed?: number, conditionKey?: string }} [manual]
 * @param {{name?: string, country?: string, lat?: number, lon?: number} | null} [place]
 * @returns {object} Weather
 */
export function manualWeather(manual, place = null) {
  const input = manual && typeof manual === "object" ? manual : {};
  const requestedKey = str(input.conditionKey);
  const conditionKey = CONDITION_BY_KEY[requestedKey] ? requestedKey : "cloudy";
  const condition = { ...CONDITION_BY_KEY[conditionKey] };
  const code = MANUAL_CODES[conditionKey] ?? 3;

  const temp = Math.min(60, Math.max(-60, r1(input.temp) ?? 12));
  const precipProb = clampInt(input.precipProb, 0, 100);
  const windSpeed = Math.min(200, Math.max(0, ri(input.windSpeed) ?? 3));
  const mood = MANUAL_MOOD[conditionKey] || MANUAL_MOOD.cloudy;
  const humidity = mood.humidity;
  const feelsLike = Math.round(feelsLikeManual(temp, windSpeed, humidity) * 10) / 10;

  const rainy = ["drizzle", "rain", "heavy-rain", "thunder", "sleet"].includes(conditionKey);
  const snowy = ["snow", "sleet"].includes(conditionKey);
  const precipMm = precipProb >= 20 ? Math.round((precipProb / 100) * 2 * 10) / 10 : 0;

  const location = {
    name: str(place && place.name).trim() || "Вручную",
    country: str(place && place.country),
    lat: toNum(place && place.lat),
    lon: toNum(place && place.lon),
  };

  return {
    temp,
    feelsLike,
    humidity,
    precipMm,
    precipProb,
    rain: rainy ? precipMm : 0,
    showers: rainy && conditionKey !== "drizzle" ? precipMm : 0,
    snowfall: snowy ? precipMm : 0,
    code,
    isDay: true,
    condition,
    windSpeed,
    windGust: Math.max(windSpeed, Math.round(windSpeed * 1.6)),
    cloudCover: mood.cloudCover,
    uvIndex: mood.uv,
    location,
    updatedAt: Date.now(),
    source: "manual",
    hourly: [],
    daily: [],
    today: null,
  };
}

// ---------------------------------------------------------------------------
// Текстовая сводка и геолокация
// ---------------------------------------------------------------------------

function tempTone(t) {
  if (t <= -15) return "сильный мороз";
  if (t < -5) return "мороз";
  if (t < 2) return "холодно";
  if (t < 15) return "прохладно";
  if (t < 22) return "тепло";
  if (t < 28) return "жарко";
  return "очень жарко";
}

/**
 * Короткая сводка для UI: «прохладно, дождь» или «+13°».
 * @param {object} weather
 * @returns {string}
 */
export function weatherSummary(weather) {
  if (!weather || typeof weather !== "object") return "Погода неизвестна";
  const temp = toNum(weather.temp);
  if (temp === null) return "Погода неизвестна";
  const rounded = Math.round(temp);
  const tone = tempTone(rounded);
  const label = weather.condition && typeof weather.condition.label === "string" ? weather.condition.label.trim() : "";
  let tail = label ? label.toLowerCase() : `${rounded > 0 ? "+" : ""}${rounded}°`;
  const wind = toNum(weather.windSpeed);
  if (wind !== null && wind >= 35) tail += ", ветер";
  return `${tone}, ${tail}`;
}

function geoErrorMessage(code) {
  switch (code) {
    case 1:
      return "Доступ к геолокации запрещён. Выберите город вручную.";
    case 2:
      return "Не удалось определить местоположение. Выберите город вручную.";
    case 3:
      return "Геолокация не ответила вовремя. Выберите город вручную.";
    default:
      return "Не удалось определить местоположение. Выберите город вручную.";
  }
}

/**
 * Координаты пользователя через navigator.geolocation.
 * @param {{ timeout?: number }} [options]
 * @returns {Promise<{lat: number, lon: number}>}
 */
export async function geolocate({ timeout = 8000 } = {}) {
  let nav = null;
  try {
    nav = typeof navigator !== "undefined" ? navigator : null;
  } catch {
    nav = null;
  }
  if (!nav || !nav.geolocation || typeof nav.geolocation.getCurrentPosition !== "function") {
    throw new Error("Геолокация недоступна в этом браузере. Выберите город вручную.");
  }
  return new Promise((resolve, reject) => {
    const onSuccess = (position) => {
      const lat = toNum(position && position.coords && position.coords.lat);
      const lon = toNum(position && position.coords && position.coords.lon);
      if (lat === null || lon === null || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
        reject(new Error("Не удалось определить местоположение. Выберите город вручную."));
        return;
      }
      resolve({ lat, lon });
    };
    const onError = (err) => reject(new Error(geoErrorMessage(err && err.code)));
    try {
      nav.geolocation.getCurrentPosition(onSuccess, onError, {
        enableHighAccuracy: false,
        timeout: Math.max(1000, Math.round(toNum(timeout) ?? 8000)),
        maximumAge: 5 * 60 * 1000,
      });
    } catch {
      reject(new Error("Геолокация недоступна в этом браузере. Выберите город вручную."));
    }
  });
}
