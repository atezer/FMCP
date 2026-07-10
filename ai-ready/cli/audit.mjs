#!/usr/bin/env node
// AI-Ready Design Audit — CLI (v2/B)
// Figma REST API + personal token ile tasarım dosyasını 9 kategoride denetler.
// v1 Figma skill'i (/ai-ready-check) ile aynı kategori numaraları ve skor modeli.
// Bağımlılıksız — Node 18+ (global fetch) yeterli.
//
// Kullanım:
//   FIGMA_TOKEN=figd_... node audit.mjs --file <FILE_KEY> [--node 4:37]
//     [--manifests ./manifests] [--json rapor.json] [--min-score 80]

import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// ---------- argümanlar ----------
const args = {};
{
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) args[argv[i].slice(2)] = argv[i + 1];
  }
}
const FILE_KEY = args.file;
const NODE_ID = args.node ? args.node.replace("-", ":") : null;
const TOKEN = process.env.FIGMA_TOKEN || process.env.FIGMA_REST_TOKEN;
const MIN_SCORE = args["min-score"] ? Number(args["min-score"]) : null;

if (!FILE_KEY || !TOKEN) {
  console.error("Kullanım: FIGMA_TOKEN=... node audit.mjs --file <FILE_KEY> [--node <id>] [--manifests <dir>] [--json <out>] [--min-score <n>]");
  process.exit(2);
}

// ---------- manifest yükleme ----------
// manifests/ altındaki her *.json: { name, fileKey, components: [{key, name}] }
const manifests = []; // {name, fileKey, keySet, nameSet}
if (args.manifests && existsSync(args.manifests)) {
  for (const f of readdirSync(args.manifests).filter((f) => f.endsWith(".json"))) {
    try {
      const m = JSON.parse(readFileSync(join(args.manifests, f), "utf8"));
      if (Array.isArray(m.components)) {
        manifests.push({
          name: m.name || f.replace(".json", ""),
          fileKey: m.fileKey || null,
          keySet: new Set(m.components.map((c) => c.key)),
          nameSet: new Set(m.components.map((c) => c.name)),
        });
      }
    } catch { console.error(`Uyarı: manifest okunamadı: ${f}`); }
  }
}
const manifestFor = (slug) => manifests.find((m) => m.name.toLowerCase().includes(slug));
const iconManifest = manifestFor("s-icons") || manifestFor("icon");
const anyManifest = manifests.length > 0;
const keyInAnyManifest = (key) => manifests.some((m) => m.keySet.has(key));

// ---------- Figma REST ----------
async function figmaGet(path) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`https://api.figma.com/v1${path}`, {
      headers: { "X-Figma-Token": TOKEN },
    });
    if (res.status === 429) {
      const wait = Number(res.headers.get("retry-after") || 5);
      console.error(`Rate limit — ${wait}s bekleniyor...`);
      await new Promise((r) => setTimeout(r, wait * 1000));
      continue;
    }
    if (!res.ok) throw new Error(`Figma API ${res.status}: ${await res.text()}`);
    return res.json();
  }
  throw new Error("Rate limit aşılamadı (3 deneme)");
}

// ---------- denetim durumu ----------
const issues = []; // {category, nodeId, nodeName, issueType, shortValue, severity}
let totalNodes = 0;
const tokenStats = {
  fill: { bound: 0, unbound: 0 },
  stroke: { bound: 0, unbound: 0 },
  padding: { bound: 0, unbound: 0 },
  gap: { bound: 0, unbound: 0 },
  radius: { bound: 0, unbound: 0 },
  textStyle: { bound: 0, unbound: 0 },
};
const imageRefs = new Map(); // imageRef -> [nodeName]
let componentsMeta = {}; // componentId -> {key, name, remote}
let componentNames = new Set();
// Instance içi override haritası: nodeId -> overriddenFields[]
// Kütüphane instance'larının İÇ katmanlarındaki hardcoded değerler kütüphanenin
// sorumluluğudur; yalnızca ekranda override edilmiş property'ler denetlenir.
const instanceOverrides = {};

function report(category, node, issueType, shortValue, severity) {
  issues.push({
    category,
    nodeId: node.id,
    nodeName: (node.name || "").slice(0, 50),
    issueType,
    shortValue: String(shortValue ?? "").slice(0, 50),
    severity,
  });
}

// ---------- yardımcılar ----------
const NAMING_RE = /^(Frame|Group|Rectangle|Ellipse|Vector|Text|Line|Image|Polygon|Star|Boolean)( \d+)?$/;
const PLACEHOLDERS = [
  "lorem ipsum", "placeholder", "title", "heading", "body text", "label",
  "caption", "description", "başlık", "alt başlık", "metin", "açıklama", "etiket",
];
const VECTOR_TYPES = new Set(["VECTOR", "LINE", "ELLIPSE", "RECTANGLE", "BOOLEAN_OPERATION", "STAR", "REGULAR_POLYGON"]);
const CONTAINER_TYPES = new Set(["FRAME", "GROUP", "COMPONENT", "INSTANCE", "COMPONENT_SET", "SECTION"]);

const bb = (n) => n.absoluteBoundingBox || null;
const isIconSized = (n) => {
  const b = bb(n);
  return b && b.width >= 16 && b.width <= 32 && b.height >= 16 && b.height <= 32;
};
const hasBound = (n, prop) => Boolean(n.boundVariables && n.boundVariables[prop]);

// ---------- kategori kontrolleri (tek gezinti) ----------
function walk(node, parent, insideInstance) {
  totalNodes++;
  const isInstance = node.type === "INSTANCE";
  const nowInside = insideInstance || isInstance;
  if (isInstance && Array.isArray(node.overrides)) {
    for (const o of node.overrides) {
      if (o.id && Array.isArray(o.overriddenFields)) instanceOverrides[o.id] = o.overriddenFields;
    }
  }
  // Instance içinde token denetimi yalnızca override edilmiş alanlarda yapılır
  const checkToken = (...fields) =>
    !insideInstance || fields.some((f) => (instanceOverrides[node.id] || []).includes(f));

  // 1. İsimlendirme — instance içi katmanlar kütüphaneden gelir, atla
  if (!insideInstance) {
    if (NAMING_RE.test(node.name || "")) report(1, node, "otomatik-isim", node.name, "info");
    else if ((node.name || "").trim().length <= 1) report(1, node, "anlamsız-isim", node.name, "info");
  }

  // 2. Hiyerarşi
  const kids = node.children || [];
  if (!insideInstance && CONTAINER_TYPES.has(node.type) && node.type !== "COMPONENT_SET") {
    if (kids.length === 1 && (node.type === "FRAME" || node.type === "GROUP"))
      report(2, node, "tek-çocuklu-wrapper", kids[0].name, "warning");
    if (kids.length > 15) report(2, node, "düz-yapı", `${kids.length} doğrudan çocuk`, "info");
    if (kids.length === 0 && (node.type === "FRAME" || node.type === "GROUP"))
      report(2, node, "boş-frame", "", "warning");
  }

  // 3. Auto-layout
  if (node.type === "FRAME" && !insideInstance) {
    const hasLayout = node.layoutMode && node.layoutMode !== "NONE";
    if (!hasLayout && kids.length >= 2) report(3, node, "auto-layout-yok", `${kids.length} çocuk`, "warning");
  }
  if (node.layoutPositioning === "ABSOLUTE") report(3, node, "absolute-position", "", "info");
  if (node.type === "TEXT") {
    const ar = node.style?.textAutoResize;
    if (ar === "NONE") report(3, node, "metin-taşma-riski", "textAutoResize: NONE", "warning");
    if (ar === "TRUNCATE") report(3, node, "metin-kesilmiş-olabilir", "TRUNCATE", "info");
  }

  // 4a. Token bağlama — instance içinde yalnızca override edilmiş alanlar denetlenir
  const fills = Array.isArray(node.fills) ? node.fills : [];
  for (const f of fills) {
    if (f.type === "SOLID" && f.visible !== false && checkToken("fills", "styles")) {
      const boundVar = Boolean(f.boundVariables?.color) || Boolean(node.styles?.fill);
      tokenStats.fill[boundVar ? "bound" : "unbound"]++;
      if (!boundVar) {
        const hex = f.color
          ? "#" + [f.color.r, f.color.g, f.color.b].map((c) => Math.round(c * 255).toString(16).padStart(2, "0")).join("")
          : "?";
        report(4, node, "hardcoded-renk", hex, "critical");
      }
    }
    if (f.type === "IMAGE" && f.imageRef) {
      if (!imageRefs.has(f.imageRef)) imageRefs.set(f.imageRef, []);
      imageRefs.get(f.imageRef).push(node);
    }
  }
  const strokes = Array.isArray(node.strokes) ? node.strokes : [];
  for (const s of strokes) {
    if (s.type === "SOLID" && s.visible !== false && checkToken("strokes", "styles")) {
      const boundVar = Boolean(s.boundVariables?.color) || Boolean(node.styles?.stroke);
      tokenStats.stroke[boundVar ? "bound" : "unbound"]++;
      if (!boundVar) report(4, node, "hardcoded-stroke", "", "critical");
    }
  }
  if (node.layoutMode && node.layoutMode !== "NONE") {
    const pads = ["paddingLeft", "paddingRight", "paddingTop", "paddingBottom"];
    const anyPad = pads.some((p) => (node[p] ?? 0) !== 0);
    if (anyPad && checkToken(...pads)) {
      const allBound = pads.every((p) => (node[p] ?? 0) === 0 || hasBound(node, p));
      tokenStats.padding[allBound ? "bound" : "unbound"]++;
      if (!allBound) report(4, node, "hardcoded-padding", pads.map((p) => node[p] ?? 0).join("/"), "warning");
    }
    if ((node.itemSpacing ?? 0) !== 0 && checkToken("itemSpacing")) {
      const b = hasBound(node, "itemSpacing");
      tokenStats.gap[b ? "bound" : "unbound"]++;
      if (!b) report(4, node, "hardcoded-gap", node.itemSpacing, "warning");
    }
  }
  const radii = node.rectangleCornerRadii || (node.cornerRadius ? [node.cornerRadius] : []);
  if (radii.some((r) => r > 0) && checkToken("cornerRadius", "rectangleCornerRadii")) {
    const b = ["topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius", "cornerRadius"]
      .some((p) => hasBound(node, p));
    tokenStats.radius[b ? "bound" : "unbound"]++;
    if (!b) report(4, node, "hardcoded-radius", radii.join("/"), "warning");
  }
  if (node.type === "TEXT" && checkToken("styles", "textStyleId", "fontSize")) {
    const b = Boolean(node.styles?.text);
    tokenStats.textStyle[b ? "bound" : "unbound"]++;
    if (!b) report(4, node, "stilsiz-metin", `${node.style?.fontSize ?? "?"}px`, "warning");
  }

  // 5. Component / detach / kütüphane kaynağı
  if (isInstance && node.componentId) {
    const meta = componentsMeta[node.componentId];
    if (!meta) {
      report(5, node, "kırık-instance", "kaynak component bulunamadı", "critical");
    } else if (anyManifest) {
      if (meta.remote === false) {
        report(5, node, "local-component", meta.name, "warning");
      } else if (!keyInAnyManifest(meta.key)) {
        if (isIconSized(node)) report(8, node, "ikon-kütüphane-dışı", meta.name, "critical");
        else report(5, node, "kütüphane-dışı-component", meta.name, "critical");
      } else if (iconManifest?.keySet.has(meta.key) && !isIconSized(node)) {
        // ikon manifest'inde ama ikon boyutunda değil — bilgi
        report(8, node, "ikon-beklenmedik-boyut", `${bb(node)?.width}x${bb(node)?.height}`, "info");
      }
    }
  }
  if (!insideInstance && node.type === "FRAME") {
    // detach heuristiği (detachedInfo REST'te yok)
    if ((node.name || "").includes("/") || componentNames.has(node.name))
      report(5, node, "muhtemel-detach", "isim kalıbı (heuristik)", "critical");
  }

  // 6. Gizli / gereksiz
  if (node.visible === false) report(6, node, "gizli-katman", "", "info");
  else {
    if (node.opacity === 0) report(6, node, "opacity-0", "", "warning");
    const b = bb(node), pb = parent ? bb(parent) : null;
    if (b && (b.width === 0 || b.height === 0)) report(6, node, "sıfır-boyut", `${b.width}x${b.height}`, "warning");
    if (b && pb && parent.clipsContent !== true &&
        (b.x + b.width < pb.x || b.x > pb.x + pb.width || b.y + b.height < pb.y || b.y > pb.y + pb.height))
      report(6, node, "off-canvas", "", "warning");
  }

  // 7. Metin içerik
  if (node.type === "TEXT") {
    const text = (node.characters || "").trim();
    if (text === "") report(7, node, "boş-metin", "", "warning");
    else if (PLACEHOLDERS.some((p) => text.toLowerCase() === p || text.toLowerCase().startsWith("lorem ipsum")))
      report(7, node, "placeholder-metin", text, "warning");
  }

  // 8. Elle çizilmiş / rasterize ikon
  if (!nowInside && isIconSized(node) && (node.type === "FRAME" || node.type === "GROUP") && kids.length > 0) {
    if (kids.every((k) => VECTOR_TYPES.has(k.type)))
      report(8, node, "elle-eklenmiş-ikon", "instance değil", "critical");
  }
  if (isIconSized(node) && fills.some((f) => f.type === "IMAGE"))
    report(8, node, "rasterize-ikon", "", "warning");

  // 9. Yapıştırılmış asset (ikon boyutu üstü image fill, instance dışı)
  if (!nowInside && !isIconSized(node) && fills.some((f) => f.type === "IMAGE"))
    report(9, node, "yapıştırılmış-asset", `${bb(node)?.width ?? "?"}x${bb(node)?.height ?? "?"}`, "critical");

  for (const child of kids) walk(child, node, nowInside);
}

// ---------- ana akış ----------
const CATEGORY_NAMES = {
  1: "Katman İsimlendirme", 2: "Hiyerarşi ve Yapı", 3: "Auto-Layout",
  4: "Design Token ve Stil", 5: "Component ve Detach", 6: "Gizli/Gereksiz Katmanlar",
  7: "Metin İçerik", 8: "İkon Kütüphane (S-Icons)", 9: "Asset Kütüphane (Assets)",
};

(async () => {
  console.error(`Dosya çekiliyor: ${FILE_KEY}${NODE_ID ? ` (node ${NODE_ID})` : " (tüm dosya)"}...`);
  let root;
  if (NODE_ID) {
    const data = await figmaGet(`/files/${FILE_KEY}/nodes?ids=${encodeURIComponent(NODE_ID)}`);
    const entry = data.nodes[Object.keys(data.nodes)[0]];
    if (!entry) throw new Error(`Node bulunamadı: ${NODE_ID}`);
    root = entry.document;
    componentsMeta = entry.components || {};
  } else {
    const data = await figmaGet(`/files/${FILE_KEY}`);
    root = data.document;
    componentsMeta = data.components || {};
  }
  componentNames = new Set(Object.values(componentsMeta).map((c) => c.name));
  if (!anyManifest)
    console.error("Uyarı: manifest yok — kütüphane kaynak kontrolleri (5g/8a/9a) atlanacak. --manifests ile verin.");

  walk(root, null, false);

  // 9a. tekrarlayan asset
  for (const [ref, nodes] of imageRefs) {
    if (nodes.length > 1)
      report(9, nodes[0], "tekrarlayan-asset", `${nodes.length} yerde aynı görsel`, "warning");
  }

  // ---------- skor (v1 ile aynı model) ----------
  const counts = { critical: 0, warning: 0, info: 0 };
  for (const i of issues) counts[i.severity]++;
  // Taban 60: küçük frame'lerde birkaç critical'ın skoru anında sıfırlamasını önler
  const maxPoints = Math.max(totalNodes * 0.3, 60);
  const points = counts.critical * 3 + counts.warning * 1 + counts.info * 0.5;
  const score = Math.max(0, Math.round((1 - points / Math.max(maxPoints, 1)) * 100));
  const verdict = score >= 80 ? "AI-Ready" : score >= 50 ? "Kısmen hazır" : "Hazır değil";

  // ---------- rapor ----------
  const byCat = {};
  for (let c = 1; c <= 9; c++) byCat[c] = { critical: 0, warning: 0, info: 0, samples: [] };
  for (const i of issues) {
    byCat[i.category][i.severity]++;
    if (byCat[i.category].samples.length < 5) byCat[i.category].samples.push(i);
  }

  console.log(`\nAI-Readiness Raporu — ${FILE_KEY}${NODE_ID ? ` / ${NODE_ID}` : ""}`);
  console.log(`Taranan node: ${totalNodes} | Skor: ${score}/100 (${verdict})\n`);
  console.log("Kategori".padEnd(34) + "Durum".padEnd(8) + "Crit  Warn  Info");
  for (let c = 1; c <= 9; c++) {
    const k = byCat[c];
    const status = k.critical ? "FAIL" : k.warning ? "WARN" : "PASS";
    console.log(
      `${c}. ${CATEGORY_NAMES[c]}`.padEnd(34) + status.padEnd(8) +
      String(k.critical).padEnd(6) + String(k.warning).padEnd(6) + String(k.info)
    );
  }
  console.log("\nToken bağlılık özeti:");
  for (const [k, v] of Object.entries(tokenStats)) {
    const total = v.bound + v.unbound;
    if (total) console.log(`  ${k.padEnd(10)} ${v.bound}/${total} bağlı (%${Math.round((v.bound / total) * 100)})`);
  }
  const criticals = issues.filter((i) => i.severity === "critical").slice(0, 10);
  if (criticals.length) {
    console.log("\nİlk kritik bulgular:");
    for (const i of criticals)
      console.log(`  [${i.category}] ${i.issueType}: "${i.nodeName}" ${i.shortValue} (${i.nodeId})`);
  }

  if (args.json) {
    writeFileSync(args.json, JSON.stringify({
      fileKey: FILE_KEY, nodeId: NODE_ID, generatedAt: new Date().toISOString(),
      totalNodes, score, verdict, counts, tokenStats,
      categories: Object.fromEntries(Object.entries(byCat).map(([c, k]) => [c, {
        name: CATEGORY_NAMES[c], status: k.critical ? "FAIL" : k.warning ? "WARN" : "PASS",
        critical: k.critical, warning: k.warning, info: k.info,
      }])),
      issues,
      limitations: [
        "detachedInfo REST'te yok — detach tespiti heuristik",
        "Semantic/Primitive katman kontrolü (4b/4c/4d) v1 Figma skill'inin sorumluluğunda",
      ],
    }, null, 2));
    console.log(`\nJSON rapor: ${args.json}`);
  }

  if (MIN_SCORE !== null && score < MIN_SCORE) {
    console.error(`\nSkor ${score} < eşik ${MIN_SCORE} — FAIL`);
    process.exit(1);
  }
})().catch((e) => { console.error(`Hata: ${e.message}`); process.exit(2); });
