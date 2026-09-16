/**
 * fmcp CLI — bridge/port probing and process helpers. Dependency-free.
 */
export declare const MIN_PORT = 5454;
export declare const MAX_PORT = 5470;
export declare const HOST = "127.0.0.1";
export type PortKind = "fmcp" | "other" | "dead" | "none";
/** Shape of GET /status on a v1.9.15+ bridge (older bridges return only clients/uptime/version). */
export interface BridgeStatusPayload {
    clients: number;
    uptime: number;
    version: string;
    pid?: number;
    port?: number;
    preferredPort?: number;
    installPath?: string | null;
    mcpClient?: string;
    standalone?: boolean;
    startedAt?: number;
    files?: {
        fileKey: string | null;
        fileName: string | null;
        pluginVersion: string | null;
        connectedAt: number;
    }[];
}
export interface BridgeInfo {
    port: number;
    kind: PortKind;
    status: BridgeStatusPayload | null;
    /** PID of the listener as seen by the OS (lsof/netstat); null if unknown. */
    pid: number | null;
    command: string | null;
}
/** GET / on a port: "fmcp" (marker found), "other" (something else answers), "none" (refused), "dead" (no answer). */
export declare function probePort(port: number, host?: string, timeoutMs?: number): Promise<PortKind>;
export declare function fetchStatus(port: number, host?: string, timeoutMs?: number): Promise<BridgeStatusPayload | null>;
/** POST /shutdown. Resolves true if the bridge accepted (200) or is already gone. */
export declare function requestShutdown(port: number, host?: string, timeoutMs?: number): Promise<boolean>;
/** PID listening on a TCP port, via lsof (darwin/linux) or netstat (win32). null if unknown. */
export declare function listeningPid(port: number, platform?: NodeJS.Platform): number | null;
/** Full command line of a PID (ps). null if unknown. */
export declare function processCommand(pid: number, platform?: NodeJS.Platform): string | null;
/** Recognise FMCP bridge processes in `ps` output: executable must be node/npm/npx so shells or editors whose
 * command line merely mentions the script (e.g. `bash -c "... fmcp.js serve"`) are not flagged. Exported for tests. */
export declare const FMCP_PROCESS_RE: RegExp;
/** All FMCP-looking processes on this machine: [{pid, command}]. Best effort; [] on Windows or failure. */
export declare function listFmcpProcesses(platform?: NodeJS.Platform, selfPid?: number): {
    pid: number;
    command: string;
}[];
export declare function isProcessAlive(pid: number): boolean;
export declare function killPid(pid: number, signal?: NodeJS.Signals): boolean;
/** Probe every port in range in parallel; returns only ports where something answers or holds the port. */
export declare function scanBridges(opts?: {
    platform?: NodeJS.Platform;
    withPids?: boolean;
}): Promise<BridgeInfo[]>;
export declare const sleep: (ms: number) => Promise<void>;
/** Wait until /status answers on `port` (or give up after timeoutMs). */
export declare function waitForBridge(port: number, timeoutMs?: number): Promise<BridgeStatusPayload | null>;
//# sourceMappingURL=probe.d.ts.map