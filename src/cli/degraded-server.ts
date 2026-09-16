/**
 * fmcp CLI — degraded MCP server. Dependency-free (no MCP SDK, no ws, no pino).
 *
 * Used when the full bridge cannot run: cloud/remote sessions (the Figma plugin lives on the
 * user's computer and can never reach this process) or a checkout without node_modules.
 * Instead of "Connection closed" the AI client gets a working server with a single tool,
 * `figma_get_status`, that explains the situation and how to fix it.
 *
 * Protocol: MCP over stdio, newline-delimited JSON-RPC 2.0.
 */

import { createInterface } from "node:readline";

export interface DegradedInfo {
	version: string;
	reason: string;
	installRoot: string;
}

type JsonRpcId = string | number | null;
interface JsonRpcRequest { jsonrpc: "2.0"; id?: JsonRpcId; method: string; params?: Record<string, unknown> }
interface JsonRpcResponse { jsonrpc: "2.0"; id: JsonRpcId; result?: unknown; error?: { code: number; message: string } }

export const DEGRADED_TOOL_NAME = "figma_get_status";

export function degradedStatusPayload(info: DegradedInfo): Record<string, unknown> {
	return {
		pluginConnected: false,
		bridgeListening: false,
		mode: "degraded",
		serverVersion: info.version,
		reason: info.reason,
		message:
			"F-MCP Bridge bu ortamda çalışmıyor: Figma plugin'i sizin bilgisayarınızda, bu oturum ise başka bir makinede (bulut/uzak) ya da bağımlılıklar kurulu değil. figma_* araçları burada kullanılamaz.",
		fix: [
			"Figma ile çalışmak için Claude Desktop'ı veya Mac/PC'de terminalden Claude Code'u kullanın (plugin ile aynı bilgisayar).",
			"Yerel kurulumda bağımlılık eksikse: npm ci && npm run build, ardından `node dist/cli/fmcp.js doctor`.",
		],
		docs: "https://github.com/atezer/FMCP#sorun-mu-yaşıyorsunuz",
	};
}

/** Pure request handler — returns a response, or null for notifications. Exported for tests. */
export function handleDegradedMessage(msg: JsonRpcRequest, info: DegradedInfo): JsonRpcResponse | null {
	const id = msg.id ?? null;
	const isNotification = msg.id === undefined;
	const reply = (result: unknown): JsonRpcResponse => ({ jsonrpc: "2.0", id, result });

	switch (msg.method) {
		case "initialize": {
			const requested = typeof msg.params?.protocolVersion === "string" ? msg.params.protocolVersion : "2024-11-05";
			return reply({
				protocolVersion: requested,
				capabilities: { tools: {} },
				serverInfo: { name: "figma-mcp-bridge", version: info.version },
				instructions:
					"F-MCP Bridge DEGRADED modda: Figma plugin'ine bu ortamdan ulaşılamıyor. Yalnızca figma_get_status aracı var; onu çağırıp kullanıcıya nedenini ve çözümü ilet. Diğer figma_* araçlarını deneme.",
			});
		}
		case "ping":
			return reply({});
		case "tools/list":
			return reply({
				tools: [{
					name: DEGRADED_TOOL_NAME,
					description: "F-MCP Bridge durumu. Bu ortamda köprü çalışmıyor (degraded); neden ve çözüm döner.",
					inputSchema: { type: "object", properties: {}, additionalProperties: false },
					annotations: { readOnlyHint: true },
				}],
			});
		case "tools/call": {
			const name = typeof msg.params?.name === "string" ? msg.params.name : "";
			const payload = degradedStatusPayload(info);
			if (name === DEGRADED_TOOL_NAME) {
				return reply({ content: [{ type: "text", text: JSON.stringify(payload) }] });
			}
			return reply({
				isError: true,
				content: [{ type: "text", text: JSON.stringify({ ...payload, requestedTool: name, error: `${name || "(boş)"} bu ortamda kullanılamaz` }) }],
			});
		}
		case "resources/list":
			return reply({ resources: [] });
		case "prompts/list":
			return reply({ prompts: [] });
		default:
			if (isNotification) return null;
			return { jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${msg.method}` } };
	}
}

/** Run the degraded server over stdio until stdin closes. */
export function runDegradedServer(info: DegradedInfo): Promise<void> {
	return new Promise((resolve) => {
		process.stderr.write(`[fmcp] DEGRADED mode (${info.reason}) — only ${DEGRADED_TOOL_NAME} is available\n`);
		const rl = createInterface({ input: process.stdin, crlfDelay: Number.POSITIVE_INFINITY });
		rl.on("line", (line) => {
			const trimmed = line.trim();
			if (!trimmed) return;
			let msg: JsonRpcRequest;
			try {
				msg = JSON.parse(trimmed) as JsonRpcRequest;
			} catch {
				process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } })}\n`);
				return;
			}
			const res = handleDegradedMessage(msg, info);
			if (res) process.stdout.write(`${JSON.stringify(res)}\n`);
		});
		rl.on("close", () => resolve());
		process.stdin.on("end", () => resolve());
	});
}
