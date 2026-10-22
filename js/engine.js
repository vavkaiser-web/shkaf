// js/engine.js — сборка образов «ШКАФ»: требования по погоде, подбор слотов,
// формальность, цвет и тренд, новизна, диверсификация и детерминизм по seed.
// Чистый ES2022 без DOM: модуль импортируется в Node-тестах.

import { SEASONS, OCCASIONS, itemTitle } from "./data.js";
import { outfitColorScore } from "./color.js";

const DAY_MS = 86400000;
const SEASON_ACCUSATIVE = { autumn: "осень", winter: "зиму", spring: "весну", summer: "лето" };
const VALID_CATEGORIES = new Set([
  "top",
  "bottom",
  "dress",
  "outerwear",
  "shoes",
  "bag",
  "accessory"
]);
const OPEN_SHOE_IDS = new Set(["sandals"]);
const BOOT_IDS = new Set(["boots", "highboots"]);
const PATTERN_WITH_SECOND = new Set(["striped", "check", "print", "other"]);

const TITLE_POOL = [
  "Тихий контраст",
  "Осенний слоёный",
  "Шоколадный вечер",
  "Мягкая классика",
  "Городской дождь",
  "Бордовый акцент",
  "Оливковое утро",
  "Тёплый нейтрал",
  "Сдержанный день",
  "Уютный слой",
  "Строгий силуэт",
  "Спокойная база",
  "Ночной синий",
  "Горчичный штрих",
  "Плотный трикотаж",
  "Тихий деним",
  "Сливовый вечер",
  "Ивори и шоколад",
  "Тёплый вечер",
  "Быстрый сбор",
  "Деловой минимум",
  "Спортивный ритм",
  "Выходной в городе",
  "Слои и воздух",
  "Тихая роскошь",
  "Дождливый ноябрь",
  "Осенний силуэт",
  "Холодный день",
  "Лёгкий день",
  "Цельный силуэт"
];

/* ------------------------------ утилиты ------------------------------ */

function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function clamp01(value) {
  return clamp(value, 0, 1);
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

function average(list) {
  if (!list.length) return 0;
  return list.reduce((sum, value) => sum + value, 0) / list.length;
}

function capitalize(text) {
  const s = String(text || "");
  return s ? s[0].toUpperCase() + s.slice(1) : "";
}

function lowerFirst(text) {
  const s = String(text || "");
  return s ? s[0].toLowerCase() + s.slice(1) : "";
}

function quoteName(name) {
  return `«${lowerFirst(name)}»`;
}

function pluralRu(count, one, few, many) {
  const abs = Math.abs(count) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last > 1 && last < 5) return few;
  if (last === 1) return one;
  return many;
}

function fmtTemp(value) {
  const n = Math.round(num(value, 0));
  if (n > 0) return `+${n}`;
  if (n < 0) return `-${Math.abs(n)}`;
  return "0";
}

function safeClone(value) {
  try {
    return structuredClone(value);
  } catch {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return Array.isArray(value) ? value.slice() : value;
    }
  }
}

function seedToInt(seed) {
  if (typeof seed === "number" && Number.isFinite(seed)) {
    return Math.floor(Math.abs(seed)) % 2147483647 || 1;
  }
  const text = String(seed == null ? 1 : seed);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash || 1;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* --------------------------- погодные требования --------------------------- */

export function requirementsFor(weather = {}) {
  const w = weather && typeof weather === "object" ? weather : {};
  const temp = num(w.temp, num(w.feelsLike, 16));
  const feelsLike = num(w.feelsLike, temp);
  const precipProb = num(w.precipProb, 0);
  const snowfall = num(w.snowfall, 0);
  const rainAmount =
    num(w.rain, 0) + num(w.showers, 0) + Math.max(0, num(w.precipMm, 0) - snowfall) * 0.5;
  const conditionKey = String((w.condition && w.condition.key) || "").toLowerCase();
  const code = num(w.code, NaN);
  const windSpeed = num(w.windSpeed, 0);
  const windGust = num(w.windGust, 0);

  const snowCodes = [71, 73, 75, 77, 85, 86];
  const rainCodes = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99];

  const snow = conditionKey === "snow" || conditionKey === "sleet" || snowfall > 0 || snowCodes.includes(code);
  const rain = snow
    ? conditionKey === "sleet"
    : conditionKey === "drizzle" ||
      conditionKey === "rain" ||
      conditionKey === "heavy-rain" ||
      conditionKey === "thunder" ||
      rainAmount >= 0.05 ||
      rainCodes.includes(code) ||
      precipProb >= 60;

  const wind = windSpeed >= 25 || windGust >= 35;

  let targetWarmth = 1 + (30 - feelsLike) / 10;
  if (rain || snow) targetWarmth += 0.15;
  if (wind) targetWarmth += 0.15;
  targetWarmth = round1(clamp(targetWarmth, 1, 5));

  const warmthRange = [round1(clamp(targetWarmth - 0.7, 1, 5)), round1(clamp(targetWarmth + 1, 1, 5))];
  const layers = targetWarmth < 2.4 ? 1 : targetWarmth < 4.0 ? 2 : 3;
  const needsOuterwear = targetWarmth >= 3.6 || (snow && targetWarmth >= 3.2);
  const outerwearOptional = !needsOuterwear && (targetWarmth >= 2.7 || rain || wind);

  let footwear = "closed";
  if (snow || feelsLike < 1.5 || targetWarmth >= 4.1) footwear = "boots";
  else if (feelsLike >= 24 && !rain) footwear = "open";

  const notes = [];
  let firstNote = `На улице ${fmtTemp(temp)}°`;
  if (Math.round(temp) !== Math.round(feelsLike)) firstNote += `, ощущается ${fmtTemp(feelsLike)}°`;
  notes.push(firstNote);
  if (snow) {
    notes.push(
      snowfall > 0
        ? "Идёт снег — нужна обувь повыше и непромокаемая, шапка не помешает."
        : "Вероятен снег — закрытая непромокаемая обувь и тёплый слой сверху."
    );
  } else if (rain) {
    notes.push(
      precipProb > 0
        ? `Дождь с вероятностью ${Math.round(precipProb)}% — нужна непромокаемая обувь и слой сверху.`
        : "Дождь — нужна непромокаемая обувь и слой сверху."
    );
  } else if (feelsLike > 24) {
    notes.push("Жарко — лёгкие ткани и открытая обувь, если она есть.");
  } else if (feelsLike < 3) {
    notes.push("Холодно — без шорт и сандалий, добавляем тёплый слой.");
  }
  if (wind) {
    notes.push(`Ветер до ${Math.round(Math.max(windSpeed, windGust))} км/ч — лучше закрытая одежда.`);
  }

  const tempWord =
    feelsLike >= 26
      ? "жарко"
      : feelsLike >= 18
        ? "тепло"
        : feelsLike >= 9
          ? "прохладно"
          : feelsLike >= 2
            ? "холодно"
            : feelsLike >= -7
              ? "морозно"
              : "сильный мороз";
  const weatherWord = snow
    ? "снег"
    : rain
      ? "дождь"
      : wind
        ? "ветер"
        : conditionKey === "clear"
          ? "ясно"
          : conditionKey === "fog"
            ? "туман"
            : conditionKey === "overcast"
              ? "пасмурно"
              : conditionKey === "partly"
                ? "переменная облачность"
                : "облачно";

  return {
    targetWarmth,
    warmthRange,
    layers,
    needsOuterwear,
    outerwearOptional,
    rain,
    snow,
    wind,
    footwear,
    notes: notes.slice(0, 3),
    summary: `${tempWord}, ${weatherWord}`
  };
}

/* --------------------------- хэш и диапазоны --------------------------- */

export function outfitHash(itemIds = []) {
  const ids = [...new Set((Array.isArray(itemIds) ? itemIds : []).map((id) => String(id)))].sort();
  const key = ids.join("|");
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `h${hash.toString(36).padStart(7, "0")}`;
}

const WARMTH_TEMPS = {
  1: [22, 40],
  2: [15, 28],
  3: [6, 20],
  4: [-3, 12],
  5: [-25, 4]
};

export function itemWarmthRange(item = {}) {
  const warmth = clamp(num(item && item.warmth, 3), 1, 5);
  const low = Math.floor(warmth);
  const high = Math.ceil(warmth);
  const a = WARMTH_TEMPS[low];
  const b = WARMTH_TEMPS[high];
  const t = warmth - low;
  return {
    min: Math.round(a[0] + (b[0] - a[0]) * t),
    max: Math.round(a[1] + (b[1] - a[1]) * t)
  };
}

/* ------------------------------ пояснения ------------------------------ */

export function trendNoteFor(seasonKey = "autumn") {
  const season = SEASONS[seasonKey] || SEASONS.autumn;
  const names = (season.colors || []).slice(0, 3).map((color) => String(color.name).toLowerCase());
  const list =
    names.length > 2
      ? `${names.slice(0, -1).join(", ")} и ${names[names.length - 1]}`
      : names.join(" и ");
  if (String(season.summary || "").toLowerCase().includes("прогноз")) {
    const seasonName = SEASON_ACCUSATIVE[season.key] || String(season.label).toLowerCase();
    return `Прогноз на ${seasonName} — ${list}; это ориентир, а не гарантия.`;
  }
  return `Палитра ${season.title}: ${list}. Эти оттенки хорошо сочетаются между собой.`;
}

export function explainOutfit(outfit = {}, weather = null, seasonKey = "autumn") {
  if (outfit && typeof outfit.why === "string" && outfit.why.trim()) return outfit.why;
  const req = requirementsFor(weather);
  const items = Array.isArray(outfit && outfit.items) ? outfit.items : [];
  const names = items
    .map((item) => (item && item.name ? lowerFirst(item.name) : item ? itemTitle(item).toLowerCase() : ""))
    .filter(Boolean);
  const weatherText = (req.notes.length ? req.notes.slice(0, 2) : ["Погода подсказала этот образ"]).join(". ");
  const parts = [weatherText.endsWith(".") ? weatherText : `${weatherText}.`, trendNoteFor(seasonKey)];
  if (names.length) parts.push(`Собираем: ${names.join(", ")}.`);
  return parts.join(" ");
}

/* ------------------------------ движок ------------------------------ */

function isUsableItem(item) {
  return Boolean(item) && typeof item === "object" && VALID_CATEGORIES.has(item.category);
}

function isOpenShoe(item) {
  return Boolean(item) && OPEN_SHOE_IDS.has(String(item.subcategory || ""));
}

function isBoot(item) {
  return Boolean(item) && BOOT_IDS.has(String(item.subcategory || ""));
}

function colorHexes(items) {
  const out = [];
  for (const item of items) {
    if (!item || typeof item.colorHex !== "string") continue;
    out.push(item.colorHex);
    if (item.secondaryHex && PATTERN_WITH_SECOND.has(String(item.pattern || "solid"))) {
      out.push(item.secondaryHex);
    }
  }
  return out;
}

function noveltyScore(items, now) {
  let sum = 0;
  for (const item of items) {
    const lastWorn = Number(item.lastWorn) || 0;
    const wearCount = Number(item.wearCount) || 0;
    if (lastWorn <= 0) {
      sum += 1;
    } else {
      const days = Math.max(0, (now - lastWorn) / DAY_MS);
      sum += clamp01(days / 60) * clamp01(1 - wearCount / 12) * 0.9 + 0.05;
    }
  }
  return clamp01(sum / Math.max(1, items.length));
}

function forgottenItems(items, now) {
  const list = [];
  for (const item of items) {
    const lastWorn = Number(item.lastWorn) || 0;
    const days = lastWorn > 0 ? Math.max(0, (now - lastWorn) / DAY_MS) : Infinity;
    if (days === Infinity || days >= 7) list.push({ item, days });
  }
  list.sort((a, b) => {
    const da = a.days === Infinity ? Number.MAX_SAFE_INTEGER : a.days;
    const db = b.days === Infinity ? Number.MAX_SAFE_INTEGER : b.days;
    if (db !== da) return db - da;
    return String(a.item.id).localeCompare(String(b.item.id));
  });
  return list;
}

// salt (обычно из outfitHash) двигает «забытую вещь», чтобы в выдаче не
// повторялся один и тот же чип про никогда не надетую куртку.
function freshnessInfo(items, now, salt = 0) {
  const list = forgottenItems(items, now);
  if (!list.length) return null;
  const index = Math.abs(Math.trunc(salt)) % list.length;
  return list[index];
}

function hashSalt(hash) {
  let value = 0;
  for (const char of String(hash)) value = (value * 33 + char.charCodeAt(0)) % 1000003;
  return value;
}

function outfitItems(parts) {
  const items = [];
  if (parts.outerwear) items.push(parts.outerwear);
  items.push(...parts.core);
  if (parts.shoes) items.push(parts.shoes);
  if (parts.extra) items.push(parts.extra);
  return items;
}

function scoreParts(parts, req, occasionInfo, colorRes, now) {
  const items = outfitItems(parts);
  const core = parts.core;
  const coreWarmth = average(core.map((item) => num(item.warmth, 3)));
  const outerWarmth = parts.outerwear ? num(parts.outerwear.warmth, 3) : null;
  const effectiveWarmth =
    outerWarmth == null ? coreWarmth : coreWarmth + (outerWarmth - coreWarmth) * 0.5;
  const warmthFit = clamp01(1 - Math.abs(effectiveWarmth - req.targetWarmth) / 3);

  const coreFormality = core.map((item) => num(item.formality, 2.5));
  const formalityAvg = average(coreFormality);
  const formalitySpread = Math.max(...coreFormality) - Math.min(...coreFormality);
  const formalityFit = clamp01(
    1 - Math.abs(formalityAvg - occasionInfo.formality) / 2.2 - formalitySpread * 0.08
  );

  let weatherFit = 0.5;
  if (req.rain) {
    if (parts.shoes && parts.shoes.waterproof) weatherFit += 0.22;
    if (parts.outerwear && parts.outerwear.waterproof) weatherFit += 0.14;
    if (parts.shoes && !parts.shoes.waterproof) weatherFit -= 0.12;
  }
  if (req.snow) {
    if (parts.shoes && num(parts.shoes.warmth) >= 4) weatherFit += 0.18;
    if (parts.outerwear && num(parts.outerwear.warmth) >= 3.6) weatherFit += 0.1;
    if (parts.outerwear && num(parts.outerwear.warmth) < 3.2) weatherFit -= 0.15;
  }
  if (req.needsOuterwear) {
    if (parts.outerwear && num(parts.outerwear.warmth, 0) >= req.targetWarmth - 1) weatherFit += 0.2;
  }
  if (req.footwear === "open") {
    if (isOpenShoe(parts.shoes)) weatherFit += 0.12;
    else if (parts.shoes && num(parts.shoes.warmth) >= 3.5) weatherFit -= 0.18;
  }
  if (req.footwear === "boots") {
    if (isBoot(parts.shoes)) weatherFit += 0.15;
    else if (isOpenShoe(parts.shoes)) weatherFit -= 0.3;
  }
  if (req.footwear === "closed" && parts.shoes && !isOpenShoe(parts.shoes)) weatherFit += 0.06;
  if (req.wind && parts.outerwear) weatherFit += 0.06;
  weatherFit = clamp01(weatherFit);

  const hints = Array.isArray(occasionInfo.styleHints) ? occasionInfo.styleHints : [];
  let styleHits = 0;
  let styleTotal = 0;
  for (const item of items) {
    const styles = Array.isArray(item.styles) ? item.styles : [];
    styleTotal += Math.max(1, Math.min(2, styles.length));
    for (const hint of hints) {
      if (styles.includes(hint)) styleHits += 1;
    }
  }
  const styleFit = styleTotal ? clamp01(styleHits / (styleTotal * 0.7)) : 0.4;

  const novelty = noveltyScore(items, now);
  const optionalBonus = req.outerwearOptional ? (parts.outerwear ? 1 : 0) : 0.5;
  const favoriteBonus = items.some((item) => item.favorite) ? 1 : 0;

  const raw =
    warmthFit * 24 +
    formalityFit * 20 +
    colorRes.score * 24 +
    weatherFit * 12 +
    novelty * 14 +
    styleFit * 6 +
    optionalBonus * 2 +
    favoriteBonus * 0.6;

  return clamp(raw, 5, 100);
}

function buildWeatherChip(req, feelsLike, precipProb, windSpeed, fallbackLabel) {
  const temp = `${fmtTemp(feelsLike)}°`;
  if (req.snow) return `Снег, ${temp}`;
  if (req.rain) return precipProb >= 5 ? `Дождь ${Math.round(precipProb)}%, ${temp}` : `Дождь, ${temp}`;
  if (req.wind) return `Ветер ${Math.round(windSpeed)} км/ч, ${temp}`;
  return `${fallbackLabel}, ${temp}`;
}

function buildWhy({ parts, req, temp, feelsLike, precipProb, colorRes, now, salt }) {
  const weatherBits = [`На улице ${fmtTemp(temp)}°`];
  if (Math.round(temp) !== Math.round(feelsLike)) {
    weatherBits.push(`ощущается как ${fmtTemp(feelsLike)}°`);
  }
  if (req.snow) weatherBits.push("идёт снег");
  else if (req.rain) {
    weatherBits.push(precipProb >= 5 ? `дождь с вероятностью ${Math.round(precipProb)}%` : "дождь");
  } else if (req.wind) weatherBits.push("ветрено");

  const layerBits = [];
  if (parts.outerwear) {
    const outer = parts.outerwear;
    let bit = `сверху ${quoteName(outer.name)}`;
    if (req.rain && outer.waterproof) bit += ", под дождём не промокнете";
    else if (req.snow && num(outer.warmth) >= 4) bit += ", в мороз тепло";
    layerBits.push(bit);
  }
  if (req.rain && parts.shoes) {
    layerBits.push(
      parts.shoes.waterproof
        ? `на ногах ${quoteName(parts.shoes.name)}, лужи не страшны`
        : `на ногах ${quoteName(parts.shoes.name)}, но от луж они не спасут`
    );
  } else if (req.snow && parts.shoes && num(parts.shoes.warmth) >= 4) {
    layerBits.push(`на ногах ${quoteName(parts.shoes.name)}, ноги не замёрзнут`);
  } else if (req.footwear === "open" && parts.shoes && isOpenShoe(parts.shoes)) {
    layerBits.push(`на ногах открытые ${quoteName(parts.shoes.name)}`);
  }

  let weatherSentence = weatherBits.join(", ");
  if (layerBits.length) weatherSentence += ` — ${layerBits.join(", ")}`;
  weatherSentence += ".";
  const sentences = [capitalize(weatherSentence)];

  const trendNames = (colorRes.trendHits || []).slice(0, 2).map((hit) => String(hit.name).toLowerCase());
  if (colorRes.paletteName) {
    sentences.push(`Сочетание «${colorRes.paletteName}» — из сезонной палитры.`);
  } else if (trendNames.length >= 2) {
    sentences.push(`Цвета образа близки к палитре сезона: ${trendNames.join(" и ")}.`);
  } else {
    sentences.push("Спокойные цвета — образ не спорит с погодой.");
  }

  const fresh = freshnessInfo(outfitItems(parts), now, salt);
  if (fresh && fresh.item) {
    if (fresh.days === Infinity) {
      sentences.push(`${quoteName(fresh.item.name)} вы ещё ни разу не надевали — отличный повод.`);
    } else if (fresh.days >= 10) {
      sentences.push(
        `${quoteName(fresh.item.name)} не носили уже ${Math.round(fresh.days)} ${pluralRu(Math.round(fresh.days), "день", "дня", "дней")} — пора вернуть в оборот.`
      );
    }
  }
  return sentences.slice(0, 3).join(" ");
}

function buildChips({ parts, req, feelsLike, precipProb, windSpeed, conditionLabel, colorRes, occasionInfo, now, salt }) {
  const chips = [];
  chips.push({ type: "weather", label: buildWeatherChip(req, feelsLike, precipProb, windSpeed, conditionLabel) });
  if (colorRes.paletteName) chips.push({ type: "palette", label: colorRes.paletteName });
  else if (colorRes.trendHits && colorRes.trendHits.length) {
    chips.push({ type: "palette", label: String(colorRes.trendHits[0].name).toLowerCase() });
  }
  const fresh = freshnessInfo(outfitItems(parts), now, salt);
  if (fresh && fresh.item) {
    if (fresh.days === Infinity) {
      chips.push({ type: "fresh", label: `«${fresh.item.name}» — ни разу не надевали` });
    } else {
      chips.push({
        type: "fresh",
        label: `«${fresh.item.name}» не носили ${Math.round(fresh.days)} ${pluralRu(Math.round(fresh.days), "день", "дня", "дней")}`
      });
    }
  }
  chips.push({ type: "style", label: occasionInfo.label });
  const layerCount = 1 + (parts.outerwear ? 1 : 0);
  chips.push({
    type: "layer",
    label: `${layerCount} ${pluralRu(layerCount, "слой", "слоя", "слоёв")}`
  });
  return chips.slice(0, 5);
}

function comboTitle(label) {
  return String(label)
    .split(" + ")
    .map((word, index) => (index === 0 ? capitalize(word) : word))
    .join(" и ");
}

function pickTitle({ parts, req, feelsLike, colorRes, seasonInfo }, rng, usedTitles) {
  const options = [];
  if (colorRes.paletteName) options.push(comboTitle(colorRes.paletteName));
  if (req.rain) options.push("Городской дождь", "Дождливый день");
  else if (req.snow) options.push("Снежный контраст", "Холодный день");
  else if (feelsLike >= 24) options.push("Лёгкий день", "Солнечный ритм");
  else if (feelsLike <= 2) options.push("Тёплый слой", "Морозный день");
  if (parts.outerwear && parts.outerwear.waterproof && req.rain) options.push("Слои и дождь");
  if (parts.outerwear) options.push("Слои и воздух", "Уютный слой");
  if (parts.core.length === 1) options.push("Цельный силуэт", "Платье и характер");
  if (Array.isArray(seasonInfo.keywords) && seasonInfo.keywords.length) {
    options.push(`${capitalize(seasonInfo.keywords[0])} и ${seasonInfo.keywords[1] || "база"}`);
  }

  const isUsed = (title) => usedTitles.has(title.toLowerCase());
  for (const option of options) {
    if (option && !isUsed(option)) return option;
  }
  const offset = Math.floor(rng() * TITLE_POOL.length);
  for (let i = 0; i < TITLE_POOL.length; i += 1) {
    const candidate = TITLE_POOL[(offset + i) % TITLE_POOL.length];
    if (!isUsed(candidate)) return candidate;
  }
  const base = TITLE_POOL[Math.floor(rng() * TITLE_POOL.length)];
  return `${base} ${usedTitles.size + 1}`;
}

function buildOutfit({ candidate, req, temp, feelsLike, precipProb, windSpeed, conditionLabel, occasionInfo, seasonKey, seasonInfo, now, createdAt, rng, usedTitles }) {
  const parts = candidate.parts;
  const items = outfitItems(parts);
  const salt = hashSalt(candidate.hash);
  const title = pickTitle(
    { parts, req, feelsLike, colorRes: candidate.colorRes, seasonInfo },
    rng,
    usedTitles
  );
  usedTitles.add(title.toLowerCase());

  const outfit = {
    id: `look_${candidate.hash.slice(1)}`,
    items,
    itemIds: items.map((item) => item.id),
    score: round1(candidate.baseScore),
    title,
    paletteName: candidate.colorRes.paletteName || null,
    why: buildWhy({ parts, req, temp, feelsLike, precipProb, colorRes: candidate.colorRes, now, salt }),
    chips: buildChips({
      parts,
      req,
      feelsLike,
      precipProb,
      windSpeed,
      conditionLabel,
      colorRes: candidate.colorRes,
      occasionInfo,
      now,
      salt
    }),
    weatherSnapshot: {
      temp,
      feelsLike,
      precipProb,
      windSpeed,
      conditionLabel
    },
    occasion: occasionInfo.id,
    season: seasonKey,
    createdAt
  };
  return outfit;
}

function conditionLabelFor(weather, req) {
  const fromWeather = weather && weather.condition && weather.condition.label;
  if (fromWeather) return fromWeather;
  if (req.snow) return "Снег";
  if (req.rain) return "Дождь";
  if (req.wind) return "Ветер";
  const code = num(weather && weather.code, -1);
  if (code === 0) return "Ясно";
  if (code === 1 || code === 2) return "Переменная облачность";
  if (code === 3) return "Облачно";
  return "Облачно";
}

export function generateOutfits({
  items = [],
  weather = null,
  occasion = "casual",
  season = "autumn",
  count = 6,
  seed = 1,
  recentLookHashes = [],
  blockedHashes = []
} = {}) {
  const createdAt = Date.now();
  // Для оценок округляем время до часа: выдача не «дрожит» между двумя
  // вызовами подряд, а createdAt остаётся точным.
  const now = Math.floor(createdAt / 3600000) * 3600000;
  const wanted = Math.max(1, Math.min(24, Math.round(num(count, 6)) || 6));
  const requestedSeason = typeof season === "string" ? season : (season && season.key) || "autumn";
  const seasonKey = SEASONS[requestedSeason] ? requestedSeason : "autumn";
  const seasonInfo = SEASONS[seasonKey];
  const occasionInfo = OCCASIONS.find((entry) => entry.id === occasion) || OCCASIONS[0];
  const req = requirementsFor(weather);
  const temp = num(weather && weather.temp, num(weather && weather.feelsLike, 16));
  const feelsLike = num(weather && weather.feelsLike, temp);
  const precipProb = num(weather && weather.precipProb, 0);
  const windSpeed = num(weather && weather.windSpeed, 0);
  const conditionLabel = conditionLabelFor(weather, req);
  const rng = mulberry32(seedToInt(seed));

  const warnings = [];
  const recentHashes = new Set((Array.isArray(recentLookHashes) ? recentLookHashes : []).map(String));
  const blockedHashesSet = new Set((Array.isArray(blockedHashes) ? blockedHashes : []).map(String));

  const cloned = safeClone(Array.isArray(items) ? items : []);
  const usable = cloned.filter(isUsableItem);
  usable.forEach((item, index) => {
    if (typeof item.id !== "string" || !item.id) item.id = `it_auto_${index}`;
  });

  const byCategory = {
    top: [],
    bottom: [],
    dress: [],
    outerwear: [],
    shoes: [],
    bag: [],
    accessory: []
  };
  for (const item of usable) byCategory[item.category].push(item);

  if (byCategory.shoes.length === 0) {
    warnings.push("В шкафу нет обуви — добавьте пару, и образы станут завершёнными.");
  }
  if (byCategory.top.length === 0 && byCategory.dress.length === 0) {
    warnings.push("Нет ни верха, ни платья — образ пока не из чего собрать.");
  }
  if (byCategory.top.length > 0 && byCategory.bottom.length === 0) {
    warnings.push("Нет низа — добавьте брюки, джинсы или юбку.");
  }
  if (req.needsOuterwear && byCategory.outerwear.length === 0) {
    warnings.push("На такую погоду нужна верхняя одежда — добавьте пальто или куртку.");
  }
  if (byCategory.bag.length === 0 && byCategory.accessory.length === 0) {
    warnings.push("Нет сумок и аксессуаров — образы получатся лаконичнее, но это не страшно.");
  }

  const emptyStats = (counts) => ({
    candidates: 0,
    byCategory: Object.fromEntries(Object.entries(counts).map(([key, value]) => [key, value.length]))
  });

  if (usable.length === 0) {
    return {
      outfits: [],
      warnings: ["В шкафу пока пусто — добавьте вещи, и я соберу образы."],
      stats: emptyStats(byCategory)
    };
  }
  if (byCategory.shoes.length === 0) {
    return { outfits: [], warnings, stats: emptyStats(byCategory) };
  }
  if (byCategory.top.length === 0 && byCategory.dress.length === 0) {
    return { outfits: [], warnings, stats: emptyStats(byCategory) };
  }
  if (byCategory.top.length > 0 && byCategory.bottom.length === 0 && byCategory.dress.length === 0) {
    warnings.push("Нет низа или платья — верх не с чем сочетать.");
    return { outfits: [], warnings, stats: emptyStats(byCategory) };
  }

  const weatherAllowed = (item) => {
    const sub = String(item.subcategory || "");
    if (feelsLike < 3 && (sub === "shorts" || sub === "sandals")) return false;
    if (feelsLike > 24 && (sub === "puffer" || sub === "highboots" || sub === "boots")) return false;
    if (feelsLike > 24 && num(item.warmth) >= 4.8) return false;
    if (feelsLike > 22 && num(item.warmth) >= 4) return false;
    if (item.category === "accessory" && feelsLike > 16 && num(item.warmth) >= 4) return false;
    if (item.category === "outerwear" && feelsLike > 2 && num(item.warmth) > req.targetWarmth + 1.2) return false;
    if ((req.rain || req.snow) && sub === "sandals") return false;
    return true;
  };

  const pool = {};
  for (const category of Object.keys(byCategory)) {
    pool[category] = byCategory[category].filter(weatherAllowed);
  }
  // Приоритет непромокаемого, когда он есть в шкафу: на дождь берём только
  // waterproof-обувь и верхнюю одежду, иначе — всё, что осталось.
  if (req.rain) {
    const waterproofShoes = pool.shoes.filter((item) => item.waterproof);
    if (waterproofShoes.length) pool.shoes = waterproofShoes;
    const waterproofOuter = pool.outerwear.filter((item) => item.waterproof);
    if (waterproofOuter.length) pool.outerwear = waterproofOuter;
  }
  // В мороз и снег не предлагаем лёгкую обувь, если есть тёплая.
  if (req.snow || feelsLike <= 1) {
    const warmShoes = pool.shoes.filter((item) => num(item.warmth) >= 3.5);
    if (warmShoes.length) pool.shoes = warmShoes;
  }
  const hiddenByWeather =
    usable.length - Object.values(pool).reduce((sum, list) => sum + list.length, 0);
  if (hiddenByWeather > 0) {
    warnings.push(
      `Часть вещей не подходит под погоду — ${hiddenByWeather} ${pluralRu(hiddenByWeather, "вещь", "вещи", "вещей")} ${hiddenByWeather % 10 === 1 && hiddenByWeather % 100 !== 11 ? "не участвует" : "не участвуют"} в подборе.`
    );
  }

  const stats = {
    candidates: 0,
    byCategory: Object.fromEntries(Object.entries(pool).map(([key, value]) => [key, value.length]))
  };

  if (pool.shoes.length === 0) {
    warnings.push("Под такую погоду не нашлось обуви — добавьте закрытую непромокаемую пару.");
    return { outfits: [], warnings, stats };
  }
  const canBuildTopBottom = pool.top.length > 0 && pool.bottom.length > 0;
  if (!canBuildTopBottom && pool.dress.length === 0) {
    warnings.push("Под такую погоду не нашлось ни верха с низом, ни платья.");
    return { outfits: [], warnings, stats };
  }

  let includeOuterwear = req.needsOuterwear || req.outerwearOptional;
  if (req.needsOuterwear && pool.outerwear.length === 0) {
    warnings.push("Нет подходящей верхней одежды для этой погоды — образы собраны без слоя сверху.");
    includeOuterwear = false;
  }

  const outerSuitability = (item) => {
    let score = 0;
    if (req.rain && item.waterproof) score += 2;
    if (req.snow && num(item.warmth) >= 4) score += 2;
    score += 1 - Math.abs(num(item.warmth, 3) - req.targetWarmth) / 3;
    score += 1 - Math.abs(num(item.formality, 2.5) - occasionInfo.formality) / 3;
    return score;
  };
  const extras = [...pool.bag, ...pool.accessory];
  const extrasSorted = extras
    .slice()
    .sort(
      (a, b) =>
        outerSuitability(b) - outerSuitability(a) ||
        String(a.id).localeCompare(String(b.id))
    )
    .slice(0, 3);
  const outerSorted = pool.outerwear
    .slice()
    .sort(
      (a, b) =>
        outerSuitability(b) - outerSuitability(a) ||
        String(a.id).localeCompare(String(b.id))
    )
    .slice(0, 3);

  const cores = [];
  if (canBuildTopBottom) {
    for (const top of pool.top) {
      for (const bottom of pool.bottom) cores.push([top, bottom]);
    }
  }
  for (const dress of pool.dress) cores.push([dress]);

  const candidates = [];
  const seenHashes = new Set();
  const outerOptions = includeOuterwear ? [...outerSorted, null] : [null];
  for (const core of cores) {
    for (const shoes of pool.shoes) {
      for (const outerwear of outerOptions) {
        if (req.needsOuterwear && !outerwear) continue;
        const extraOptions = extrasSorted.length ? [...extrasSorted, null] : [null];
        for (const extra of extraOptions) {
          const parts = { core, outerwear, shoes, extra };
          const items = outfitItems(parts);
          const hash = outfitHash(items.map((item) => item.id));
          if (seenHashes.has(hash)) continue;
          if (blockedHashesSet.has(hash) || recentHashes.has(hash)) continue;
          seenHashes.add(hash);
          const colorRes = outfitColorScore(colorHexes(items), seasonKey);
          const baseScore = scoreParts(parts, req, occasionInfo, colorRes, now);
          const jitter = (rng() - 0.5) * 4;
          candidates.push({
            parts,
            items,
            hash,
            baseScore,
            rankScore: baseScore + jitter,
            colorRes
          });
        }
      }
    }
  }
  stats.candidates = candidates.length;

  if (candidates.length === 0) {
    warnings.push("Не удалось собрать ни одного образа из этих вещей. Добавьте пару вещей — и всё получится.");
    return { outfits: [], warnings, stats };
  }

  candidates.sort(
    (a, b) => b.rankScore - a.rankScore || String(a.hash).localeCompare(String(b.hash))
  );

  const selected = [];
  const usedHashes = new Set();
  const itemUsage = new Map();
  const maxPerItem = Math.max(1, Math.ceil(wanted / 3));
  for (let limit = maxPerItem; selected.length < wanted && limit <= wanted + 1; limit += 1) {
    let progress = true;
    while (selected.length < wanted && progress) {
      progress = false;
      for (const candidate of candidates) {
        if (usedHashes.has(candidate.hash)) continue;
        const ids = candidate.items.map((item) => item.id);
        if (ids.some((id) => (itemUsage.get(id) || 0) >= limit)) continue;
        selected.push(candidate);
        usedHashes.add(candidate.hash);
        for (const id of ids) itemUsage.set(id, (itemUsage.get(id) || 0) + 1);
        progress = true;
        break;
      }
    }
  }

  if (selected.length < wanted) {
    const left = wanted - selected.length;
    warnings.push(
      `Получилось собрать ${selected.length} ${pluralRu(selected.length, "образ", "образа", "образов")} из ${wanted} — не хватает разных сочетаний, добавьте вещей.`
    );
  }
  if (selected.length === 0) {
    warnings.push("Все подходящие образы уже показаны — попробуйте добавить новые вещи.");
    return { outfits: [], warnings, stats };
  }

  selected.sort(
    (a, b) => b.baseScore - a.baseScore || String(a.hash).localeCompare(String(b.hash))
  );
  const usedTitles = new Set();
  const outfits = selected.map((candidate) =>
    buildOutfit({
      candidate,
      req,
      temp,
      feelsLike,
      precipProb,
      windSpeed,
      conditionLabel,
      occasionInfo,
      seasonKey,
      seasonInfo,
      now,
      createdAt,
      rng,
      usedTitles
    })
  );

  return { outfits, warnings, stats };
}
