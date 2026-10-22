# «ШКАФ» — контракт модулей v1

Приложение: офлайн-first PWA, чистый ES2022, без сборки и npm-зависимостей.
Корень: `wardrobe/`. Обслуживается статикой (`python3 -m http.server`), открывается на телефоне и ноуте.

## 0. Жёсткие правила

- Никаких внешних библиотек, CDN, шрифтовых зависимостей в JS. Только браузерные API.
- Код должен грузиться как ES-модули (`<script type="module">`), целевые браузеры: Safari 16+, Chrome 110+.
- Никаких `document`/`window`/`localStorage` в `js/data.js`, `js/color.js`, `js/engine.js` — они гоняются в Node-тестах.
  `js/weather.js` и `js/db.js` — браузерные (могут использовать `fetch`, `indexedDB`, `localStorage`), но должны импортироваться в Node без падения на этапе импорта (обращение к браузерным API — только внутри функций).
- Все пользовательские строки — на русском (кроме технических id).
- Не менять файлы вне своего скоупа. Не запускать серверы. Не трогать `index.html`, `styles.css`, `js/ui.js`, `js/app.js`, `sw.js`, `manifest.webmanifest`.
- Проверка: `node --check <файл>`; тесты — `node --test tests/`.
- Никаких сетевых запросов, кроме Open-Meteo (см. §7).
- Деньги/ключи не нужны: всё работает без API-ключей.

## 1. Общие типы данных

### Item (вещь)

```js
{
  id: "it_ab12cd",                 // строка; генерируется db.js при putItem, если нет
  name: "Бордовый свитер",         // готовая подпись (см. itemTitle)
  category: "top",                 // top|bottom|dress|outerwear|shoes|bag|accessory
  subcategory: "sweater",          // id из SUBCATEGORIES[category]
  colorHex: "#6B2233",             // основной цвет, 7 символов
  secondaryHex: "#EFE5D2" | null,  // второй цвет/принт, если есть
  colorName: "бордо",              // из colorName()
  pattern: "solid",                // solid|striped|check|print|knit|denim|leather|other
  warmth: 3,                       // 1 (жарко) … 5 (мороз)
  formality: 2.5,                   // 1 (спорт) … 5 (формально)
  waterproof: false,
  styles: ["casual", "classic"],   // теги из STYLE_TAGS
  photo: "data:image/svg+xml,...", // data URL; для демо — сгенерированный SVG, для фото — сжатый JPEG/WebP
  favorite: false,
  wearCount: 0,
  lastWorn: null | 1730000000000,  // ms timestamp
  createdAt: 1730000000000,
  source: "demo" | "photo",
  notes: ""
}
```

Инварианты: `category` и `subcategory` валидны; `colorHex` — валидный hex; `warmth` и `formality` — числа 1..5; `photo` — непустая строка (допускается `""` только если фото не удалось сжать — UI покажет плейсхолдер).

### Weather (погода)

```js
{
  temp: 13.2, feelsLike: 12.1, humidity: 80,
  precipMm: 0.2, precipProb: 60,        // % на ближайший час
  rain: 0.2, showers: 0, snowfall: 0,
  code: 61, isDay: true,
  condition: { key: "rain", label: "Дождь", icon: "rain" }, // см. §7.1
  windSpeed: 14, windGust: 22,          // км/ч
  cloudCover: 75, uvIndex: 1,
  location: { name: "Берлин", country: "Германия", lat: 52.52, lon: 13.41 },
  updatedAt: 1730000000000,
  source: "open-meteo" | "cache" | "manual",
  hourly: [ { time: "2026-10-22T15:00", temp, feelsLike, precipProb, code,
              condition:{key,label,icon} } ],       // 12 ближайших часов, начиная с текущего
  daily: [ { date: "2026-10-22", code, condition:{key,label,icon},
             tMax, tMin, feelsLikeMax, precipProbMax, windMax } ], // 5 дней, начиная с сегодня
  today: { sunrise: "2026-10-22T07:42", sunset: "2026-10-22T17:58" } | null
}
```

### Place

```js
{ name: "Берлин", country: "Германия", admin1: "Берлин"?, lat: 52.52437, lon: 13.41053, timezone: "Europe/Berlin" }
```

### Settings

```js
{
  place: { name, country, lat, lon } | null,
  weatherMode: "auto" | "manual",
  manual: { temp: 12, precipProb: 0, windSpeed: 3, conditionKey: "cloudy" },
  selectedOccasion: "casual",       // casual|work|evening|sport
  demoLoaded: false,
  onboarded: false,
  hemisphere: "north",              // северное полушарие: месяцы сезонов как в §4
  lookCount: 0
}
```

DEFAULT_SETTINGS экспортирует `js/data.js` (см. §4). `db.getSettings()` мёржит дефолты.

### Outfit (образ) — результат движка

```js
{
  id: "look_xyz",
  items: [Item, ...],               // полные объекты, по порядку слотов
  itemIds: ["it_1", "it_2"],        // == items.map(i => i.id)
  score: 87.4,
  title: "Тихий контраст",          // короткое название образа
  paletteName: "бордо + ивори" | null,
  why: "На улице +9°, ощущается +6°, дождь 60% — ...",   // 1–3 предложения
  chips: [ { type: "weather"|"palette"|"fresh"|"style"|"layer", label: "..." } ],
  weatherSnapshot: { temp, feelsLike, precipProb, windSpeed, conditionLabel },
  occasion: "casual",
  season: "autumn",
  createdAt: 1730000000000
}
```

## 2. `js/data.js` — справочники (владелец: engine-dev)

```js
export const CATEGORIES        // [{ id, label, plural, icon }] — 7 категорий из §1 (icon: строка-ключ)
export const SUBCATEGORIES     // { top: [{ id, label, warmth, formality, styles, icon }], bottom: [...], dress, outerwear, shoes, bag, accessory }
export const STYLE_TAGS        // [{ id: "casual", label: "Кэжуal" }] — 8 тегов: casual, smart, classic, street, sport, romantic, outdoor, evening
export const OCCASIONS         // [{ id: "casual", label: "Повседневный", formality: 2.4, styleHints: [...] , icon }] — casual|work|evening|sport
export const PATTERNS          // [{ id: "solid", label: "Однотонный" }, ...]
export const COLOR_NAMES       // [{ name: "чёрный", hex: "#141414", neutral: true }, ...] — 35–45 оттенков, русские названия
export const SEASONS           // { autumn: SeasonInfo, winter, spring, summer } (см. §4)
export const DEFAULT_SETTINGS  // см. §1 Settings
export const TREND_SOURCES     // [{ label, url, note }] — 3–5 источников по трендам

export function seasonForDate(date = new Date(), hemisphere = "north") -> { key, ...SeasonInfo }
export function itemTitle(item) -> string     // "Бордовый свитер" (цвет + подкатегория, без дублей)
export function demoWardrobe() -> Item[]      // 16–20 демо-вещей, см. §9
```

`SeasonInfo`:

```js
{
  key: "autumn",
  label: "Осень",
  title: "Осень–зима 2026/27",
  months: [9, 10, 11],
  summary: "Главные цвета сезона — бордо, шоколад, ивори, синий ночи и олива...",
  colors: [ { name: "Бордо", hex: "#6B2233", role: "accent"|"base"|"neutral" }, ... ], // 8–10
  combos: [ { a: "#6B2233", b: "#EFE5D2", label: "бордо + ивори", note: "..." }, ... ], // 6–8
  keywords: ["бордо", "шоколад", ...],
  source: { label: "Pantone NYFW A/W 2026/27, Vogue UA, Rinascimento", url: "https://..." } | null
}
```

## 3. `js/color.js` — цвет (владелец: engine-dev)

```js
export function hexToRgb(hex) -> {r,g,b} | null
export function rgbToHex({r,g,b}) -> "#rrggbb"
export function rgbToLab({r,g,b}) -> {L,a,b}
export function hexToLab(hex) -> {L,a,b}
export function deltaE(hexA, hexB) -> number            // CIE76, 0..~100
export function hexToHsl(hex) -> {h,s,l}
export function isNeutral(hex) -> boolean
export function colorName(hex) -> { name, hex, deltaE, neutral }
export function bestTextColor(hex) -> "#ffffff"|"#141414"
export function colorHarmony(hexA, hexB) -> { score: 0..1, kind: "neutral"|"mono"|"analogous"|"complementary"|"contrast"|"clash" }
export function trendAffinity(hex, seasonKey) -> { score: 0..1, name: string|null, hex: string|null, distance: number }
export function nearestTrend(hex, seasonKey) -> { name, hex, distance } | null
export function outfitColorScore(hexes /* string[] */, seasonKey) -> {
  score: 0..1,            // гармония пары + попадание в тренд + монохром-бонус
  paletteName: string|null,   // "бордо + ивори" если пара совпала с combos
  trendHits: [{ name, hex }], // какие цвета образа попали в палитру сезона
  harmonyKinds: string[]
}
export async function paletteFromImage(source, { count = 4 } = {}) -> [{ hex, share }]
// source: HTMLImageElement | HTMLCanvasElement | ImageBitmap | Blob | File.
// В браузере: уменьшить до ~160px, взять пиксели, отбросить прозрачные/почти белый фон,
// кластеризовать (k-means / медианное сечение), вернуть 3–5 цветов по убыванию доли.
// В Node вызывать не будут; на отсутствие canvas не падать (вернуть []).
```

## 4. Сезонные тренды (данные обязательны для AW 26/27)

Дата в приложении — октябрь 2026, актуальный сезон: осень → заголовок «Осень–зима 2026/27».
Основа (взято из публичных источников):

| цвет | hex (использовать) | роль |
|---|---|---|
| бордо / Rouge Noir | `#6B2233` | accent |
| вишнёвый / cherry | `#9E1B32` | accent |
| сливовый / prugna | `#5C2B44` | accent |
| шоколадный / Testa di Moro | `#4A3227` | base |
| ивори / Avorio | `#EFE5D2` | base |
| синий ночи / Blu Notte | `#1C2A45` | base |
| оливковый / Verde Olio | `#5E5F3D` | base |
| горчичный | `#C8A02E` | accent |
| терракотовый | `#B85C38` | accent |
| графитовый | `#3B3B3B` | neutral |

Работающие сочетания (обязательны в `combos`): бордо+ивори; бордо+шоколад; шоколад+синий ночи;
шоколад+олива; олива+бордо; синий ночи+олива; горчичный+шоколад; терракота+ивори; слива+графит.
Для `winter` — та же палитра с заголовком «Зима 2026/27» (можно чуть темнее).
Для `spring` (март–май) — «Весна 2027 (прогноз)»: пудрово-розовый `#E8C9C4`, сливочный `#F3E7C9`,
небесно-голубой `#A9C6DE`, шалфей `#A8B79A`, шоколад `#4A3227`, алый `#C0392B`, лиловый `#B9A7D1`.
Для `summer` — «Лето 2027 (прогноз)»: белый `#F5F2EA`, песочный `#DCC9A6`, оливковый `#6B6B45`,
терракота `#B85C38`, деним `#4A6E96`, лимонный `#E8D25B`, коралловый `#E8756A`.
Прогнозные сезоны помечать в `summary` словом «прогноз» и не выдавать за факт.

Источники (URL для `TREND_SOURCES`):
- https://www.pantone.com/eu/en-de/articles/fashion-color-trend-report/new-york-fashion-week-autumn-winter-2026
- https://vogue.ua/article/fashion/tendencii/slivoviy-chervoniy-i-girchichniy-6-naymodnishih-koloriv-holodnogo-sezonu-65421.html
- https://magazine.rinascimento.com/es-es/blog/paleta-de-colores-rinascimento-otono-invierno
- https://www.vogue.fr/article/combos-couleurs-automne-hiver-2026-2027

## 5. `js/engine.js` — сборка образов (владелец: engine-dev)

```js
export function requirementsFor(weather) -> {
  targetWarmth,            // 1..5 (дробное)
  warmthRange: [lo, hi],   // допустимая теплота слоёв
  layers: 1|2|3,
  needsOuterwear: boolean,
  outerwearOptional: boolean,
  rain: boolean, snow: boolean, wind: boolean,
  footwear: "open"|"closed"|"boots",
  notes: string[],         // 1–3 фразы по-русски ("На улице +9°, ощущается +6°")
  summary: string          // "прохладно, дождь"
}

export function generateOutfits({
  items, weather, occasion = "casual", season = "autumn",
  count = 6, seed = 1, recentLookHashes = [], blockedHashes = []
}) -> {
  outfits: Outfit[],
  warnings: string[],      // "В шкафу нет обуви — добавьте пару"
  stats: { candidates: number, byCategory: { top: 4, ... } }
}

export function outfitHash(itemIds) -> string   // стабильный, не зависит от порядка? — ЗАВИСИТ от порядка не должен: сортировать id
export function itemWarmthRange(item) -> { min: number, max: number }  // рекомендуемая t° для вещи, для UI/подписей
export function explainOutfit(outfit, weather, seasonKey) -> string     // если движок не заполнил why
export function trendNoteFor(seasonKey) -> string                       // короткая фраза про палитру сезона
```

Требования к алгоритму (проверяются тестами):
1. Слоты: `[top, bottom, shoes]` ИЛИ `[dress, shoes]`; опционально `outerwear` (обязательно при `needsOuterwear`, при `outerwearOptional` — с бонусом), 1 аксессуар/сумка максимум.
2. Погодные правила: при `rain` — приоритет `waterproof: true` обуви и верхней одежды, никаких открытых сандалий;
   при `feelsLike < 3` — без шорт/сандалий; при `feelsLike > 24` — без пуховиков/сапог, обувь `open` при наличии.
3. Формальность: для `work`/`evening` тяготение к formality 3.5–4.5, для `sport` — 1–2; штраф за разброс формальности внутри образа.
4. Цвет: `outfitColorScore` цвета образа + бонус за combo сезона; в `paletteName` попадает название сочетания, в `chips` — палитра.
5. Новизна: штраф за `lastWorn` (экспонента по дням, свежее = сильнее штраф), за большой `wearCount`,
   за совпадение `outfitHash` с `recentLookHashes`; бонус вещам, которые давно/никогда не носили.
6. Диверсификация: `outfits` — без дублей наборов (по `outfitHash`), взаимно разные по вещам и цвету.
7. Детерминизм: при одинаковых аргументах и `seed` результат идентичен; при `seed+1` — другой.
8. `why` — 1–3 осмысленных предложения по-русски: погода (t°, дождь/ветер), палитра/тренд, новизна/что давно не носили.
   `title` — 2–4 слова, не повторяется у разных образов в выдаче.
9. Вещи не выдумывать, не мутировать вход (`structuredClone`).

## 6. `js/db.js` — хранилище (владелец: platform-dev)

IndexedDB (база `shkaf`, version 1), fallback на `localStorage` при недоступности IDB.
Хранилища: `items` (keyPath id), `looks`, `history`, `settings` (одна запись id="app").

```js
export const db = {
  async init(),
  async getItems(),                         // createdAt desc
  async putItem(item),                      // id, createdAt, name, colorName при отсутствии
  async deleteItem(id),
  async deleteItems(ids),
  async getLooks(),                         // createdAt desc
  async putLook(look),
  async deleteLook(id),
  async markWorn(itemIds, lookId, dateISO), // +1 wearCount, lastWorn=date; запись в history
  async getHistory(),                       // [{ id, date, itemIds, lookId }] desc
  async getSettings(),
  async saveSettings(patch),
  async exportAll(),                        // { version: 1, exportedAt, items, looks, history, settings }
  async importAll(data, { merge = true } = {}),
  async clearAll({ keepDemo = false } = {}),
  storageMode                               // "indexeddb" | "localstorage"
}
```

Требования: объём фото не ломает запись (IndexedDB blob/dataURL до ~500 КБ на вещь — ок);
`markWorn` без дублей за один день; `exportAll`/`importAll` — JSON-совместимые объекты,
импорт валидирует поля и не падает на мусоре; `clearAll` чистит всё, `keepDemo` — оставить вещи source="demo".
Ошибки — `Error` с русским сообщением. Все методы идемпотентны/безопасны при повторном вызове.

## 7. `js/weather.js` — погода (владелец: platform-dev)

### 7.1 Коды и иконки

`WEATHER_CODES`: WMO code → `{ key, label, icon }`. Ключи `key`:
`clear, partly, cloudy, overcast, fog, drizzle, rain, heavy-rain, snow, sleet, thunder`.
`icon` — один из: `sun, moon, cloud-sun, cloud, fog, drizzle, rain, snow, storm`.
Точные соответствия WMO:
0 → clear/sun (ночью moon); 1 → partly; 2 → cloudy; 3 → overcast; 45,48 → fog;
51,53,55 → drizzle; 56,57 → drizzle; 61,63,66 → rain; 65,67 → heavy-rain;
71,73,75,77 → snow; 80,81 → rain; 82 → heavy-rain; 85,86 → snow;
95,96,99 → thunder.
`describeWeather(code, isDay = true) -> { key, label, icon }`.

### 7.2 API

```js
export async function searchPlaces(query, { limit = 6, lang = "ru", signal } = {}) -> Place[]
export async function fetchWeather(place, { signal, force = false } = {}) -> Weather
export function manualWeather(manual, place = null) -> Weather
export function weatherSummary(weather) -> string   // "прохладно, дождь" / "+13°, облачно"
export async function geolocate({ timeout = 8000 } = {}) -> { lat, lon }   // navigator.geolocation, Promise
export function conditionIcon(condition) -> string  // из key/icon, для UI
```

- Прогноз: Open-Meteo `https://api.open-meteo.com/v1/forecast` с `timezone=auto`, 6 дней,
  current: temperature_2m, relative_humidity_2m, apparent_temperature, is_day, precipitation,
  rain, showers, snowfall, weather_code, cloud_cover, wind_speed_10m, wind_gusts_10m, uv_index;
  hourly: temperature_2m, apparent_temperature, precipitation_probability, weather_code, wind_speed_10m;
  daily: weather_code, temperature_2m_max, temperature_2m_min, apparent_temperature_max,
  precipitation_probability_max, wind_speed_10m_max, sunrise, sunset.
- Геокодинг: `https://geocoding-api.open-meteo.com/v1/search?name=...&count=6&language=ru&format=json`.
- Кэш в `localStorage`: ключ по округлённым координатам, TTL 15 минут, при недоступности сети — отдать кэш
  (source "cache"), иначе бросить `Error("Не удалось получить погоду…")`.
- `precipProb` в Weather — из ближайшего по времени hourly-значения (current его не содержит).
- Ошибки сети/таймауты — понятный русский текст, не вешать UI.
- `manualWeather`: code выбирается из conditionKey (clear→0, partly→2, cloudy→3, overcast→3,
  fog→45, drizzle→51, rain→61, snow→71, thunder→95); `feelsLike` считать по ветру/влажности
  (формула допустима упрощённая), hourly/daily — пустые массивы, today: null.

## 8. Прочее

- `js/ui.js`, `js/app.js`, `index.html`, `styles.css`, `sw.js`, `manifest.webmanifest`, иконки — Lead.
- UI вызывает только функции из §2–§7; никаких прямых сетевых вызовов из UI.
- Тесты: `tests/engine.test.mjs` (engine-dev), `tests/data.test.mjs` (engine-dev),
  `tests/weather.test.mjs` (platform-dev). Node 26, `node --test`.
  Для weather-тестов допускается мок `globalThis.fetch` и `globalThis.localStorage` (сам модуль не должен
  обращаться к ним на этапе импорта).

## 9. Демо-шкаф (обязательно, чтобы приложение работало сразу)

`demoWardrobe()` — 16–20 вещей, равномерно покрывающих категории, в палитре осени–зимы 2026/27:
- верх: ивори-свитер, шоколадная водолазка, синяя рубашка, чёрная футболка, бордовый кардиган;
- низ: шоколадные брюки, синие джинсы, оливковая юбка миди, чёрные брюки, графитовые джинсы;
- платье: бордовое платье миди, сливовое платье;
- верхняя одежда: шоколадное пальто, оливковая куртка, чёрный пуховик;
- обувь: белые кроссовки, шоколадные ботинки, чёрные сапоги, ивори-лоферы;
- сумка: шоколадный тоут; аксессуар: горчичный шарф, бордовая шапка.

Фото — сгенерированные SVG data URL (плоские силуэты одежды нужного цвета, 600×750, мягкая подложка).
У 4–5 вещей `wearCount` > 0 и `lastWorn` недавний, у остальных — 0/null: это демонстрирует «надо носить забытое».
Иконки силуэтов: `tshirt, longsleeve, shirt, blouse, sweater, cardigan, hoodie, top, jeans, trousers,
chinos, shorts, skirt, leggings, sportpants, dress, sundress, jumpsuit, coat, trench, jacket, puffer,
bomber, blazer, sneakers, boots, heels, loafers, sandals, tote, shoulder, backpack, clutch, scarf, hat,
cap, belt, gloves, sunglasses, jewelry` (если для подкатегории нет отдельной — использовать ближайшую).
