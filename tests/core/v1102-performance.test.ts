/**
 * v1.10.2 — Faz 2 server-side performance: LRU/size-bounded response cache,
 * client-generation cache keys, single-serialization response guard.
 */

import type { AddressInfo } from "net";
import { WebSocket } from "ws";
import { ResponseCache } from "../../src/core/response-cache";
import { PluginBridgeServer } from "../../src/core/plugin-bridge-server";
import { truncatePluginResponse, PLUGIN_SIZE_THRESHOLDS } from "../../src/core/response-guard";

describe("ResponseCache", () => {
	it("is LRU: a hit protects an entry from eviction", () => {
		const cache = new ResponseCache(2);
		cache.set("a", "A");
		cache.set("b", "B");
		expect(cache.get("a", 60_000)).toBe("A"); // a becomes most recently used
		cache.set("c", "C"); // evicts b, not a
		expect(cache.get("a", 60_000)).toBe("A");
		expect(cache.get("b", 60_000)).toBeNull();
		expect(cache.get("c", 60_000)).toBe("C");
	});

	it("enforces the size budget and tracks totalChars exactly", () => {
		const cache = new ResponseCache(50, 100);
		cache.set("a", "x".repeat(40));
		cache.set("b", "y".repeat(40));
		expect(cache.totalChars).toBe(80);
		cache.set("c", "z".repeat(40)); // 120 > 100 → evict LRU "a"
		expect(cache.get("a", 60_000)).toBeNull();
		expect(cache.totalChars).toBe(80);
		cache.set("b", "short"); // replacing an entry updates the total
		expect(cache.totalChars).toBe(45);
	});

	it("does not cache a value larger than the whole budget", () => {
		const cache = new ResponseCache(50, 10);
		cache.set("big", "x".repeat(11));
		expect(cache.size).toBe(0);
		expect(cache.totalChars).toBe(0);
	});

	it("expired entries and invalidation release their size", () => {
		const cache = new ResponseCache();
		cache.set("p:1", "abc");
		cache.set("q:1", "de");
		expect(cache.get("p:1", -1)).toBeNull();
		expect(cache.totalChars).toBe(2);
		cache.invalidate("q:");
		expect(cache.totalChars).toBe(0);
		cache.set("r", { a: 1 }); // objects are sized by their JSON
		expect(cache.totalChars).toBe(JSON.stringify({ a: 1 }).length);
		cache.invalidate();
		expect(cache.size).toBe(0);
		expect(cache.totalChars).toBe(0);
	});
});

describe("bridge client generation", () => {
	it("changes when a plugin registers and when it disconnects", async () => {
		const bridge = new PluginBridgeServer(5454);
		const b = bridge as unknown as Record<string, any>;
		const http = b.createBridgeHttpServer();
		await new Promise<void>((r) => http.listen(0, "127.0.0.1", r));
		const port = (http.address() as AddressInfo).port;
		b.setupBridgeOnServer(http, port, "127.0.0.1");
		try {
			const g0 = bridge.getClientGeneration();
			const ws = new WebSocket(`ws://127.0.0.1:${port}`, { origin: "null" });
			await new Promise((r) => ws.once("open", r));
			ws.send(JSON.stringify({ type: "ready", fileKey: "FILE_A", fileName: "A" }));
			const until = async (cond: () => boolean) => {
				const end = Date.now() + 2000;
				while (!cond() && Date.now() < end) await new Promise((r) => setTimeout(r, 20));
			};
			await until(() => bridge.getClientGeneration() > g0);
			const g1 = bridge.getClientGeneration();
			expect(g1).toBeGreaterThan(g0);
			ws.close();
			await until(() => bridge.getClientGeneration() > g1);
			expect(bridge.getClientGeneration()).toBeGreaterThan(g1);
		} finally {
			bridge.stop();
		}
	});
});

describe("response guard after single-serialization refactor", () => {
	const tree = (d: number, w: number): Record<string, unknown> => ({
		id: `${d}`,
		name: `Frame ${d}`,
		type: "FRAME",
		fills: [{ type: "SOLID", color: { r: 1, g: 0, b: 0 } }],
		effects: [{ type: "DROP_SHADOW" }],
		...(d > 0 ? { children: Array.from({ length: w }, () => tree(d - 1, w)) } : {}),
	});

	it("still prunes large node trees under the limit without mutating the input", () => {
		const payload = { success: true, data: { document: tree(4, 8) } };
		const before = JSON.stringify(payload);
		const out = truncatePluginResponse(payload, "figma_get_file_data");
		expect(out.wasTruncated).toBe(true);
		expect(out.truncatedSizeKB).toBeLessThanOrEqual(PLUGIN_SIZE_THRESHOLDS.WARNING_KB);
		expect(JSON.stringify(payload)).toBe(before);
		const doc = (out.data as any).data.document;
		expect(doc.children).toHaveLength(5);
		expect(doc._childrenTruncated).toBe(3);
	});

	it("generic payloads are trimmed to fit and keep their envelope", () => {
		const payload = {
			success: true,
			items: Array.from({ length: 5000 }, (_, i) => ({ i, text: "x".repeat(100) })),
		};
		const out = truncatePluginResponse(payload, "figma_extract_contract");
		expect(out.wasTruncated).toBe(true);
		expect(out.truncatedSizeKB).toBeLessThanOrEqual(PLUGIN_SIZE_THRESHOLDS.WARNING_KB);
		expect((out.data as any).success).toBe(true);
		expect(out.originalSizeKB).toBeCloseTo(JSON.stringify(payload).length / 1024, 5);
	});
});
