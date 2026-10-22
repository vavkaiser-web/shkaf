// js/data.js — справочники «ШКАФ»: категории, подкатегории, стили, поводы,
// паттерны, названия цветов, сезонные палитры, настройки и демо-шкаф.
// Чистый ES2022, никаких DOM/сети/localStorage: модуль гоняется в Node-тестах.

export const CATEGORIES = [
  { id: "top", label: "Верх", plural: "Верх", icon: "tshirt" },
  { id: "bottom", label: "Низ", plural: "Низ", icon: "trousers" },
  { id: "dress", label: "Платья", plural: "Платья", icon: "dress" },
  { id: "outerwear", label: "Верхняя одежда", plural: "Верхняя одежда", icon: "coat" },
  { id: "shoes", label: "Обувь", plural: "Обувь", icon: "sneakers" },
  { id: "bag", label: "Сумки", plural: "Сумки", icon: "tote" },
  { id: "accessory", label: "Аксессуары", plural: "Аксессуары", icon: "scarf" }
];

// gender нужен itemTitle: m — мужской, f — женский, n — средний, pl — множественное.
export const SUBCATEGORIES = {
  top: [
    { id: "tshirt", label: "Футболка", gender: "f", warmth: 1, formality: 1.7, styles: ["casual", "street", "sport"], icon: "tshirt" },
    { id: "longsleeve", label: "Лонгслив", gender: "m", warmth: 2, formality: 2.0, styles: ["casual", "street", "sport"], icon: "longsleeve" },
    { id: "shirt", label: "Рубашка", gender: "f", warmth: 2, formality: 3.4, styles: ["smart", "classic"], icon: "shirt" },
    { id: "blouse", label: "Блуза", gender: "f", warmth: 2, formality: 3.6, styles: ["classic", "romantic"], icon: "blouse" },
    { id: "sweater", label: "Свитер", gender: "m", warmth: 3, formality: 2.6, styles: ["casual", "classic", "romantic"], icon: "sweater" },
    { id: "cardigan", label: "Кардиган", gender: "m", warmth: 3, formality: 2.8, styles: ["casual", "classic", "smart"], icon: "cardigan" },
    { id: "hoodie", label: "Худи", gender: "n", warmth: 3, formality: 1.6, styles: ["casual", "street", "sport", "outdoor"], icon: "hoodie" },
    { id: "top", label: "Топ", gender: "m", warmth: 1, formality: 2.4, styles: ["casual", "romantic", "evening"], icon: "top" },
    { id: "turtleneck", label: "Водолазка", gender: "f", warmth: 4, formality: 3.2, styles: ["classic", "smart", "casual"], icon: "longsleeve" }
  ],
  bottom: [
    { id: "jeans", label: "Джинсы", gender: "pl", warmth: 3, formality: 2.0, styles: ["casual", "street"], icon: "jeans" },
    { id: "trousers", label: "Брюки", gender: "pl", warmth: 3, formality: 3.6, styles: ["smart", "classic"], icon: "trousers" },
    { id: "chinos", label: "Чиносы", gender: "pl", warmth: 2.5, formality: 2.8, styles: ["casual", "smart", "classic"], icon: "chinos" },
    { id: "shorts", label: "Шорты", gender: "pl", warmth: 1, formality: 1.8, styles: ["casual", "sport", "street"], icon: "shorts" },
    { id: "skirt", label: "Юбка миди", gender: "f", warmth: 3, formality: 3.4, styles: ["romantic", "classic", "smart"], icon: "skirt" },
    { id: "leggings", label: "Леггинсы", gender: "pl", warmth: 2, formality: 1.5, styles: ["sport", "casual"], icon: "leggings" },
    { id: "sportpants", label: "Спортивные штаны", gender: "pl", warmth: 2.5, formality: 1.3, styles: ["sport", "street"], icon: "sportpants" }
  ],
  dress: [
    { id: "dress", label: "Платье", gender: "n", warmth: 3, formality: 3.5, styles: ["romantic", "evening", "classic"], icon: "dress" },
    { id: "midi", label: "Платье миди", gender: "n", warmth: 3, formality: 3.7, styles: ["romantic", "evening", "classic"], icon: "dress" },
    { id: "sundress", label: "Сарафан", gender: "m", warmth: 1.5, formality: 3.0, styles: ["romantic", "casual"], icon: "sundress" },
    { id: "jumpsuit", label: "Комбинезон", gender: "m", warmth: 3, formality: 3.4, styles: ["smart", "classic", "street"], icon: "jumpsuit" }
  ],
  outerwear: [
    { id: "coat", label: "Пальто", gender: "n", warmth: 4, formality: 3.8, styles: ["classic", "smart", "outdoor"], icon: "coat" },
    { id: "trench", label: "Тренч", gender: "m", warmth: 3.4, formality: 3.2, styles: ["classic", "smart"], icon: "trench" },
    { id: "jacket", label: "Куртка", gender: "f", warmth: 3, formality: 2.4, styles: ["casual", "outdoor", "street"], icon: "jacket" },
    { id: "puffer", label: "Пуховик", gender: "m", warmth: 5, formality: 2.0, styles: ["casual", "outdoor", "sport"], icon: "puffer" },
    { id: "bomber", label: "Бомбер", gender: "m", warmth: 2.8, formality: 2.2, styles: ["casual", "street", "sport"], icon: "bomber" },
    { id: "blazer", label: "Пиджак", gender: "m", warmth: 3, formality: 4.2, styles: ["smart", "classic", "evening"], icon: "blazer" }
  ],
  shoes: [
    { id: "sneakers", label: "Кроссовки", gender: "pl", warmth: 2, formality: 1.7, styles: ["casual", "sport", "street"], icon: "sneakers" },
    { id: "boots", label: "Ботинки", gender: "pl", warmth: 4, formality: 2.9, styles: ["casual", "classic", "outdoor"], icon: "boots" },
    { id: "highboots", label: "Сапоги", gender: "pl", warmth: 4.7, formality: 3.2, styles: ["classic", "evening", "outdoor"], icon: "boots" },
    { id: "heels", label: "Туфли", gender: "pl", warmth: 2, formality: 4.2, styles: ["evening", "smart", "classic"], icon: "heels" },
    { id: "loafers", label: "Лоферы", gender: "pl", warmth: 2.2, formality: 3.4, styles: ["smart", "classic"], icon: "loafers" },
    { id: "sandals", label: "Сандалии", gender: "pl", warmth: 1, formality: 2.2, styles: ["casual", "romantic"], icon: "sandals" }
  ],
  bag: [
    { id: "tote", label: "Тоут", gender: "m", warmth: 3, formality: 3.0, styles: ["classic", "smart", "casual"], icon: "tote" },
    { id: "shoulder", label: "Сумка на плечо", gender: "f", warmth: 3, formality: 3.2, styles: ["classic", "smart", "street"], icon: "shoulder" },
    { id: "backpack", label: "Рюкзак", gender: "m", warmth: 3, formality: 1.8, styles: ["casual", "street", "outdoor"], icon: "backpack" },
    { id: "clutch", label: "Клатч", gender: "m", warmth: 3, formality: 4.2, styles: ["evening", "smart"], icon: "clutch" }
  ],
  accessory: [
    { id: "scarf", label: "Шарф", gender: "m", warmth: 4, formality: 2.4, styles: ["casual", "classic", "outdoor"], icon: "scarf" },
    { id: "hat", label: "Шапка", gender: "f", warmth: 4.6, formality: 2.4, styles: ["casual", "outdoor"], icon: "hat" },
    { id: "cap", label: "Кепка", gender: "f", warmth: 2, formality: 1.8, styles: ["casual", "sport", "street"], icon: "cap" },
    { id: "belt", label: "Ремень", gender: "m", warmth: 2, formality: 3.4, styles: ["classic", "smart"], icon: "belt" },
    { id: "gloves", label: "Перчатки", gender: "pl", warmth: 4.5, formality: 2.8, styles: ["classic", "casual"], icon: "gloves" },
    { id: "sunglasses", label: "Очки", gender: "pl", warmth: 1, formality: 2.6, styles: ["casual", "street"], icon: "sunglasses" },
    { id: "jewelry", label: "Украшение", gender: "n", warmth: 1, formality: 4.0, styles: ["evening", "romantic", "classic"], icon: "jewelry" }
  ]
};

export const STYLE_TAGS = [
  { id: "casual", label: "Кэжуал" },
  { id: "smart", label: "Смарт" },
  { id: "classic", label: "Классика" },
  { id: "street", label: "Стрит" },
  { id: "sport", label: "Спорт" },
  { id: "romantic", label: "Романтика" },
  { id: "outdoor", label: "Аутдор" },
  { id: "evening", label: "Вечерний" }
];

export const OCCASIONS = [
  { id: "casual", label: "Повседневный", formality: 2.4, styleHints: ["casual", "street", "classic", "sport"], icon: "coffee" },
  { id: "work", label: "Рабочий", formality: 3.9, styleHints: ["smart", "classic", "casual"], icon: "briefcase" },
  { id: "evening", label: "Вечерний", formality: 4.2, styleHints: ["evening", "romantic", "classic", "smart"], icon: "wine" },
  { id: "sport", label: "Спортивный", formality: 1.5, styleHints: ["sport", "street", "casual", "outdoor"], icon: "run" }
];

export const PATTERNS = [
  { id: "solid", label: "Однотонный" },
  { id: "striped", label: "Полоска" },
  { id: "check", label: "Клетка" },
  { id: "print", label: "Принт" },
  { id: "knit", label: "Вязка" },
  { id: "denim", label: "Деним" },
  { id: "leather", label: "Кожа" },
  { id: "other", label: "Другое" }
];

// 43 оттенка. neutral — база, которая сочетается с чем угодно.
export const COLOR_NAMES = [
  { name: "чёрный", hex: "#141414", neutral: true },
  { name: "белый", hex: "#F5F2EA", neutral: true },
  { name: "белоснежный", hex: "#FFFFFF", neutral: true },
  { name: "ивори", hex: "#EFE5D2", neutral: true },
  { name: "кремовый", hex: "#F1E7D6", neutral: true },
  { name: "сливочный", hex: "#F3E7C9", neutral: false },
  { name: "песочный", hex: "#DCC9A6", neutral: false },
  { name: "бежевый", hex: "#D8C7AE", neutral: true },
  { name: "серый", hex: "#8A8A8A", neutral: true },
  { name: "графитовый", hex: "#3B3B3B", neutral: true },
  { name: "серебристый", hex: "#C3C7CB", neutral: true },
  { name: "дымчатый", hex: "#A9AEB3", neutral: true },
  { name: "шоколадный", hex: "#4A3227", neutral: false },
  { name: "кофейный", hex: "#5A4030", neutral: false },
  { name: "коричневый", hex: "#6B4B36", neutral: false },
  { name: "бордо", hex: "#6B2233", neutral: false },
  { name: "вишнёвый", hex: "#9E1B32", neutral: false },
  { name: "алый", hex: "#C0392B", neutral: false },
  { name: "красный", hex: "#C62828", neutral: false },
  { name: "терракотовый", hex: "#B85C38", neutral: false },
  { name: "коралловый", hex: "#E8756A", neutral: false },
  { name: "горчичный", hex: "#C8A02E", neutral: false },
  { name: "лимонный", hex: "#E8D25B", neutral: false },
  { name: "сливовый", hex: "#5C2B44", neutral: false },
  { name: "лиловый", hex: "#B9A7D1", neutral: false },
  { name: "фиолетовый", hex: "#6A4C93", neutral: false },
  { name: "лавандовый", hex: "#C7B9DD", neutral: false },
  { name: "пудрово-розовый", hex: "#E8C9C4", neutral: false },
  { name: "розовый", hex: "#E4A0B0", neutral: false },
  { name: "синий ночи", hex: "#1C2A45", neutral: false },
  { name: "синий", hex: "#3B5BA5", neutral: false },
  { name: "небесно-голубой", hex: "#A9C6DE", neutral: false },
  { name: "голубой", hex: "#7FA9C9", neutral: false },
  { name: "деним", hex: "#4A6E96", neutral: false },
  { name: "оливковый", hex: "#5E5F3D", neutral: false },
  { name: "олива", hex: "#6B6B45", neutral: false },
  { name: "шалфей", hex: "#A8B79A", neutral: false },
  { name: "хаки", hex: "#7C7A55", neutral: false },
  { name: "зелёный", hex: "#3F7A4D", neutral: false },
  { name: "изумрудный", hex: "#1F6B57", neutral: false },
  { name: "мятный", hex: "#9CCBB4", neutral: false },
  { name: "бирюзовый", hex: "#3E9C9C", neutral: false },
  { name: "золотой", hex: "#C9A227", neutral: false }
];

// Прилагательные для itemTitle. Если для названия нет правила — цвет считаем
// несклоняемым и пишем через дефис («ивори-свитер», «хаки-брюки»).
const ADJECTIVE_OVERRIDES = {
  "бордо": { m: "бордовый", f: "бордовая", n: "бордовое", pl: "бордовые" },
  "олива": { m: "оливковый", f: "оливковая", n: "оливковое", pl: "оливковые" },
  "шалфей": { m: "шалфейный", f: "шалфейная", n: "шалфейное", pl: "шалфейные" },
  "синий ночи": { m: "синий", f: "синяя", n: "синее", pl: "синие" },
  "пудрово-розовый": null,
  "ивори": null,
  "хаки": null,
  "деним": null
};

function adjectiveForms(colorName) {
  const key = String(colorName || "").toLowerCase();
  if (!key) return null;
  if (Object.prototype.hasOwnProperty.call(ADJECTIVE_OVERRIDES, key)) {
    return ADJECTIVE_OVERRIDES[key];
  }
  let stem = "";
  if (key.endsWith("ый") || key.endsWith("ий") || key.endsWith("ой")) {
    stem = key.slice(0, -2);
  } else {
    return null;
  }
  if (key.endsWith("ий")) {
    return { m: key, f: `${stem}яя`, n: `${stem}ее`, pl: `${stem}ие` };
  }
  if (key.endsWith("ой")) {
    return { m: key, f: `${stem}ая`, n: `${stem}ое`, pl: `${stem}ые` };
  }
  return { m: key, f: `${stem}ая`, n: `${stem}ое`, pl: `${stem}ые` };
}

function capitalize(text) {
  if (!text) return "";
  return text[0].toUpperCase() + text.slice(1);
}

function lowerFirst(text) {
  if (!text) return "";
  return text[0].toLowerCase() + text.slice(1);
}

function findSubcategory(category, subcategoryId) {
  const list = SUBCATEGORIES[category];
  if (!Array.isArray(list)) return null;
  return list.find((s) => s.id === subcategoryId) || null;
}

export const SEASONS = {
  autumn: {
    key: "autumn",
    label: "Осень",
    title: "Осень–зима 2026/27",
    months: [9, 10, 11],
    summary:
      "Главные цвета сезона — бордо, вишня, шоколад, ивори, синий ночи и олива. Глубокие тёплые оттенки спокойно сочетаются между собой и с графитом: получается дорого и без усилий.",
    colors: [
      { name: "Бордо", hex: "#6B2233", role: "accent" },
      { name: "Вишнёвый", hex: "#9E1B32", role: "accent" },
      { name: "Сливовый", hex: "#5C2B44", role: "accent" },
      { name: "Шоколадный", hex: "#4A3227", role: "base" },
      { name: "Ивори", hex: "#EFE5D2", role: "base" },
      { name: "Синий ночи", hex: "#1C2A45", role: "base" },
      { name: "Оливковый", hex: "#5E5F3D", role: "base" },
      { name: "Горчичный", hex: "#C8A02E", role: "accent" },
      { name: "Терракотовый", hex: "#B85C38", role: "accent" },
      { name: "Графитовый", hex: "#3B3B3B", role: "neutral" }
    ],
    combos: [
      { a: "#6B2233", b: "#EFE5D2", label: "бордо + ивори", note: "Мягкий контраст: тёмный акцент на светлой базе." },
      { a: "#6B2233", b: "#4A3227", label: "бордо + шоколад", note: "Тёплое глубокое сочетание для холодных дней." },
      { a: "#4A3227", b: "#1C2A45", label: "шоколад + синий ночи", note: "Сдержанная пара для работы и вечера." },
      { a: "#4A3227", b: "#5E5F3D", label: "шоколад + олива", note: "Природные оттенки, которым легко вместе." },
      { a: "#5E5F3D", b: "#6B2233", label: "олива + бордо", note: "Благородный контраст тёплого и холодного." },
      { a: "#1C2A45", b: "#5E5F3D", label: "синий ночи + олива", note: "Спокойная городская классика." },
      { a: "#C8A02E", b: "#4A3227", label: "горчичный + шоколад", note: "Солнечный акцент на тёмном шоколаде." },
      { a: "#B85C38", b: "#EFE5D2", label: "терракота + ивори", note: "Тёплый осенний дуэт, работает и днём, и вечером." },
      { a: "#5C2B44", b: "#3B3B3B", label: "слива + графит", note: "Сдержанно и чуть загадочно." }
    ],
    keywords: ["бордо", "вишнёвый", "слива", "шоколад", "ивори", "синий ночи", "олива", "горчица", "терракота", "графит"],
    source: {
      label: "Pantone NYFW A/W 2026/27, Vogue UA, Rinascimento",
      url: "https://www.pantone.com/eu/en-de/articles/fashion-color-trend-report/new-york-fashion-week-autumn-winter-2026"
    }
  },
  winter: {
    key: "winter",
    label: "Зима",
    title: "Зима 2026/27",
    months: [12, 1, 2],
    summary:
      "Зимой та же глубокая палитра, что и осенью, только чуть темнее: бордо, шоколад, синий ночи и графит. Ивори, горчица и терракота остаются тёплыми акцентами среди тёмных вещей.",
    colors: [
      { name: "Бордо", hex: "#6B2233", role: "accent" },
      { name: "Вишнёвый", hex: "#9E1B32", role: "accent" },
      { name: "Сливовый", hex: "#5C2B44", role: "accent" },
      { name: "Шоколадный", hex: "#4A3227", role: "base" },
      { name: "Ивори", hex: "#EFE5D2", role: "base" },
      { name: "Синий ночи", hex: "#1C2A45", role: "base" },
      { name: "Оливковый", hex: "#5E5F3D", role: "base" },
      { name: "Горчичный", hex: "#C8A02E", role: "accent" },
      { name: "Терракотовый", hex: "#B85C38", role: "accent" },
      { name: "Графитовый", hex: "#3B3B3B", role: "neutral" }
    ],
    combos: [
      { a: "#6B2233", b: "#EFE5D2", label: "бордо + ивори", note: "Светлая база вытягивает тёмный бордо." },
      { a: "#6B2233", b: "#4A3227", label: "бордо + шоколад", note: "Тёплый зимний дуэт для пальто и свитера." },
      { a: "#4A3227", b: "#1C2A45", label: "шоколад + синий ночи", note: "Тёмная пара, которая не выглядит мрачно." },
      { a: "#4A3227", b: "#5E5F3D", label: "шоколад + олива", note: "Природные оттенки для повседневных образов." },
      { a: "#5E5F3D", b: "#6B2233", label: "олива + бордо", note: "Контраст, который держит образ." },
      { a: "#1C2A45", b: "#5E5F3D", label: "синий ночи + олива", note: "Городская классика на каждый день." },
      { a: "#C8A02E", b: "#4A3227", label: "горчичный + шоколад", note: "Тёплый акцент в мороз." },
      { a: "#B85C38", b: "#EFE5D2", label: "терракота + ивори", note: "Светлое пятно среди зимней одежды." },
      { a: "#5C2B44", b: "#3B3B3B", label: "слива + графит", note: "Строгий вечерний вариант." }
    ],
    keywords: ["бордо", "вишнёвый", "слива", "шоколад", "ивори", "синий ночи", "олива", "горчица", "терракота", "графит"],
    source: {
      label: "Pantone NYFW A/W 2026/27, Vogue UA, Rinascimento",
      url: "https://www.pantone.com/eu/en-de/articles/fashion-color-trend-report/new-york-fashion-week-autumn-winter-2026"
    }
  },
  spring: {
    key: "spring",
    label: "Весна",
    title: "Весна 2027 (прогноз)",
    months: [3, 4, 5],
    summary:
      "Прогноз на весну 2027: пудрово-розовый, сливочный, небесно-голубой, шалфей и лиловый. Пока это ориентир по тренд-отчётам, а не гарантия — но сочетания получаются мягкие и свежие.",
    colors: [
      { name: "Пудрово-розовый", hex: "#E8C9C4", role: "accent" },
      { name: "Сливочный", hex: "#F3E7C9", role: "base" },
      { name: "Небесно-голубой", hex: "#A9C6DE", role: "base" },
      { name: "Шалфей", hex: "#A8B79A", role: "base" },
      { name: "Шоколадный", hex: "#4A3227", role: "base" },
      { name: "Алый", hex: "#C0392B", role: "accent" },
      { name: "Лиловый", hex: "#B9A7D1", role: "accent" },
      { name: "Ивори", hex: "#EFE5D2", role: "base" },
      { name: "Графитовый", hex: "#3B3B3B", role: "neutral" }
    ],
    combos: [
      { a: "#E8C9C4", b: "#4A3227", label: "пудра + шоколад", note: "Нежный верх и тёмная база." },
      { a: "#A9C6DE", b: "#F3E7C9", label: "небо + сливки", note: "Самый светлый весенний дуэт." },
      { a: "#A8B79A", b: "#EFE5D2", label: "шалфей + ивори", note: "Спокойная зелень на тёплой базе." },
      { a: "#C0392B", b: "#3B3B3B", label: "алый + графит", note: "Один яркий акцент и строгая база." },
      { a: "#B9A7D1", b: "#F3E7C9", label: "лиловый + сливки", note: "Мягкий вечерний контраст." },
      { a: "#E8C9C4", b: "#A8B79A", label: "пудра + шалфей", note: "Тонкая игра близких оттенков." },
      { a: "#A8B79A", b: "#4A3227", label: "шалфей + шоколад", note: "Природная пара для города." },
      { a: "#B9A7D1", b: "#3B3B3B", label: "лиловый + графит", note: "Вечерний вариант с характером." }
    ],
    keywords: ["пудрово-розовый", "сливочный", "небесно-голубой", "шалфей", "шоколад", "алый", "лиловый"],
    source: {
      label: "Прогноз «ШКАФ» по тренд-отчётам: Pantone, Vogue UA, Rinascimento",
      url: "https://www.pantone.com/eu/en-de/articles/fashion-color-trend-report/new-york-fashion-week-autumn-winter-2026"
    }
  },
  summer: {
    key: "summer",
    label: "Лето",
    title: "Лето 2027 (прогноз)",
    months: [6, 7, 8],
    summary:
      "Прогноз на лето 2027: белый, песочный, олива, терракота, деним, лимонный и коралловый. Светлая база и один тёплый акцент — рабочая схема для жарких дней; это ориентир, а не гарантия.",
    colors: [
      { name: "Белый", hex: "#F5F2EA", role: "base" },
      { name: "Песочный", hex: "#DCC9A6", role: "base" },
      { name: "Олива", hex: "#6B6B45", role: "base" },
      { name: "Терракотовый", hex: "#B85C38", role: "accent" },
      { name: "Деним", hex: "#4A6E96", role: "base" },
      { name: "Лимонный", hex: "#E8D25B", role: "accent" },
      { name: "Коралловый", hex: "#E8756A", role: "accent" },
      { name: "Шоколадный", hex: "#4A3227", role: "base" },
      { name: "Графитовый", hex: "#3B3B3B", role: "neutral" }
    ],
    combos: [
      { a: "#F5F2EA", b: "#DCC9A6", label: "белый + песок", note: "Самый лёгкий летний дуэт." },
      { a: "#DCC9A6", b: "#B85C38", label: "песок + терракота", note: "Тёплая земляная пара." },
      { a: "#4A6E96", b: "#F5F2EA", label: "деним + белый", note: "Классика, которая работает всегда." },
      { a: "#6B6B45", b: "#DCC9A6", label: "олива + песок", note: "Природные оттенки для отпуска и города." },
      { a: "#E8D25B", b: "#4A6E96", label: "лимон + деним", note: "Солнечный акцент на дениме." },
      { a: "#E8756A", b: "#F5F2EA", label: "коралл + белый", note: "Свежий контраст для жаркого дня." },
      { a: "#B85C38", b: "#4A6E96", label: "терракота + деним", note: "Тёплое и прохладное в одном образе." },
      { a: "#E8D25B", b: "#3B3B3B", label: "лимон + графит", note: "Яркий акцент и строгая база." }
    ],
    keywords: ["белый", "песочный", "олива", "терракота", "деним", "лимонный", "коралловый"],
    source: {
      label: "Прогноз «ШКАФ» по тренд-отчётам: Pantone, Vogue UA, Rinascimento",
      url: "https://www.pantone.com/eu/en-de/articles/fashion-color-trend-report/new-york-fashion-week-autumn-winter-2026"
    }
  }
};

export const DEFAULT_SETTINGS = {
  place: null,
  weatherMode: "auto",
  manual: { temp: 12, precipProb: 0, windSpeed: 3, conditionKey: "cloudy" },
  selectedOccasion: "casual",
  demoLoaded: false,
  onboarded: false,
  hemisphere: "north",
  lookCount: 0
};

export const TREND_SOURCES = [
  {
    label: "Pantone · Fashion Color Trend Report A/W 2026/27",
    url: "https://www.pantone.com/eu/en-de/articles/fashion-color-trend-report/new-york-fashion-week-autumn-winter-2026",
    note: "Официальная палитра сезона: бордо, шоколад, ивори, синий ночи и олива."
  },
  {
    label: "Vogue UA · 6 самых модных цветов холодного сезона",
    url: "https://vogue.ua/article/fashion/tendencii/slivoviy-chervoniy-i-girchichniy-6-naymodnishih-koloriv-holodnogo-sezonu-65421.html",
    note: "Сливовый, черри и горчица в реальных сочетаниях."
  },
  {
    label: "Rinascimento · Палитра осень–зима",
    url: "https://magazine.rinascimento.com/es-es/blog/paleta-de-colores-rinascimento-otono-invierno",
    note: "Итальянский взгляд: Testa di Moro, Verde Olio, Avorio."
  },
  {
    label: "Vogue France · Цветовые комбо осень–зима 2026/27",
    url: "https://www.vogue.fr/article/combos-couleurs-automne-hiver-2026-2027",
    note: "Готовые пары цветов, на которых построены combos сезона."
  }
];

export function seasonForDate(date = new Date(), hemisphere = "north") {
  const parsed = date instanceof Date ? date : new Date(date);
  const month = Number.isNaN(parsed.getTime()) ? new Date().getMonth() + 1 : parsed.getMonth() + 1;
  const shift = String(hemisphere).toLowerCase() === "south" ? 6 : 0;
  const shifted = ((month - 1 + shift) % 12) + 1;
  const key =
    Object.keys(SEASONS).find((k) => SEASONS[k].months.includes(shifted)) || "autumn";
  return { ...SEASONS[key], key };
}

// Нормальное семантическое название вещи: «Бордовый свитер», «Ивори-свитер».
export function itemTitle(item = {}) {
  const category = item && item.category;
  const sub = findSubcategory(category, item && item.subcategory);
  const categoryInfo = CATEGORIES.find((c) => c.id === category);
  const label = (sub && sub.label) || (categoryInfo && categoryInfo.label) || "Вещь";
  const labelLower = String(label).toLowerCase();
  const rawColor =
    (typeof item.colorName === "string" && item.colorName.trim()) ||
    (typeof item.colorHex === "string" ? nearestColorName(item.colorHex) : "");
  const colorKey = String(rawColor || "").toLowerCase().trim();
  if (!colorKey) return capitalize(label);
  if (labelLower.includes(colorKey)) return capitalize(label);

  const gender = (sub && sub.gender) || inferGender(label);
  const forms = adjectiveForms(colorKey);
  if (forms) {
    return `${capitalize(forms[gender] || forms.m)} ${lowerFirst(label)}`;
  }
  return `${capitalize(colorKey)}-${lowerFirst(label)}`;
}

function inferGender(label) {
  const l = String(label).toLowerCase();
  if (/[ыи]$/.test(l)) return "pl";
  if (/[ая]$/.test(l)) return "f";
  if (/[ое]$/.test(l)) return "n";
  return "m";
}

function nearestColorName(hex) {
  const rgb = parseHex(hex);
  if (!rgb) return "";
  let best = null;
  let bestD = Infinity;
  for (const entry of COLOR_NAMES) {
    const e = parseHex(entry.hex);
    if (!e) continue;
    const d = (rgb.r - e.r) ** 2 + (rgb.g - e.g) ** 2 + (rgb.b - e.b) ** 2;
    if (d < bestD) {
      bestD = d;
      best = entry;
    }
  }
  return best ? best.name : "";
}

/* ------------------------------------------------------------------ */
/* SVG-фото демо-вещей: плоские силуэты одежды 600×750 с мягким фоном. */
/* ------------------------------------------------------------------ */

const PHOTO_BG = "#ECE5D8";
const PHOTO_INK = "#2B2622";

function parseHex(hex) {
  if (typeof hex !== "string") return null;
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = h.split("").map((ch) => ch + ch).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16)
  };
}

function toHex2(n) {
  return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
}

function mixColor(a, b, t) {
  const ca = parseHex(a) || { r: 128, g: 128, b: 128 };
  const cb = parseHex(b) || { r: 128, g: 128, b: 128 };
  const k = Math.max(0, Math.min(1, Number(t) || 0));
  return `#${toHex2(ca.r + (cb.r - ca.r) * k)}${toHex2(ca.g + (cb.g - ca.g) * k)}${toHex2(ca.b + (cb.b - ca.b) * k)}`;
}

function P(d, fill, extra = "") {
  return `<path d="${d}" fill="${fill}"${extra ? ` ${extra}` : ""}/>`;
}

function svgTop(c, kind) {
  const { base, dark, light, bg } = c;
  const long = ["longsleeve", "sweater", "cardigan", "blouse", "hoodie", "turtleneck"].includes(kind);
  const back = [];
  const front = [];

  if (kind === "hoodie") {
    back.push(P("M 232 176 Q 300 108 368 176 Q 344 214 300 214 Q 256 214 232 176 Z", light));
  }
  if (long) {
    back.push(P("M 214 174 L 146 200 L 138 372 L 198 390 L 214 252 Z", base));
    back.push(P("M 386 174 L 454 200 L 462 372 L 402 390 L 386 252 Z", base));
    front.push(`<rect x="136" y="368" width="64" height="28" rx="12" fill="${dark}"/>`);
    front.push(`<rect x="400" y="368" width="64" height="28" rx="12" fill="${dark}"/>`);
  } else if (kind === "top") {
    back.push(P("M 214 174 L 180 200 L 190 256 L 214 246 Z", base));
    back.push(P("M 386 174 L 420 200 L 410 256 L 386 246 Z", base));
  } else {
    back.push(P("M 214 174 L 150 202 L 164 268 L 212 250 Z", base));
    back.push(P("M 386 174 L 450 202 L 436 268 L 388 250 Z", base));
  }

  back.push(P("M 212 176 C 238 156 362 156 388 176 L 400 462 C 338 480 262 480 200 462 Z", base));

  // вырез / воротник
  if (kind === "turtleneck") {
    front.push(`<rect x="254" y="112" width="92" height="76" rx="26" fill="${base}" stroke="${dark}" stroke-width="3"/>`);
    front.push(`<path d="M 264 132 Q 300 150 336 132" fill="none" stroke="${dark}" stroke-width="3" opacity="0.5"/>`);
  } else if (kind === "cardigan") {
    front.push(P("M 256 166 L 300 244 L 344 166 L 318 160 L 300 198 L 282 160 Z", bg));
    front.push(`<path d="M 300 246 L 300 460" stroke="${dark}" stroke-width="3" opacity="0.7" fill="none"/>`);
    for (const y of [268, 326, 384, 436]) {
      front.push(`<circle cx="300" cy="${y}" r="7" fill="${light}" stroke="${dark}" stroke-width="2"/>`);
    }
  } else if (kind === "shirt" || kind === "blouse") {
    front.push(P("M 300 198 L 262 158 L 268 214 Z", light, `stroke="${dark}" stroke-width="2"`));
    front.push(P("M 300 198 L 338 158 L 332 214 Z", light, `stroke="${dark}" stroke-width="2"`));
    front.push(`<path d="M 300 200 L 300 458" stroke="${dark}" stroke-width="2" opacity="0.55" fill="none"/>`);
    for (const y of [246, 306, 366, 426]) {
      front.push(`<circle cx="312" cy="${y}" r="5" fill="${light}" stroke="${dark}" stroke-width="1.5"/>`);
    }
    if (kind === "shirt") {
      front.push(`<rect x="238" y="286" width="46" height="40" rx="6" fill="none" stroke="${dark}" stroke-width="2" opacity="0.5"/>`);
    }
  } else {
    front.push(`<ellipse cx="300" cy="172" rx="42" ry="17" fill="${bg}"/>`);
    front.push(`<path d="M 256 168 Q 300 206 344 168" fill="none" stroke="${dark}" stroke-width="7" stroke-linecap="round"/>`);
  }

  if (kind === "hoodie") {
    front.push(`<path d="M 240 382 Q 300 360 360 382 L 360 432 Q 300 452 240 432 Z" fill="none" stroke="${dark}" stroke-width="4"/>`);
    front.push(`<path d="M 286 210 L 280 288" stroke="${light}" stroke-width="5" stroke-linecap="round"/>`);
    front.push(`<path d="M 314 210 L 320 288" stroke="${light}" stroke-width="5" stroke-linecap="round"/>`);
  }
  if (kind === "sweater" || kind === "turtleneck") {
    front.push(`<g stroke="${dark}" stroke-width="2" opacity="0.18">`);
    for (const x of [242, 272, 300, 328, 358]) front.push(`<path d="M ${x} 214 L ${x} 452"/>`);
    front.push(`</g>`);
  }
  front.push(`<path d="M 202 452 Q 300 470 398 452" fill="none" stroke="${dark}" stroke-width="10" opacity="0.3"/>`);

  return back.join("") + front.join("");
}

function svgPants(c, kind) {
  const { base, dark, light } = c;
  const parts = [];
  if (kind === "skirt") {
    parts.push(P("M 214 262 L 386 262 L 454 610 Q 300 642 146 610 Z", base));
    for (const x of [252, 300, 348]) {
      parts.push(`<path d="M ${x} 278 L ${x - 12} 606" stroke="${dark}" stroke-width="2" opacity="0.25" fill="none"/>`);
    }
  } else if (kind === "shorts") {
    parts.push(P("M 214 262 L 386 262 L 394 430 L 316 430 L 300 372 L 284 430 L 206 430 Z", base));
    parts.push(`<path d="M 300 264 L 300 372" stroke="${dark}" stroke-width="2" opacity="0.45" fill="none"/>`);
  } else {
    parts.push(P("M 216 262 L 384 262 L 396 644 L 314 644 L 300 456 L 286 644 L 204 644 Z", base));
    parts.push(`<path d="M 300 264 L 300 456" stroke="${dark}" stroke-width="2" opacity="0.45" fill="none"/>`);
    parts.push(`<path d="M 226 292 Q 258 314 250 344" stroke="${dark}" stroke-width="3" fill="none"/>`);
    parts.push(`<path d="M 374 292 Q 342 314 350 344" stroke="${dark}" stroke-width="3" fill="none"/>`);
    parts.push(`<path d="M 220 300 L 210 636" stroke="${dark}" stroke-width="2" opacity="0.28" fill="none"/>`);
    parts.push(`<path d="M 380 300 L 390 636" stroke="${dark}" stroke-width="2" opacity="0.28" fill="none"/>`);
    if (kind === "jeans") {
      parts.push(`<path d="M 230 432 Q 258 454 282 442" stroke="${light}" stroke-width="3" fill="none" opacity="0.55"/>`);
      parts.push(`<path d="M 370 432 Q 342 454 318 442" stroke="${light}" stroke-width="3" fill="none" opacity="0.55"/>`);
      for (const x of [238, 300, 362]) {
        parts.push(`<rect x="${x}" y="232" width="10" height="36" rx="4" fill="${dark}"/>`);
      }
    }
    if (kind === "sportpants") {
      parts.push(`<rect x="202" y="618" width="86" height="30" rx="12" fill="${dark}"/>`);
      parts.push(`<rect x="312" y="618" width="86" height="30" rx="12" fill="${dark}"/>`);
      parts.push(`<path d="M 224 304 L 214 626" stroke="${light}" stroke-width="7" opacity="0.5" fill="none"/>`);
    }
    if (kind === "leggings") {
      parts.push(`<path d="M 258 456 L 252 636" stroke="${dark}" stroke-width="2" opacity="0.25" fill="none"/>`);
      parts.push(`<path d="M 342 456 L 348 636" stroke="${dark}" stroke-width="2" opacity="0.25" fill="none"/>`);
    }
  }
  parts.push(`<rect x="212" y="234" width="176" height="30" rx="9" fill="${dark}"/>`);
  return parts.join("");
}

function svgDress(c, kind) {
  const { base, dark, light, bg } = c;
  const parts = [];
  if (kind === "jumpsuit") {
    parts.push(P("M 250 186 C 268 168 332 168 350 186 L 366 330 L 392 640 L 318 640 L 300 470 L 282 640 L 208 640 L 234 330 Z", base));
    parts.push(`<path d="M 234 330 Q 300 346 366 330" stroke="${dark}" stroke-width="5" fill="none"/>`);
    parts.push(`<rect x="232" y="318" width="136" height="22" rx="9" fill="${dark}"/>`);
  } else if (kind === "sundress") {
    parts.push(`<path d="M 252 176 L 264 224" stroke="${base}" stroke-width="15" stroke-linecap="round" fill="none"/>`);
    parts.push(`<path d="M 348 176 L 336 224" stroke="${base}" stroke-width="15" stroke-linecap="round" fill="none"/>`);
    parts.push(P("M 240 214 L 360 214 L 430 616 Q 300 650 170 616 Z", base));
    parts.push(`<path d="M 240 214 Q 300 238 360 214" stroke="${dark}" stroke-width="4" fill="none"/>`);
  } else {
    parts.push(P("M 252 182 L 206 208 L 216 262 L 256 244 Z", base));
    parts.push(P("M 348 182 L 394 208 L 384 262 L 344 244 Z", base));
    parts.push(P("M 250 184 C 268 166 332 166 350 184 L 366 330 L 436 610 Q 300 648 164 610 L 234 330 Z", base));
    parts.push(`<path d="M 234 330 Q 300 346 366 330" stroke="${dark}" stroke-width="5" fill="none"/>`);
    for (const x of [260, 300, 340]) {
      parts.push(`<path d="M ${x} 356 L ${x} 612" stroke="${dark}" stroke-width="2" opacity="0.16" fill="none"/>`);
    }
  }
  parts.push(`<ellipse cx="300" cy="186" rx="38" ry="16" fill="${bg}"/>`);
  parts.push(`<path d="M 262 182 Q 300 212 338 182" fill="none" stroke="${dark}" stroke-width="4" stroke-linecap="round"/>`);
  if (kind === "dress" || kind === "midi") {
    parts.push(`<path d="M 246 384 Q 300 398 354 384" stroke="${light}" stroke-width="4" fill="none" opacity="0.5"/>`);
  }
  return parts.join("");
}

function svgOuter(c, kind) {
  const { base, dark, light } = c;
  const parts = [];
  parts.push(P("M 206 176 L 140 204 L 134 512 L 192 528 L 206 260 Z", base));
  parts.push(P("M 394 176 L 460 204 L 466 512 L 408 528 L 394 260 Z", base));

  if (kind === "puffer") {
    parts.push(P("M 196 178 C 226 146 374 146 404 178 L 414 506 Q 300 532 186 506 Z", base));
    parts.push(`<g stroke="${dark}" stroke-width="2.5" opacity="0.35" fill="none">`);
    for (let y = 222; y <= 494; y += 44) {
      parts.push(`<path d="M 192 ${y} Q 300 ${y + 16} 408 ${y}"/>`);
    }
    parts.push(`</g>`);
    parts.push(`<path d="M 242 168 Q 300 214 358 168" fill="none" stroke="${dark}" stroke-width="14" stroke-linecap="round"/>`);
    parts.push(`<rect x="200" y="496" width="200" height="26" rx="12" fill="${dark}"/>`);
    parts.push(`<path d="M 300 190 L 300 508" stroke="${dark}" stroke-width="3" opacity="0.5" fill="none"/>`);
  } else if (kind === "jacket" || kind === "bomber" || kind === "blazer") {
    parts.push(P("M 210 176 C 234 154 366 154 390 176 L 402 456 Q 300 476 198 456 Z", base));
    parts.push(`<path d="M 300 186 L 300 462" stroke="${dark}" stroke-width="3" opacity="0.6" fill="none"/>`);
    if (kind === "blazer") {
      parts.push(P("M 258 166 L 300 258 L 342 166 L 316 158 L 300 202 L 284 158 Z", light, `stroke="${dark}" stroke-width="2"`));
      parts.push(`<rect x="228" y="360" width="52" height="34" rx="6" fill="none" stroke="${dark}" stroke-width="2.5"/>`);
      parts.push(`<rect x="272" y="214" width="26" height="22" rx="3" fill="${light}"/>`);
    } else {
      parts.push(`<path d="M 258 164 Q 300 208 342 164" fill="none" stroke="${light}" stroke-width="12" stroke-linecap="round" opacity="0.7"/>`);
      parts.push(`<rect x="288" y="196" width="24" height="12" rx="5" fill="${light}" stroke="${dark}"/>`);
      parts.push(`<rect x="226" y="398" width="58" height="30" rx="6" fill="none" stroke="${dark}" stroke-width="2.5"/>`);
      parts.push(`<rect x="316" y="398" width="58" height="30" rx="6" fill="none" stroke="${dark}" stroke-width="2.5"/>`);
    }
    if (kind === "bomber") {
      parts.push(`<rect x="200" y="446" width="200" height="28" rx="12" fill="${dark}"/>`);
      parts.push(`<rect x="136" y="496" width="62" height="26" rx="11" fill="${dark}"/>`);
      parts.push(`<rect x="402" y="496" width="62" height="26" rx="11" fill="${dark}"/>`);
    }
  } else {
    // пальто / тренч
    parts.push(P("M 204 176 C 232 152 368 152 396 176 L 418 612 Q 300 632 182 612 Z", base));
    parts.push(P("M 258 166 L 300 254 L 342 166 L 316 158 L 300 198 L 284 158 Z", light));
    parts.push(`<path d="M 300 236 L 300 616" stroke="${dark}" stroke-width="2" opacity="0.4" fill="none"/>`);
    parts.push(`<rect x="212" y="416" width="176" height="24" rx="10" fill="${dark}" opacity="0.85"/>`);
    parts.push(`<rect x="282" y="408" width="36" height="40" rx="8" fill="${light}"/>`);
    for (const y of [264, 322, 380]) {
      parts.push(`<circle cx="300" cy="${y}" r="6" fill="${light}" stroke="${dark}" stroke-width="1.5"/>`);
    }
    parts.push(`<rect x="216" y="470" width="62" height="36" rx="8" fill="none" stroke="${dark}" stroke-width="3"/>`);
    parts.push(`<rect x="322" y="470" width="62" height="36" rx="8" fill="none" stroke="${dark}" stroke-width="3"/>`);
    if (kind === "trench") {
      for (const x of [274, 326]) {
        for (const y of [300, 360]) {
          parts.push(`<circle cx="${x}" cy="${y}" r="6" fill="${light}" stroke="${dark}" stroke-width="1.5"/>`);
        }
      }
    }
  }
  return parts.join("");
}

function svgShoe(c, kind) {
  const { base, dark, light } = c;
  const parts = [];
  if (kind === "boots" || kind === "highboots") {
    const top = kind === "highboots" ? 392 : 462;
    parts.push(P(`M 240 ${top} L 360 ${top} L 374 590 Q 300 608 226 590 Z`, base, `stroke="${dark}" stroke-width="2"`));
    parts.push(`<path d="M 300 ${top + 16} L 300 586" stroke="${light}" stroke-width="4" opacity="0.35" fill="none"/>`);
    parts.push(P("M 206 586 Q 300 610 394 586 L 410 634 Q 300 660 190 634 Z", base));
    parts.push(P("M 190 634 Q 300 660 410 634 L 408 654 Q 300 678 192 654 Z", dark));
    parts.push(`<path d="M 300 ${top + 14} L 300 588" stroke="${dark}" stroke-width="2" opacity="0.4" fill="none"/>`);
    parts.push(`<rect x="226" y="${top - 14}" width="148" height="26" rx="10" fill="${dark}"/>`);
  } else if (kind === "sneakers") {
    // подошва
    parts.push(P("M 104 636 Q 302 672 498 636 L 498 608 Q 302 646 104 608 Z", dark));
    // верх: носок слева, подъём, вырез под щиколотку, пятка справа
    parts.push(
      P(
        "M 112 608 C 120 580 140 564 170 554 C 220 538 280 528 340 520 C 378 515 406 512 424 518 C 436 522 438 540 430 552 C 425 560 438 560 448 550 C 470 530 492 550 496 582 L 498 608 Q 302 646 112 608 Z",
        base,
        `stroke="${dark}" stroke-width="3.5"`
      )
    );
    parts.push(`<path d="M 466 534 Q 486 558 492 586" fill="none" stroke="${dark}" stroke-width="4" opacity="0.65"/>`);
    parts.push(P("M 112 608 C 124 578 146 562 176 552 C 196 560 204 582 210 600 Q 170 620 112 610 Z", light, `opacity="0.55"`));
    for (let i = 0; i < 4; i += 1) {
      const x = 250 + i * 28;
      parts.push(`<path d="M ${x} ${588 - i * 2} L ${x + 46} ${556 - i * 4}" stroke="${dark}" stroke-width="5" stroke-linecap="round" opacity="0.6"/>`);
    }
    parts.push(P("M 392 526 C 408 522 424 526 428 540 L 396 544 C 388 536 388 530 392 526 Z", light, `stroke="${dark}" stroke-width="2"`));
    parts.push(`<path d="M 112 610 Q 300 644 498 610" fill="none" stroke="${dark}" stroke-width="2.5" opacity="0.35"/>`);
  } else if (kind === "loafers") {
    // подошва
    parts.push(P("M 104 636 Q 302 670 498 636 L 498 612 Q 302 646 104 612 Z", dark));
    // верх лофера: низкий профиль с подъёмом у пятки
    parts.push(
      P(
        "M 112 610 C 120 584 146 570 190 562 C 250 550 330 542 390 542 C 440 542 470 550 484 566 C 494 580 498 596 498 612 Q 302 646 112 610 Z",
        base,
        `stroke="${dark}" stroke-width="3.5"`
      )
    );
    parts.push(`<path d="M 236 590 Q 302 574 368 588" fill="none" stroke="${dark}" stroke-width="9" stroke-linecap="round" opacity="0.85"/>`);
    parts.push(`<path d="M 460 554 Q 484 574 490 600" fill="none" stroke="${dark}" stroke-width="4" opacity="0.6"/>`);
    parts.push(`<path d="M 120 610 Q 302 640 490 610" fill="none" stroke="${light}" stroke-width="5" opacity="0.5"/>`);
  } else if (kind === "heels") {
    parts.push(P("M 196 600 Q 214 548 300 544 Q 386 548 404 600 L 356 624 L 240 624 Z", base));
    parts.push(`<rect x="346" y="618" width="20" height="38" rx="6" fill="${dark}"/>`);
    parts.push(`<path d="M 196 600 Q 300 626 404 600" stroke="${light}" stroke-width="7" fill="none" opacity="0.6"/>`);
  } else if (kind === "sandals") {
    parts.push(`<path d="M 176 606 Q 300 634 424 606 L 424 626 Q 300 654 176 626 Z" fill="${dark}"/>`);
    parts.push(`<path d="M 214 606 Q 240 546 300 540 Q 360 546 386 606" fill="none" stroke="${base}" stroke-width="15"/>`);
    parts.push(`<path d="M 232 604 Q 258 572 286 566" fill="none" stroke="${base}" stroke-width="11"/>`);
    parts.push(`<path d="M 368 604 Q 342 572 314 566" fill="none" stroke="${base}" stroke-width="11"/>`);
  } else {
    parts.push(P("M 186 594 Q 204 546 300 542 Q 396 546 414 594 Q 404 634 300 640 Q 196 634 186 594 Z", base));
  }
  const cfg =
    kind === "highboots"
      ? { cy: 535, scale: 1.28 }
      : kind === "boots"
        ? { cy: 570, scale: 1.3 }
        : { cy: 596, scale: 1.4 };
  return `<g transform="translate(300 430) scale(${cfg.scale}) translate(-300 -${cfg.cy})">${parts.join("")}</g>`;
}

function svgBag(c, kind) {
  const { base, dark, light } = c;
  const parts = [];
  if (kind === "backpack") {
    parts.push(`<rect x="216" y="344" width="168" height="216" rx="44" fill="${base}"/>`);
    parts.push(`<path d="M 258 344 Q 258 280 300 280 Q 342 280 342 344" fill="none" stroke="${dark}" stroke-width="12" stroke-linecap="round"/>`);
    parts.push(`<rect x="246" y="400" width="108" height="88" rx="16" fill="none" stroke="${dark}" stroke-width="4"/>`);
    parts.push(`<path d="M 300 344 L 300 560" stroke="${dark}" stroke-width="2" opacity="0.4" fill="none"/>`);
  } else if (kind === "clutch") {
    parts.push(`<rect x="210" y="420" width="180" height="118" rx="26" fill="${base}"/>`);
    parts.push(`<path d="M 210 456 L 390 456" stroke="${dark}" stroke-width="3" opacity="0.5" fill="none"/>`);
    parts.push(`<circle cx="300" cy="478" r="11" fill="${light}" stroke="${dark}" stroke-width="2"/>`);
  } else if (kind === "shoulder") {
    parts.push(`<rect x="228" y="380" width="144" height="176" rx="20" fill="${base}"/>`);
    parts.push(`<path d="M 246 380 Q 250 286 300 286 Q 350 286 354 380" fill="none" stroke="${dark}" stroke-width="13" stroke-linecap="round"/>`);
    parts.push(`<path d="M 228 410 L 372 410" stroke="${light}" stroke-width="4" opacity="0.4" fill="none"/>`);
  } else {
    parts.push(`<rect x="216" y="338" width="168" height="222" rx="18" fill="${base}"/>`);
    parts.push(`<path d="M 252 338 Q 252 262 300 262 Q 348 262 348 338" fill="none" stroke="${dark}" stroke-width="14" stroke-linecap="round"/>`);
    parts.push(`<path d="M 216 368 L 384 368" stroke="${light}" stroke-width="4" opacity="0.4" fill="none"/>`);
    parts.push(`<rect x="278" y="376" width="44" height="22" rx="5" fill="${light}" opacity="0.8"/>`);
  }
  return parts.join("");
}

function svgAccessory(c, kind) {
  const { base, dark, light } = c;
  const parts = [];
  if (kind === "scarf") {
    parts.push(`<ellipse cx="300" cy="286" rx="88" ry="54" fill="none" stroke="${base}" stroke-width="30"/>`);
    parts.push(P("M 246 320 Q 228 432 244 552 L 306 552 Q 296 432 302 320 Z", base));
    parts.push(P("M 354 320 Q 372 432 356 552 L 312 552 Q 318 432 316 320 Z", base));
    parts.push(`<path d="M 300 330 Q 292 432 296 548" stroke="${dark}" stroke-width="2" opacity="0.35" fill="none"/>`);
    for (let y = 552; y < 604; y += 14) {
      parts.push(`<path d="M ${252 + (y - 552) * 0.05} ${y} L ${252 + (y - 552) * 0.05} ${y + 9}" stroke="${dark}" stroke-width="3" opacity="0.6"/>`);
      parts.push(`<path d="M ${348 - (y - 552) * 0.05} ${y} L ${348 - (y - 552) * 0.05} ${y + 9}" stroke="${dark}" stroke-width="3" opacity="0.6"/>`);
    }
  } else if (kind === "hat") {
    parts.push(`<path d="M 206 374 Q 300 248 394 374 Z" fill="${base}"/>`);
    parts.push(`<rect x="194" y="364" width="212" height="50" rx="24" fill="${dark}"/>`);
    parts.push(`<g stroke="${dark}" stroke-width="2" opacity="0.22">`);
    for (const x of [244, 272, 300, 328, 356]) parts.push(`<path d="M ${x} 372 L ${x} 322"/>`);
    parts.push(`</g>`);
  } else if (kind === "cap") {
    parts.push(`<path d="M 212 376 Q 300 268 388 376 Z" fill="${base}"/>`);
    parts.push(`<path d="M 210 376 Q 300 356 390 376 Q 420 388 400 404 Q 300 424 200 404 Q 180 388 210 376 Z" fill="${dark}"/>`);
    parts.push(`<circle cx="300" cy="296" r="10" fill="${light}"/>`);
  } else if (kind === "belt") {
    parts.push(`<rect x="182" y="358" width="236" height="38" rx="10" fill="${base}"/>`);
    parts.push(`<rect x="270" y="344" width="62" height="66" rx="9" fill="none" stroke="${light}" stroke-width="8"/>`);
    parts.push(`<path d="M 300 344 L 300 410" stroke="${light}" stroke-width="6"/>`);
    for (const x of [368, 386, 404]) {
      parts.push(`<circle cx="${x}" cy="377" r="5" fill="${dark}"/>`);
    }
  } else if (kind === "gloves") {
    parts.push(P("M 196 400 L 196 330 Q 196 300 224 300 Q 252 300 252 330 L 252 400 Q 252 440 224 440 Q 196 440 196 400 Z", base));
    parts.push(P("M 300 400 L 300 320 Q 300 290 328 290 Q 356 290 356 320 L 356 400 Q 356 444 328 444 Q 300 444 300 400 Z", base));
    parts.push(`<path d="M 196 386 L 252 386" stroke="${dark}" stroke-width="7"/>`);
    parts.push(`<path d="M 300 382 L 356 382" stroke="${dark}" stroke-width="7"/>`);
    parts.push(P("M 236 330 Q 262 322 268 348 Q 268 372 244 372 Z", base));
    parts.push(P("M 320 322 Q 346 314 352 340 Q 352 364 328 364 Z", base));
  } else if (kind === "sunglasses") {
    parts.push(`<rect x="188" y="330" width="92" height="62" rx="26" fill="${base}" opacity="0.85"/>`);
    parts.push(`<rect x="320" y="330" width="92" height="62" rx="26" fill="${base}" opacity="0.85"/>`);
    parts.push(`<path d="M 280 356 Q 300 344 320 356" fill="none" stroke="${dark}" stroke-width="7"/>`);
    parts.push(`<path d="M 188 348 L 142 330" stroke="${dark}" stroke-width="6" stroke-linecap="round"/>`);
    parts.push(`<path d="M 412 348 L 458 330" stroke="${dark}" stroke-width="6" stroke-linecap="round"/>`);
  } else if (kind === "jewelry") {
    parts.push(`<path d="M 214 296 Q 300 452 386 296" fill="none" stroke="${base}" stroke-width="7"/>`);
    parts.push(`<circle cx="300" cy="430" r="20" fill="${base}" stroke="${dark}" stroke-width="2"/>`);
    for (const x of [252, 348]) {
      parts.push(`<circle cx="${x}" cy="362" r="8" fill="${light}" stroke="${dark}" stroke-width="1.5"/>`);
    }
  } else {
    parts.push(`<path d="M 300 190 L 300 240 M 300 240 L 210 420 L 390 420 Z" fill="none" stroke="${base}" stroke-width="12" stroke-linejoin="round"/>`);
  }
  return parts.join("");
}

function shapeSvg(icon, c) {
  switch (icon) {
    case "tshirt":
    case "top":
      return svgTop(c, icon === "top" ? "top" : "tshirt");
    case "longsleeve":
      return svgTop(c, "longsleeve");
    case "shirt":
      return svgTop(c, "shirt");
    case "blouse":
      return svgTop(c, "blouse");
    case "sweater":
      return svgTop(c, "sweater");
    case "cardigan":
      return svgTop(c, "cardigan");
    case "hoodie":
      return svgTop(c, "hoodie");
    case "jeans":
      return svgPants(c, "jeans");
    case "trousers":
    case "chinos":
      return svgPants(c, "trousers");
    case "sportpants":
      return svgPants(c, "sportpants");
    case "leggings":
      return svgPants(c, "leggings");
    case "shorts":
      return svgPants(c, "shorts");
    case "skirt":
      return svgPants(c, "skirt");
    case "dress":
    case "midi":
      return svgDress(c, "dress");
    case "sundress":
      return svgDress(c, "sundress");
    case "jumpsuit":
      return svgDress(c, "jumpsuit");
    case "coat":
      return svgOuter(c, "coat");
    case "trench":
      return svgOuter(c, "trench");
    case "jacket":
      return svgOuter(c, "jacket");
    case "puffer":
      return svgOuter(c, "puffer");
    case "bomber":
      return svgOuter(c, "bomber");
    case "blazer":
      return svgOuter(c, "blazer");
    case "sneakers":
      return svgShoe(c, "sneakers");
    case "boots":
    case "highboots":
      return svgShoe(c, icon === "highboots" ? "highboots" : "boots");
    case "loafers":
      return svgShoe(c, "loafers");
    case "heels":
      return svgShoe(c, "heels");
    case "sandals":
      return svgShoe(c, "sandals");
    case "tote":
      return svgBag(c, "tote");
    case "shoulder":
      return svgBag(c, "shoulder");
    case "backpack":
      return svgBag(c, "backpack");
    case "clutch":
      return svgBag(c, "clutch");
    case "scarf":
      return svgAccessory(c, "scarf");
    case "hat":
      return svgAccessory(c, "hat");
    case "cap":
      return svgAccessory(c, "cap");
    case "belt":
      return svgAccessory(c, "belt");
    case "gloves":
      return svgAccessory(c, "gloves");
    case "sunglasses":
      return svgAccessory(c, "sunglasses");
    case "jewelry":
      return svgAccessory(c, "jewelry");
    default:
      return svgAccessory(c, "jewelry");
  }
}

function garmentPhoto(item) {
  const sub = findSubcategory(item.category, item.subcategory);
  const icon = (sub && sub.icon) || "tshirt";
  const base = /^#[0-9a-fA-F]{6}$/.test(String(item.colorHex || "")) ? item.colorHex : "#8A8A8A";
  const secondary = /^#[0-9a-fA-F]{6}$/.test(String(item.secondaryHex || ""))
    ? item.secondaryHex
    : mixColor(base, "#FFFFFF", 0.5);
  const c = {
    base,
    dark: mixColor(base, PHOTO_INK, 0.5),
    light: mixColor(base, "#FFFFFF", 0.58),
    sec: secondary,
    bg: PHOTO_BG
  };
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 750" width="600" height="750">` +
    `<rect width="600" height="750" fill="${PHOTO_BG}"/>` +
    `<circle cx="486" cy="156" r="132" fill="${mixColor(base, PHOTO_BG, 0.8)}"/>` +
    `<circle cx="104" cy="626" r="106" fill="${mixColor(secondary, PHOTO_BG, 0.82)}"/>` +
    `<ellipse cx="300" cy="676" rx="152" ry="20" fill="${PHOTO_INK}" opacity="0.07"/>` +
    shapeSvg(icon, c) +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const DAY_MS = 86400000;

export function demoWardrobe() {
  const now = Date.now();
  const defs = [
    {
      category: "top", subcategory: "sweater", colorHex: "#EFE5D2", secondaryHex: "#E2D5BC",
      pattern: "knit", warmth: 3, formality: 2.7, styles: ["casual", "classic", "romantic"],
      favorite: true, wearCount: 3, lastWornDaysAgo: 2,
      notes: "Любимый свитер: тёплый, но не колючий."
    },
    {
      category: "top", subcategory: "turtleneck", colorHex: "#4A3227",
      pattern: "knit", warmth: 4, formality: 3.2, styles: ["classic", "smart", "casual"],
      notes: "Базовая водолазка под пальто и пиджак."
    },
    {
      category: "top", subcategory: "shirt", colorHex: "#1C2A45", secondaryHex: "#2F4066",
      pattern: "solid", warmth: 2, formality: 3.6, styles: ["smart", "classic"],
      notes: "Рубашка на все случаи: и в офис, и на ужин."
    },
    {
      category: "top", subcategory: "cardigan", colorHex: "#6B2233",
      pattern: "knit", warmth: 3, formality: 3.0, styles: ["casual", "classic", "romantic"],
      wearCount: 5, lastWornDaysAgo: 8,
      notes: "Бордовый кардиган вместо пиджака."
    },
    {
      category: "bottom", subcategory: "trousers", colorHex: "#4A3227",
      pattern: "solid", warmth: 3, formality: 3.7, styles: ["smart", "classic"],
      wearCount: 4, lastWornDaysAgo: 1,
      notes: "Шоколадные брюки с высокой посадкой."
    },
    {
      category: "bottom", subcategory: "jeans", colorHex: "#1C2A45", secondaryHex: "#4A6E96",
      pattern: "denim", warmth: 3, formality: 2.0, styles: ["casual", "street"],
      notes: "Тёмные джинсы без потёртостей."
    },
    {
      category: "bottom", subcategory: "skirt", colorHex: "#5E5F3D",
      pattern: "solid", warmth: 3, formality: 3.4, styles: ["romantic", "classic", "smart"],
      notes: "Оливковая юбка миди, хорошо держит складку."
    },
    {
      category: "bottom", subcategory: "trousers", colorHex: "#141414",
      pattern: "solid", warmth: 2.6, formality: 4.2, styles: ["smart", "classic", "evening"],
      notes: "Чёрные брюки — строгая база."
    },
    {
      category: "dress", subcategory: "midi", colorHex: "#6B2233",
      pattern: "solid", warmth: 3, formality: 3.7, styles: ["romantic", "evening", "classic"],
      favorite: true,
      notes: "Бордовое платье миди для ужина и театра."
    },
    {
      category: "dress", subcategory: "dress", colorHex: "#5C2B44",
      pattern: "solid", warmth: 2.5, formality: 3.5, styles: ["evening", "romantic"],
      notes: "Сливовое платье с мягкой драпировкой."
    },
    {
      category: "outerwear", subcategory: "coat", colorHex: "#4A3227",
      pattern: "solid", warmth: 4.2, formality: 3.8, styles: ["classic", "smart", "outdoor"],
      notes: "Шоколадное пальто прямого кроя."
    },
    {
      category: "outerwear", subcategory: "jacket", colorHex: "#5E5F3D", secondaryHex: "#3F4030",
      pattern: "solid", warmth: 3.2, formality: 2.4, waterproof: true, styles: ["casual", "outdoor", "street"],
      notes: "Оливковая куртка с водоотталкивающей пропиткой."
    },
    {
      category: "outerwear", subcategory: "puffer", colorHex: "#141414",
      pattern: "solid", warmth: 5, formality: 2.0, waterproof: true, styles: ["casual", "outdoor", "sport"],
      notes: "Чёрный пуховик для настоящего мороза."
    },
    {
      category: "shoes", subcategory: "sneakers", colorHex: "#F5F2EA", secondaryHex: "#D8D4CB",
      pattern: "solid", warmth: 2, formality: 1.8, styles: ["casual", "sport", "street"],
      favorite: true, wearCount: 6, lastWornDaysAgo: 3,
      notes: "Белые кроссовки — универсальная пара."
    },
    {
      category: "shoes", subcategory: "boots", colorHex: "#4A3227", secondaryHex: "#2E1F18",
      pattern: "leather", warmth: 4.2, formality: 2.9, waterproof: true, styles: ["casual", "classic", "outdoor"],
      notes: "Шоколадные ботинки на толстой подошве."
    },
    {
      category: "shoes", subcategory: "highboots", colorHex: "#141414", secondaryHex: "#2A2A2A",
      pattern: "leather", warmth: 4.7, formality: 3.2, waterproof: true, styles: ["classic", "evening", "outdoor"],
      wearCount: 3, lastWornDaysAgo: 5,
      notes: "Чёрные сапоги до колена."
    },
    {
      category: "shoes", subcategory: "loafers", colorHex: "#EFE5D2", secondaryHex: "#C9B493",
      pattern: "leather", warmth: 2.2, formality: 3.4, styles: ["smart", "classic"],
      notes: "Ивори-лоферы для более собранных образов."
    },
    {
      category: "bag", subcategory: "tote", colorHex: "#4A3227",
      pattern: "leather", warmth: 3, formality: 3.2, styles: ["classic", "smart", "casual"],
      notes: "Шоколадный тоут — влезает ноутбук и шарф."
    },
    {
      category: "accessory", subcategory: "scarf", colorHex: "#C8A02E",
      pattern: "knit", warmth: 4, formality: 2.4, styles: ["casual", "classic", "outdoor"],
      notes: "Горчичный шарф — единственное яркое пятно."
    },
    {
      category: "accessory", subcategory: "hat", colorHex: "#6B2233",
      pattern: "knit", warmth: 4.6, formality: 2.4, styles: ["casual", "outdoor"],
      notes: "Бордовая шапка под цвет кардигана."
    }
  ];

  return defs.map((d, index) => {
    const sub = findSubcategory(d.category, d.subcategory);
    const colorName = nearestColorName(d.colorHex);
    const item = {
      id: `it_demo_${String(index + 1).padStart(2, "0")}`,
      name: "",
      category: d.category,
      subcategory: d.subcategory,
      colorHex: d.colorHex,
      secondaryHex: d.secondaryHex || null,
      colorName,
      pattern: d.pattern || "solid",
      warmth: d.warmth ?? (sub ? sub.warmth : 3),
      formality: d.formality ?? (sub ? sub.formality : 2.5),
      waterproof: Boolean(d.waterproof),
      styles: (d.styles || (sub ? sub.styles : ["casual"])).slice(),
      photo: "",
      favorite: Boolean(d.favorite),
      wearCount: d.wearCount || 0,
      lastWorn: d.lastWornDaysAgo != null ? now - d.lastWornDaysAgo * DAY_MS : null,
      createdAt: now - (42 + index * 3) * DAY_MS,
      source: "demo",
      notes: d.notes || ""
    };
    item.name = itemTitle(item);
    item.photo = garmentPhoto(item);
    return item;
  });
}
