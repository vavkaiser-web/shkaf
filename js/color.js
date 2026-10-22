// js/color.js — цветовая наука «ШКАФ»: RGB/HSL/Lab, CIE76, названия цветов,
// нейтральность, гармония пар, близость к палитре сезона и k-means по фото.
// В Node модуль импортируется без браузерных API: canvas трогаем только внутри
// paletteFromImage и только если document существует.

import { SEASONS, COLOR_NAMES } from "./data.js";

const NEUTRAL_CHROMA = 15;
const XN = 95.047;
const YN = 100.0;
const ZN = 108.883;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function round(value, digits = 0) {
  const k = 10 ** digits;
  return Math.round(value * k) / k;
}

export function hexToRgb(hex) {
  if (typeof hex !== "string") return null;
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) {
    h = h
      .split("")
      .map((ch) => ch + ch)
      .join("");
  }
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16)
  };
}

export function rgbToHex({ r, g, b } = {}) {
  const to = (n) => clamp(Math.round(Number(n) || 0), 0, 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

function srgbToLinear(channel) {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function labPivot(t) {
  return t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
}

export function rgbToLab({ r, g, b } = {}) {
  const rr = Number.isFinite(r) ? r : 0;
  const gg = Number.isFinite(g) ? g : 0;
  const bb = Number.isFinite(b) ? b : 0;
  const rl = srgbToLinear(rr);
  const gl = srgbToLinear(gg);
  const bl = srgbToLinear(bb);
  const x = (0.4124564 * rl + 0.3575761 * gl + 0.1804375 * bl) * 100;
  const y = (0.2126729 * rl + 0.7151522 * gl + 0.072175 * bl) * 100;
  const z = (0.0193339 * rl + 0.119192 * gl + 0.9503041 * bl) * 100;
  const fx = labPivot(x / XN);
  const fy = labPivot(y / YN);
  const fz = labPivot(z / ZN);
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

export function hexToLab(hex) {
  const rgb = hexToRgb(hex);
  return rgb ? rgbToLab(rgb) : null;
}

export function deltaE(hexA, hexB) {
  const a = hexToLab(hexA);
  const b = hexToLab(hexB);
  if (!a || !b) return 100;
  return Math.sqrt((a.L - b.L) ** 2 + (a.a - b.a) ** 2 + (a.b - b.b) ** 2);
}

export function hexToHsl(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d > 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
        break;
      case g:
        h = ((b - r) / d + 2) * 60;
        break;
      default:
        h = ((r - g) / d + 4) * 60;
        break;
    }
  }
  return { h, s, l };
}

export function isNeutral(hex) {
  const lab = hexToLab(hex);
  if (!lab) return false;
  return Math.hypot(lab.a, lab.b) <= NEUTRAL_CHROMA;
}

let namedLabCache = null;
function namedLabs() {
  if (!namedLabCache) {
    namedLabCache = COLOR_NAMES.map((entry) => ({ entry, lab: hexToLab(entry.hex) })).filter(
      (row) => row.lab
    );
  }
  return namedLabCache;
}

export function colorName(hex) {
  const lab = hexToLab(hex);
  if (!lab) {
    return { name: "неизвестный", hex: "#808080", deltaE: 100, neutral: true };
  }
  let best = null;
  let bestD = Infinity;
  for (const row of namedLabs()) {
    const d = Math.sqrt(
      (lab.L - row.lab.L) ** 2 + (lab.a - row.lab.a) ** 2 + (lab.b - row.lab.b) ** 2
    );
    if (d < bestD) {
      bestD = d;
      best = row.entry;
    }
  }
  if (!best) return { name: "неизвестный", hex: "#808080", deltaE: 100, neutral: true };
  return { name: best.name, hex: best.hex, deltaE: round(bestD, 2), neutral: best.neutral };
}

function relativeLuminance(rgb) {
  const r = srgbToLinear(rgb.r);
  const g = srgbToLinear(rgb.g);
  const b = srgbToLinear(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(lumA, lumB) {
  const hi = Math.max(lumA, lumB);
  const lo = Math.min(lumA, lumB);
  return (hi + 0.05) / (lo + 0.05);
}

export function bestTextColor(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#141414";
  const lum = relativeLuminance(rgb);
  const onWhite = contrastRatio(lum, 1);
  const onInk = contrastRatio(lum, relativeLuminance({ r: 20, g: 20, b: 20 }));
  return onWhite >= onInk ? "#ffffff" : "#141414";
}

function hueDifference(a, b) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

// Гармония пары. kind: neutral | mono | analogous | complementary | contrast | clash.
export function colorHarmony(hexA, hexB) {
  const labA = hexToLab(hexA);
  const labB = hexToLab(hexB);
  if (!labA || !labB) return { score: 0.2, kind: "clash" };
  const chromaA = Math.hypot(labA.a, labA.b);
  const chromaB = Math.hypot(labB.a, labB.b);
  const dL = Math.abs(labA.L - labB.L);
  const dE = deltaE(hexA, hexB);
  const neutralA = chromaA <= NEUTRAL_CHROMA;
  const neutralB = chromaB <= NEUTRAL_CHROMA;

  if (neutralA || neutralB) {
    let score;
    if (neutralA && neutralB) {
      score = 0.68 + (dL >= 18 ? 0.14 : 0.03);
    } else {
      score = 0.78 + (dL >= 12 && dL <= 70 ? 0.1 : 0);
    }
    return { score: clamp(score, 0, 1), kind: "neutral" };
  }

  const hueA = hexToHsl(hexA).h;
  const hueB = hexToHsl(hexB).h;
  const dH = hueDifference(hueA, hueB);

  if (dH < 15) {
    const score = dE < 6 ? 0.66 : clamp(0.88 - dH / 90, 0, 1);
    return { score, kind: "mono" };
  }
  if (dH < 45) {
    return { score: clamp(0.9 - (dH - 15) / 90, 0, 1), kind: "analogous" };
  }
  if (dH >= 150) {
    const penalty = chromaA > 45 && chromaB > 45 && dE > 70 ? 0.12 : 0;
    return { score: clamp(0.8 - penalty, 0, 1), kind: "complementary" };
  }
  const bright = Math.min(chromaA, chromaB) > 38;
  if (bright && dH >= 105) return { score: 0.34, kind: "clash" };
  return { score: 0.68, kind: "contrast" };
}

export function trendAffinity(hex, seasonKey) {
  const season = SEASONS[seasonKey] || null;
  const lab = hexToLab(hex);
  if (!season || !lab || !Array.isArray(season.colors) || season.colors.length === 0) {
    return { score: 0, name: null, hex: null, distance: 100 };
  }
  let best = { distance: Infinity, name: null, hex: null };
  for (const color of season.colors) {
    const d = deltaE(hex, color.hex);
    if (d < best.distance) best = { distance: d, name: color.name, hex: color.hex };
  }
  return {
    score: clamp(1 - best.distance / 34, 0, 1),
    name: best.name,
    hex: best.hex,
    distance: round(best.distance, 2)
  };
}

export function nearestTrend(hex, seasonKey) {
  const affinity = trendAffinity(hex, seasonKey);
  if (!affinity.name) return null;
  return { name: affinity.name, hex: affinity.hex, distance: affinity.distance };
}

// Оценка цветовой палитры образа: гармония пар + попадание в тренд сезона +
// бонус за горчичное «комбо» из сезонной подборки и монохром.
export function outfitColorScore(hexes, seasonKey) {
  const list = (Array.isArray(hexes) ? hexes : []).filter((hex) => hexToRgb(hex));
  const empty = { score: 0, paletteName: null, trendHits: [], harmonyKinds: [] };
  if (list.length === 0) return empty;
  const season = SEASONS[seasonKey] || null;

  let harmonySum = 0;
  let pairs = 0;
  const harmonyKinds = [];
  for (let i = 0; i < list.length; i += 1) {
    for (let j = i + 1; j < list.length; j += 1) {
      const h = colorHarmony(list[i], list[j]);
      harmonySum += h.score;
      pairs += 1;
      if (!harmonyKinds.includes(h.kind)) harmonyKinds.push(h.kind);
    }
  }
  const harmony = pairs > 0 ? harmonySum / pairs : 0.82;

  const unique = [...new Set(list.map((hex) => hex.toLowerCase()))];
  const trendHits = [];
  let trendSum = 0;
  let paletteName = null;

  if (season) {
    for (const hex of unique) {
      const affinity = trendAffinity(hex, seasonKey);
      trendSum += affinity.score;
      if (affinity.score >= 0.62 && affinity.name) {
        const hit = { name: affinity.name, hex: affinity.hex };
        if (!trendHits.some((item) => item.hex === hit.hex)) trendHits.push(hit);
      }
    }
    for (const combo of season.combos || []) {
      const hasA = unique.some((hex) => deltaE(hex, combo.a) <= 8);
      const hasB = unique.some((hex) => deltaE(hex, combo.b) <= 8);
      if (hasA && hasB) {
        paletteName = combo.label;
        break;
      }
    }
  }
  const trendScore = season ? trendSum / unique.length : 0;

  const colored = unique.filter((hex) => !isNeutral(hex));
  let monoBonus = 0;
  if (colored.length >= 2) {
    const baseHue = hexToHsl(colored[0]).h;
    const same = colored.every((hex) => hueDifference(baseHue, hexToHsl(hex).h) < 16);
    if (same) monoBonus = 0.05;
  } else if (colored.length === 1) {
    monoBonus = 0.02;
  }

  const comboBonus = paletteName ? 0.1 : 0;
  const score = clamp(harmony * 0.6 + trendScore * 0.25 + comboBonus + monoBonus, 0, 1);
  return { score, paletteName, trendHits, harmonyKinds };
}

/* ------------------------------------------------------------------ */
/* Палитра по фото. В Node/без canvas безопасно возвращаем [].         */
/* ------------------------------------------------------------------ */

function blobToDrawable(blob) {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(blob).catch(() => null);
  }
  if (typeof Image === "undefined" || typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
    return Promise.resolve(null);
  }
  const url = URL.createObjectURL(blob);
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    image.src = url;
  });
}

function dist2(a, b) {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
}

export async function paletteFromImage(source, { count = 4 } = {}) {
  try {
    if (!source) return [];
    if (typeof document === "undefined" || typeof document.createElement !== "function") return [];
    const size = 160;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx =
      typeof canvas.getContext === "function" ? canvas.getContext("2d", { willReadFrequently: true }) : null;
    if (!ctx) return [];

    let image = source;
    if (typeof Blob !== "undefined" && source instanceof Blob) {
      image = await blobToDrawable(source);
      if (!image) return [];
    }
    const width = Number(image.naturalWidth || image.videoWidth || image.width || 0);
    const height = Number(image.naturalHeight || image.videoHeight || image.height || 0);
    if (!width || !height) return [];

    const scale = Math.min(size / width, size / height);
    const dw = Math.max(1, Math.round(width * scale));
    const dh = Math.max(1, Math.round(height * scale));
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(image, Math.round((size - dw) / 2), Math.round((size - dh) / 2), dw, dh);
    const data = ctx.getImageData(0, 0, size, size).data;

    const pixels = [];
    for (let y = 0; y < size; y += 2) {
      for (let x = 0; x < size; x += 2) {
        const i = (y * size + x) * 4;
        const alpha = data[i + 3];
        if (alpha < 128) continue;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        // почти белый/светло-серый фон фотографии не должен попадать в палитру
        if (r > 236 && g > 236 && b > 232) continue;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        if (max - min < 6 && max > 218) continue;
        pixels.push([r, g, b]);
      }
    }
    if (pixels.length < 10) return [];

    const k = Math.min(Math.max(1, Math.round(Number(count) || 4)), Math.min(5, pixels.length));
    const centers = [];
    for (let i = 0; i < k; i += 1) {
      const index = Math.min(pixels.length - 1, Math.floor(((i + 0.5) * pixels.length) / k));
      centers.push(pixels[index].slice());
    }
    const assignment = new Array(pixels.length).fill(0);
    for (let iteration = 0; iteration < 10; iteration += 1) {
      let moved = false;
      for (let p = 0; p < pixels.length; p += 1) {
        let best = 0;
        let bestD = Infinity;
        for (let c = 0; c < centers.length; c += 1) {
          const d = dist2(pixels[p], centers[c]);
          if (d < bestD) {
            bestD = d;
            best = c;
          }
        }
        if (assignment[p] !== best) {
          assignment[p] = best;
          moved = true;
        }
      }
      const sums = centers.map(() => [0, 0, 0, 0]);
      for (let p = 0; p < pixels.length; p += 1) {
        const c = assignment[p];
        sums[c][0] += pixels[p][0];
        sums[c][1] += pixels[p][1];
        sums[c][2] += pixels[p][2];
        sums[c][3] += 1;
      }
      for (let c = 0; c < centers.length; c += 1) {
        if (sums[c][3] > 0) {
          centers[c] = [
            sums[c][0] / sums[c][3],
            sums[c][1] / sums[c][3],
            sums[c][2] / sums[c][3]
          ];
        } else {
          centers[c] = pixels[(c * 37 + iteration) % pixels.length].slice();
        }
      }
      if (!moved && iteration > 2) break;
    }

    const clusters = centers.map((center, index) => {
      let share = 0;
      for (let p = 0; p < pixels.length; p += 1) {
        if (assignment[p] === index) share += 1;
      }
      return {
        hex: rgbToHex({ r: center[0], g: center[1], b: center[2] }),
        share: share / pixels.length
      };
    });
    return clusters
      .filter((cluster) => cluster.share >= 0.02)
      .sort((x, y) => y.share - x.share)
      .slice(0, k)
      .map((cluster) => ({ hex: cluster.hex, share: round(cluster.share, 3) }));
  } catch {
    return [];
  }
}
