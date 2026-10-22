// tests/data.test.mjs — проверки справочников, сезонов, названий и демо-шкафа.
import test from "node:test";
import assert from "node:assert/strict";

import {
  CATEGORIES,
  SUBCATEGORIES,
  STYLE_TAGS,
  OCCASIONS,
  PATTERNS,
  COLOR_NAMES,
  SEASONS,
  DEFAULT_SETTINGS,
  TREND_SOURCES,
  seasonForDate,
  itemTitle,
  demoWardrobe
} from "../js/data.js";
import { deltaE, isNeutral, colorName } from "../js/color.js";

const HEX = /^#[0-9a-fA-F]{6}$/;
const RU_WORD = /^[а-яё][а-яё -]*$/u;

test("категории: ровно 7 и совпадают с контрактом", () => {
  assert.equal(CATEGORIES.length, 7);
  assert.deepEqual(
    CATEGORIES.map((category) => category.id),
    ["top", "bottom", "dress", "outerwear", "shoes", "bag", "accessory"]
  );
  for (const category of CATEGORIES) {
    assert.ok(category.label.length > 0);
    assert.equal(typeof category.plural, "string");
    assert.match(category.icon, /^[a-z-]+$/);
  }
});

test("подкатегории: покрывают все категории и проходят инварианты", () => {
  const styleIds = new Set(STYLE_TAGS.map((tag) => tag.id));
  assert.equal(Object.keys(SUBCATEGORIES).length, 7);
  for (const category of CATEGORIES) {
    const list = SUBCATEGORIES[category.id];
    assert.ok(Array.isArray(list) && list.length > 0, `пустая категория ${category.id}`);
    const ids = new Set();
    for (const sub of list) {
      assert.equal(typeof sub.id, "string");
      assert.ok(sub.id.length > 0);
      assert.ok(!ids.has(sub.id), `дубль подкатегории ${sub.id}`);
      ids.add(sub.id);
      assert.ok(RU_WORD.test(sub.label.toLowerCase()), `название ${sub.label}`);
      assert.ok(sub.warmth >= 1 && sub.warmth <= 5, `${sub.id}: warmth`);
      assert.ok(sub.formality >= 1 && sub.formality <= 5, `${sub.id}: formality`);
      assert.ok(Array.isArray(sub.styles) && sub.styles.length > 0);
      for (const style of sub.styles) {
        assert.ok(styleIds.has(style), `неизвестный стиль ${style} у ${sub.id}`);
      }
      assert.match(sub.icon, /^[a-z-]+$/);
    }
  }
  // подкатегории, которые точно нужны движку и демо-шкафу
  for (const [category, id] of [
    ["top", "sweater"],
    ["top", "shirt"],
    ["bottom", "trousers"],
    ["bottom", "jeans"],
    ["bottom", "shorts"],
    ["bottom", "skirt"],
    ["dress", "dress"],
    ["outerwear", "coat"],
    ["outerwear", "puffer"],
    ["shoes", "sneakers"],
    ["shoes", "boots"],
    ["shoes", "sandals"],
    ["bag", "tote"],
    ["accessory", "scarf"]
  ]) {
    assert.ok(
      SUBCATEGORIES[category].some((sub) => sub.id === id),
      `${category}/${id} отсутствует`
    );
  }
});

test("стилевые теги: ровно 8 штук из контракта", () => {
  assert.deepEqual(
    STYLE_TAGS.map((tag) => tag.id).sort(),
    ["casual", "classic", "evening", "outdoor", "romantic", "smart", "sport", "street"].sort()
  );
  for (const tag of STYLE_TAGS) {
    assert.ok(RU_WORD.test(tag.label.toLowerCase()), tag.label);
  }
});

test("поводы: 4 с формальностью и валидными styleHints", () => {
  const styleIds = new Set(STYLE_TAGS.map((tag) => tag.id));
  assert.deepEqual(
    OCCASIONS.map((occasion) => occasion.id).sort(),
    ["casual", "evening", "sport", "work"].sort()
  );
  for (const occasion of OCCASIONS) {
    assert.ok(occasion.formality >= 1 && occasion.formality <= 5);
    assert.ok(Array.isArray(occasion.styleHints) && occasion.styleHints.length > 0);
    for (const hint of occasion.styleHints) {
      assert.ok(styleIds.has(hint), `неизвестный hint ${hint}`);
    }
    assert.ok(occasion.label.length > 0);
  }
  assert.ok(
    OCCASIONS.find((occasion) => occasion.id === "work").formality >
      OCCASIONS.find((occasion) => occasion.id === "casual").formality
  );
  assert.ok(
    OCCASIONS.find((occasion) => occasion.id === "sport").formality <
      OCCASIONS.find((occasion) => occasion.id === "casual").formality
  );
});

test("паттерны: все 8 id из контракта и русские подписи", () => {
  assert.deepEqual(
    PATTERNS.map((pattern) => pattern.id).sort(),
    ["check", "denim", "knit", "leather", "other", "print", "solid", "striped"].sort()
  );
  for (const pattern of PATTERNS) {
    assert.ok(RU_WORD.test(pattern.label.toLowerCase()), pattern.label);
  }
});

test("цвета: 35–45 оттенков, уникальные имена/hex, корректная нейтральность", () => {
  assert.ok(COLOR_NAMES.length >= 35 && COLOR_NAMES.length <= 45, `оттенков: ${COLOR_NAMES.length}`);
  const names = new Set();
  const hexes = new Set();
  for (const color of COLOR_NAMES) {
    assert.match(color.hex, HEX, color.name);
    assert.match(color.name, RU_WORD, color.name);
    assert.equal(typeof color.neutral, "boolean");
    assert.ok(!names.has(color.name), `дубль имени ${color.name}`);
    assert.ok(!hexes.has(color.hex.toUpperCase()), `дубль hex ${color.hex}`);
    names.add(color.name);
    hexes.add(color.hex.toUpperCase());
  }
  // ключевые цвета сезона есть в справочнике точь-в-точь
  for (const [name, hex] of [
    ["бордо", "#6B2233"],
    ["ивори", "#EFE5D2"],
    ["шоколадный", "#4A3227"],
    ["синий ночи", "#1C2A45"],
    ["оливковый", "#5E5F3D"],
    ["горчичный", "#C8A02E"],
    ["терракотовый", "#B85C38"],
    ["графитовый", "#3B3B3B"]
  ]) {
    const found = COLOR_NAMES.find((color) => color.name === name);
    assert.ok(found, `нет цвета ${name}`);
    assert.equal(found.hex.toUpperCase(), hex);
  }
  // нейтральные по справочнику должны быть нейтральными и для color.js
  for (const color of COLOR_NAMES.filter((entry) => entry.neutral)) {
    assert.ok(isNeutral(color.hex), `${color.name} не считается нейтральным`);
  }
  assert.equal(isNeutral("#141414"), true);
  assert.equal(isNeutral("#6B2233"), false);
  assert.equal(colorName("#6B2233").name, "бордо");
});

test("осенняя палитра: заголовок, месяцы и все 10 цветов таблицы контракта", () => {
  const autumn = SEASONS.autumn;
  assert.equal(autumn.key, "autumn");
  assert.equal(autumn.title, "Осень–зима 2026/27");
  assert.deepEqual([...autumn.months], [9, 10, 11]);
  assert.ok(autumn.summary.length > 40);
  assert.ok(!autumn.summary.toLowerCase().includes("прогноз"), "осень — не прогноз");
  assert.ok(autumn.colors.length >= 8 && autumn.colors.length <= 10);
  assert.ok(autumn.keywords.length >= 5);
  assert.ok(autumn.source && autumn.source.label && autumn.source.url.startsWith("https://"));

  const required = {
    "#6B2233": "accent",
    "#9E1B32": "accent",
    "#5C2B44": "accent",
    "#4A3227": "base",
    "#EFE5D2": "base",
    "#1C2A45": "base",
    "#5E5F3D": "base",
    "#C8A02E": "accent",
    "#B85C38": "accent",
    "#3B3B3B": "neutral"
  };
  for (const color of autumn.colors) {
    assert.match(color.hex, HEX);
    assert.ok(["accent", "base", "neutral"].includes(color.role), color.role);
  }
  for (const [hex, role] of Object.entries(required)) {
    const found = autumn.colors.find((color) => color.hex.toUpperCase() === hex);
    assert.ok(found, `в палитре нет ${hex}`);
    assert.equal(found.role, role, `${hex}: роль`);
  }
});

test("осенние combos: все обязательные пары из контракта", () => {
  const autumn = SEASONS.autumn;
  assert.ok(autumn.combos.length >= 6, "нужно 6–8 сочетаний");
  for (const combo of autumn.combos) {
    assert.match(combo.a, HEX);
    assert.match(combo.b, HEX);
    assert.ok(combo.label.includes("+"), `подпись ${combo.label}`);
    assert.ok(combo.note.length > 10, `заметка ${combo.label}`);
  }
  const requiredPairs = [
    ["#6B2233", "#EFE5D2"],
    ["#6B2233", "#4A3227"],
    ["#4A3227", "#1C2A45"],
    ["#4A3227", "#5E5F3D"],
    ["#5E5F3D", "#6B2233"],
    ["#1C2A45", "#5E5F3D"],
    ["#C8A02E", "#4A3227"],
    ["#B85C38", "#EFE5D2"],
    ["#5C2B44", "#3B3B3B"]
  ];
  for (const [a, b] of requiredPairs) {
    const found = autumn.combos.some(
      (combo) =>
        (combo.a.toUpperCase() === a && combo.b.toUpperCase() === b) ||
        (combo.a.toUpperCase() === b && combo.b.toUpperCase() === a)
    );
    assert.ok(found, `нет обязательного сочетания ${a} + ${b}`);
  }
});

test("сезоны: 4 валидных сезона, прогнозы честно помечены", () => {
  for (const key of ["autumn", "winter", "spring", "summer"]) {
    const season = SEASONS[key];
    assert.ok(season, `нет сезона ${key}`);
    assert.equal(season.key, key);
    assert.ok(season.label.length > 0);
    assert.deepEqual([...season.months].sort((a, b) => a - b), season.months.slice().sort((a, b) => a - b));
    assert.equal(season.months.length, 3);
    assert.ok(season.colors.length >= 8 && season.colors.length <= 10, `${key}: ${season.colors.length} цветов`);
    assert.ok(season.combos.length >= 6 && season.combos.length <= 9, `${key}: combos`);
    assert.ok(season.keywords.length >= 5);
    for (const color of season.colors) {
      assert.match(color.hex, HEX);
      assert.ok(["accent", "base", "neutral"].includes(color.role));
    }
  }
  assert.equal(SEASONS.winter.title, "Зима 2026/27");
  for (const key of ["spring", "summer"]) {
    assert.ok(SEASONS[key].title.includes("2027"), SEASONS[key].title);
    assert.ok(SEASONS[key].title.toLowerCase().includes("прогноз"), SEASONS[key].title);
    assert.ok(SEASONS[key].summary.toLowerCase().includes("прогноз"), `${key}: summary`);
  }
  // весенние и летние цвета из контракта на месте
  for (const hex of ["#E8C9C4", "#F3E7C9", "#A9C6DE", "#A8B79A", "#C0392B", "#B9A7D1"]) {
    assert.ok(
      SEASONS.spring.colors.some((color) => color.hex.toUpperCase() === hex),
      `весна без ${hex}`
    );
  }
  for (const hex of ["#F5F2EA", "#DCC9A6", "#6B6B45", "#4A6E96", "#E8D25B", "#E8756A"]) {
    assert.ok(
      SEASONS.summer.colors.some((color) => color.hex.toUpperCase() === hex),
      `лето без ${hex}`
    );
  }
});

test("seasonForDate: месяцы, стыки сезонов и полушария", () => {
  const at = (month0, day = 15, year = 2026) => new Date(year, month0, day, 12, 0, 0);
  assert.equal(seasonForDate(at(9)).key, "autumn");
  assert.equal(seasonForDate(at(0, 10, 2027)).key, "winter");
  assert.equal(seasonForDate(at(3, 1, 2027)).key, "spring");
  assert.equal(seasonForDate(at(6, 1, 2027)).key, "summer");
  // стыки: 1 сентября — осень, 1 декабря — зима, 1 марта — весна, 1 июня — лето
  assert.equal(seasonForDate(at(8, 1)).key, "autumn");
  assert.equal(seasonForDate(at(11, 1)).key, "winter");
  assert.equal(seasonForDate(at(2, 1, 2027)).key, "spring");
  assert.equal(seasonForDate(at(5, 1, 2027)).key, "summer");
  // южное полушарие: январь — лето, июль — зима
  assert.equal(seasonForDate(at(0, 10, 2027), "south").key, "summer");
  assert.equal(seasonForDate(at(6, 10, 2027), "south").key, "winter");
  // результат содержит полный SeasonInfo
  const autumn = seasonForDate(at(9));
  assert.equal(autumn.title, "Осень–зима 2026/27");
  assert.ok(Array.isArray(autumn.colors));
  // мусор на входе не роняет
  const fallback = seasonForDate("не дата");
  assert.ok(["autumn", "winter", "spring", "summer"].includes(fallback.key));
});

test("itemTitle: цвет + подкатегория, склонение и дефис для несклоняемых", () => {
  assert.equal(
    itemTitle({ category: "top", subcategory: "sweater", colorName: "бордо", colorHex: "#6B2233" }),
    "Бордовый свитер"
  );
  assert.equal(
    itemTitle({ category: "bottom", subcategory: "jeans", colorName: "синий ночи", colorHex: "#1C2A45" }),
    "Синие джинсы"
  );
  assert.equal(
    itemTitle({ category: "top", subcategory: "sweater", colorName: "ивори", colorHex: "#EFE5D2" }),
    "Ивори-свитер"
  );
  assert.equal(
    itemTitle({ category: "dress", subcategory: "midi", colorName: "бордо", colorHex: "#6B2233" }),
    "Бордовое платье миди"
  );
  assert.equal(
    itemTitle({ category: "outerwear", subcategory: "coat", colorName: "шоколадный", colorHex: "#4A3227" }),
    "Шоколадное пальто"
  );
  // без цвета — просто подпись подкатегории; без данных — не падает
  assert.equal(itemTitle({ category: "accessory", subcategory: "scarf" }), "Шарф");
  assert.equal(typeof itemTitle({}), "string");
  assert.equal(typeof itemTitle(), "string");
  // не мутирует вход
  const item = { category: "top", subcategory: "sweater", colorName: "бордо" };
  const snapshot = JSON.stringify(item);
  itemTitle(item);
  assert.equal(JSON.stringify(item), snapshot);
});

test("demoWardrobe: 16–20 валидных вещей и полное покрытие категорий", () => {
  const items = demoWardrobe();
  assert.ok(items.length >= 16 && items.length <= 20, `вещей: ${items.length}`);
  const ids = new Set();
  const names = new Set();
  const categories = new Set();
  let wornItems = 0;
  for (const item of items) {
    assert.ok(CATEGORIES.some((category) => category.id === item.category), item.category);
    assert.ok(
      SUBCATEGORIES[item.category].some((sub) => sub.id === item.subcategory),
      `${item.category}/${item.subcategory}`
    );
    assert.match(item.colorHex, HEX);
    assert.ok(item.secondaryHex === null || HEX.test(item.secondaryHex));
    assert.ok(item.warmth >= 1 && item.warmth <= 5, `${item.name}: warmth`);
    assert.ok(item.formality >= 1 && item.formality <= 5, `${item.name}: formality`);
    assert.ok(Array.isArray(item.styles) && item.styles.length > 0);
    assert.ok(item.styles.every((style) => STYLE_TAGS.some((tag) => tag.id === style)));
    assert.equal(item.source, "demo");
    assert.ok(item.photo.startsWith("data:image/svg+xml,"), `${item.name}: photo`);
    const svg = decodeURIComponent(item.photo.slice("data:image/svg+xml,".length));
    assert.ok(svg.includes("<svg") && svg.includes("600") && svg.includes("750"));
    assert.ok(!ids.has(item.id), `дубль id ${item.id}`);
    assert.ok(!names.has(item.name), `дубль имени ${item.name}`);
    ids.add(item.id);
    names.add(item.name);
    categories.add(item.category);
    assert.equal(item.name, itemTitle(item));
    assert.equal(item.colorName, colorName(item.colorHex).name);
    if (Number(item.wearCount) > 0 || item.lastWorn != null) wornItems += 1;
  }
  // «надо носить забытое»: 4–5 вещей с историей носки, остальные чистые
  assert.ok(wornItems >= 4 && wornItems <= 5, `вещей с историей: ${wornItems}`);
  for (const category of CATEGORIES) {
    assert.ok(categories.has(category.id), `демо-шкаф не покрывает ${category.id}`);
  }
  assert.ok(items.some((item) => item.category === "accessory"));
  assert.ok(items.some((item) => item.category === "bag"));
  assert.ok(items.some((item) => item.lastWorn === null && item.wearCount === 0));
});

test("demoWardrobe: цвета в палитре сезона или нейтральные", () => {
  const items = demoWardrobe();
  for (const item of items) {
    const inPalette = SEASONS.autumn.colors.some(
      (color) => deltaE(item.colorHex, color.hex) <= 25
    );
    assert.ok(
      inPalette || isNeutral(item.colorHex),
      `${item.name} (${item.colorHex}) выбивается из палитры`
    );
  }
});

test("DEFAULT_SETTINGS и TREND_SOURCES соответствуют контракту", () => {
  assert.deepEqual(Object.keys(DEFAULT_SETTINGS).sort(), [
    "demoLoaded",
    "hemisphere",
    "lookCount",
    "manual",
    "onboarded",
    "place",
    "selectedOccasion",
    "weatherMode"
  ]);
  assert.equal(DEFAULT_SETTINGS.weatherMode, "auto");
  assert.equal(DEFAULT_SETTINGS.hemisphere, "north");
  assert.equal(DEFAULT_SETTINGS.selectedOccasion, "casual");
  assert.ok(["casual", "work", "evening", "sport"].includes(DEFAULT_SETTINGS.selectedOccasion));
  assert.equal(DEFAULT_SETTINGS.manual.temp, 12);
  assert.equal(DEFAULT_SETTINGS.manual.conditionKey, "cloudy");
  assert.equal(DEFAULT_SETTINGS.place, null);

  assert.ok(TREND_SOURCES.length >= 3 && TREND_SOURCES.length <= 5);
  for (const source of TREND_SOURCES) {
    assert.ok(source.label.length > 0);
    assert.ok(source.url.startsWith("https://"), source.url);
    assert.ok(source.note.length > 10, source.note);
  }
  const urls = TREND_SOURCES.map((source) => source.url).join("\n");
  assert.ok(urls.includes("pantone.com"));
  assert.ok(urls.includes("vogue."));
});
