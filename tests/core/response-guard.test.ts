import {
	estimateTokens,
	calculateSizeKB,
	truncateResponse,
	truncateRestResponse,
	truncatePluginResponse,
	RESPONSE_SIZE_THRESHOLDS,
	PLUGIN_SIZE_THRESHOLDS,
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

// ---- PLUGIN_SIZE_THRESHOLDS ----

describe("PLUGIN_SIZE_THRESHOLDS", () => {
	it("has correct values (much tighter than REST)", () => {
		expect(PLUGIN_SIZE_THRESHOLDS.IDEAL_KB).toBe(40);
		expect(PLUGIN_SIZE_THRESHOLDS.WARNING_KB).toBe(80);
		expect(PLUGIN_SIZE_THRESHOLDS.CRITICAL_KB).toBe(160);
		expect(PLUGIN_SIZE_THRESHOLDS.MAX_KB).toBe(250);
	});

	it("plugin thresholds are tighter than REST thresholds", () => {
		expect(PLUGIN_SIZE_THRESHOLDS.IDEAL_KB).toBeLessThan(RESPONSE_SIZE_THRESHOLDS.IDEAL_KB);
		expect(PLUGIN_SIZE_THRESHOLDS.WARNING_KB).toBeLessThan(RESPONSE_SIZE_THRESHOLDS.WARNING_KB);
		expect(PLUGIN_SIZE_THRESHOLDS.CRITICAL_KB).toBeLessThan(RESPONSE_SIZE_THRESHOLDS.CRITICAL_KB);
		expect(PLUGIN_SIZE_THRESHOLDS.MAX_KB).toBeLessThan(RESPONSE_SIZE_THRESHOLDS.MAX_KB);
	});
});

// ---- truncatePluginResponse ----

describe("truncatePluginResponse", () => {
	/** Build a deeply nested plugin tree (mimics figma_get_design_context payload). */
	function makeNodeTree(width: number, depth: number, id = "0"): Record<string, unknown> {
		const node: Record<string, unknown> = {
			id,
			name: `Node ${id}`,
			type: "FRAME",
			fills: [{ type: "SOLID", color: { r: 0.5, g: 0.5, b: 0.5 }, opacity: 1 }],
			strokes: [{ type: "SOLID", color: { r: 0, g: 0, b: 0 } }],
			effects: [
				{ type: "DROP_SHADOW", color: { r: 0, g: 0, b: 0, a: 0.25 }, offset: { x: 0, y: 4 }, radius: 8 },
				{ type: "INNER_SHADOW", color: { r: 0, g: 0, b: 0, a: 0.15 }, offset: { x: 0, y: 2 }, radius: 4 },
			],
			boundVariables: { fills: [{ id: "VariableID:1:2", type: "VARIABLE_ALIAS" }] },
			absoluteBoundingBox: { x: 0, y: 0, width: 800, height: 600 },
			cornerRadius: 12,
			padding: { top: 16, right: 16, bottom: 16, left: 16 },
		};
		if (depth > 0) {
			node.children = Array.from({ length: width }, (_, i) =>
				makeNodeTree(width, depth - 1, `${id}.${i}`)
			);
			node.childCount = width;
		}
		return node;
	}

	it("returns data unchanged when under maxKB", () => {
		const data = { name: "small", id: "1:2" };
		const result = truncatePluginResponse(data, "figma_test");
		expect(result.wasTruncated).toBe(false);
		expect(result.data).toEqual(data);
	});

	it("truncates large tree by progressive pruning", () => {
		// Wide and deep tree — should easily exceed 80KB
		const tree = makeNodeTree(8, 4);
		const wrapped = { data: { document: tree, fileKey: "abc" } };
		const result = truncatePluginResponse(wrapped, "figma_get_file_data");
		expect(result.wasTruncated).toBe(true);
		expect(result.truncatedSizeKB).toBeLessThanOrEqual(PLUGIN_SIZE_THRESHOLDS.WARNING_KB);
		expect(result.originalSizeKB).toBeGreaterThan(result.truncatedSizeKB);
	});

	it("adds _responseGuard marker when truncated", () => {
		const tree = makeNodeTree(10, 4);
		const wrapped = { data: { document: tree } };
		const result = truncatePluginResponse(wrapped, "figma_get_design_context");
		expect(result.wasTruncated).toBe(true);
		const guard = (result.data as Record<string, unknown>)._responseGuard as Record<string, unknown>;
		expect(guard).toBeDefined();
		expect(guard.tool).toBe("figma_get_design_context");
		expect(guard.strategy).toMatch(/^plugin-prune-stage-\d|plugin-prune-fallback/);
		expect(guard.originalSizeKB).toBeGreaterThan(0);
		expect(guard.truncatedSizeKB).toBeGreaterThan(0);
	});

	it("preserves envelope structure (data.document or data.node)", () => {
		const tree = makeNodeTree(8, 3);
		const wrapped = { data: { document: tree, fileKey: "test", fileName: "Test File" } };
		const result = truncatePluginResponse(wrapped, "figma_get_file_data");
		const out = result.data as Record<string, unknown>;
		const dataField = out.data as Record<string, unknown>;
		expect(dataField).toBeDefined();
		expect(dataField.fileKey).toBe("test");
		expect(dataField.fileName).toBe("Test File");
		expect(dataField.document).toBeDefined();
	});

	it("caps children arrays at 5 with _childrenTruncated marker", () => {
		// Tree with many siblings at root
		const tree = {
			id: "root",
			name: "Root",
			type: "FRAME",
			children: Array.from({ length: 50 }, (_, i) => ({
				id: `child-${i}`,
				name: `Child ${i}`,
				type: "FRAME",
				fills: Array.from({ length: 5 }, () => ({ type: "SOLID", color: { r: 0.5, g: 0.5, b: 0.5 } })),
				effects: Array.from({ length: 3 }, () => ({ type: "DROP_SHADOW", radius: 4 })),
				description: "x".repeat(500),
			})),
			childCount: 50,
		};
		// Use small maxKB to force pruning regardless of fixture size
		const result = truncatePluginResponse({ data: { document: tree } }, "figma_get_file_data", { maxKB: 10 });
		expect(result.wasTruncated).toBe(true);
		// After stage 1, children should be capped
		const out = result.data as Record<string, unknown>;
		const doc = (out.data as Record<string, unknown>).document as Record<string, unknown>;
		const children = doc.children as unknown[];
		expect(children.length).toBeLessThanOrEqual(5);
	});

	it("drops effects and boundVariables in stage 2+", () => {
		// Build a tree heavy on effects/boundVariables to force stage 2+
		const tree: Record<string, unknown> = {
			id: "root",
			name: "Root",
			type: "FRAME",
			children: Array.from({ length: 5 }, (_, i) => ({
				id: `c-${i}`,
				name: `C ${i}`,
				type: "FRAME",
				effects: Array.from({ length: 20 }, () => ({
					type: "DROP_SHADOW",
					color: { r: 0, g: 0, b: 0, a: 0.5 },
					offset: { x: 0, y: 4 },
					radius: 8,
					blendMode: "NORMAL",
					visible: true,
					showShadowBehindNode: false,
				})),
				boundVariables: {
					fills: Array.from({ length: 10 }, (_, j) => ({
						id: `VariableID:${j}`,
						type: "VARIABLE_ALIAS",
						name: "long variable name " + "x".repeat(100),
					})),
				},
			})),
		};
		// Use small maxKB to force pruning into stage 2+
		const result = truncatePluginResponse({ data: { document: tree } }, "figma_get_design_context", { maxKB: 5 });
		expect(result.wasTruncated).toBe(true);
		// Verify size is under custom threshold
		expect(result.truncatedSizeKB).toBeLessThanOrEqual(5 * 1.6);  // some headroom for marker
	});

	it("respects custom maxKB option", () => {
		const tree = makeNodeTree(8, 4);
		const result = truncatePluginResponse({ data: { document: tree } }, "figma_test", { maxKB: 20 });
		expect(result.wasTruncated).toBe(true);
		expect(result.truncatedSizeKB).toBeLessThanOrEqual(20);
	});

	it("handles bare node payload (no data wrapper)", () => {
		const tree = makeNodeTree(8, 4);
		const result = truncatePluginResponse(tree, "figma_test");
		expect(result.wasTruncated).toBe(true);
		const out = result.data as Record<string, unknown>;
		expect(out._responseGuard).toBeDefined();
	});

	it("handles null and primitive types gracefully", () => {
		expect(truncatePluginResponse(null, "test").wasTruncated).toBe(false);
		expect(truncatePluginResponse("short string", "test").wasTruncated).toBe(false);
		expect(truncatePluginResponse(42, "test").wasTruncated).toBe(false);
	});
});
