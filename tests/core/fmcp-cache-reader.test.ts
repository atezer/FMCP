/**
 * Unit tests for FMCP DS cache reader (v3.1+).
 * Verifies parsing of fixture cache files under tests/fixtures/fcm-ds/.
 */

import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, copyFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const FIXTURES = join(__dirname, "..", "fixtures", "fcm-ds");
const FIXTURE_KEY_DIR = "TESTKEY1234567890ABCD";

let tmpRoot: string;

function setupCache(lastSyncIso: string | null, opts?: { skipMeta?: boolean; skipActive?: boolean }): string {
	tmpRoot = mkdtempSync(join(tmpdir(), "fmcp-cache-test-"));
	if (!opts?.skipActive) {
		copyFileSync(join(FIXTURES, "active.md"), join(tmpRoot, "active.md"));
	}
	const keyDir = join(tmpRoot, FIXTURE_KEY_DIR);
	mkdirSync(keyDir, { recursive: true });
	copyFileSync(join(FIXTURES, FIXTURE_KEY_DIR, "components.md"), join(keyDir, "components.md"));
	copyFileSync(join(FIXTURES, FIXTURE_KEY_DIR, "tokens.md"), join(keyDir, "tokens.md"));
	if (!opts?.skipMeta && lastSyncIso) {
		const metaTemplate = readFileSync(join(FIXTURES, FIXTURE_KEY_DIR, "_meta.md"), "utf8");
		writeFileSync(join(keyDir, "_meta.md"), metaTemplate.replace("__LAST_SYNC__", lastSyncIso));
	}
	process.env.FMCP_CACHE_ROOT = tmpRoot;
	return tmpRoot;
}

afterEach(() => {
	if (tmpRoot) {
		rmSync(tmpRoot, { recursive: true, force: true });
		tmpRoot = "";
	}
	delete process.env.FMCP_CACHE_ROOT;
	jest.resetModules();
});

async function loadReader() {
	jest.resetModules();
	return await import("../../src/core/fmcp-cache-reader");
}

describe("resolveActiveDs", () => {
	it("returns fresh status when sync is recent", async () => {
		setupCache(new Date().toISOString());
		const { resolveActiveDs } = await loadReader();
		const ctx = await resolveActiveDs();
		expect(ctx.status).toBe("fresh");
		expect(ctx.libraryName).toBe("❖ TEST");
		expect(ctx.fileKey).toBe("TESTKEY1234567890ABCD");
		expect(ctx.cacheRoot).toContain(FIXTURE_KEY_DIR);
		expect(ctx.lastSync).toBeTruthy();
	});

	it("returns stale status for old sync", async () => {
		const old = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
		setupCache(old);
		const { resolveActiveDs } = await loadReader();
		const ctx = await resolveActiveDs();
		expect(ctx.status).toBe("stale");
		expect(ctx.libraryName).toBe("❖ TEST");
	});

	it("returns missing status when active.md not found", async () => {
		setupCache(null, { skipActive: true });
		const { resolveActiveDs } = await loadReader();
		const ctx = await resolveActiveDs();
		expect(ctx.status).toBe("missing");
		expect(ctx.libraryName).toBeNull();
	});

	it("returns missing status when _meta.md absent", async () => {
		setupCache(null, { skipMeta: true });
		const { resolveActiveDs } = await loadReader();
		const ctx = await resolveActiveDs();
		expect(ctx.status).toBe("missing");
	});
});

describe("getLibraryComponents", () => {
	it("parses heading-bullet UI components and icon table", async () => {
		setupCache(new Date().toISOString());
		const { getLibraryComponents } = await loadReader();
		const items = await getLibraryComponents("❖ TEST");
		const names = items.map((i) => i.name);
		expect(names).toContain("Button");
		expect(names).toContain("NavigationTopBar");
		expect(names).toContain("Divider_H");
		expect(names).toContain("chevron_right");
		expect(names).toContain("close");
		const button = items.find((i) => i.name === "Button");
		expect(button?.key).toBe("aaaa1111");
		const chevron = items.find((i) => i.name === "chevron_right");
		expect(chevron?.key).toBe("dddd4444");
		expect(chevron?.role).toBe("icon");
	});

	it("parses sourceLibrary annotation (Phase G multi-library)", async () => {
		setupCache(new Date().toISOString());
		const { getLibraryComponents } = await loadReader();
		const items = await getLibraryComponents("❖ TEST");
		const nav = items.find((i) => i.name === "NavigationTopBar");
		expect(nav?.sourceLibrary).toBe("❖ TEST Mobil");
		// Other items without explicit annotation fall back to active library
		const button = items.find((i) => i.name === "Button");
		expect(button?.sourceLibrary).toBe("❖ TEST");
	});

	it("parses kind annotation + auto-infers COMPONENT_SET from variant syntax (Phase H)", async () => {
		setupCache(new Date().toISOString());
		const { getLibraryComponents } = await loadReader();
		const items = await getLibraryComponents("❖ TEST");
		// Explicit annotation
		const button = items.find((i) => i.name === "Button");
		expect(button?.kind).toBe("COMPONENT_SET");
		// Non-variant entry defaults to COMPONENT
		const divider = items.find((i) => i.name === "Divider_H");
		expect(divider?.kind).toBe("COMPONENT");
		// Icons default to COMPONENT (no Props/Type column value with variant)
		const chevron = items.find((i) => i.name === "chevron_right");
		expect(chevron?.kind).toBe("COMPONENT");
	});

	it("skips Eksik (missing) components", async () => {
		setupCache(new Date().toISOString());
		const { getLibraryComponents } = await loadReader();
		const items = await getLibraryComponents("❖ TEST");
		expect(items.find((i) => i.name === "Card")).toBeUndefined();
	});

	it("filters by substring", async () => {
		setupCache(new Date().toISOString());
		const { getLibraryComponents } = await loadReader();
		const items = await getLibraryComponents("❖ TEST", "navi");
		expect(items.map((i) => i.name)).toEqual(["NavigationTopBar"]);
	});

	it("returns empty when libraryName mismatches active.md", async () => {
		setupCache(new Date().toISOString());
		const { getLibraryComponents } = await loadReader();
		const items = await getLibraryComponents("❖ OTHER");
		expect(items).toEqual([]);
	});
});

describe("getLibraryTokens", () => {
	it("parses spacing, radius, and component-bg tables with type inference", async () => {
		setupCache(new Date().toISOString());
		const { getLibraryTokens } = await loadReader();
		const items = await getLibraryTokens("❖ TEST");
		const spacing = items.filter((i) => i.type === "spacing");
		expect(spacing.map((i) => i.name)).toEqual(["spacing-100", "spacing-200"]);
		expect(spacing[0].key).toBe("s100key");
		const radius = items.filter((i) => i.type === "radius");
		expect(radius.map((i) => i.name)).toEqual(["radius-100"]);
		const colors = items.filter((i) => i.type === "color");
		expect(colors.length).toBeGreaterThan(0);
		expect(colors[0].name).toMatch(/Primary button bg/);
	});

	it("skips Collection Info metadata table", async () => {
		setupCache(new Date().toISOString());
		const { getLibraryTokens } = await loadReader();
		const items = await getLibraryTokens("❖ TEST");
		expect(items.find((i) => i.key === "colkey1")).toBeUndefined();
	});

	it("filter narrows by name substring", async () => {
		setupCache(new Date().toISOString());
		const { getLibraryTokens } = await loadReader();
		const items = await getLibraryTokens("❖ TEST", "spacing-100");
		expect(items.length).toBe(1);
		expect(items[0].key).toBe("s100key");
	});

	it("returns empty when libraryName mismatches active.md", async () => {
		setupCache(new Date().toISOString());
		const { getLibraryTokens } = await loadReader();
		const items = await getLibraryTokens("❖ OTHER");
		expect(items).toEqual([]);
	});
});
