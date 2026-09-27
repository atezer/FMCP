import { mkdtempSync, mkdirSync, chmodSync, readFileSync, rmSync, statSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import {
	isAllowedBridgeOrigin,
	loadOrCreatePairingSecret,
	pairingMatches,
	pairingRequired,
} from "../../src/core/pairing";

describe("pairing secret file", () => {
	let dir: string;
	beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "fmcp-pairing-")); });
	afterEach(() => {
		try { chmodSync(dir, 0o700); } catch { /* ignore */ }
		rmSync(dir, { recursive: true, force: true });
	});

	it("creates a 32-character code once, private to the user, and returns the same code afterwards", () => {
		const file = join(dir, "fmcp", "pairing");
		const first = loadOrCreatePairingSecret(file);
		expect(first).toMatch(/^[A-Za-z0-9_-]{32}$/);
		expect(loadOrCreatePairingSecret(file)).toBe(first);
		expect(readFileSync(file, "utf8").trim()).toBe(first);
		if (process.platform !== "win32") {
			expect(statSync(file).mode & 0o777).toBe(0o600);
			expect(statSync(join(dir, "fmcp")).mode & 0o777).toBe(0o700);
		}
	});

	it("refuses a file that does not hold a valid code instead of accepting it", () => {
		const file = join(dir, "pairing");
		writeFileSync(file, "short\n");
		expect(() => loadOrCreatePairingSecret(file)).toThrow(/not valid/);
	});

	it("says how to fix it when the file cannot be created (a sandboxed shell)", () => {
		if (process.platform === "win32" || process.getuid?.() === 0) return; // permissions don't bind root
		const locked = join(dir, "locked");
		mkdirSync(locked, { mode: 0o500 });
		expect(() => loadOrCreatePairingSecret(join(locked, "fmcp", "pairing"))).toThrow(
			/could not create the pairing file .* \(EACCES\).*--print-pairing.*FMCP_PAIRING_FILE/,
		);
	});
});

describe("pairingMatches", () => {
	const secret = "abcdefghijklmnopqrstuvwxyz012345";
	it("accepts the code, also with surrounding whitespace from a paste", () => {
		expect(pairingMatches(secret, secret)).toBe(true);
		expect(pairingMatches(secret, `  ${secret}\n`)).toBe(true);
	});
	it("rejects anything else", () => {
		expect(pairingMatches(secret, secret.slice(0, -1) + "6")).toBe(false);
		expect(pairingMatches(secret, secret.slice(1))).toBe(false);
		expect(pairingMatches(secret, undefined)).toBe(false);
		expect(pairingMatches(secret, null)).toBe(false);
		expect(pairingMatches(secret, 42)).toBe(false);
		expect(pairingMatches("", "")).toBe(false);
	});
});

describe("isAllowedBridgeOrigin", () => {
	it.each([
		[undefined, true], // a non-browser client
		["null", true], // the Figma plugin iframe (sandboxed, opaque origin)
		["https://www.figma.com", true],
		["https://figma.com", true],
		["https://staging.figma.com:8443", true],
		["http://www.figma.com", false],
		["https://evil.example", false],
		["https://figma.com.evil.example", false],
		["https://evilfigma.com", false],
		["not a url", false],
	])("%s → %s", (origin, allowed) => {
		expect(isAllowedBridgeOrigin(origin as string | undefined)).toBe(allowed);
	});
});

describe("pairingRequired", () => {
	it("is on unless FMCP_PAIRING switches it off", () => {
		expect(pairingRequired({})).toBe(true);
		expect(pairingRequired({ FMCP_PAIRING: "on" })).toBe(true);
		expect(pairingRequired({ FMCP_PAIRING: "off" })).toBe(false);
		expect(pairingRequired({ FMCP_PAIRING: " FALSE " })).toBe(false);
		expect(pairingRequired({ FMCP_PAIRING: "0" })).toBe(false);
	});
});
