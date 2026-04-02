import {
	estimateTokens,
	calculateSizeKB,
	truncateResponse,
	truncateRestResponse,
	RESPONSE_SIZE_THRESHOLDS,
} from "../../src/core/response-guard";

// ---- estimateTokens ----

describe("estimateTokens", () => {
	it("returns ~1 token per 4 chars for strings", () => {
		expect(estimateTokens("abcd")).toBe(1);
		expect(estimateTokens("abcdefgh")).toBe(2);
	});

	it("estimates tokens for objects", () => {
		const obj = { name: "test", value: 123 };
		const tokens = estimateTokens(obj);
		expect(tokens).toBeGreaterThan(0);
		expect(tokens).toBe(Math.ceil(JSON.stringify(obj).length / 4));
	});

	it("handles empty data", () => {
		expect(estimateTokens("")).toBe(0);
		expect(estimateTokens(null)).toBeGreaterThan(0); // "null" = 4 chars = 1 token
	});
});

// ---- calculateSizeKB ----

describe("calculateSizeKB", () => {
	it("calculates correct KB for small objects", () => {
		const kb = calculateSizeKB({ a: 1 });
		expect(kb).toBeGreaterThan(0);
		expect(kb).toBeLessThan(1);
	});

	it("calculates correct KB for strings", () => {
		const str = "a".repeat(1024);
		expect(calculateSizeKB(str)).toBeCloseTo(1024 / 1024, 0); // ~1 KB (plus quotes)
	});
});

// ---- RESPONSE_SIZE_THRESHOLDS ----

describe("RESPONSE_SIZE_THRESHOLDS", () => {
	it("has correct values", () => {
		expect(RESPONSE_SIZE_THRESHOLDS.IDEAL_KB).toBe(100);
		expect(RESPONSE_SIZE_THRESHOLDS.WARNING_KB).toBe(200);
		expect(RESPONSE_SIZE_THRESHOLDS.CRITICAL_KB).toBe(500);
		expect(RESPONSE_SIZE_THRESHOLDS.MAX_KB).toBe(1000);
	});
});

// ---- truncateResponse ----

describe("truncateResponse", () => {
	it("returns data unchanged when under maxKB", () => {
		const data = { name: "small" };
		const result = truncateResponse(data, { maxKB: 200 });
		expect(result.wasTruncated).toBe(false);
		expect(result.data).toEqual(data);
	});

	it("truncates large arrays", () => {
		const data = Array.from({ length: 200 }, (_, i) => ({ id: i, text: "x".repeat(500) }));
		const result = truncateResponse(data, { maxKB: 10, maxArrayItems: 10 });
		expect(result.wasTruncated).toBe(true);
		expect(result.itemsRemoved).toBeGreaterThan(0);
		expect(result.truncatedSizeKB).toBeLessThan(result.originalSizeKB);
	});

	it("truncates long strings", () => {
		const data = { text: "a".repeat(10000) };
		const result = truncateResponse(data, { maxKB: 1, maxStringLength: 100 });
		expect(result.wasTruncated).toBe(true);
		const truncatedText = (result.data as Record<string, string>).text;
		expect(truncatedText.length).toBeLessThan(10000);
	});

	it("adds _truncated marker to trimmed arrays", () => {
		// Each item ~500 bytes → 1000 items = ~500KB, well over maxKB=1
		const data = Array.from({ length: 1000 }, (_, i) => ({ id: i, text: "x".repeat(500) }));
		const result = truncateResponse(data, { maxKB: 1, maxArrayItems: 5 });
		expect(result.wasTruncated).toBe(true);
		const arr = result.data as unknown[];
		const last = arr[arr.length - 1] as Record<string, unknown>;
		expect(last._truncated).toBe(true);
	});

	it("respects maxObjectDepth", () => {
		const data = { a: { b: { c: { d: { e: "deep" } } } } };
		const result = truncateResponse(data, { maxKB: 0, maxObjectDepth: 2 });
		expect(result.wasTruncated).toBe(true);
	});

	it("preserves null and undefined", () => {
		const result = truncateResponse(null, { maxKB: 200 });
		expect(result.wasTruncated).toBe(false);
		expect(result.data).toBeNull();
	});
});

// ---- truncateRestResponse ----

describe("truncateRestResponse", () => {
	it("returns data unchanged when under maxKB", () => {
		const data = { comments: [{ id: "1", message: "hi" }] };
		const result = truncateRestResponse("/v1/files/abc/comments", data, 200);
		expect(result.wasTruncated).toBe(false);
	});

	it("truncates /comments to last 20", () => {
		const comments = Array.from({ length: 500 }, (_, i) => ({
			id: `c${i}`,
			message: "A".repeat(500),
			user: { handle: `user${i}` },
		}));
		const result = truncateRestResponse("/v1/files/abc/comments", { comments }, 200);
		expect(result.wasTruncated).toBe(true);
		expect((result.data as Record<string, unknown[]>).comments.length).toBe(20);
		expect(result.itemsRemoved).toBe(480);
		const meta = (result.data as Record<string, unknown>)._truncated as Record<string, unknown>;
		expect(meta.totalComments).toBe(500);
		expect(meta.showing).toBe(20);
	});

	it("truncates /versions to first 10", () => {
		// Each version ~2KB with long thumbnail → 500 versions = ~1MB, well over 200KB
		const versions = Array.from({ length: 500 }, (_, i) => ({
			id: `v${i}`,
			created_at: new Date().toISOString(),
			label: null,
			description: "x".repeat(500),
			user: { handle: `user${i}`, img_url: "https://example.com/" + "x".repeat(300) },
			thumbnail_url: "https://example.com/thumb/" + "x".repeat(500),
		}));
		const result = truncateRestResponse("/v1/files/abc/versions", { versions }, 200);
		expect(result.wasTruncated).toBe(true);
		expect((result.data as Record<string, unknown[]>).versions.length).toBe(10);
		expect(result.itemsRemoved).toBe(490);
	});

	it("truncates /files document children to 20 pages", () => {
		const document = {
			id: "0:0",
			name: "Doc",
			type: "DOCUMENT",
			children: Array.from({ length: 50 }, (_, i) => ({
				id: `${i}:0`,
				name: `Page ${i}`,
				type: "CANVAS",
				children: Array.from({ length: 100 }, (_, j) => ({
					id: `${i}:${j}`,
					name: `Frame ${j}`,
					type: "FRAME",
				})),
			})),
		};
		const result = truncateRestResponse("/v1/files/abc", { document }, 200);
		expect(result.wasTruncated).toBe(true);
		const doc = (result.data as Record<string, Record<string, unknown[]>>).document;
		expect(doc.children.length).toBe(20);
	});

	it("falls back to generic truncation for unknown endpoints", () => {
		const data = { items: Array.from({ length: 1000 }, (_, i) => ({ id: i, text: "x".repeat(500) })) };
		const result = truncateRestResponse("/v1/unknown/endpoint", data, 200);
		expect(result.wasTruncated).toBe(true);
		expect(result.truncatedSizeKB).toBeLessThan(result.originalSizeKB);
	});

	it("reports correct originalSizeKB and truncatedSizeKB", () => {
		const comments = Array.from({ length: 500 }, (_, i) => ({
			id: `c${i}`,
			message: "A".repeat(500),
		}));
		const result = truncateRestResponse("/v1/files/abc/comments", { comments }, 200);
		expect(result.originalSizeKB).toBeGreaterThan(200);
		expect(result.truncatedSizeKB).toBeLessThan(200);
	});
});
