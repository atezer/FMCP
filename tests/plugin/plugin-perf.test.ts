/**
 * v1.10.2 Faz 2 — plugin (f-mcp-plugin/code.js) performance behaviour.
 *
 * code.js is a Figma sandbox script, so it is loaded into a vm context with a
 * minimal fake `figma` global. Handlers are driven through figma.ui.onmessage
 * and their posted results inspected.
 */

import { readFileSync } from "fs";
import { join } from "path";
import * as vm from "vm";

type Msg = Record<string, any>;

interface FakeNode {
	id: string;
	name: string;
	type: string;
	children?: FakeNode[];
	[k: string]: any;
}

function loadPlugin(opts: { pages?: FakeNode[]; nodes?: FakeNode[] } = {}) {
	const posted: Msg[] = [];
	const pages = opts.pages ?? [];
	const byId = new Map<string, FakeNode>();
	const index = (n: FakeNode) => {
		byId.set(n.id, n);
		(n.children ?? []).forEach(index);
	};
	pages.forEach(index);
	(opts.nodes ?? []).forEach(index);

	const figma: Record<string, any> = {
		fileKey: "TESTKEY",
		mixed: Symbol("mixed"),
		root: { id: "0:0", name: "Test File", type: "DOCUMENT", children: pages },
		currentPage: pages[0],
		showUI: () => {},
		ui: { postMessage: (m: Msg) => posted.push(m), onmessage: null },
		clientStorage: { getAsync: async () => undefined, setAsync: async () => {} },
		loadAllPagesAsync: jest.fn(async () => {}),
		getNodeByIdAsync: async (id: string) => byId.get(id) ?? null,
		base64Encode: (bytes: Uint8Array) => Buffer.from(bytes).toString("base64"),
	};
	const context = vm.createContext({
		figma,
		__html__: "",
		console: { log() {}, warn() {}, error() {}, info() {}, debug() {} },
		setTimeout,
		clearTimeout,
		Promise,
	});
	const code = readFileSync(join(__dirname, "../../f-mcp-plugin/code.js"), "utf8");
	vm.runInContext(code, context);

	async function send(msg: Msg): Promise<Msg> {
		const requestId = `r${Math.random()}`;
		await figma.ui.onmessage({ ...msg, requestId });
		const res = posted.find((m) => m.requestId === requestId);
		if (!res) throw new Error(`no result for ${msg.type}`);
		return res;
	}
	return { figma, context: context as Record<string, any>, send, posted };
}

function page(id: string, children: FakeNode[] = []): FakeNode & { loadAsync: jest.Mock } {
	const p: any = { id, name: `Page ${id}`, type: "PAGE", children };
	p.loadAsync = jest.fn(async () => {});
	p.findAllWithCriteria = ({ types }: { types: string[] }) => {
		const out: FakeNode[] = [];
		const walk = (n: FakeNode) => {
			for (const c of n.children ?? []) {
				if (types.includes(c.type)) out.push(c);
				walk(c);
			}
		};
		walk(p);
		return out;
	};
	return p;
}

/** INSTANCE whose sync mainComponent getter throws (as in dynamic-page). */
function instance(id: string, main: any, children: FakeNode[] = []) {
	const counters = { syncGetter: 0, async: 0 };
	const node: any = {
		id,
		name: `Instance ${id}`,
		type: "INSTANCE",
		children,
		getMainComponentAsync: async () => {
			counters.async++;
			return main;
		},
	};
	Object.defineProperty(node, "mainComponent", {
		get() {
			counters.syncGetter++;
			throw new Error("sync mainComponent is not allowed in dynamic-page");
		},
	});
	return { node, counters };
}

const remoteMain = (key: string) => ({ key, name: `Lib ${key}`, remote: true, parent: { type: "PAGE" } });

describe("GET_DOCUMENT_STRUCTURE page loading", () => {
	it("does not load all pages for depth<=1", async () => {
		const p = loadPlugin({ pages: [page("1:0"), page("2:0")] });
		const res = await p.send({ type: "GET_DOCUMENT_STRUCTURE", depth: 1 });
		expect(res.success).toBe(true);
		expect(res.data.document.children).toHaveLength(2);
		expect(p.figma.loadAllPagesAsync).not.toHaveBeenCalled();
	});

	it("still loads all pages when children are requested (depth>=2)", async () => {
		const p = loadPlugin({ pages: [page("1:0", [{ id: "1:1", name: "F", type: "FRAME" }])] });
		const res = await p.send({ type: "GET_DOCUMENT_STRUCTURE", depth: 2 });
		expect(p.figma.loadAllPagesAsync).toHaveBeenCalledTimes(1);
		expect(res.data.document.children[0].children[0].id).toBe("1:1");
	});
});

describe("SEARCH_LIBRARY_ASSETS instance scan", () => {
	it("loads pages one by one, never the whole document, and dedupes library keys", async () => {
		const a = instance("1:2", remoteMain("K1"));
		const b = instance("1:3", remoteMain("K1"));
		const c = instance("2:2", remoteMain("K2"));
		const p1 = page("1:0", [a.node, b.node]);
		const p2 = page("2:0", [c.node]);
		const p = loadPlugin({ pages: [p1, p2] });
		const res = await p.send({
			type: "SEARCH_LIBRARY_ASSETS",
			assetTypes: ["components"],
			currentPageOnly: false,
		});
		expect(res.success).toBe(true);
		expect(p.figma.loadAllPagesAsync).not.toHaveBeenCalled();
		expect(p1.loadAsync).toHaveBeenCalled();
		expect(p2.loadAsync).toHaveBeenCalled();
		expect(res.data.libraryComponents.map((x: any) => x.key)).toEqual(["K1", "K2"]);
		expect(a.counters.syncGetter + b.counters.syncGetter + c.counters.syncGetter).toBe(0);
	});

	it("caps the number of scanned instances and reports it", async () => {
		const many = Array.from({ length: 5100 }, (_, i) => instance(`1:${i + 10}`, null).node);
		const p = loadPlugin({ pages: [page("1:0", many)] });
		const res = await p.send({ type: "SEARCH_LIBRARY_ASSETS", assetTypes: ["components"] });
		expect(res.data.instanceScanTruncated).toBe(true);
	});
});

describe("VALIDATE_SCREEN", () => {
	it("resolves instances asynchronously and does not walk instance internals", async () => {
		const internals: FakeNode[] = Array.from({ length: 20 }, (_, i) => ({
			id: `9:${i}`,
			name: `inner ${i}`,
			type: "RECTANGLE",
			fills: [{ type: "SOLID", color: { r: 1, g: 0, b: 0 } }],
		}));
		const inst = instance("1:2", remoteMain("K1"), internals);
		const root: FakeNode = {
			id: "1:1",
			name: "Screen",
			type: "FRAME",
			layoutMode: "VERTICAL",
			children: [inst.node],
		};
		const p = loadPlugin({ nodes: [root] });
		const res = await p.send({ type: "VALIDATE_SCREEN", nodeId: "1:1" });
		expect(res.success).toBe(true);
		expect(res.totalNodesWalked).toBe(2); // frame + instance, not its 20 internals
		expect(res.breakdown.libraryInstanceCount).toBe(1);
		expect(inst.counters.syncGetter).toBe(0);
		expect(res.violations.some((v: any) => v.nodeId.startsWith("9:"))).toBe(false);
	});
});

describe("VALIDATE_SCREEN on an instance root", () => {
	it("still walks the root instance's own children", async () => {
		const child: FakeNode = { id: "9:1", name: "inner", type: "FRAME", layoutMode: "VERTICAL" };
		const rootInst = instance("1:5", remoteMain("K1"), [child]);
		const p = loadPlugin({ nodes: [rootInst.node] });
		const res = await p.send({ type: "VALIDATE_SCREEN", nodeId: "1:5" });
		expect(res.success).toBe(true);
		expect(res.totalNodesWalked).toBe(2);
	});
});

describe("export helpers", () => {
	it("mapWithConcurrency keeps order and never exceeds the limit", async () => {
		const { context } = loadPlugin();
		let active = 0;
		let peak = 0;
		const out = await context.mapWithConcurrency([1, 2, 3, 4, 5, 6, 7, 8, 9], 4, async (n: number) => {
			active++;
			peak = Math.max(peak, active);
			await new Promise((r) => setTimeout(r, 5));
			active--;
			return n * 2;
		});
		expect(out).toEqual([2, 4, 6, 8, 10, 12, 14, 16, 18]);
		expect(peak).toBe(4);
	});

	it("clampExportScale caps raster exports at 4096 px and leaves vectors alone", () => {
		const { context } = loadPlugin();
		const big = { width: 8192, height: 1000 };
		expect(context.clampExportScale(big, "PNG", 2)).toEqual({ scale: 0.5, clamped: true });
		expect(context.clampExportScale(big, "SVG", 2)).toEqual({ scale: 2, clamped: false });
		expect(context.clampExportScale({ width: 390, height: 844 }, "JPG", 2)).toEqual({ scale: 2, clamped: false });
		expect(context.clampExportScale(big, "PNG", 2, 0)).toEqual({ scale: 2, clamped: false });
	});

	it("BATCH_EXPORT_NODES runs at most 4 exports at once and reports clamped scale", async () => {
		let active = 0;
		let peak = 0;
		const settingsSeen: any[] = [];
		const mk = (i: number, width: number): FakeNode => ({
			id: `5:${i}`,
			name: `n${i}`,
			type: "FRAME",
			width,
			height: 100,
			exportAsync: async (settings: any) => {
				settingsSeen.push(settings);
				active++;
				peak = Math.max(peak, active);
				await new Promise((r) => setTimeout(r, 5));
				active--;
				return new Uint8Array([1, 2, 3]);
			},
		});
		const nodes = Array.from({ length: 10 }, (_, i) => mk(i, i === 0 ? 10000 : 100));
		const p = loadPlugin({ nodes });
		const res = await p.send({ type: "BATCH_EXPORT_NODES", nodeIds: nodes.map((n) => n.id), format: "PNG", scale: 1 });
		expect(res.success).toBe(true);
		expect(peak).toBeLessThanOrEqual(4);
		const results = res.data.results;
		expect(results.map((r: any) => r.nodeId)).toEqual(nodes.map((n) => n.id));
		expect(results[0].scaleClamped).toBe(true);
		expect(results[0].scale).toBeCloseTo(0.409, 3);
		expect(results[1].scaleClamped).toBeUndefined();
	});
});

describe("post-execute scan", () => {
	it("does not report violations from inside instances", async () => {
		const inner: FakeNode = {
			id: "9:1",
			name: "inner",
			type: "RECTANGLE",
			fills: [{ type: "SOLID", color: { r: 1, g: 0, b: 0 } }],
		};
		const inst = instance("1:2", remoteMain("K1"), [inner]);
		const root: FakeNode = { id: "1:1", name: "Root", type: "GROUP", children: [inst.node] };
		const { context } = loadPlugin({ nodes: [root] });
		const scan = await context.postExecuteScan({ nodeId: "1:1" });
		expect(scan.totalChecked).toBe(2);
		expect(scan.violations).toHaveLength(0);
	});
});
