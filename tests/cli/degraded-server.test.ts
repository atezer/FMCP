import { DEGRADED_TOOL_NAME, handleDegradedMessage } from "../../src/cli/degraded-server";

const info = { version: "1.9.15", reason: "CLAUDE_CODE_REMOTE", installRoot: "/tmp/x" };

describe("cli/degraded-server", () => {
	it("answers initialize with tools capability and an explanatory instruction", () => {
		const res = handleDegradedMessage({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } }, info);
		expect(res?.id).toBe(1);
		const result = res?.result as { protocolVersion: string; capabilities: { tools: object }; serverInfo: { version: string }; instructions: string };
		expect(result.protocolVersion).toBe("2025-06-18");
		expect(result.capabilities.tools).toBeDefined();
		expect(result.serverInfo.version).toBe("1.9.15");
		expect(result.instructions).toMatch(/DEGRADED/);
	});

	it("ignores notifications", () => {
		expect(handleDegradedMessage({ jsonrpc: "2.0", method: "notifications/initialized" }, info)).toBeNull();
	});

	it("lists exactly one read-only tool", () => {
		const res = handleDegradedMessage({ jsonrpc: "2.0", id: 2, method: "tools/list" }, info);
		const tools = (res?.result as { tools: { name: string; annotations: { readOnlyHint: boolean } }[] }).tools;
		expect(tools).toHaveLength(1);
		expect(tools[0].name).toBe(DEGRADED_TOOL_NAME);
		expect(tools[0].annotations.readOnlyHint).toBe(true);
	});

	it("figma_get_status explains the degraded mode and the fix", () => {
		const res = handleDegradedMessage({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: DEGRADED_TOOL_NAME, arguments: {} } }, info);
		const result = res?.result as { isError?: boolean; content: { type: string; text: string }[] };
		expect(result.isError).toBeUndefined();
		const payload = JSON.parse(result.content[0].text);
		expect(payload.pluginConnected).toBe(false);
		expect(payload.mode).toBe("degraded");
		expect(payload.reason).toBe("CLAUDE_CODE_REMOTE");
		expect(Array.isArray(payload.fix)).toBe(true);
	});

	it("any other figma_* tool returns isError with the same explanation", () => {
		const res = handleDegradedMessage({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "figma_execute", arguments: { code: "1" } } }, info);
		const result = res?.result as { isError?: boolean; content: { text: string }[] };
		expect(result.isError).toBe(true);
		expect(JSON.parse(result.content[0].text).requestedTool).toBe("figma_execute");
	});

	it("unknown methods get -32601", () => {
		const res = handleDegradedMessage({ jsonrpc: "2.0", id: 5, method: "nope" }, info);
		expect(res?.error?.code).toBe(-32601);
	});
});
