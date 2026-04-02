import { parseFigmaUrl } from "../../src/core/figma-url";

describe("parseFigmaUrl", () => {
	// ---- Valid design URLs ----

	it("parses standard design URL", () => {
		const result = parseFigmaUrl("https://www.figma.com/design/abc123DEF456/My-File");
		expect(result).not.toBeNull();
		expect(result!.fileKey).toBe("abc123DEF456");
		expect(result!.nodeId).toBeUndefined();
	});

	it("parses design URL without www", () => {
		const result = parseFigmaUrl("https://figma.com/design/abc123DEF456/My-File");
		expect(result).not.toBeNull();
		expect(result!.fileKey).toBe("abc123DEF456");
	});

	it("parses URL with node-id query parameter (dash format)", () => {
		const result = parseFigmaUrl("https://www.figma.com/design/abc123DEF456/My-File?node-id=12-345");
		expect(result).not.toBeNull();
		expect(result!.fileKey).toBe("abc123DEF456");
		expect(result!.nodeId).toBe("12:345");
	});

	it("parses URL with node-id query parameter (colon format)", () => {
		const result = parseFigmaUrl("https://www.figma.com/design/abc123DEF456/My-File?node-id=12:345");
		expect(result).not.toBeNull();
		expect(result!.nodeId).toBe("12:345");
	});

	// ---- FigJam URLs ----

	it("parses board URL (FigJam)", () => {
		const result = parseFigmaUrl("https://www.figma.com/board/XYZ789abcdef/Board-Name");
		expect(result).not.toBeNull();
		expect(result!.fileKey).toBe("XYZ789abcdef");
	});

	it("parses jam URL (FigJam)", () => {
		const result = parseFigmaUrl("https://www.figma.com/jam/XYZ789abcdef/Jam-Name");
		expect(result).not.toBeNull();
		expect(result!.fileKey).toBe("XYZ789abcdef");
	});

	// ---- Proto and file URLs ----

	it("parses proto URL", () => {
		const result = parseFigmaUrl("https://www.figma.com/proto/abc123DEF456/Proto-Name");
		expect(result).not.toBeNull();
		expect(result!.fileKey).toBe("abc123DEF456");
	});

	it("parses legacy file URL", () => {
		const result = parseFigmaUrl("https://www.figma.com/file/abc123DEF456/File-Name");
		expect(result).not.toBeNull();
		expect(result!.fileKey).toBe("abc123DEF456");
	});

	// ---- Edge cases ----

	it("handles URL with trailing slash", () => {
		const result = parseFigmaUrl("https://www.figma.com/design/abc123DEF456/");
		expect(result).not.toBeNull();
		expect(result!.fileKey).toBe("abc123DEF456");
	});

	it("handles URL with extra query parameters", () => {
		const result = parseFigmaUrl("https://www.figma.com/design/abc123DEF456/Name?node-id=1-2&t=abc123");
		expect(result).not.toBeNull();
		expect(result!.fileKey).toBe("abc123DEF456");
		expect(result!.nodeId).toBe("1:2");
	});

	it("handles real-world SUI URL", () => {
		const result = parseFigmaUrl("https://www.figma.com/design/7T4iLZCd3OmyI9Rokxm2av/SUI?node-id=37-1368");
		expect(result).not.toBeNull();
		expect(result!.fileKey).toBe("7T4iLZCd3OmyI9Rokxm2av");
		expect(result!.nodeId).toBe("37:1368");
	});

	// ---- Invalid inputs ----

	it("returns null for empty string", () => {
		expect(parseFigmaUrl("")).toBeNull();
	});

	it("returns null for null/undefined", () => {
		expect(parseFigmaUrl(null as unknown as string)).toBeNull();
		expect(parseFigmaUrl(undefined as unknown as string)).toBeNull();
	});

	it("returns null for non-Figma URL", () => {
		expect(parseFigmaUrl("https://google.com")).toBeNull();
	});

	it("returns null for Figma URL without file key", () => {
		expect(parseFigmaUrl("https://www.figma.com/")).toBeNull();
	});

	it("returns null for too-short file key", () => {
		expect(parseFigmaUrl("https://www.figma.com/design/abc/Name")).toBeNull();
	});
});
