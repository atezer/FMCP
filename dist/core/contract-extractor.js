/**
 * Contract Extractor — Component Set → design contract JSON spec (v1.9.14).
 *
 * figma_extract_contract aracının çekirdeği. Üç aşamalı okuma:
 *   1) STRUCTURE  — set metadata + componentPropertyDefinitions + default variant ağacı
 *   2) OVERRIDES  — her variant prop değeri için default'a karşı token diff'i
 *   3) TOKENS     — kullanılan tüm variable'ların mode bazlı alias-chain çözümü
 *
 * Plugin scriptleri HAM veri döndürür (JSON string — safeSerialize bozulmalarını
 * atlamak için); tüm normalizasyon/birleştirme bu modüldeki saf TS fonksiyonlarında
 * yapılır ki Jest ile test edilebilsin. DS-agnostic: hiçbir koleksiyon/font/tema
 * adı hardcode edilmez.
 */
// ============================================================================
// Plugin script üreticileri
// ============================================================================
/**
 * Aşama 1 — STRUCTURE. nodeId verilmezse aktif seçimden çözer.
 * COMPONENT_SET | COMPONENT | (INSTANCE → main) hedeflerini destekler.
 */
export function buildStructureScript(nodeId) {
    return `
var TARGET_ID = ${JSON.stringify(nodeId ?? null)};
function fail(m) { return JSON.stringify({ ok: false, error: m }); }
var node = null;
if (TARGET_ID) {
	node = await figma.getNodeByIdAsync(TARGET_ID);
	if (!node) return fail('NODE_NOT_FOUND:' + TARGET_ID);
} else {
	var sel = figma.currentPage.selection;
	if (!sel || sel.length === 0) return fail('NO_SELECTION');
	node = sel[0];
}
var set = null;
if (node.type === 'COMPONENT_SET') set = node;
else if (node.type === 'COMPONENT') set = (node.parent && node.parent.type === 'COMPONENT_SET') ? node.parent : node;
else if (node.type === 'INSTANCE') {
	var mc = await node.getMainComponentAsync();
	if (mc) set = (mc.parent && mc.parent.type === 'COMPONENT_SET') ? mc.parent : mc;
}
if (!set) return fail('NOT_COMPONENT:' + node.type);

var dv = set.type === 'COMPONENT_SET' ? (set.defaultVariant || set.children[0]) : set;
if (!dv) return fail('EMPTY_COMPONENT_SET');

function aliasId(a) { if (!a) return null; if (Array.isArray(a)) a = a[0]; return (a && a.id) ? a.id : null; }
function boundOf(n) {
	var out = {}; var b = n.boundVariables; if (!b) return out;
	var keys = ['itemSpacing','counterAxisSpacing','paddingTop','paddingRight','paddingBottom','paddingLeft','topLeftRadius','topRightRadius','bottomLeftRadius','bottomRightRadius','strokeWeight','fontSize','fontFamily','fontStyle','fontWeight','opacity','width','height','fills','strokes'];
	for (var i = 0; i < keys.length; i++) {
		var k = keys[i];
		if (b[k]) { var id = aliasId(b[k]); if (id) out[k] = id; }
	}
	return out;
}
function hex2(x) { var s = Math.round(x * 255).toString(16); return s.length < 2 ? '0' + s : s; }
function firstSolidHex(n) {
	try {
		var fills = n.fills;
		if (!fills || fills === figma.mixed || !fills.length) return null;
		for (var i = 0; i < fills.length; i++) {
			var f = fills[i];
			if (f.visible === false) continue;
			if (f.type === 'SOLID') {
				var h = '#' + hex2(f.color.r) + hex2(f.color.g) + hex2(f.color.b);
				if (typeof f.opacity === 'number' && f.opacity < 1) h += hex2(f.opacity);
				return h;
			}
		}
		return null;
	} catch (e) { return null; }
}
function firstStrokeHex(n) {
	try {
		var st = n.strokes;
		if (!st || !st.length) return null;
		for (var i = 0; i < st.length; i++) {
			if (st[i].visible === false) continue;
			if (st[i].type === 'SOLID') return '#' + hex2(st[i].color.r) + hex2(st[i].color.g) + hex2(st[i].color.b);
		}
		return null;
	} catch (e) { return null; }
}
var budget = { n: 0 };
async function extract(n, depth) {
	if (budget.n++ > 400 || depth > 8) return null;
	var o = { name: n.name, type: n.type, visible: n.visible !== false };
	o.w = typeof n.width === 'number' ? Math.round(n.width * 100) / 100 : null;
	o.h = typeof n.height === 'number' ? Math.round(n.height * 100) / 100 : null;
	if ('layoutMode' in n && n.layoutMode && n.layoutMode !== 'NONE') {
		o.layoutMode = n.layoutMode;
		o.primaryAxisAlignItems = n.primaryAxisAlignItems;
		o.counterAxisAlignItems = n.counterAxisAlignItems;
		o.primaryAxisSizingMode = n.primaryAxisSizingMode;
		o.counterAxisSizingMode = n.counterAxisSizingMode;
		o.paddingTop = n.paddingTop; o.paddingRight = n.paddingRight;
		o.paddingBottom = n.paddingBottom; o.paddingLeft = n.paddingLeft;
		o.itemSpacing = n.itemSpacing;
	}
	if ('layoutGrow' in n) o.layoutGrow = n.layoutGrow;
	if ('layoutAlign' in n) o.layoutAlign = n.layoutAlign;
	if ('topLeftRadius' in n && typeof n.topLeftRadius === 'number') o.radius = [n.topLeftRadius || 0, n.topRightRadius || 0, n.bottomRightRadius || 0, n.bottomLeftRadius || 0];
	o.fillHex = firstSolidHex(n);
	o.strokeHex = firstStrokeHex(n);
	if (typeof n.strokeWeight === 'number') o.strokeWeight = n.strokeWeight;
	o.bound = boundOf(n);
	if (n.type === 'TEXT') {
		o.characters = (n.characters || '').slice(0, 120);
		o.fontSize = (n.fontSize !== figma.mixed) ? n.fontSize : null;
		o.fontFamily = (n.fontName !== figma.mixed && n.fontName) ? n.fontName.family : null;
		o.fontStyle = (n.fontName !== figma.mixed && n.fontName) ? n.fontName.style : null;
		o.textAlign = n.textAlignHorizontal;
		o.textAutoResize = n.textAutoResize;
		var lh = n.lineHeight;
		o.lineHeight = (lh === figma.mixed) ? 'mixed' : (lh && lh.unit === 'AUTO') ? 'auto' : (lh && typeof lh.value === 'number') ? lh.value : 'auto';
		if (lh && lh !== figma.mixed && lh.unit && lh.unit !== 'AUTO') o.lineHeightUnit = lh.unit;
		var ls = n.letterSpacing;
		if (ls && ls !== figma.mixed) { o.letterSpacing = ls.value; o.letterSpacingUnit = ls.unit; }
		var tsId = (n.textStyleId !== figma.mixed) ? n.textStyleId : null;
		if (tsId) { try { var st = await figma.getStyleByIdAsync(tsId); o.textStyleName = st ? st.name : null; } catch (e) { o.textStyleName = null; } }
	}
	if (n.type === 'INSTANCE') {
		try {
			var mc2 = await n.getMainComponentAsync();
			if (mc2) o.mainComponent = { id: mc2.id, name: mc2.name, parentName: (mc2.parent && mc2.parent.type === 'COMPONENT_SET') ? mc2.parent.name : null };
		} catch (e) {}
	}
	if (n.componentPropertyReferences) {
		var refs = {}; var anyRef = false;
		for (var rk in n.componentPropertyReferences) { refs[rk] = n.componentPropertyReferences[rk]; anyRef = true; }
		if (anyRef) o.propRefs = refs;
	}
	if ('children' in n && n.children && n.children.length) {
		var kids = [];
		for (var ci = 0; ci < n.children.length; ci++) {
			var k = await extract(n.children[ci], depth + 1);
			if (k) kids.push(k);
		}
		o.children = kids;
	}
	return o;
}
var rawProps = [];
try {
	var defs = set.componentPropertyDefinitions || {};
	for (var key in defs) {
		var d = defs[key];
		var p = { key: key, type: d.type, defaultValue: (d.defaultValue === undefined) ? null : d.defaultValue, variantOptions: d.variantOptions || null };
		if (d.type === 'INSTANCE_SWAP' && typeof d.defaultValue === 'string') {
			try {
				var dn = await figma.getNodeByIdAsync(d.defaultValue);
				if (dn) { p.defaultComponentName = dn.name; p.defaultComponentId = dn.id; }
			} catch (e) {}
		}
		rawProps.push(p);
	}
} catch (e) {}
var vgp = null;
if (set.type === 'COMPONENT_SET') { try { vgp = set.variantGroupProperties; } catch (e) { vgp = null; } }
var tree = await extract(dv, 0);
return JSON.stringify({
	ok: true,
	kind: set.type,
	set: { id: set.id, name: set.name, key: set.key || null },
	fileKey: figma.fileKey || null,
	defaultVariant: { id: dv.id, name: dv.name },
	props: rawProps,
	variantGroupProperties: vgp,
	tree: tree
});
`.trim();
}
/**
 * Aşama 2 — OVERRIDES. Her variant prop'unun her değeri için "default kombinasyon
 * + sadece o prop değişmiş" variant'ı bulur, default'a karşı token diff'i çıkarır.
 */
export function buildOverridesScript(setId) {
    return `
var SET_ID = ${JSON.stringify(setId)};
function fail(m) { return JSON.stringify({ ok: false, error: m }); }
var set = await figma.getNodeByIdAsync(SET_ID);
if (!set) return fail('NODE_NOT_FOUND:' + SET_ID);
if (set.type !== 'COMPONENT_SET') return JSON.stringify({ ok: true, overrides: {} });
var dv = set.defaultVariant || set.children[0];
if (!dv) return JSON.stringify({ ok: true, overrides: {} });

function parseCombo(name) {
	var out = {};
	var parts = String(name).split(',');
	for (var i = 0; i < parts.length; i++) {
		var kv = parts[i].split('=');
		if (kv.length === 2) out[kv[0].trim()] = kv[1].trim();
	}
	return out;
}
function comboEquals(a, b, skipKey) {
	for (var k in a) { if (k === skipKey) continue; if (a[k] !== b[k]) return false; }
	for (var k2 in b) { if (k2 === skipKey) continue; if (a[k2] !== b[k2]) return false; }
	return true;
}
function aliasId(a) { if (!a) return null; if (Array.isArray(a)) a = a[0]; return (a && a.id) ? a.id : null; }
function boundOf(n) {
	var out = {}; var b = n.boundVariables; if (!b) return out;
	var keys = ['itemSpacing','counterAxisSpacing','paddingTop','paddingRight','paddingBottom','paddingLeft','topLeftRadius','topRightRadius','bottomLeftRadius','bottomRightRadius','strokeWeight','fontSize','fontFamily','fontStyle','fontWeight','opacity','width','height','fills','strokes'];
	for (var i = 0; i < keys.length; i++) { var k = keys[i]; if (b[k]) { var id = aliasId(b[k]); if (id) out[k] = id; } }
	return out;
}
function hex2(x) { var s = Math.round(x * 255).toString(16); return s.length < 2 ? '0' + s : s; }
function firstSolidHex(n) {
	try {
		var fills = n.fills;
		if (!fills || fills === figma.mixed || !fills.length) return null;
		for (var i = 0; i < fills.length; i++) {
			var f = fills[i];
			if (f.visible === false) continue;
			if (f.type === 'SOLID') {
				var h = '#' + hex2(f.color.r) + hex2(f.color.g) + hex2(f.color.b);
				if (typeof f.opacity === 'number' && f.opacity < 1) h += hex2(f.opacity);
				return h;
			}
		}
		return null;
	} catch (e) { return null; }
}
function snapshot(n) {
	var s = { name: n.name, type: n.type, bound: boundOf(n), fillHex: firstSolidHex(n) };
	s.hasStroke = false;
	try { s.hasStroke = !!(n.strokes && n.strokes.length && n.strokes.some(function (x) { return x.visible !== false; })); } catch (e) {}
	if (typeof n.strokeWeight === 'number') s.strokeWeight = n.strokeWeight;
	if ('paddingLeft' in n) { s.pl = n.paddingLeft; s.pr = n.paddingRight; s.pt = n.paddingTop; s.pb = n.paddingBottom; }
	if ('itemSpacing' in n) s.gap = n.itemSpacing;
	if ('topLeftRadius' in n && typeof n.topLeftRadius === 'number') s.radius = [n.topLeftRadius || 0, n.topRightRadius || 0, n.bottomRightRadius || 0, n.bottomLeftRadius || 0];
	if (n.type === 'TEXT') {
		s.fontSize = (n.fontSize !== figma.mixed) ? n.fontSize : null;
		s.textStyleId = (n.textStyleId !== figma.mixed) ? (n.textStyleId || null) : null;
	}
	return s;
}
function flatten(root) {
	var map = {};
	var budget = { n: 0 };
	// depth/budget sinirlari structure extract'iyle AYNI (8/400) tutulur —
	// aksi halde derin set'lerde overrides path'leri structure agacinda
	// karsiligi olmayan node'lara isaret eder.
	function walk(n, path, names, depth) {
		if (budget.n++ > 400 || depth > 8) return;
		map[path] = snapshot(n);
		map[path].names = names;
		if ('children' in n && n.children) {
			for (var i = 0; i < n.children.length; i++) {
				var child = n.children[i];
				var cp = path === '' ? String(i) : path + '/' + i;
				var cn = names === '' ? child.name : names + '/' + child.name;
				walk(child, cp, cn, depth + 1);
			}
		}
	}
	walk(root, '', '', 0);
	return map;
}
var RADIUS_KEYS = ['topLeftRadius', 'topRightRadius', 'bottomRightRadius', 'bottomLeftRadius'];
function diffMaps(da, db) {
	var entries = [];
	var paths = {};
	for (var pa in da) paths[pa] = true;
	for (var pb in db) paths[pb] = true;
	for (var p in paths) {
		var a = da[p]; var b = db[p];
		if (!a || !b) continue;
		var names = (b && b.names !== undefined) ? b.names : (a ? a.names : '');
		var t = b ? b.type : a.type;
		function push(f, av, bv2) { entries.push({ p: p, n: names || '', t: t, f: f, a: av, b: bv2 }); }
		// Bound variable diff'leri (fills/strokes/spacing/radius/typo)
		var fields = {};
		for (var fk in a.bound) fields[fk] = true;
		for (var fk2 in b.bound) fields[fk2] = true;
		for (var f in fields) {
			var ida = a.bound[f] || null; var idb = b.bound[f] || null;
			if (ida === idb) continue;
			if (idb) push(f, ida ? { id: ida } : null, { id: idb });
			else {
				// default bound, variant unbound → raw değere veya (none)'a düştü
				var rawB = null;
				if (f === 'fills') rawB = b.fillHex ? { v: b.fillHex } : null;
				else if (f === 'paddingLeft') rawB = (b.pl > 0) ? { v: b.pl } : null;
				else if (f === 'paddingRight') rawB = (b.pr > 0) ? { v: b.pr } : null;
				else if (f === 'paddingTop') rawB = (b.pt > 0) ? { v: b.pt } : null;
				else if (f === 'paddingBottom') rawB = (b.pb > 0) ? { v: b.pb } : null;
				else if (f === 'itemSpacing') rawB = (b.gap > 0) ? { v: b.gap } : null;
				else if (f === 'strokeWeight') rawB = (b.strokeWeight > 0 && b.hasStroke) ? { v: b.strokeWeight } : null;
				else if (f === 'fontSize') rawB = b.fontSize ? { v: b.fontSize } : null;
				else if (RADIUS_KEYS.indexOf(f) >= 0 && b.radius) { var rv = b.radius[RADIUS_KEYS.indexOf(f)]; rawB = (rv > 0) ? { v: rv } : null; }
				push(f, { id: ida }, rawB);
			}
		}
		// Bound OLMAYAN taraflar: default'ta fill yokken variant'ta stroke/fill görünmesi
		if (!a.bound.fills && !b.bound.fills && a.fillHex !== b.fillHex) {
			if (b.fillHex) push('fills', a.fillHex ? { v: a.fillHex } : null, { v: b.fillHex });
			else if (a.fillHex) push('fills', { v: a.fillHex }, null);
		}
		if (t === 'TEXT' && a.textStyleId !== b.textStyleId) {
			push('textStyle', a.textStyleId ? { id: a.textStyleId } : null, b.textStyleId ? { id: b.textStyleId } : null);
		}
	}
	return entries;
}
var defaultCombo = parseCombo(dv.name);
var defaultMap = flatten(dv);
var vgp = {};
try { vgp = set.variantGroupProperties || {}; } catch (e) { vgp = {}; }
var overrides = {};
var textStyleIds = {};
for (var prop in vgp) {
	var values = (vgp[prop] && vgp[prop].values) || [];
	for (var vi = 0; vi < values.length; vi++) {
		var val = values[vi];
		if (val === defaultCombo[prop]) continue;
		var target = null;
		for (var ci = 0; ci < set.children.length; ci++) {
			var child = set.children[ci];
			if (child.type !== 'COMPONENT') continue;
			var combo = parseCombo(child.name);
			if (combo[prop] === val && comboEquals(combo, defaultCombo, prop)) { target = child; break; }
		}
		if (!target) continue;
		var entries = diffMaps(defaultMap, flatten(target));
		for (var ei = 0; ei < entries.length; ei++) {
			var en = entries[ei];
			if (en.f === 'textStyle') {
				if (en.a && en.a.id) textStyleIds[en.a.id] = true;
				if (en.b && en.b.id) textStyleIds[en.b.id] = true;
			}
		}
		if (!overrides[prop]) overrides[prop] = {};
		overrides[prop][val] = entries;
	}
}
// textStyle id → isim çözümü (yalnızca değişenler için)
var styleNames = {};
for (var sid in textStyleIds) {
	try { var st2 = await figma.getStyleByIdAsync(sid); if (st2) styleNames[sid] = st2.name; } catch (e) {}
}
for (var op in overrides) {
	for (var ov in overrides[op]) {
		var list = overrides[op][ov];
		for (var li = 0; li < list.length; li++) {
			var e2 = list[li];
			if (e2.f === 'textStyle') {
				if (e2.a && e2.a.id && styleNames[e2.a.id]) e2.a.styleName = styleNames[e2.a.id];
				if (e2.b && e2.b.id && styleNames[e2.b.id]) e2.b.styleName = styleNames[e2.b.id];
			}
		}
	}
}
return JSON.stringify({ ok: true, overrides: overrides });
`.trim();
}
/**
 * Aşama 3 — TOKENS. Verilen variable id'lerini tüm mode'larda çözer;
 * alias zincirini isim listesi olarak döndürür (sonsuz döngüye karşı visited set).
 */
export function buildTokensScript(variableIds) {
    return `
var IDS = ${JSON.stringify(variableIds)};
function hex2(x) { var s = Math.round(x * 255).toString(16); return s.length < 2 ? '0' + s : s; }
function serVal(v) {
	if (v === null || v === undefined) return null;
	if (typeof v === 'object' && typeof v.r === 'number') {
		var h = '#' + hex2(v.r) + hex2(v.g) + hex2(v.b);
		if (typeof v.a === 'number' && v.a < 1) h += hex2(v.a);
		return h;
	}
	return v;
}
var out = {};
for (var i = 0; i < IDS.length; i++) {
	var id = IDS[i];
	var v = null;
	try { v = await figma.variables.getVariableByIdAsync(id); } catch (e) { continue; }
	if (!v) continue;
	var col = null;
	try { col = await figma.variables.getVariableCollectionByIdAsync(v.variableCollectionId); } catch (e) {}
	if (!col) continue;
	var entry = { name: v.name, collection: col.name, type: v.resolvedType, values: {}, aliasChain: {} };
	for (var m = 0; m < col.modes.length; m++) {
		var mode = col.modes[m];
		var chain = [];
		var visited = {};
		visited[v.id] = true;
		var val = v.valuesByMode[mode.modeId];
		var guard = 0;
		while (val && typeof val === 'object' && val.type === 'VARIABLE_ALIAS' && guard++ < 12) {
			if (visited[val.id]) { val = null; break; }
			visited[val.id] = true;
			var nv = null;
			try { nv = await figma.variables.getVariableByIdAsync(val.id); } catch (e) { nv = null; }
			if (!nv) { val = null; break; }
			chain.push(nv.name.split('/').join('.'));
			// Koleksiyonlar arasi alias'ta modeId'ler farklidir — tek kopru mode ADIdir.
			// Ayni isimli mode hedef koleksiyonda yoksa defaultModeId'ye dusulur
			// (tek-mode primitive koleksiyonlar icin standart durum).
			var ncol = null;
			try { ncol = await figma.variables.getVariableCollectionByIdAsync(nv.variableCollectionId); } catch (e) {}
			var useModeId = null;
			if (ncol) {
				for (var mm = 0; mm < ncol.modes.length; mm++) {
					if (ncol.modes[mm].name === mode.name) { useModeId = ncol.modes[mm].modeId; break; }
				}
				if (!useModeId) useModeId = ncol.defaultModeId;
			}
			val = useModeId !== null ? nv.valuesByMode[useModeId] : null;
		}
		// Guard tukendiyse elde hala alias objesi kalabilir — contract'a
		// {type:'VARIABLE_ALIAS'} sizdirma, cozulmedi olarak isaretle (null).
		if (val && typeof val === 'object' && val.type === 'VARIABLE_ALIAS') val = null;
		entry.values[mode.name] = serVal(val);
		entry.aliasChain[mode.name] = chain;
	}
	out[id] = entry;
}
return JSON.stringify({ ok: true, tokens: out });
`.trim();
}
// ============================================================================
// İsimlendirme yardımcıları
// ============================================================================
/** "Icon (R)#12:34" → "Icon (R)" — property key'den hash'i düşür. */
export function stripPropHash(key) {
    return key.replace(/#[^#]*$/, "").replace(/^[↳→›»\s]+/, "").trim();
}
function words(s) {
    return s
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .replace(/([a-z\d])([A-Z])/g, "$1 $2")
        .trim()
        .split(/\s+/)
        .filter(Boolean);
}
export function toKebabCase(s) {
    return words(s).map((w) => w.toLowerCase()).join("-");
}
export function toCamelCase(s) {
    const w = words(s).map((x) => x.toLowerCase());
    return w.map((x, i) => (i === 0 ? x : x[0].toUpperCase() + x.slice(1))).join("");
}
export function toPascalCase(s) {
    return words(s).map((x) => x[0].toUpperCase() + x.slice(1).toLowerCase()).join("");
}
/** Variant seçenekleri tam olarak True/False mu? (boolean-like variant tespiti) */
export function isBooleanLikeOptions(options) {
    if (!options || options.length !== 2)
        return false;
    const lower = options.map((o) => o.toLowerCase()).sort();
    return lower[0] === "false" && lower[1] === "true";
}
const GENERIC_NAME = /^(frame|group|rectangle|ellipse|line|vector|text|component|union|subtract|intersect|exclude)\s*\d*$/i;
/** Generic Figma adlarını (Frame 1, Group 2…) bağlama göre anlamlı ada çevirir. */
export function semanticPartName(node) {
    const raw = node.name.trim();
    if (node.type === "INSTANCE" && node.mainComponent) {
        // Variant adı ("version=v2") yerine set adını tercih et
        const base = node.mainComponent.parentName || node.mainComponent.name;
        if (!GENERIC_NAME.test(base))
            return toKebabCase(base);
    }
    if (!GENERIC_NAME.test(raw))
        return toKebabCase(raw);
    if (node.type === "TEXT")
        return "label";
    const w = node.w ?? 0;
    const h = node.h ?? 0;
    if ((node.type === "RECTANGLE" || node.type === "LINE") && (h <= 2 || w <= 2))
        return "divider";
    if (node.type === "RECTANGLE" || node.type === "ELLIPSE" || node.type === "VECTOR")
        return "shape";
    return "content";
}
/** Çakışan part adlarına -2, -3… soneki ekler. */
export function dedupeName(base, used) {
    if (!used.has(base)) {
        used.add(base);
        return base;
    }
    let i = 2;
    while (used.has(`${base}-${i}`))
        i++;
    const name = `${base}-${i}`;
    used.add(name);
    return name;
}
// ============================================================================
// CSS eşleme
// ============================================================================
const FIELD_TO_CSS = {
    itemSpacing: "gap",
    counterAxisSpacing: "row-gap",
    paddingTop: "padding-top",
    paddingRight: "padding-right",
    paddingBottom: "padding-bottom",
    paddingLeft: "padding-left",
    topLeftRadius: "border-top-left-radius",
    topRightRadius: "border-top-right-radius",
    bottomLeftRadius: "border-bottom-left-radius",
    bottomRightRadius: "border-bottom-right-radius",
    strokes: "border-color",
    fontSize: "font-size",
    fontFamily: "font-family",
    fontStyle: "font-weight",
    fontWeight: "font-weight",
    opacity: "opacity",
    width: "width",
    height: "height",
    textStyle: "text-style",
};
/** Bound alan adını CSS property'e çevirir (fills node tipine göre ayrışır). */
export function fieldToCss(field, nodeType) {
    if (field === "fills")
        return nodeType === "TEXT" ? "color" : "background-color";
    return FIELD_TO_CSS[field] ?? null;
}
/** Variable adını token referansına çevirir: "Spacing/spacing-050" → "{Spacing.spacing-050}" */
export function tokenRef(variableName) {
    return `{${variableName.split("/").join(".")}}`;
}
/** #rgb | #rrggbb | #rrggbbaa hex'i 0-1 aralığında RGBA'ya çevirir. */
export function parseHexColor(hex) {
    if (typeof hex !== "string")
        return null;
    const m = hex.trim().replace(/^#/, "");
    if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$|^[0-9a-fA-F]{8}$/.test(m))
        return null;
    if (m.length === 3) {
        return {
            r: parseInt(m[0] + m[0], 16) / 255,
            g: parseInt(m[1] + m[1], 16) / 255,
            b: parseInt(m[2] + m[2], 16) / 255,
            a: 1,
        };
    }
    return {
        r: parseInt(m.slice(0, 2), 16) / 255,
        g: parseInt(m.slice(2, 4), 16) / 255,
        b: parseInt(m.slice(4, 6), 16) / 255,
        a: m.length === 8 ? parseInt(m.slice(6, 8), 16) / 255 : 1,
    };
}
/** fg'yi bg üzerine alpha-blend eder (her ikisi de opak RGB döner). */
function blendOver(fg, bg) {
    const a = fg.a;
    return {
        r: fg.r * a + bg.r * (1 - a),
        g: fg.g * a + bg.g * (1 - a),
        b: fg.b * a + bg.b * (1 - a),
        a: 1,
    };
}
function linearize(c) {
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
export function relativeLuminance(c) {
    return 0.2126 * linearize(c.r) + 0.7152 * linearize(c.g) + 0.0722 * linearize(c.b);
}
/**
 * WCAG kontrast oranı. Alpha'lı renkler blend edilir: bg → beyaz üzerine,
 * fg → (blend edilmiş) bg üzerine. 2 ondalık yuvarlanır.
 *
 * Beyaz zemin varsayımı: bileşenin gerçek sayfa zemini contract'tan bilinemez;
 * açık tema en yaygın durum olduğundan yarı saydam bg beyaza blend edilir.
 * Koyu zeminli kullanımlarda gerçek oran bundan sapabilir — bu bilinçli bir
 * yaklaşıklıktır (fg için zemin bellidir: bileşenin kendi bg'si).
 */
export function computeContrastRatio(fgHex, bgHex) {
    const fg = parseHexColor(fgHex);
    const bg = parseHexColor(bgHex);
    if (!fg || !bg)
        return null;
    const WHITE = { r: 1, g: 1, b: 1, a: 1 };
    const bgSolid = bg.a < 1 ? blendOver(bg, WHITE) : bg;
    const fgSolid = fg.a < 1 ? blendOver(fg, bgSolid) : fg;
    const l1 = relativeLuminance(fgSolid);
    const l2 = relativeLuminance(bgSolid);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    return Math.round(ratio * 100) / 100;
}
// ============================================================================
// Assembly — saf TS birleştirme
// ============================================================================
// "durum" Türkçe DS'lerde yaygın State prop adıdır — bu bir DS/tema adı değil,
// dil desteğidir; modülün DS-agnostic ilkesiyle çelişmez (tema/koleksiyon/font
// adı varsayılmaz, yalnızca prop ROLÜ tanınır).
const STATE_PROP_NAMES = new Set(["state", "durum", "interaction"]);
const STATE_VALUE_MAP = {
    hover: "hover",
    focus: "focus-visible",
    "focus-visible": "focus-visible",
    pressed: "active",
    active: "active",
    disabled: "disabled",
    selected: "selected",
    loading: "loading",
};
const ELEMENT_HINTS = [
    [/button|btn|cta/i, "button"],
    [/checkbox|radio|switch|toggle|input|field|textarea/i, "input"],
    [/select|dropdown/i, "select"],
    [/link/i, "a"],
    [/nav/i, "nav"],
    [/list/i, "ul"],
    [/image|avatar|photo/i, "img"],
    [/header/i, "header"],
    [/footer/i, "footer"],
    [/label|text|caption|title/i, "span"],
];
export function inferElement(componentName) {
    for (const [re, el] of ELEMENT_HINTS) {
        if (re.test(componentName))
            return el;
    }
    return "div";
}
/** Default variant ağacını dolaşıp path → görünen ad eşlemesi + part listesi üretir. */
function indexTree(tree) {
    const byPath = new Map();
    const partsOrder = [];
    const usedNames = new Set();
    byPath.set("", { node: tree, path: "", displayPath: "" });
    function walk(node, path, displayPrefix, usedAtLevel, isTopLevel) {
        const children = node.children ?? [];
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            const childPath = path === "" ? String(i) : `${path}/${i}`;
            const base = semanticPartName(child);
            const name = dedupeName(base, isTopLevel ? usedNames : usedAtLevel);
            const displayPath = displayPrefix === "" ? name : `${displayPrefix}/${name}`;
            const indexed = { node: child, path: childPath, displayPath };
            byPath.set(childPath, indexed);
            if (isTopLevel)
                partsOrder.push(indexed);
            // INSTANCE altına inen path'ler override eşlemesi için gerekir;
            // part olarak değil, display path olarak adlandırılır.
            walk(child, childPath, displayPath, new Set(), false);
        }
    }
    walk(tree, "", "", usedNames, true);
    return { byPath, partsOrder };
}
function boundTokensToCss(node, tokensById) {
    const out = {};
    const bound = node.bound ?? {};
    for (const field of Object.keys(bound)) {
        const css = fieldToCss(field, node.type);
        if (!css)
            continue;
        const entry = tokensById[bound[field]];
        out[css] = entry ? tokenRef(entry.name) : `{unresolved:${bound[field]}}`;
    }
    if (node.type === "TEXT" && node.textStyleName)
        out["text-style"] = node.textStyleName;
    return out;
}
function layoutOf(node) {
    const dirMap = { HORIZONTAL: "row", VERTICAL: "column", GRID: "grid" };
    const alignMap = {
        MIN: "start", CENTER: "center", MAX: "end", SPACE_BETWEEN: "space-between", BASELINE: "baseline",
    };
    const out = { display: node.layoutMode === "GRID" ? "grid" : "flex" };
    if (node.layoutMode && dirMap[node.layoutMode])
        out.direction = dirMap[node.layoutMode];
    if (node.counterAxisAlignItems && alignMap[node.counterAxisAlignItems])
        out.align = alignMap[node.counterAxisAlignItems];
    if (node.primaryAxisAlignItems && alignMap[node.primaryAxisAlignItems])
        out.justify = alignMap[node.primaryAxisAlignItems];
    return out;
}
/** props + states + orphan tespiti. */
export function normalizeProps(rawProps, referencedKeys, defaultCombo) {
    const props = [];
    const states = [];
    const orphans = [];
    const usedCodeNames = new Set();
    function codeName(base, isBool) {
        let name = base;
        if (usedCodeNames.has(name))
            name = isBool ? `show${toPascalCase(base)}` : `${base}2`;
        let i = 2;
        while (usedCodeNames.has(name))
            name = `${base}${++i}`;
        usedCodeNames.add(name);
        return name;
    }
    for (const raw of rawProps) {
        const cleanName = stripPropHash(raw.key);
        if (raw.type === "VARIANT") {
            const options = raw.variantOptions ?? [];
            const lowerName = cleanName.toLowerCase();
            if (STATE_PROP_NAMES.has(lowerName)) {
                for (const opt of options) {
                    const mapped = STATE_VALUE_MAP[opt.toLowerCase()];
                    if (mapped && !states.includes(mapped))
                        states.push(mapped);
                }
            }
            if (isBooleanLikeOptions(options)) {
                const name = codeName(`is${toPascalCase(cleanName)}`, true);
                const defRaw = defaultCombo[cleanName] ?? String(raw.defaultValue ?? "");
                // values gerçek variant string'lerinden türetilir ("true"/"False"/"TRUE"…):
                // Figma setProperties case-sensitive olduğundan sabit "True"/"False"
                // yazmak küçük harfli set'lerde geri-yazmayı kırar. isBooleanLikeOptions
                // guard'ı sayesinde iki find de garantili eşleşir.
                const trueOpt = options.find((o) => o.toLowerCase() === "true") ?? "True";
                const falseOpt = options.find((o) => o.toLowerCase() === "false") ?? "False";
                props.push({
                    name,
                    description: cleanName,
                    type: "boolean",
                    default: defRaw.toLowerCase() === "true",
                    bindings: {
                        figma: { kind: "VARIANT", property: raw.key, values: { true: trueOpt, false: falseOpt } },
                        code: { prop: name },
                    },
                });
                continue;
            }
            const name = codeName(toCamelCase(cleanName), false);
            const values = {};
            for (const opt of options)
                values[toKebabCase(opt)] = opt;
            const defRaw = defaultCombo[cleanName] ?? String(raw.defaultValue ?? options[0] ?? "");
            props.push({
                name,
                description: `${cleanName} of the component`,
                type: { enum: options.map((o) => toKebabCase(o)) },
                default: toKebabCase(defRaw),
                bindings: {
                    figma: { kind: "VARIANT", property: raw.key, values },
                    code: { prop: name },
                },
            });
            continue;
        }
        // BOOLEAN / TEXT / INSTANCE_SWAP — backing layer kontrolü
        if (!referencedKeys.has(raw.key))
            orphans.push(raw.key);
        if (raw.type === "BOOLEAN") {
            const name = codeName(toCamelCase(cleanName), true);
            props.push({
                name,
                description: cleanName,
                type: "boolean",
                default: raw.defaultValue === true,
                bindings: {
                    figma: { kind: "BOOLEAN", property: raw.key },
                    code: { prop: name },
                },
            });
            continue;
        }
        if (raw.type === "TEXT") {
            const name = codeName(toCamelCase(cleanName), false);
            // TEXT prop'ları contract'ta her zaman required:true alır: Figma'daki
            // default değer placeholder'dır, kod tarafında içeriksiz bir metin
            // bileşeni render etmek neredeyse her zaman hatadır. Opsiyonelleştirme
            // kararı contract'ı elden geçiren geliştiriciye bırakılır (status: draft).
            props.push({
                name,
                description: `${cleanName} content`,
                type: "text",
                default: raw.defaultValue ?? "",
                required: true,
                bindings: {
                    figma: { kind: "TEXT", property: raw.key },
                    code: { prop: name },
                },
            });
            continue;
        }
        // INSTANCE_SWAP
        const name = codeName(toCamelCase(cleanName), false);
        props.push({
            name,
            description: `${cleanName} slot`,
            type: "slot",
            default: raw.defaultComponentName ?? raw.defaultValue ?? null,
            bindings: {
                figma: {
                    kind: "INSTANCE_SWAP",
                    property: raw.key,
                    ...(raw.defaultComponentId ? { defaultComponentId: raw.defaultComponentId } : {}),
                },
                code: { prop: name },
            },
        });
    }
    return { props, states, orphans };
}
/**
 * Variant adından ("Style=Custom, Size=Large") kombinasyon objesi çıkarır.
 * Tam olarak "anahtar=değer" olmayan segmentler (combo'suz ad, "a=b=c") atlanır —
 * plugin script'indeki parseCombo ile davranış birebir aynı tutulur.
 */
export function parseVariantCombo(name) {
    const out = {};
    for (const part of String(name).split(",")) {
        const kv = part.split("=");
        if (kv.length === 2)
            out[kv[0].trim()] = kv[1].trim();
    }
    return out;
}
function collectReferencedKeys(tree) {
    const keys = new Set();
    function walk(n) {
        if (!n)
            return;
        if (n.propRefs)
            for (const v of Object.values(n.propRefs))
                keys.add(v);
        for (const c of n.children ?? [])
            walk(c);
    }
    walk(tree);
    return keys;
}
/** structure + overrides içinde geçen tüm variable id'lerini toplar (aşama 3 girdisi). */
export function collectVariableIds(structure, overrides) {
    const ids = new Set();
    function walkTree(n) {
        if (!n)
            return;
        for (const id of Object.values(n.bound ?? {}))
            ids.add(id);
        for (const c of n.children ?? [])
            walkTree(c);
    }
    walkTree(structure.tree);
    for (const group of Object.values(overrides.overrides ?? {})) {
        for (const entries of Object.values(group)) {
            for (const e of entries) {
                if (e.f === "textStyle")
                    continue; // stil id'leri variable değil
                if (e.a?.id)
                    ids.add(e.a.id);
                if (e.b?.id)
                    ids.add(e.b.id);
            }
        }
    }
    return Array.from(ids);
}
function formatOverrideValue(entry, tokensById) {
    const b = entry.b;
    if (!b)
        return "(none)";
    if (entry.f === "textStyle")
        return b.styleName ?? "(unknown style)";
    if (b.id) {
        const t = tokensById[b.id];
        return t ? tokenRef(t.name) : `{unresolved:${b.id}}`;
    }
    if (b.v !== undefined && b.v !== null)
        return String(b.v);
    return "(none)";
}
function formatOverrides(rawOverrides, byPath, tokensById) {
    const out = {};
    for (const [prop, group] of Object.entries(rawOverrides.overrides ?? {})) {
        const groupKey = `${toCamelCase(prop)}Overrides`;
        const formattedGroup = {};
        for (const [value, entries] of Object.entries(group)) {
            const rootTokens = {};
            const childTokens = {};
            for (const entry of entries) {
                const nodeType = entry.t;
                // textStyle FIELD_TO_CSS üzerinden zaten "text-style"e eşlenir;
                // strokeWeight ise haritada yok — kökte 4 kenara genişletileceği
                // için burada geçici "border-width" etiketi alır.
                let css = fieldToCss(entry.f, nodeType);
                if (entry.f === "strokeWeight")
                    css = "border-width";
                if (!css)
                    continue;
                const formatted = formatOverrideValue(entry, tokensById);
                if (entry.p === "") {
                    // Kök: strokeWeight → 4 kenar genişliği (contract şeması border-*-width bekler)
                    if (entry.f === "strokeWeight") {
                        for (const side of ["top", "bottom", "left", "right"]) {
                            rootTokens[`border-${side}-width`] = formatted;
                        }
                    }
                    else {
                        rootTokens[css] = formatted;
                    }
                }
                else {
                    const indexed = byPath.get(entry.p);
                    // Fallback (path default ağaçta yoksa — variant'a özgü ekstra node):
                    // ham adlardan kebab yol üretilir; bu yol dedupeName soneklerinden
                    // (-2, -3) habersizdir, aynı adlı kardeşlerde çakışma riski taşır.
                    // Normal set'lerde byPath her zaman bulunur, fallback nadirdir.
                    const displayPath = indexed?.displayPath
                        ?? entry.n.split("/").map((s) => toKebabCase(s)).join("/");
                    childTokens[`${displayPath}/${css}`] = formatted;
                }
            }
            const valueEntry = {};
            if (Object.keys(rootTokens).length > 0)
                valueEntry.root = { tokens: rootTokens };
            if (Object.keys(childTokens).length > 0)
                valueEntry.children = { tokens: childTokens };
            if (Object.keys(valueEntry).length > 0)
                formattedGroup[toKebabCase(value)] = valueEntry;
        }
        if (Object.keys(formattedGroup).length > 0)
            out[groupKey] = formattedGroup;
    }
    return out;
}
function buildParts(partsOrder, tokensById) {
    const parts = {};
    for (const { node, displayPath } of partsOrder) {
        const key = displayPath;
        if (node.type === "INSTANCE") {
            parts[key] = {
                slot: {
                    name: key,
                    acceptsMode: "open",
                    figmaName: node.name,
                    ...(node.mainComponent?.id ? { defaultComponentId: node.mainComponent.id } : {}),
                },
            };
            continue;
        }
        const tokens = boundTokensToCss(node, tokensById);
        const entry = { attrs: { figmaName: node.name } };
        if (Object.keys(tokens).length > 0)
            entry.tokens = tokens;
        parts[key] = entry;
    }
    return parts;
}
function buildBaseSpecs(tree, partsOrder) {
    // Figma'da primary axis layoutMode'u izler: VERTICAL'de primary = height,
    // counter = width. hug/fixed eşlemesi bu yüzden eksene göre seçilmeli —
    // aksi halde dikey bileşenlerde width/height ters raporlanır.
    const vertical = tree.layoutMode === "VERTICAL";
    const widthMode = vertical ? tree.counterAxisSizingMode : tree.primaryAxisSizingMode;
    const heightMode = vertical ? tree.primaryAxisSizingMode : tree.counterAxisSizingMode;
    const root = {
        layoutMode: tree.layoutMode ?? "NONE",
        primaryAxisAlign: tree.primaryAxisAlignItems ?? null,
        counterAxisAlign: tree.counterAxisAlignItems ?? null,
        paddingTop: tree.paddingTop ?? 0,
        paddingRight: tree.paddingRight ?? 0,
        paddingBottom: tree.paddingBottom ?? 0,
        paddingLeft: tree.paddingLeft ?? 0,
        gap: tree.itemSpacing ?? 0,
        radius: tree.radius ?? [0, 0, 0, 0],
        width: widthMode === "AUTO" ? "hug" : tree.w,
        height: heightMode === "AUTO" ? "hug" : tree.h,
        primaryAxisSizingMode: tree.primaryAxisSizingMode ?? null,
        counterAxisSizingMode: tree.counterAxisSizingMode ?? null,
        fillHex: tree.fillHex ?? null,
    };
    const children = {};
    for (const { node, displayPath } of partsOrder) {
        const c = {
            type: node.type,
            figmaName: node.name,
            width: node.w,
            height: node.h,
            visible: node.visible,
            layoutGrow: node.layoutGrow ?? 0,
            layoutAlign: node.layoutAlign ?? "INHERIT",
        };
        if (node.type === "TEXT") {
            c.textStyle = node.textStyleName ?? null;
            c.fontFamily = node.fontFamily ?? null;
            c.fontWeight = node.fontStyle ?? null;
            c.fontSize = node.fontSize ?? null;
            c.lineHeight = node.lineHeight ?? "auto";
            if (node.lineHeightUnit)
                c.lineHeightUnit = node.lineHeightUnit;
            c.letterSpacing = node.letterSpacing ?? 0;
            c.letterSpacingUnit = node.letterSpacingUnit ?? "PIXELS";
            c.textAlign = node.textAlign ?? null;
            c.textAutoResize = node.textAutoResize ?? null;
            c.colorHex = node.fillHex ?? null;
        }
        if (node.type === "INSTANCE" && node.mainComponent) {
            c.component = node.mainComponent.name;
            c.componentId = node.mainComponent.id;
        }
        children[displayPath] = c;
    }
    return { root, children };
}
/**
 * Her stil varyantı için root background × text foreground token çiftini
 * eşleyip mode bazlı WCAG kontrastı hesaplar.
 *
 * Yalnızca İLK TEXT part analiz edilir: bileşenin birincil etiketi budur ve
 * stil override'ları tipik olarak tüm text'leri aynı contents token'ına bağlar;
 * çoklu-metin bileşenlerde ek çiftler contract'ı elden geçirende genişletilebilir.
 * fg için "ilk mode" fallback'i vardır (bkz. pushPair): fg ve bg farklı
 * koleksiyonlardan gelebilir ve mode adları örtüşmeyebilir (örn. bg Light/Dark,
 * fg tek-mode "Base") — bg mode'ları eksen kabul edilir, fg bulunamazsa ilk
 * değerine düşülür; bg için fallback yoktur çünkü eksenin kendisidir.
 */
function buildA11y(structure, formattedOverrides, anatomyRootTokens, partsOrder, tokensById, defaultCombo) {
    // Token ref → entry ters eşlemesi
    const byRef = new Map();
    for (const entry of Object.values(tokensById))
        byRef.set(tokenRef(entry.name), entry);
    const textParts = partsOrder.filter((p) => p.node.type === "TEXT");
    if (textParts.length === 0)
        return [];
    const textPart = textParts[0];
    const textTokens = boundTokensToCss(textPart.node, tokensById);
    const defaultFgRef = textTokens.color;
    const defaultBgRef = anatomyRootTokens["background-color"];
    // "Style" benzeri grubu seç: önce ada göre (style/variant/tone/type/color),
    // bulunamazsa renk override'ı içeren ilk grup. State-benzeri gruplar
    // (hover/pressed background değiştirse bile) her iki turda da atlanır —
    // a11y çiftleri kalıcı stilleri temsil etmeli, geçici etkileşim hallerini değil.
    let styleGroupKey = null;
    let stylePropName = null;
    const groupTouchesColor = (key) => {
        const group = formattedOverrides[key];
        if (!group)
            return false;
        return Object.values(group).some((v) => Object.keys(v.root?.tokens ?? {}).includes("background-color") ||
            Object.keys(v.children?.tokens ?? {}).some((k) => k.endsWith("/color")));
    };
    const candidates = Object.keys(structure.variantGroupProperties ?? {})
        .filter((prop) => !STATE_PROP_NAMES.has(prop.toLowerCase()));
    const byNamePriority = [
        ...candidates.filter((p) => /style|variant|tone|type|color/i.test(p)),
        ...candidates.filter((p) => !/style|variant|tone|type|color/i.test(p)),
    ];
    for (const prop of byNamePriority) {
        const key = `${toCamelCase(prop)}Overrides`;
        if (groupTouchesColor(key)) {
            styleGroupKey = key;
            stylePropName = prop;
            break;
        }
    }
    const pairs = [];
    function pushPair(styleLabel, fgRef, bgRef) {
        if (!fgRef || !bgRef)
            return;
        const fg = byRef.get(fgRef);
        const bg = byRef.get(bgRef);
        if (!fg || !bg || fg.type !== "COLOR" || bg.type !== "COLOR")
            return;
        const ratios = {};
        for (const mode of Object.keys(bg.values)) {
            const fgHex = fg.values[mode] ?? fg.values[Object.keys(fg.values)[0]];
            const bgHex = bg.values[mode];
            if (typeof fgHex !== "string" || typeof bgHex !== "string")
                continue;
            const ratio = computeContrastRatio(fgHex, bgHex);
            if (ratio !== null)
                ratios[mode] = ratio;
        }
        if (Object.keys(ratios).length === 0)
            return;
        const min = Math.min(...Object.values(ratios));
        pairs.push({
            foreground: fg.name.split("/").join("."),
            background: bg.name.split("/").join("."),
            node: textPart.displayPath,
            style: styleLabel,
            ratios,
            wcagAA: min >= 4.5,
            wcagAAA: min >= 7,
        });
    }
    if (styleGroupKey && stylePropName) {
        const group = formattedOverrides[styleGroupKey];
        for (const [valueKey, override] of Object.entries(group)) {
            const bgRef = override.root?.tokens?.["background-color"] ?? defaultBgRef;
            const fgRef = override.children?.tokens?.[`${textPart.displayPath}/color`] ?? defaultFgRef;
            if (bgRef === "(none)")
                continue; // şeffaf zemin — kontrast bağlama bağlı
            pushPair(valueKey, fgRef, bgRef);
        }
        // Default stilin kendi çifti (override listesinde yoktur)
        const defaultStyleValue = defaultCombo[stylePropName];
        if (defaultStyleValue)
            pushPair(toKebabCase(defaultStyleValue), defaultFgRef, defaultBgRef);
    }
    else {
        pushPair("default", defaultFgRef, defaultBgRef);
    }
    return pairs;
}
/** Üç aşamanın ham çıktısını tam contract + rapora dönüştürür. */
export function assembleContract(structure, overrides, tokens, opts) {
    if (!structure.ok || !structure.set || !structure.tree || !structure.defaultVariant) {
        throw new Error(`Invalid structure payload: ${structure.error ?? "missing fields"}`);
    }
    const tokensById = tokens.tokens ?? {};
    const setName = structure.set.name;
    const kebabName = toKebabCase(setName);
    const pascalName = toPascalCase(setName);
    const defaultCombo = parseVariantCombo(structure.defaultVariant.name);
    const { byPath, partsOrder } = indexTree(structure.tree);
    const referencedKeys = collectReferencedKeys(structure.tree);
    const { props, states, orphans } = normalizeProps(structure.props ?? [], referencedKeys, defaultCombo);
    const anatomyRootTokens = boundTokensToCss(structure.tree, tokensById);
    const formattedOverrides = formatOverrides(overrides, byPath, tokensById);
    const resolvedTokens = {};
    for (const entry of Object.values(tokensById)) {
        resolvedTokens[entry.name.split("/").join(".")] = {
            type: entry.type,
            collection: entry.collection,
            values: entry.values,
            aliasChain: entry.aliasChain,
        };
    }
    const a11yPairs = buildA11y(structure, formattedOverrides, anatomyRootTokens, partsOrder, tokensById, defaultCombo);
    const contract = {
        $schema: "./contract.schema.json",
        id: `ds.${kebabName}`,
        name: setName,
        version: "0.1.0",
        status: "draft",
        description: `${setName} component`,
        semantics: { element: inferElement(setName) },
        ...(states.length > 0 ? { states } : {}),
        props,
        anatomy: {
            layout: layoutOf(structure.tree),
            tokens: anatomyRootTokens,
            parts: buildParts(partsOrder, tokensById),
        },
        resolvedTokens,
        baseSpecs: buildBaseSpecs(structure.tree, partsOrder),
        a11y: { contrastPairs: a11yPairs },
        anchors: {
            figma: {
                fileKey: structure.fileKey ?? "",
                componentSetKey: structure.set.key || structure.set.id,
                nodeId: structure.set.id,
            },
            code: {
                importPath: (opts?.importPathTemplate ?? "@ds/components/{Name}").replace("{Name}", pascalName),
                export: pascalName,
            },
        },
        ...(Object.keys(formattedOverrides).length > 0 ? { variantOverrides: formattedOverrides } : {}),
    };
    const a11yFailCount = a11yPairs.filter((p) => !p.wcagAA).length;
    const notes = [
        "Status: draft — anchors.code needs manual verification",
    ];
    if (orphans.length > 0) {
        notes.push(`Orphan property uyarısı: ${orphans.length} prop'un backing layer'ı default variant'ta bulunamadı: ${orphans.join(", ")}`);
    }
    const report = {
        propsExtracted: props.length,
        statesDetected: states,
        tokensResolved: Object.keys(tokensById).length,
        a11yPairCount: a11yPairs.length,
        a11yFailCount,
        orphanProps: orphans,
        suggestedFileName: `${kebabName}-spec.json`,
        notes,
    };
    return { contract, report };
}
/**
 * executeCodeViaUI sonucundan script JSON string'ini çıkarıp parse eder.
 * Script JSON.stringify döndürür — safeSerialize string'e dokunmaz.
 */
export function parseScriptResult(execResult, stage) {
    if (execResult === null || typeof execResult !== "object") {
        throw new Error(`${stage}: unexpected execute result (${typeof execResult})`);
    }
    const rec = execResult;
    if (rec.success === false) {
        throw new Error(`${stage}: ${String(rec.error ?? "plugin execution failed")}`);
    }
    const raw = rec.result;
    if (typeof raw === "string") {
        try {
            return JSON.parse(raw);
        }
        catch {
            throw new Error(`${stage}: script result is not valid JSON`);
        }
    }
    if (raw !== null && typeof raw === "object")
        return raw;
    throw new Error(`${stage}: script returned no result`);
}
//# sourceMappingURL=contract-extractor.js.map