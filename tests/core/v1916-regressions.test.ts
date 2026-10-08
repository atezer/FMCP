/**
 * v1.9.16 regression tests — Faz 0 "silently broken features".
 * Each block maps to an item in docs/IYILESTIRME_PLANI.md (PR-1).
 */

import { truncatePluginResponse, guardPluginPayload, PLUGIN_SIZE_THRESHOLDS } from "../../src/core/response-guard";
import { BlockingTracker, containsNodeId } from "../../src/core/blocking-tracker";
import { hexToRgbLiteral, normalizeTokenValue, rgbaToHex } from "../../src/core/color-utils";
import { BootstrapInjector } from "../../src/core/bootstrap-injector";
import { FMCP_VERSION } from "../../src/core/version";
import { PluginBridgeConnector } from "../../src/core/plugin-bridge-connector";
import { ResponseCache } from "../../src/core/response-cache";

const bigProps = () =>
	Array.from({ length: 1200 }, (_, i) => ({ name: `prop-${i}`, type: "VARIANT", values: ["Default", "Hover", "Pressed"], description: "x".repeat(40) }));

describe("0.1 response guard never returns {} for non-node payloads", () => {
	it("{props:[...]} over the limit keeps data and a marker", () => {
		const out = truncatePluginResponse({ props: bigProps() }, "figma_extract_contract");
		expect(out.wasTruncated).toBe(true);
		const data = out.data as Record<string, unknown>;
		expect(Array.isArray(data.props)).toBe(true);
		expect((data.props as unknown[]).length).toBeGreaterThan(0);
		expect(out.truncatedSizeKB).toBeLessThanOrEqual(PLUGIN_SIZE_THRESHOLDS.WARNING_KB);
	});

	it("{success, contract} envelope survives (no stage-4 wipe)", () => {
		const out = truncatePluginResponse({ success: true, contract: { props: bigProps() } }, "figma_extract_contract");
		const data = out.data as Record<string, unknown>;
		expect(data.success).toBe(true);
		expect(data.contract).toBeDefined();
	});

	it("large base64 image is truncated but not emptied", () => {
		const out = truncatePluginResponse({ success: true, image: { base64: "A".repeat(120 * 1024) } }, "figma_get_component_image");
		const data = out.data as Record<string, unknown>;
		expect(data.success).toBe(true);
		expect(data.image).toBeDefined();
	});

	it("real node trees are still pruned by node stages", () => {
		const child = (i: number) => ({ id: `1:${i}`, name: `n${i}`, type: "FRAME", fills: [{ type: "SOLID" }], children: [], effects: ["x".repeat(400)] });
		const doc = { id: "0:1", name: "Doc", type: "DOCUMENT", children: Array.from({ length: 400 }, (_, i) => child(i)) };
		const out = truncatePluginResponse({ success: true, data: { document: doc } }, "figma_get_file_data");
		const guard = (out.data as Record<string, unknown>)._responseGuard as Record<string, unknown>;
		expect(String(guard.strategy)).toMatch(/^plugin-prune-stage-/);
	});

	it("guardPluginPayload leaves a compact _truncated marker when not debug", () => {
		const out = guardPluginPayload({ success: true, props: bigProps() }, "t") as Record<string, unknown>;
		expect(out._truncated).toBeDefined();
		expect(out._responseGuard).toBeUndefined();
		expect(out.success).toBe(true);
	});

	it("guardPluginPayload keeps full _responseGuard when debug", () => {
		const out = guardPluginPayload({ props: bigProps() }, "t", true) as Record<string, unknown>;
		expect(out._responseGuard).toBeDefined();
	});

	it("small payloads pass through untouched", () => {
		const input = { success: true, a: 1 };
		expect(guardPluginPayload(input, "t")).toBe(input);
	});
});

describe("0.2 cached payloads stay guarded", () => {
	it("caching the guarded payload keeps cache hits under the limit", () => {
		const cache = new ResponseCache();
		const guarded = guardPluginPayload({ props: bigProps() }, "figma_get_file_data");
		cache.set("k", guarded);
		const hit = cache.get("k", 60_000);
		expect(JSON.stringify(hit).length / 1024).toBeLessThanOrEqual(PLUGIN_SIZE_THRESHOLDS.WARNING_KB + 1);
	});
});

describe("0.4 console logs are unwrapped exactly once", () => {
	const logs = { logs: [{ level: "log", time: 1, args: ["hi"] }], total: 1 };
	const connectorWith = (reply: unknown) =>
		new PluginBridgeConnector({ request: async () => reply } as never);

	it("accepts the shape the UI actually sends ({logs,total})", async () => {
		await expect(connectorWith(logs).getConsoleLogs()).resolves.toEqual(logs);
	});

	it("still accepts a {data:{logs}} envelope", async () => {
		await expect(connectorWith({ success: true, data: logs }).getConsoleLogs()).resolves.toEqual(logs);
	});

	it("falls back to empty", async () => {
		await expect(connectorWith(undefined).getConsoleLogs()).resolves.toEqual({ logs: [], total: 0 });
	});
});

describe("0.8 parity value normalization", () => {
	it("missing color channels become 00, not NaN", () => {
		expect(rgbaToHex({ r: 1, g: 0.5 } as never)).toBe("#ff8000");
	});

	it("aliases are compared by id, not [object Object]", () => {
		expect(normalizeTokenValue({ type: "VARIABLE_ALIAS", id: "VariableID:1:2" })).toBe("alias:VariableID:1:2");
	});
});

describe("N8 fillColor validation", () => {
	it("accepts #rrggbb and #rgb", () => {
		expect(hexToRgbLiteral("#ff0000")).toBe("{ r: 1, g: 0, b: 0 }");
		expect(hexToRgbLiteral("fff")).toBe("{ r: 1, g: 1, b: 1 }");
	});

	it("rejects code injection", () => {
		expect(() => hexToRgbLiteral("#fff');figma.root.remove();('")).toThrow(/Invalid fillColor/);
	});
});

describe("0.11 blocking tracker matches whole node ids", () => {
	it("1:2 does not match 11:23 or I1:2;3:4", () => {
		expect(containsNodeId('getNodeByIdAsync("11:23")', "1:2")).toBe(false);
		expect(containsNodeId('getNodeByIdAsync("I1:2;3:4")', "1:2")).toBe(false);
		expect(containsNodeId('getNodeByIdAsync("1:2")', "1:2")).toBe(true);
	});

	it("checkSuppression ignores prefix collisions", () => {
		const t = new BlockingTracker();
		t.recordBlocking(["1:2"]);
		expect(t.checkSuppression('await figma.getNodeByIdAsync("11:23")').error).toBeUndefined();
		expect(t.checkSuppression('await figma.getNodeByIdAsync("1:2")').error).toBeDefined();
	});
});

describe("0.12 bootstrap reports the real version", () => {
	it("uses FMCP_VERSION", () => {
		const b = new BootstrapInjector().getBootstrap() as Record<string, unknown> | null;
		expect(JSON.stringify(b)).toContain(`"version":"${FMCP_VERSION}"`);
	});
});
