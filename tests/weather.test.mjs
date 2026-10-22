/**
 * tests/weather.test.mjs — тесты погодного слоя «ШКАФ» (node --test).
 *
 * Сеть и localStorage замоканы через globalThis; модуль импортируется
 * до установки моков — это заодно проверяет, что на этапе импорта
 * к браузерным API никто не обращается.
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  WEATHER_CODES,
  describeWeather,
  searchPlaces,
  fetchWeather,
  manualWeather,
  weatherSummary,
  geolocate,
  conditionIcon,
  weatherCacheKey,
  CACHE_TTL_MS,
} from "../js/weather.js";

// ---------------------------------------------------------------------------
// Инфраструктура моков
// ---------------------------------------------------------------------------

function createLocalStorageMock() {
  const map = new Map();
  return {
    get length() {
      return map.size;
    },
    key(index) {
      const keys = [...map.keys()];
      return index >= 0 && index < keys.length ? keys[index] : null;
    },
    getItem(key) {
      const normalized = String(key);
      return map.has(normalized) ? map.get(normalized) : null;
    },
    setItem(key, value) {
      map.set(String(key), String(value));
    },
    removeItem(key) {
      map.delete(String(key));
    },
    clear() {
      map.clear();
    },
    dump() {
      return Object.fromEntries(map);
    },
  };
}

/** Подменяет глобал и возвращает функцию восстановления. */
function installGlobal(name, value) {
  const original = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, {
    value,
    configurable: true,
    writable: true,
    enumerable: original ? original.enumerable : false,
  });
  return () => {
    if (original) Object.defineProperty(globalThis, name, original);
    else delete globalThis[name];
  };
}

/**
 * @param {(url: string, options: object, callIndex: number) => any} handler
 * @param {{ storage?: "mock" | "absent" }} [options]
 */
function createEnv(handler, { storage = "mock" } = {}) {
  const cleanups = [];
  const localStorageMock = storage === "mock" ? createLocalStorageMock() : null;
  cleanups.push(installGlobal("localStorage", localStorageMock || undefined));

  const calls = [];
  cleanups.push(
    installGlobal("fetch", async (input, options) => {
      calls.push({ url: String(input), options: options || {} });
      return handler(String(input), options || {}, calls.length);
    }),
  );

  return {
    localStorage: localStorageMock,
    calls,
    cleanup() {
      while (cleanups.length) cleanups.pop()();
    },
  };
}

function jsonResponse(payload, { ok = true, status = 200 } = {}) {
  return { ok, status, json: async () => payload };
}

const BERLIN = {
  name: "Берлин",
  country: "Германия",
  admin1: "Берлин",
  lat: 52.52437,
  lon: 13.41053,
  timezone: "Europe/Berlin",
};

/** Реалистичный ответ Open-Meteo: current + 48 часов + 6 дней. */
function buildForecastPayload() {
  const hourly = {
    time: [],
    temperature_2m: [],
    apparent_temperature: [],
    precipitation_probability: [],
    weather_code: [],
    wind_speed_10m: [],
  };
  for (let i = 0; i < 48; i += 1) {
    const hour = i % 24;
    const day = 22 + Math.floor(i / 24);
    hourly.time.push(`2026-10-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:00`);
    hourly.temperature_2m.push(10 + hour / 10);
    hourly.apparent_temperature.push(9 + hour / 10);
    hourly.precipitation_probability.push(hour === 14 ? 10 : hour === 15 ? 60 : 5);
    hourly.weather_code.push(61);
    hourly.wind_speed_10m.push(12);
  }

  return {
    latitude: 52.52437,
    longitude: 13.41053,
    timezone: "Europe/Berlin",
    current: {
      time: "2026-10-22T14:30",
      temperature_2m: 13.2,
      relative_humidity_2m: 80,
      apparent_temperature: 12.1,
      is_day: 1,
      precipitation: 0.2,
      rain: 0.2,
      showers: 0,
      snowfall: 0,
      weather_code: 61,
      cloud_cover: 75,
      wind_speed_10m: 14,
      wind_gusts_10m: 22,
      uv_index: 1,
    },
    hourly,
    daily: {
      time: ["2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25", "2026-10-26", "2026-10-27"],
      weather_code: [61, 3, 0, 71, 95, 2],
      temperature_2m_max: [14.2, 12.8, 16.4, 2.1, 9.9, 11.1],
      temperature_2m_min: [7.1, 5.2, 6.8, -1.4, 4.4, 3.3],
      apparent_temperature_max: [13.0, 11.5, 15.2, 0.4, 8.0, 10.2],
      precipitation_probability_max: [70, 40, 10, 80, 65, 30],
      wind_speed_10m_max: [18, 14, 9, 22, 31, 12],
      sunrise: [
        "2026-10-22T07:42",
        "2026-10-23T07:44",
        "2026-10-24T07:46",
        "2026-10-25T07:48",
        "2026-10-26T07:50",
        "2026-10-27T07:52",
      ],
      sunset: [
        "2026-10-22T17:58",
        "2026-10-23T17:56",
        "2026-10-24T17:54",
        "2026-10-25T17:52",
        "2026-10-26T17:50",
        "2026-10-27T17:48",
      ],
    },
  };
}

// ---------------------------------------------------------------------------
// 1. Коды WMO
// ---------------------------------------------------------------------------

test("WEATHER_CODES: точное соответствие WMO из CONTRACT §7.1", () => {
  const expected = {
    0: ["clear", "sun"],
    1: ["partly", "cloud-sun"],
    2: ["cloudy", "cloud"],
    3: ["overcast", "cloud"],
    45: ["fog", "fog"],
    48: ["fog", "fog"],
    51: ["drizzle", "drizzle"],
    53: ["drizzle", "drizzle"],
    55: ["drizzle", "drizzle"],
    56: ["drizzle", "drizzle"],
    57: ["drizzle", "drizzle"],
    61: ["rain", "rain"],
    63: ["rain", "rain"],
    66: ["rain", "rain"],
    65: ["heavy-rain", "rain"],
    67: ["heavy-rain", "rain"],
    71: ["snow", "snow"],
    73: ["snow", "snow"],
    75: ["snow", "snow"],
    77: ["snow", "snow"],
    80: ["rain", "rain"],
    81: ["rain", "rain"],
    82: ["heavy-rain", "rain"],
    85: ["snow", "snow"],
    86: ["snow", "snow"],
    95: ["thunder", "storm"],
    96: ["thunder", "storm"],
    99: ["thunder", "storm"],
  };

  const codes = Object.keys(WEATHER_CODES);
  assert.equal(codes.length, Object.keys(expected).length, "лишние/недостающие коды WMO");

  const allowedIcons = new Set(["sun", "moon", "cloud-sun", "cloud", "fog", "drizzle", "rain", "snow", "storm"]);
  const allowedKeys = new Set([
    "clear",
    "partly",
    "cloudy",
    "overcast",
    "fog",
    "drizzle",
    "rain",
    "heavy-rain",
    "snow",
    "sleet",
    "thunder",
  ]);

  for (const [code, [key, icon]] of Object.entries(expected)) {
    const entry = WEATHER_CODES[code];
    assert.ok(entry, `нет записи для кода ${code}`);
    assert.equal(entry.key, key, `key для кода ${code}`);
    assert.equal(entry.icon, icon, `icon для кода ${code}`);
    assert.ok(allowedKeys.has(entry.key), `недопустимый key ${entry.key}`);
    assert.ok(allowedIcons.has(entry.icon), `недопустимая иконка ${entry.icon}`);
    assert.match(entry.label, /[А-Яа-яЁё]/, `подпись для кода ${code} должна быть русской`);
  }
});

test("describeWeather: ночные иконки, неизвестный код, кривые входные данные", () => {
  assert.deepEqual(describeWeather(0, true), { key: "clear", label: "Ясно", icon: "sun" });
  assert.deepEqual(describeWeather(0, false), { key: "clear", label: "Ясно", icon: "moon" });
  assert.equal(describeWeather(1, false).icon, "cloud-sun", "днём и ночью для partly одна иконка");
  assert.equal(describeWeather(61).icon, "rain");
  assert.equal(describeWeather(95).key, "thunder");
  assert.equal(describeWeather(95).icon, "storm");
  assert.equal(describeWeather(45, false).icon, "fog", "туман ночью не становится луной");

  // Неизвестный код → безопасный fallback.
  assert.deepEqual(describeWeather(12345), { key: "cloudy", label: "Облачно", icon: "cloud" });
  assert.equal(describeWeather(undefined).key, "cloudy");
  assert.equal(describeWeather("61").key, "rain", "числовая строка тоже принимается");
});

// ---------------------------------------------------------------------------
// 2. Геокодинг
// ---------------------------------------------------------------------------

test("searchPlaces: корректный запрос и разбор ответа", async (t) => {
  const env = createEnv(() =>
    jsonResponse({
      results: [
        {
          name: "Берлин",
          country: "Германия",
          admin1: "Берлин",
          latitude: 52.52437,
          longitude: 13.41053,
          timezone: "Europe/Berlin",
        },
        {
          name: "Berlin",
          country: "США",
          latitude: 39.9,
          longitude: -75.0,
          timezone: "America/New_York",
        },
      ],
    }),
  );
  t.after(env.cleanup);

  const places = await searchPlaces("Берлин");
  assert.equal(env.calls.length, 1);

  const url = new URL(env.calls[0].url);
  assert.equal(url.origin, "https://geocoding-api.open-meteo.com");
  assert.equal(url.pathname, "/v1/search");
  assert.equal(url.searchParams.get("name"), "Берлин");
  assert.equal(url.searchParams.get("count"), "6");
  assert.equal(url.searchParams.get("language"), "ru");
  assert.equal(url.searchParams.get("format"), "json");

  assert.equal(places.length, 2);
  assert.deepEqual(places[0], {
    name: "Берлин",
    country: "Германия",
    admin1: "Берлин",
    lat: 52.52437,
    lon: 13.41053,
    timezone: "Europe/Berlin",
  });
  assert.equal(places[1].admin1, undefined, "нет admin1 — нет поля");
  assert.equal(places[1].lat, 39.9);
});

test("searchPlaces: limit/lang, короткий запрос, пустой и мусорный ответ", async (t) => {
  const env = createEnv(() => jsonResponse({ results: [] }));
  t.after(env.cleanup);

  assert.deepEqual(await searchPlaces(" "), [], "пустой запрос не ходит в сеть");
  assert.deepEqual(await searchPlaces("Б"), [], "слишком короткий запрос не ходит в сеть");
  assert.equal(env.calls.length, 0);

  await searchPlaces("Berlin", { limit: 3, lang: "en" });
  const url = new URL(env.calls[0].url);
  assert.equal(url.searchParams.get("count"), "3");
  assert.equal(url.searchParams.get("language"), "en");
});

test("searchPlaces: мусор в results отфильтровывается", async (t) => {
  const env = createEnv(() =>
    jsonResponse({
      results: [
        null,
        "строка",
        { name: "Без координат" },
        { name: "Берлин", latitude: 52.5, longitude: 13.4, country: "Германия" },
      ],
    }),
  );
  t.after(env.cleanup);

  const places = await searchPlaces("Берлин");
  assert.equal(places.length, 1);
  assert.equal(places[0].name, "Берлин");
});

test("searchPlaces: сетевая ошибка — понятный русский текст", async (t) => {
  const env = createEnv(() => Promise.reject(new TypeError("Failed to fetch")));
  t.after(env.cleanup);

  await assert.rejects(searchPlaces("Берлин"), (err) => {
    assert.ok(err instanceof Error);
    assert.match(err.message, /Не удалось найти город/);
    return true;
  });
});

// ---------------------------------------------------------------------------
// 3. Прогноз
// ---------------------------------------------------------------------------

test("fetchWeather: нормализует current/hourly/daily в Weather", async (t) => {
  const env = createEnv(() => jsonResponse(buildForecastPayload()));
  t.after(env.cleanup);

  const weather = await fetchWeather(BERLIN);

  // current
  assert.equal(weather.temp, 13.2);
  assert.equal(weather.feelsLike, 12.1);
  assert.equal(weather.humidity, 80);
  assert.equal(weather.precipMm, 0.2);
  assert.equal(weather.rain, 0.2);
  assert.equal(weather.cloudCover, 75);
  assert.equal(weather.windSpeed, 14);
  assert.equal(weather.windGust, 22);
  assert.equal(weather.uvIndex, 1);
  assert.equal(weather.code, 61);
  assert.equal(weather.isDay, true);
  assert.deepEqual(weather.condition, { key: "rain", label: "Небольшой дождь", icon: "rain" });
  assert.equal(weather.source, "open-meteo");
  assert.equal(typeof weather.updatedAt, "number");
  assert.ok(Date.now() - weather.updatedAt < 5000);
  assert.deepEqual(weather.location, {
    name: "Берлин",
    country: "Германия",
    lat: 52.52437,
    lon: 13.41053,
  });

  // precipProb — из ближайшего hourly (15:00 → 60, а не 14:00 → 10).
  assert.equal(weather.precipProb, 60);

  // hourly: 12 часов, начиная с текущего/следующего часа.
  assert.equal(weather.hourly.length, 12);
  assert.equal(weather.hourly[0].time, "2026-10-22T15:00");
  assert.equal(weather.hourly[0].temp, 11.5);
  assert.equal(weather.hourly[0].precipProb, 60);
  assert.equal(weather.hourly[0].code, 61);
  assert.deepEqual(weather.hourly[0].condition, { key: "rain", label: "Небольшой дождь", icon: "rain" });
  assert.equal(weather.hourly[0].condition.icon, "rain", "15:00 — ещё день, иконка дождя");
  assert.equal(weather.hourly[11].time, "2026-10-23T02:00");
  assert.equal(weather.hourly[11].condition.icon, "rain", "ночью дождь так и остаётся дождём");

  // daily: 5 дней начиная с сегодня (API вернул 6).
  assert.equal(weather.daily.length, 5);
  assert.equal(weather.daily[0].date, "2026-10-22");
  assert.equal(weather.daily[0].tMax, 14.2);
  assert.equal(weather.daily[0].tMin, 7.1);
  assert.equal(weather.daily[0].feelsLikeMax, 13);
  assert.equal(weather.daily[0].precipProbMax, 70);
  assert.equal(weather.daily[0].windMax, 18);
  assert.equal(weather.daily[0].condition.key, "rain");
  assert.equal(weather.daily[3].condition.key, "snow");
  assert.equal(weather.daily[4].condition.key, "thunder");

  // today
  assert.deepEqual(weather.today, { sunrise: "2026-10-22T07:42", sunset: "2026-10-22T17:58" });
});

test("fetchWeather: параметры запроса соответствуют контракту", async (t) => {
  const env = createEnv(() => jsonResponse(buildForecastPayload()));
  t.after(env.cleanup);

  await fetchWeather(BERLIN);
  const url = new URL(env.calls[0].url);
  assert.equal(url.origin, "https://api.open-meteo.com");
  assert.equal(url.pathname, "/v1/forecast");
  assert.equal(url.searchParams.get("latitude"), "52.52437");
  assert.equal(url.searchParams.get("longitude"), "13.41053");
  assert.equal(url.searchParams.get("timezone"), "auto");
  assert.equal(url.searchParams.get("forecast_days"), "6");

  const current = url.searchParams.get("current").split(",");
  for (const field of [
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
  ]) {
    assert.ok(current.includes(field), `в current нет ${field}`);
  }

  const hourly = url.searchParams.get("hourly").split(",");
  for (const field of [
    "temperature_2m",
    "apparent_temperature",
    "precipitation_probability",
    "weather_code",
    "wind_speed_10m",
  ]) {
    assert.ok(hourly.includes(field), `в hourly нет ${field}`);
  }

  const daily = url.searchParams.get("daily").split(",");
  for (const field of [
    "weather_code",
    "temperature_2m_max",
    "temperature_2m_min",
    "apparent_temperature_max",
    "precipitation_probability_max",
    "wind_speed_10m_max",
    "sunrise",
    "sunset",
  ]) {
    assert.ok(daily.includes(field), `в daily нет ${field}`);
  }
});

test("fetchWeather: кэш 15 минут — второй вызов без сети", async (t) => {
  assert.equal(CACHE_TTL_MS, 15 * 60 * 1000);
  const env = createEnv(() => jsonResponse(buildForecastPayload()));
  t.after(env.cleanup);

  const first = await fetchWeather(BERLIN);
  const second = await fetchWeather(BERLIN);

  assert.equal(env.calls.length, 1, "второй вызов должен прийти из кэша");
  assert.equal(second.source, "open-meteo");
  assert.deepEqual(second, first, "из кэша возвращается та же погода");

  const key = weatherCacheKey(BERLIN);
  assert.equal(key, "shkaf.weather.v1:52.52:13.41");
  const raw = env.localStorage.getItem(key);
  assert.ok(raw, "кэш записался в localStorage");
  const parsed = JSON.parse(raw);
  assert.equal(typeof parsed.at, "number");
  assert.equal(parsed.weather.temp, 13.2);
});

test("fetchWeather: ключ кэша — по округлённым координатам", async (t) => {
  const env = createEnv(() => jsonResponse(buildForecastPayload()));
  t.after(env.cleanup);

  assert.equal(
    weatherCacheKey(BERLIN),
    weatherCacheKey({ name: "Другое имя", lat: 52.52401, lon: 13.40777 }),
    "соседние координаты дают один ключ",
  );
  assert.notEqual(weatherCacheKey(BERLIN), weatherCacheKey({ lat: 52.6, lon: 13.41 }));

  await fetchWeather(BERLIN);
  const nearby = await fetchWeather({ lat: 52.52401, lon: 13.40777 });
  assert.equal(env.calls.length, 1, "соседние координаты не ходят в сеть повторно");
  assert.equal(nearby.temp, 13.2);
});

test("fetchWeather: force игнорирует свежий кэш", async (t) => {
  const env = createEnv(() => jsonResponse(buildForecastPayload()));
  t.after(env.cleanup);

  await fetchWeather(BERLIN);
  await fetchWeather(BERLIN, { force: true });
  assert.equal(env.calls.length, 2);
});

test("fetchWeather: при падении сети отдаёт устаревший кэш с source=cache", async (t) => {
  let handler = () => jsonResponse(buildForecastPayload());
  const env = createEnv((url, options, index) => handler(url, options, index));
  t.after(env.cleanup);

  await fetchWeather(BERLIN);

  // Состариваем кэш сверх TTL.
  const key = weatherCacheKey(BERLIN);
  const cached = JSON.parse(env.localStorage.getItem(key));
  cached.at = Date.now() - CACHE_TTL_MS - 1000;
  env.localStorage.setItem(key, JSON.stringify(cached));

  handler = () => Promise.reject(new TypeError("Failed to fetch"));
  const fallback = await fetchWeather(BERLIN);

  assert.equal(fallback.source, "cache");
  assert.equal(fallback.temp, 13.2);
  assert.equal(fallback.hourly.length, 12);
  assert.equal(env.calls.length, 2, "была попытка сети, потом отдан кэш");
});

test("fetchWeather: без кэша и сети — понятная русская ошибка", async (t) => {
  const env = createEnv(() => Promise.reject(new TypeError("Failed to fetch")));
  t.after(env.cleanup);

  await assert.rejects(fetchWeather(BERLIN), (err) => {
    assert.ok(err instanceof Error);
    assert.match(err.message, /Не удалось получить погоду/);
    return true;
  });
});

test("fetchWeather: HTTP-ошибка, неполный ответ и отсутствие места", async (t) => {
  const env = createEnv((url) =>
    url.includes("geocoding") ? jsonResponse({}, { ok: false, status: 500 }) : jsonResponse({}, { ok: false, status: 500 }),
  );
  t.after(env.cleanup);

  await assert.rejects(fetchWeather(BERLIN), /Не удалось получить погоду/);

  // Новый env: ответ 200, но без current.
  const brokenEnv = createEnv(() => jsonResponse({ daily: { time: [] } }));
  t.after(brokenEnv.cleanup);
  await assert.rejects(fetchWeather({ name: "Рим", lat: 41.9, lon: 12.5 }), /неполные данные/);

  // Без координат — свой текст.
  await assert.rejects(fetchWeather({}), /Не выбрано место/);
  await assert.rejects(fetchWeather({ lat: "нет", lon: 1 }), /Не выбрано место/);
});

test("fetchWeather: AbortSignal пробрасывается как AbortError", async (t) => {
  const env = createEnv((url, options) => {
    if (options.signal && options.signal.aborted) {
      return Promise.reject(new DOMException("Aborted", "AbortError"));
    }
    return jsonResponse(buildForecastPayload());
  });
  t.after(env.cleanup);

  const controller = new AbortController();
  controller.abort();
  await assert.rejects(fetchWeather(BERLIN, { signal: controller.signal }), (err) => {
    assert.equal(err.name, "AbortError");
    return true;
  });
  assert.equal(env.calls.length, 1);
});

test("fetchWeather: работает без localStorage (кэша просто нет)", async (t) => {
  const env = createEnv(() => jsonResponse(buildForecastPayload()), { storage: "absent" });
  t.after(env.cleanup);

  const first = await fetchWeather(BERLIN);
  const second = await fetchWeather(BERLIN);
  assert.equal(first.temp, 13.2);
  assert.equal(second.temp, 13.2);
  assert.equal(env.calls.length, 2, "без localStorage каждый вызов идёт в сеть");
});

// ---------------------------------------------------------------------------
// 4. Ручная погода
// ---------------------------------------------------------------------------

test("manualWeather: code и condition для всех conditionKey контракта", () => {
  const cases = [
    ["clear", 0, "sun"],
    ["partly", 2, "cloud-sun"],
    ["cloudy", 3, "cloud"],
    ["overcast", 3, "cloud"],
    ["fog", 45, "fog"],
    ["drizzle", 51, "drizzle"],
    ["rain", 61, "rain"],
    ["snow", 71, "snow"],
    ["thunder", 95, "storm"],
  ];

  for (const [conditionKey, code, icon] of cases) {
    const weather = manualWeather({ temp: 12, precipProb: 40, windSpeed: 3, conditionKey });
    assert.equal(weather.code, code, `code для ${conditionKey}`);
    assert.equal(weather.condition.key, conditionKey, `condition.key для ${conditionKey}`);
    assert.equal(weather.condition.icon, icon, `icon для ${conditionKey}`);
    assert.equal(weather.source, "manual");
    assert.equal(weather.isDay, true);
    assert.deepEqual(weather.hourly, []);
    assert.deepEqual(weather.daily, []);
    assert.equal(weather.today, null);
    assert.equal(weather.location.name, "Вручную");
    assert.equal(typeof weather.temp, "number");
    assert.equal(typeof weather.feelsLike, "number");
    assert.equal(typeof weather.updatedAt, "number");
    assert.equal(conditionIcon(weather.condition), icon);
  }
});

test("manualWeather: feelsLike, place, ограничения и мусор на входе", () => {
  const cold = manualWeather({ temp: -5, precipProb: 0, windSpeed: 30, conditionKey: "clear" });
  assert.ok(cold.feelsLike < cold.temp, "на морозе с ветром ощущается холоднее");
  assert.ok(cold.windGust >= cold.windSpeed);

  const warm = manualWeather({ temp: 30, precipProb: 70, windSpeed: 2, conditionKey: "rain" });
  assert.ok(warm.feelsLike >= warm.temp);
  assert.equal(warm.precipProb, 70);
  assert.ok(warm.precipMm > 0);
  assert.ok(warm.rain > 0);

  const limits = manualWeather({ temp: 100, precipProb: 150, windSpeed: -5, conditionKey: "rain" });
  assert.equal(limits.temp, 60);
  assert.equal(limits.precipProb, 100);
  assert.equal(limits.windSpeed, 0);

  const fallback = manualWeather({ conditionKey: "торнадо" });
  assert.equal(fallback.condition.key, "cloudy");
  assert.equal(fallback.code, 3);

  const empty = manualWeather();
  assert.equal(empty.temp, 12);
  assert.equal(empty.condition.key, "cloudy");

  const withPlace = manualWeather(
    { temp: 9, precipProb: 20, windSpeed: 5, conditionKey: "partly" },
    { name: "Берлин", country: "Германия", lat: 52.52, lon: 13.41 },
  );
  assert.deepEqual(withPlace.location, { name: "Берлин", country: "Германия", lat: 52.52, lon: 13.41 });
});

// ---------------------------------------------------------------------------
// 5. Сводка, иконки, геолокация
// ---------------------------------------------------------------------------

test("weatherSummary: короткая русская сводка", () => {
  assert.equal(
    weatherSummary({ temp: 13.2, condition: { key: "rain", label: "Дождь", icon: "rain" } }),
    "прохладно, дождь",
  );
  assert.equal(weatherSummary({ temp: -8, condition: { key: "snow", label: "Снег", icon: "snow" } }), "мороз, снег");
  assert.equal(
    weatherSummary({ temp: 30, condition: { key: "clear", label: "Ясно", icon: "sun" } }),
    "очень жарко, ясно",
  );
  assert.equal(weatherSummary({ temp: 5 }), "прохладно, +5°");
  assert.equal(weatherSummary({ temp: -3 }), "холодно, -3°");
  assert.match(
    weatherSummary({ temp: 10, windSpeed: 40, condition: { key: "rain", label: "Дождь" } }),
    /ветер/,
  );
  assert.equal(weatherSummary(null), "Погода неизвестна");
  assert.equal(weatherSummary({ temp: "nope" }), "Погода неизвестна");
});

test("conditionIcon: известные иконки, fallback по key", () => {
  assert.equal(conditionIcon({ key: "rain", icon: "rain" }), "rain");
  assert.equal(conditionIcon({ key: "clear", icon: "moon" }), "moon");
  assert.equal(conditionIcon({ key: "snow", icon: "не-иконка" }), "snow");
  assert.equal(conditionIcon({ key: "thunder" }), "storm");
  assert.equal(conditionIcon({ key: "heavy-rain" }), "rain");
  assert.equal(conditionIcon({ icon: "rgb(1,2,3)" }), "cloud");
  assert.equal(conditionIcon({}), "cloud");
  assert.equal(conditionIcon(null), "cloud");
});

test("geolocate: успех, ошибки кодов, недоступность", async (t) => {
  const calls = [];
  t.after(
    installGlobal("navigator", {
      geolocation: {
        getCurrentPosition(success, error, options) {
          calls.push(options);
          success({ coords: { lat: 52.52, lon: 13.405 } });
        },
      },
    }),
  );

  assert.deepEqual(await geolocate({ timeout: 5000 }), { lat: 52.52, lon: 13.405 });
  assert.equal(calls[0].timeout, 5000);
  assert.equal(calls[0].enableHighAccuracy, false);
  assert.equal(typeof calls[0].maximumAge, "number");
});

test("geolocate: отказ и таймаут геолокации — русские ошибки", async (t) => {
  const cleanupDenied = installGlobal("navigator", {
    geolocation: {
      getCurrentPosition(success, error) {
        error({ code: 1 });
      },
    },
  });
  t.after(cleanupDenied);
  await assert.rejects(geolocate(), /запрещён/);

  const cleanupTimeout = installGlobal("navigator", {
    geolocation: {
      getCurrentPosition(success, error) {
        error({ code: 3 });
      },
    },
  });
  t.after(cleanupTimeout);
  await assert.rejects(geolocate(), /не ответила/);
});

test("geolocate: без navigator.geolocation и при синхронном исключении", async (t) => {
  t.after(installGlobal("navigator", {}));
  await assert.rejects(geolocate(), /Геолокация недоступна/);

  const cleanupThrowing = installGlobal("navigator", {
    geolocation: {
      getCurrentPosition() {
        throw new Error("boom");
      },
    },
  });
  t.after(cleanupThrowing);
  await assert.rejects(geolocate(), /Геолокация недоступна/);
});
