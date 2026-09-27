/**
 * Pairing secret — only a paired F-MCP plugin may talk to the bridge.
 *
 * The bridge binds to 127.0.0.1, so the network cannot reach it. A web page in the user's
 * browser can, though: browsers let any page open ws://127.0.0.1:<port>, and the protocol is
 * public. Without a secret, a page visited while the bridge is running could register as a
 * plugin, receive the commands meant for Figma and answer them with forged Figma data, or
 * replace the Figma REST token. The secret closes that door.
 *
 * It lives in one file on the user's machine (0600, directory 0700) and is created on first use.
 * The user enters it into the plugin once (Advanced → Pairing code); the plugin keeps it in
 * figma.clientStorage and sends it with every "ready" handshake. Every bridge instance on the
 * machine (5454, 5455, …) reads the same file, so one code pairs them all.
 *
 * The value is never logged. `local-plugin-only.js --print-pairing` prints it for copying.
 */

import { randomBytes, timingSafeEqual } from "crypto";
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { dirname, join } from "path";

/** Where the pairing secret lives: FMCP_PAIRING_FILE, else ~/.config/fmcp/pairing. */
export function pairingFilePath(): string {
	return process.env.FMCP_PAIRING_FILE || join(homedir(), ".config", "fmcp", "pairing");
}

/**
 * Whether a plugin must pair before it is accepted. On unless FMCP_PAIRING is "off" / "0" / "false".
 * The off switch exists for one situation: a plugin that cannot be updated yet (a plugin older than
 * pairing never sends the code and would be refused). It re-opens the door this module closes, so the
 * bridge warns on every start while it is set. It only affects the plugin handshake — the Origin check,
 * the /shutdown check and the removed CORS headers stay.
 */
export function pairingRequired(env: NodeJS.ProcessEnv = process.env): boolean {
	const value = (env.FMCP_PAIRING || "").trim().toLowerCase();
	return !(value === "off" || value === "0" || value === "false");
}

const SECRET_RE = /^[A-Za-z0-9_-]{16,128}$/;

/** A pairing file that exists but does not hold a valid code. */
class InvalidPairingFileError extends Error {}

function readSecret(file: string): string {
	const value = readFileSync(file, "utf8").trim();
	if (!SECRET_RE.test(value)) {
		throw new InvalidPairingFileError(`F-MCP pairing file is not valid: ${file} — delete it and restart the bridge to create a new code.`);
	}
	return value;
}

/**
 * The bridge cannot start without the secret. Say what failed and how to fix it — a sandboxed shell (an agent's,
 * a CI job's) may read the home directory but not write to it, so the first run must happen in a normal terminal.
 */
function pairingFileError(err: unknown, file: string, action: "read" | "create"): Error {
	if (err instanceof InvalidPairingFileError) return err;
	const code = (err as NodeJS.ErrnoException)?.code ?? "unknown";
	return new Error(
		`F-MCP could not ${action} the pairing file ${file} (${code}). Create it once from a normal terminal with` +
		" `npx -y @atezer/figma-mcp-bridge@latest --print-pairing`, or point FMCP_PAIRING_FILE at a writable file.",
	);
}

/** Reads the pairing secret, creating it on first use. Two instances starting at once agree on one value. */
export function loadOrCreatePairingSecret(file = pairingFilePath()): string {
	try {
		return readSecret(file);
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw pairingFileError(err, file, "read");
	}
	const value = randomBytes(24).toString("base64url"); // 32 characters, 192 bits
	try {
		mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
		writeFileSync(file, `${value}\n`, { mode: 0o600, flag: "wx" });
	} catch (err) {
		// Another instance created it between our read and our write: use theirs.
		if ((err as NodeJS.ErrnoException).code === "EEXIST") {
			try { return readSecret(file); } catch (again) { throw pairingFileError(again, file, "read"); }
		}
		throw pairingFileError(err, file, "create");
	}
	try { chmodSync(file, 0o600); } catch { /* umask already applied mode; best effort */ }
	return value;
}

/** Constant-time comparison of a presented code with the expected secret. */
export function pairingMatches(expected: string, candidate: unknown): boolean {
	if (typeof candidate !== "string" || !expected) return false;
	const a = Buffer.from(expected, "utf8");
	const b = Buffer.from(candidate.trim(), "utf8");
	if (a.length !== b.length) return false;
	return timingSafeEqual(a, b);
}

/**
 * Origins allowed to open the plugin WebSocket. The Figma plugin UI runs in a sandboxed iframe and
 * sends `Origin: null`; a non-browser client sends no Origin; Figma's own pages are https figma.com.
 * Any other web origin is refused. This is defence in depth only — a page can also produce
 * `Origin: null` from a sandboxed iframe — so the pairing secret is what actually authenticates.
 */
export function isAllowedBridgeOrigin(origin: string | undefined): boolean {
	if (!origin || origin === "null") return true;
	try {
		const url = new URL(origin);
		return url.protocol === "https:" && (url.hostname === "figma.com" || url.hostname.endsWith(".figma.com"));
	} catch {
		return false;
	}
}
