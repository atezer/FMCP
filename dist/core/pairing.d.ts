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
 *
 * Two layers, two switches (documented together in docs/SETUP.md):
 * - Origin check (`isAllowedOrigin` in plugin-bridge-server.ts): refuses ordinary web pages at the
 *   WebSocket upgrade. A page can still produce `Origin: null` from a sandboxed iframe, so this is only
 *   the first line. Escape hatch: FMCP_BRIDGE_ALLOW_ANY_ORIGIN=1.
 * - Pairing (this module): the code in the "ready" handshake is what authenticates the plugin.
 *   Escape hatch: FMCP_PAIRING=off.
 * Each switch relaxes only its own layer; the bridge warns on start while either is set.
 */
/** Where the pairing secret lives: FMCP_PAIRING_FILE, else ~/.config/fmcp/pairing. */
export declare function pairingFilePath(): string;
/**
 * Whether a plugin must pair before it is accepted. On unless FMCP_PAIRING is "off" / "0" / "false".
 * The off switch exists for one situation: a plugin that cannot be updated yet (a plugin older than
 * pairing never sends the code and would be refused). It re-opens the door this module closes, so the
 * bridge warns on every start while it is set. It only affects the plugin handshake — the Origin check,
 * the /shutdown check and the removed CORS headers stay.
 */
export declare function pairingRequired(env?: NodeJS.ProcessEnv): boolean;
/** Reads the pairing secret, creating it on first use. Two instances starting at once agree on one value. */
export declare function loadOrCreatePairingSecret(file?: string): string;
/** Constant-time comparison of a presented code with the expected secret. */
export declare function pairingMatches(expected: string, candidate: unknown): boolean;
//# sourceMappingURL=pairing.d.ts.map