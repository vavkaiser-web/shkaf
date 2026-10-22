// tests/engine.test.mjs — погодные требования, сборка образов, новизна,
// диверсификация и детерминизм движка.
import test from "node:test";
import assert from "node:assert/strict";

import { demoWardrobe, SUBCATEGORIES, CATEGORIES } from "../js/data.js";
import {
  requirementsFor,
  generateOutfits,
  outfitHash,
  itemWarmthRange,
  explainOutfit,
  trendNoteFor
} from "../js/engine.js";

const DAY = 86400000;

const RAIN = {
  temp: 9,
  feelsLike: 6,
  humidity: 80,
  precipMm: 0.4,
  precipProb: 60,
  rain: 0.2,
  showers: 0,
  snowfall: 0,
  code: 61,
  isDay: true,
  condition: { key: "rain", label: "Дождь", icon: "rain" },
  windSpeed: 14,
  windGust: 22,
  cloudCover: 75,
  uvIndex: 1
};

const SNOW = {
  temp: -5,
  feelsLike: -9,
  humidity: 85,
  precipMm: 1.4,
  precipProb: 80,
  rain: 0,
  showers: 0,
  snowfall: 1.2,
  code: 71,
  isDay: true,
  condition: { key: "snow", label: "Снег", icon: "snow" },
  windSpeed: 20,
  windGust: 30,
  cloudCover: 90,
  uvIndex: 0
};

const MILD = {
  temp: 18,
  feelsLike: 18,
  humidity: 55,
  precipMm: 0,
  precipProb: 0,
  rain: 0,
  showers: 0,
  snowfall: 0,
  code: 0,
  isDay: true,
  condition: { key: "clear", label: "Ясно", icon: "sun" },
  windSpeed: 8,
  windGust: 12,
  cloudCover: 10,
  uvIndex: 3
};

const HOT = {
  temp: 30,
  feelsLike: 32,
  humidity: 40,
  precipMm: 0,
  precipProb: 0,
  rain: 0,
  showers: 0,
  snowfall: 0,
  code: 0,
  isDay: true,
  condition: { key: "clear", label: "Ясно", icon: "sun" },
  windSpeed: 5,
  windGust: 8,
  cloudCover: 5,
  uvIndex: 8
};

const FROST = {
  temp: -12,
  feelsLike: -18,
  humidity: 70,
  precipMm: 0,
  precipProb: 10,
  rain: 0,
  showers: 0,
  snowfall: 0,
  code: 3,
  isDay: true,
  condition: { key: "overcast", label: "Облачно", icon: "cloud" },
  windSpeed: 30,
  windGust: 45,
  cloudCover: 95,
  uvIndex: 0
};

function makeItem(overrides = {}) {
  return {
    id: "it_x",
    name: "Вещь",
    category: "top",
    subcategory: "sweater",
    colorHex: "#4A3227",
    secondaryHex: null,
    colorName: "шоколадный",
    pattern: "solid",
    warmth: 3,
    formality: 2.5,
    waterproof: false,
    styles: ["casual"],
    photo: "",
    favorite: false,
    wearCount: 0,
    lastWorn: null,
    createdAt: 0,
    source: "demo",
    notes: "",
    ...overrides
  };
}

function byCategory(outfit) {
  const map = {};
  for (const item of outfit.items) {
    assert.ok(CATEGORIES.some((category) => category.id === item.category), item.category);
    assert.ok(
      SUBCATEGORIES[item.category].some((sub) => sub.id === item.subcategory),
      `${item.category}/${item.subcategory}`
    );
    assert.ok(!map[item.category], `две вещи категории ${item.category}`);
    map[item.category] = item;
  }
  return map;
}

function assertSlots(outfit) {
  const map = byCategory(outfit);
  assert.ok(map.shoes, "в образе нет обуви");
  const topBottom = Boolean(map.top && map.bottom);
  const dressOnly = Boolean(map.dress && !map.top && !map.bottom);
  assert.ok(topBottom || dressOnly, "слоты должны быть top+bottom или dress");
  assert.ok(!(topBottom && map.dress), "нельзя одновременно top+bottom и dress");
  const accessoryCount = (map.bag ? 1 : 0) + (map.accessory ? 1 : 0);
  assert.ok(accessoryCount <= 1, "сумка/аксессуар — максимум один");
  assert.equal(outfit.itemIds.length, outfit.items.length);
  assert.deepEqual(outfit.itemIds, outfit.items.map((item) => item.id));
  assert.equal(new Set(outfit.itemIds).size, outfit.itemIds.length);
}

function hashes(outfits) {
  return outfits.map((outfit) => outfitHash(outfit.itemIds));
}

function coreFormality(outfit) {
  const core = outfit.items.filter((item) => ["top", "bottom", "dress"].includes(item.category));
  return core.reduce((sum, item) => sum + Number(item.formality), 0) / core.length;
}

function averageFormality(outfits) {
  return outfits.reduce((sum, outfit) => sum + coreFormality(outfit), 0) / outfits.length;
}

/* ------------------------------ требования ------------------------------ */

test("requirementsFor: дождь, +9° — закрытая обувь и понятные заметки", () => {
  const req = requirementsFor(RAIN);
  assert.equal(req.rain, true);
  assert.equal(req.snow, false);
  assert.equal(req.wind, false);
  assert.equal(req.footwear, "closed");
  assert.ok(req.targetWarmth >= 1 && req.targetWarmth <= 5);
  assert.ok(req.warmthRange[0] < req.warmthRange[1]);
  assert.ok([1, 2, 3].includes(req.layers));
  assert.equal(req.notes.length >= 1 && req.notes.length <= 3, true);
  assert.ok(req.notes[0].includes("+9"), req.notes[0]);
  assert.ok(req.notes[0].includes("+6"), req.notes[0]);
  assert.ok(req.notes.some((note) => /дождь/i.test(note)));
  assert.match(req.summary, /дождь/);
});

test("requirementsFor: снег, -5° — сапоги/ботинки и морозный слой", () => {
  const req = requirementsFor(SNOW);
  assert.equal(req.snow, true);
  assert.equal(req.rain, false);
  assert.equal(req.footwear, "boots");
  assert.equal(req.needsOuterwear, true);
  assert.ok(req.targetWarmth >= 4.3, `targetWarmth ${req.targetWarmth}`);
  assert.ok(req.layers >= 2);
  assert.ok(req.notes.some((note) => /снег/i.test(note)));
  assert.match(req.summary, /снег/);
});

test("requirementsFor: жара +30° — открытая обувь и без верхней одежды", () => {
  const req = requirementsFor(HOT);
  assert.equal(req.footwear, "open");
  assert.equal(req.needsOuterwear, false);
  assert.equal(req.outerwearOptional, false);
  assert.ok(req.targetWarmth <= 1.6, `targetWarmth ${req.targetWarmth}`);
  assert.ok(req.notes.some((note) => /жарко/i.test(note)));
});

test("requirementsFor: ветер и мороз учитываются в summary и заметках", () => {
  const req = requirementsFor(FROST);
  assert.equal(req.wind, true);
  assert.equal(req.footwear, "boots");
  assert.match(req.summary, /ветер/);
  assert.ok(req.notes.length <= 3);
  assert.ok(req.notes.some((note) => /ветер/i.test(note)));
  // пустая/странная погода не роняет функцию
  const fallback = requirementsFor();
  assert.equal(typeof fallback.summary, "string");
  assert.ok(fallback.notes.length >= 1);
});

/* ------------------------------ сборка образов ------------------------------ */

test("generateOutfits: 6 уникальных валидных образов из демо-шкафа", () => {
  const items = demoWardrobe();
  const result = generateOutfits({ items, weather: MILD, occasion: "casual", season: "autumn", count: 6, seed: 11 });
  assert.equal(result.outfits.length, 6);
  assert.equal(new Set(hashes(result.outfits)).size, 6, "образы-дубли по hash");
  assert.equal(new Set(result.outfits.map((outfit) => outfit.title)).size, 6, "титулы повторяются");
  assert.ok(result.stats.candidates > 0);
  assert.equal(result.stats.byCategory.top, 4);
  assert.equal(result.stats.byCategory.shoes, 4);

  for (const outfit of result.outfits) {
    assertSlots(outfit);
    assert.ok(outfit.score > 0 && outfit.score <= 100, `score ${outfit.score}`);
    const words = outfit.title.split(/\s+/).filter(Boolean);
    assert.ok(words.length >= 2 && words.length <= 4, `титул «${outfit.title}»`);
    assert.ok(outfit.why.length > 20, "why слишком короткий");
    assert.ok(outfit.why.includes("°"), "в why нет температуры");
    assert.ok(Array.isArray(outfit.chips) && outfit.chips.length >= 2);
    for (const chip of outfit.chips) {
      assert.ok(["weather", "palette", "fresh", "style", "layer"].includes(chip.type), chip.type);
      assert.ok(typeof chip.label === "string" && chip.label.length > 0);
    }
    assert.ok(outfit.chips.some((chip) => chip.type === "weather"));
    assert.ok(outfit.chips.some((chip) => chip.type === "style"));
    assert.ok(outfit.paletteName === null || typeof outfit.paletteName === "string");
    assert.equal(outfit.occasion, "casual");
    assert.equal(outfit.season, "autumn");
    assert.equal(typeof outfit.createdAt, "number");
    assert.equal(outfit.weatherSnapshot.temp, 18);
    assert.equal(outfit.weatherSnapshot.feelsLike, 18);
    assert.ok(outfit.id.startsWith("look_"));
  }
});

test("generateOutfits: дождь — непромокаемая обувь и верхняя одежда", () => {
  const result = generateOutfits({ items: demoWardrobe(), weather: RAIN, count: 6, seed: 2 });
  assert.equal(result.outfits.length, 6);
  for (const outfit of result.outfits) {
    const map = byCategory(outfit);
    assert.equal(map.shoes.waterproof, true, `обувь «${map.shoes.name}» промокнет`);
    assert.notEqual(map.shoes.subcategory, "sandals");
    if (map.outerwear) {
      assert.equal(map.outerwear.waterproof, true, `верх «${map.outerwear.name}» промокнет`);
    }
    assert.match(outfit.why, /дождь/i);
  }
});

test("generateOutfits: мороз — без шорт и сандалий, тёплый верх и обувь", () => {
  const items = [
    ...demoWardrobe(),
    makeItem({
      id: "it_test_shorts",
      name: "Шорты",
      category: "bottom",
      subcategory: "shorts",
      colorHex: "#C8A02E",
      warmth: 1,
      formality: 1.8
    }),
    makeItem({
      id: "it_test_sandals",
      name: "Сандалии",
      category: "shoes",
      subcategory: "sandals",
      colorHex: "#C8A02E",
      warmth: 1,
      formality: 2.2
    })
  ];
  const result = generateOutfits({ items, weather: SNOW, count: 6, seed: 4 });
  assert.equal(result.outfits.length, 6);
  for (const outfit of result.outfits) {
    const map = byCategory(outfit);
    assert.ok(!outfit.itemIds.includes("it_test_shorts"), "шорты в мороз");
    assert.ok(!outfit.itemIds.includes("it_test_sandals"), "сандалии в мороз");
    assert.notEqual(map.shoes.subcategory, "sandals");
    assert.ok(map.outerwear, "в мороз обязательна верхняя одежда");
    assert.ok(map.outerwear.warmth >= 3.5, `тёплый верх: ${map.outerwear.name}`);
    assert.ok(map.shoes.warmth >= 3.5, `тёплая обувь: ${map.shoes.name}`);
  }
});

test("generateOutfits: жара — без пуховика и сапог, открытая обувь в приоритете", () => {
  const items = [
    ...demoWardrobe(),
    makeItem({
      id: "it_test_sandals",
      name: "Сандалии",
      category: "shoes",
      subcategory: "sandals",
      colorHex: "#DCC9A6",
      warmth: 1,
      formality: 2.2
    })
  ];
  const result = generateOutfits({ items, weather: HOT, count: 6, seed: 5 });
  assert.equal(result.outfits.length, 6);
  let openUsed = 0;
  for (const outfit of result.outfits) {
    const map = byCategory(outfit);
    assert.ok(!map.outerwear, "в жару не нужна верхняя одежда");
    const forbidden = ["puffer", "boots", "highboots"];
    assert.ok(!forbidden.includes(map.shoes.subcategory), `обувь в жару: ${map.shoes.name}`);
    assert.ok(map.shoes.warmth <= 2.5, `слишком тёплая обувь: ${map.shoes.name}`);
    if (map.shoes.subcategory === "sandals") openUsed += 1;
  }
  assert.ok(openUsed >= 1, "открытая обувь не пригодилась");
});

test("generateOutfits: рабочий повод формальнее повседневного", () => {
  const items = demoWardrobe();
  const casual = generateOutfits({ items, weather: MILD, occasion: "casual", count: 6, seed: 3 });
  const work = generateOutfits({ items, weather: MILD, occasion: "work", count: 6, seed: 3 });
  assert.equal(casual.outfits.length, 6);
  assert.equal(work.outfits.length, 6);
  const casualFormality = averageFormality(casual.outfits);
  const workFormality = averageFormality(work.outfits);
  assert.ok(
    workFormality > casualFormality + 0.25,
    `работа ${workFormality.toFixed(2)} vs повседневный ${casualFormality.toFixed(2)}`
  );
  assert.ok(
    work.outfits.some((outfit) => coreFormality(outfit) >= 3.6),
    "среди рабочих образов нет ни одного собранного"
  );
});

test("generateOutfits: детерминизм по seed и различие seed+1", () => {
  const items = demoWardrobe();
  const args = { items, weather: MILD, occasion: "casual", season: "autumn", count: 6 };
  const first = generateOutfits({ ...args, seed: 42 });
  const second = generateOutfits({ ...args, seed: 42 });
  const another = generateOutfits({ ...args, seed: 43 });
  // тот же seed — побайтово те же образы
  assert.deepEqual(
    first.outfits.map((outfit) => outfit.itemIds),
    second.outfits.map((outfit) => outfit.itemIds)
  );
  assert.deepEqual(
    first.outfits.map((outfit) => outfit.title),
    second.outfits.map((outfit) => outfit.title)
  );
  // seed+1 — другой набор образов (сравниваем именно наборы, не порядок)
  const baseSet = first.outfits.map((outfit) => outfitHash(outfit.itemIds)).sort();
  const anotherSet = another.outfits.map((outfit) => outfitHash(outfit.itemIds)).sort();
  assert.notDeepEqual(anotherSet, baseSet);
  assert.equal(anotherSet.length, baseSet.length);
});

test("generateOutfits: вход не мутируется, вещи в образах — копии", () => {
  const items = demoWardrobe();
  const snapshot = JSON.stringify(items);
  const result = generateOutfits({ items, weather: RAIN, count: 4, seed: 6 });
  assert.equal(JSON.stringify(items), snapshot, "входные вещи изменились");
  const originalIds = new Set(items.map((item) => item.id));
  for (const outfit of result.outfits) {
    for (const item of outfit.items) {
      assert.ok(originalIds.has(item.id));
      assert.notEqual(item, items.find((source) => source.id === item.id), "вещь не склонирована");
    }
  }
});

test("generateOutfits: без обуви — предупреждение, образов нет", () => {
  const items = demoWardrobe().filter((item) => item.category !== "shoes");
  const result = generateOutfits({ items, weather: MILD });
  assert.equal(result.outfits.length, 0);
  assert.ok(result.warnings.some((warning) => /обув/i.test(warning)), result.warnings.join(" | "));
});

test("generateOutfits: без верха и платья — предупреждение, образов нет", () => {
  const items = demoWardrobe().filter((item) => !["top", "dress"].includes(item.category));
  const result = generateOutfits({ items, weather: MILD });
  assert.equal(result.outfits.length, 0);
  assert.ok(result.warnings.some((warning) => /верх|плать/i.test(warning)), result.warnings.join(" | "));
});

test("generateOutfits: пустой шкаф и вызов без аргументов не падают", () => {
  const empty = generateOutfits({ items: [], weather: MILD });
  assert.equal(empty.outfits.length, 0);
  assert.ok(empty.warnings.length >= 1);
  assert.equal(typeof empty.stats, "object");
  const bare = generateOutfits();
  assert.equal(bare.outfits.length, 0);
  assert.ok(bare.warnings.length >= 1);
});

test("generateOutfits: recentLookHashes исключает повтор образа", () => {
  const items = demoWardrobe();
  const base = generateOutfits({ items, weather: MILD, count: 6, seed: 7 });
  const recent = hashes(base.outfits);
  const result = generateOutfits({
    items,
    weather: MILD,
    count: 6,
    seed: 7,
    recentLookHashes: recent
  });
  assert.equal(result.outfits.length, 6, "не хватило альтернатив — тест должен быть строже");
  for (const hash of hashes(result.outfits)) {
    assert.ok(!recent.includes(hash), `повтор недавнего образа ${hash}`);
  }
});

test("generateOutfits: blockedHashes исключает конкретные образы", () => {
  const items = demoWardrobe();
  const base = generateOutfits({ items, weather: MILD, count: 6, seed: 8 });
  const blocked = hashes(base.outfits).slice(0, 2);
  const result = generateOutfits({ items, weather: MILD, count: 6, seed: 8, blockedHashes: blocked });
  assert.equal(result.outfits.length, 6);
  for (const hash of hashes(result.outfits)) {
    assert.ok(!blocked.includes(hash), `заблокированный образ ${hash}`);
  }
});

test("generateOutfits: недавняя вещь получает штраф и не выбирается первой", () => {
  const bottoms = [
    makeItem({ id: "it_b1", name: "Брюки", category: "bottom", subcategory: "trousers", colorHex: "#4A3227" }),
    makeItem({ id: "it_b2", name: "Юбка", category: "bottom", subcategory: "skirt", colorHex: "#5E5F3D" })
  ];
  const shoes = [
    makeItem({ id: "it_s1", name: "Ботинки", category: "shoes", subcategory: "boots", colorHex: "#4A3227", warmth: 4, waterproof: true }),
    makeItem({ id: "it_s2", name: "Кроссовки", category: "shoes", subcategory: "sneakers", colorHex: "#F5F2EA", warmth: 2 })
  ];
  const freshTop = makeItem({ id: "it_fresh", name: "Свежий свитер", colorHex: "#EFE5D2" });
  const recentTop = makeItem({
    id: "it_recent",
    name: "Заношенный свитер",
    colorHex: "#EFE5D2",
    wearCount: 10,
    lastWorn: Date.now() - DAY
  });
  const freshFirst = generateOutfits({
    items: [freshTop, recentTop, ...bottoms, ...shoes],
    weather: MILD,
    occasion: "casual",
    count: 1,
    seed: 9
  });
  assert.equal(freshFirst.outfits.length, 1);
  assert.ok(
    freshFirst.outfits[0].itemIds.includes("it_fresh"),
    `выбран заношенный верх: ${freshFirst.outfits[0].itemIds.join(", ")}`
  );
  assert.ok(!freshFirst.outfits[0].itemIds.includes("it_recent"));

  // три равноценных свежих верха против одного заношенного: при нехватке
  // мест диверсификация не должна вытягивать заношенную вещь в выдачу
  const recentCompetition = generateOutfits({
    items: [
      makeItem({ id: "it_fresh_a", name: "Свежий свитер А", colorHex: "#EFE5D2" }),
      makeItem({ id: "it_fresh_b", name: "Свежий свитер Б", colorHex: "#EFE5D2" }),
      makeItem({ id: "it_fresh_c", name: "Свежий свитер В", colorHex: "#EFE5D2" }),
      makeItem({
        id: "it_recent",
        name: "Заношенный свитер",
        colorHex: "#EFE5D2",
        wearCount: 10,
        lastWorn: Date.now() - DAY
      }),
      ...bottoms,
      ...shoes
    ],
    weather: MILD,
    occasion: "casual",
    count: 3,
    seed: 9
  });
  assert.equal(recentCompetition.outfits.length, 3);
  const freshUsed = new Set();
  for (const outfit of recentCompetition.outfits) {
    assert.ok(!outfit.itemIds.includes("it_recent"), "заношенная вещь попала в выдачу");
    for (const id of outfit.itemIds) {
      if (id.startsWith("it_fresh_")) freshUsed.add(id);
    }
  }
  assert.equal(freshUsed.size, 3, "свежие вещи должны заполнить все места");
});

/* ------------------------------ утилиты ------------------------------ */

test("outfitHash: не зависит от порядка и учитывает состав", () => {
  assert.equal(outfitHash(["b", "a"]), outfitHash(["a", "b"]));
  assert.equal(outfitHash(["a", "a", "b"]), outfitHash(["b", "a"]));
  assert.notEqual(outfitHash(["a", "b"]), outfitHash(["a", "c"]));
  assert.match(outfitHash(["a", "b"]), /^h[0-9a-z]+$/);
  assert.equal(outfitHash([]), outfitHash([]));
});

test("itemWarmthRange: тёплые вещи — для минуса, лёгкие — для плюса", () => {
  for (let warmth = 1; warmth <= 5; warmth += 1) {
    const range = itemWarmthRange({ warmth });
    assert.ok(range.min < range.max, `warmth ${warmth}`);
    assert.equal(Number.isInteger(range.min), true);
    assert.equal(Number.isInteger(range.max), true);
  }
  const light = itemWarmthRange({ warmth: 1 });
  const warm = itemWarmthRange({ warmth: 5 });
  assert.ok(light.min > warm.min);
  assert.ok(light.max > warm.max);
  assert.deepEqual(itemWarmthRange({}), itemWarmthRange({ warmth: 3 }));
});

test("explainOutfit и trendNoteFor: осмысленный русский текст", () => {
  const items = demoWardrobe();
  const text = explainOutfit({ items: [items[0], items[4]] }, RAIN, "autumn");
  assert.ok(text.length > 30, text);
  assert.ok(text.includes("°"), text);
  assert.ok(text.includes("дождь") || text.includes("Дождь"), text);
  assert.equal(explainOutfit({ why: "Готовое объяснение от движка." }, RAIN), "Готовое объяснение от движка.");

  assert.match(trendNoteFor("autumn"), /бордо/i);
  assert.match(trendNoteFor("autumn"), /Палитра/);
  assert.match(trendNoteFor("spring").toLowerCase(), /прогноз/);
  assert.match(trendNoteFor("summer").toLowerCase(), /прогноз/);
  assert.equal(typeof trendNoteFor(), "string");
});

test("generateOutfits: пять погодных сценариев проходят без нарушений", () => {
  const items = demoWardrobe();
  const scenarios = [
    { name: "дождь +9", weather: RAIN },
    { name: "снег -5", weather: SNOW },
    { name: "ясно +18", weather: MILD },
    { name: "жара +30", weather: HOT },
    { name: "мороз -12", weather: FROST }
  ];
  for (const scenario of scenarios) {
    const result = generateOutfits({
      items,
      weather: scenario.weather,
      occasion: "casual",
      season: "autumn",
      count: 6,
      seed: 13
    });
    assert.equal(result.outfits.length, 6, `${scenario.name}: мало образов`);
    assert.equal(new Set(result.outfits.map((outfit) => outfit.title)).size, 6);
    assert.equal(new Set(hashes(result.outfits)).size, 6);
    const feelsLike = scenario.weather.feelsLike;
    for (const outfit of result.outfits) {
      assertSlots(outfit);
      assert.ok(outfit.why.length > 20, `${scenario.name}: why`);
      const map = byCategory(outfit);
      if (feelsLike < 3) {
        assert.notEqual(map.shoes.subcategory, "sandals", `${scenario.name}: сандалии`);
      }
      if (feelsLike > 24) {
        assert.ok(!["puffer", "boots", "highboots"].includes(map.shoes.subcategory));
        assert.ok(!outfit.items.some((item) => item.subcategory === "puffer"));
      }
      if (result.outfits.length === 6) {
        assert.ok(outfit.score > 0);
      }
    }
  }
});
