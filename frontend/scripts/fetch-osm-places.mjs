// Toshkent shahridagi BARCHA tumanlar bo'yicha mahalla/kvartal va ko'chalarni
// (kichik turar-joy ko'chalarigacha) OpenStreetMap (Overpass API) dan yuklab,
// src/lib/tashkentPlaces.generated.ts ga yozadi. Har bir joyga tuman nomi qo'shiladi.
// Ishga tushirish: node scripts/fetch-osm-places.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function overpass(query, attempt = 0) {
  let lastErr;
  for (const url of MIRRORS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "taxsi-narxlar-place-importer/1.0 (logfreehub@gmail.com)",
        },
        body: "data=" + encodeURIComponent(query),
      });
      if (res.status === 429 || res.status === 504) throw new Error(`${url} -> ${res.status}`);
      if (!res.ok) throw new Error(`${url} -> ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return await res.json();
    } catch (e) {
      lastErr = e;
      console.warn("   mirror xato:", String(e.message || e).slice(0, 120));
    }
  }
  if (attempt < 3) {
    console.warn(`   ${15 * (attempt + 1)}s kutib qayta urinish...`);
    await sleep(15000 * (attempt + 1));
    return overpass(query, attempt + 1);
  }
  throw lastErr;
}

const center = (el) =>
  el.type === "node"
    ? { lat: el.lat, lng: el.lon }
    : el.center
      ? { lat: el.center.lat, lng: el.center.lon }
      : null;

function aliasesOf(tags, label) {
  const set = new Set();
  for (const k of ["name:uz", "name:ru", "name:en", "old_name", "alt_name"]) {
    const v = tags[k];
    if (!v) continue;
    for (const part of v.split(";")) {
      const s = part.trim();
      if (s && s.toLowerCase() !== label.toLowerCase()) set.add(s);
    }
  }
  return [...set].slice(0, 4);
}

const round = (n) => Math.round(n * 1e5) / 1e5;

// 1) Toshkent tumanlarini topish
console.log("Tumanlar ro'yxati olinmoqda...");
const distJson = await overpass(`[out:json][timeout:60];
area["wikidata"="Q269"]->.t;
relation(area.t)["boundary"="administrative"]["admin_level"~"^[5-9]$"]["name"];
out tags;`);

const districts = [];
for (const el of distJson.elements || []) {
  const name = el.tags?.name || "";
  const low = name.toLowerCase();
  if (low.includes("tuman") || low.includes("туман") || low.includes("район")) {
    const short = name
      .replace(/\s*(tumani|tuman|тумани|туман|район|district)\s*$/i, "")
      .trim();
    districts.push({ id: el.id, name, short });
  }
}
districts.sort((a, b) => a.short.localeCompare(b.short));
console.log(`Topildi: ${districts.length} tuman -> ${districts.map((d) => d.short).join(", ")}`);
if (!districts.length) throw new Error("Tumanlar topilmadi!");

// 2) Har bir tuman bo'yicha mahalla/kvartal va BARCHA nomli ko'chalar
const HIGHWAYS = "trunk|primary|secondary|tertiary|unclassified|residential|living_street|pedestrian";
const all = [];
const seen = new Set();

function push(p) {
  const k = (p.label + "|" + p.category).toLowerCase();
  if (seen.has(k)) return;
  seen.add(k);
  if (!p.alias?.length) delete p.alias;
  all.push(p);
}

for (const d of districts) {
  console.log(`-> ${d.short} ...`);
  const areaId = 3600000000 + d.id;
  const json = await overpass(`[out:json][timeout:240];
area(${areaId})->.d;
(
  node(area.d)[place~"^(neighbourhood|quarter|suburb)$"][name];
  way(area.d)[place~"^(neighbourhood|quarter|suburb)$"][name];
  relation(area.d)[place~"^(neighbourhood|quarter|suburb)$"][name];
  way(area.d)[highway~"^(${HIGHWAYS})$"][name];
);
out center tags;`);

  const streetGroups = new Map();
  let nAreas = 0;
  for (const el of json.elements || []) {
    const c = center(el);
    const name = el.tags?.name;
    if (!c || !name) continue;
    const suffix = name.toLowerCase().includes(d.short.toLowerCase()) ? "" : ` (${d.short})`;
    if (el.tags.place) {
      nAreas++;
      push({
        label: name + suffix,
        lat: round(c.lat),
        lng: round(c.lng),
        category: el.tags.place === "suburb" ? "Tumanlar va massivlar" : "Mahalla va kvartallar",
        alias: aliasesOf(el.tags, name),
      });
    } else if (el.tags.highway) {
      let g = streetGroups.get(name);
      if (!g) {
        g = { latSum: 0, lngSum: 0, n: 0, alias: new Set(), suffix };
        streetGroups.set(name, g);
      }
      g.latSum += c.lat;
      g.lngSum += c.lng;
      g.n += 1;
      for (const a of aliasesOf(el.tags, name)) g.alias.add(a);
    }
  }
  for (const [name, g] of streetGroups) {
    push({
      label: name + g.suffix,
      lat: round(g.latSum / g.n),
      lng: round(g.lngSum / g.n),
      category: "Ko'chalar",
      alias: [...g.alias].slice(0, 4),
    });
  }
  console.log(`   ${d.short}: ${nAreas} hudud, ${streetGroups.size} ko'cha`);
  await sleep(2000); // Overpass'ga bosim bermaslik uchun
}

all.sort((a, b) => a.label.localeCompare(b.label));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outFile = path.join(__dirname, "..", "src", "lib", "tashkentPlaces.generated.ts");
const body = all.map((p) => "  " + JSON.stringify(p)).join(",\n");
const content = `// AUTO-GENERATED — OpenStreetMap (Overpass API) dan olingan Toshkent hududlari va ko'chalari (tuman-tuman).
// Qayta yaratish: node scripts/fetch-osm-places.mjs  (qo'lda tahrir qilmang)
import type { Place } from "./tashkentPlaces";

export const GENERATED_PLACES: Place[] = [
${body},
];
`;
fs.writeFileSync(outFile, content, "utf8");
const sizeMb = (fs.statSync(outFile).size / 1024 / 1024).toFixed(2);
console.log(`Yozildi: ${outFile} (jami ${all.length} ta joy, ${sizeMb} MB)`);
