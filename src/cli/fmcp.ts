#!/usr/bin/env node
/**
 * fmcp — F-MCP Bridge command line.
 *
 *   fmcp serve              MCP server (stdio). Full bridge when possible, degraded otherwise.
 *   fmcp doctor [--fix]     10 checks with one-line fixes.  --json for machines.
 *   fmcp fix                = doctor --fix
 *   fmcp status [--json]    Which bridges run on 5454–5470, who owns them, which files are connected.
 *   fmcp start [--port N]   Standalone bridge in the background (for testing the plugin). --foreground to stay attached.
 *   fmcp stop [--all|--port N]
 *   fmcp restart
 *   fmcp versions [--check] Version strings across manifests; --check exits 1 on drift.
 *   fmcp version | help
 *
 * This file and everything under src/cli/ must stay dependency-free (node builtins only):
 * `serve` has to answer the MCP client even when node_modules is missing.
 */

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, openSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { FMCP_VERSION } from "../core/version.js";
import { runDegradedServer } from "./degraded-server.js";
import { exitCodeFor, type Finding, formatFindings, runDoctor } from "./doctor.js";
import { fmcpHome, installRootFrom, isCloudEnv, logFilePath, pidFilePath } from "./paths.js";
import {
	type BridgeInfo, fetchStatus, isProcessAlive, killPid, MAX_PORT, MIN_PORT,
	requestShutdown, scanBridges, sleep,
} from "./probe.js";
import { checkVersions, collectVersions } from "./versions.js";

const ROOT = installRootFrom(import.meta.url);

interface Args { cmd: string; flags: Map<string, string | true>; }

function parseArgs(argv: string[]): Args {
	const [cmd = "help", ...rest] = argv;
	const flags = new Map<string, string | true>();
	for (let i = 0; i < rest.length; i++) {
		const a = rest[i];
		if (!a.startsWith("--")) continue;
		const eq = a.indexOf("=");
		if (eq > -1) { flags.set(a.slice(2, eq), a.slice(eq + 1)); continue; }
		const next = rest[i + 1];
		if (next && !next.startsWith("--")) { flags.set(a.slice(2), next); i++; } else flags.set(a.slice(2), true);
	}
	return { cmd, flags };
}

const out = (s: string) => process.stdout.write(`${s}\n`);
const err = (s: string) => process.stderr.write(`${s}\n`);

// ───────────────────────────── serve ─────────────────────────────

async function cmdServe(): Promise<void> {
	const cloud = isCloudEnv();
	// `fmcp start` (standalone) is an explicit request for the WebSocket bridge itself; honour it even in
	// environments that look remote — the user is testing the plugin, not talking to an MCP client.
	if (cloud.cloud && process.env.FMCP_STANDALONE !== "1") {
		await runDegradedServer({ version: FMCP_VERSION, reason: cloud.reason ?? "cloud", installRoot: ROOT });
		return;
	}
	const entry = join(ROOT, "dist", "local-plugin-only.js");
	if (!existsSync(entry)) {
		await runDegradedServer({ version: FMCP_VERSION, reason: "dist/local-plugin-only.js yok (npm run build)", installRoot: ROOT });
		return;
	}
	try {
		// Importing the module starts the full server (it calls main() at module load).
		await import(pathToFileURL(entry).href);
	} catch (e) {
		const code = (e as NodeJS.ErrnoException)?.code;
		const msg = e instanceof Error ? e.message : String(e);
		if (code === "ERR_MODULE_NOT_FOUND" || /Cannot find (package|module)/.test(msg)) {
			err(`[fmcp] Bağımlılık eksik (${msg.split("\n")[0]}). Degraded moda geçiliyor. Çözüm: cd ${ROOT} && npm ci`);
			await runDegradedServer({ version: FMCP_VERSION, reason: "node_modules eksik", installRoot: ROOT });
			return;
		}
		throw e;
	}
}

// ───────────────────────────── doctor / fix ─────────────────────────────

async function cmdDoctor(flags: Args["flags"]): Promise<number> {
	const findings = await runDoctor({
		installRoot: ROOT, cwd: process.cwd(), home: homedir(), platform: process.platform, env: process.env, nodeVersion: process.version,
	});
	const fixResults = new Map<Finding, string>();
	if (flags.has("fix")) {
		for (const x of findings) {
			if (!x.action) continue;
			try { fixResults.set(x, await x.action()); } catch (e) { fixResults.set(x, `düzeltme başarısız: ${e instanceof Error ? e.message : String(e)}`); }
		}
	}
	if (flags.has("json")) {
		const plain = findings.map((x) => {
			const { action, ...rest } = x;
			return { ...rest, fixable: !!action, fixed: fixResults.get(x) };
		});
		out(JSON.stringify({ version: FMCP_VERSION, installRoot: ROOT, findings: plain }, null, 2));
	} else {
		out(`fmcp doctor — F-MCP Bridge v${FMCP_VERSION} — ${ROOT}\n`);
		out(formatFindings(findings, fixResults));
	}
	return exitCodeFor(findings);
}

// ───────────────────────────── status ─────────────────────────────

function describe(b: BridgeInfo): string {
	if (b.kind !== "fmcp") return `:${b.port}  ${b.kind === "dead" ? "cevap vermiyor" : "FMCP değil"}${b.pid ? `  PID ${b.pid}` : ""}${b.command ? `  ${b.command.slice(0, 60)}` : ""}`;
	const s = b.status;
	if (!s) return `:${b.port}  FMCP (eski sürüm, /status yok)`;
	const who = s.standalone ? "standalone" : (s.mcpClient ?? "MCP");
	const files = (s.files ?? []).map((f) => `${f.fileName ?? "?"}${f.pluginVersion ? ` v${f.pluginVersion}` : ""}`).join(", ");
	return `:${b.port}  FMCP v${s.version}  ${who}  PID ${s.pid ?? b.pid ?? "?"}  ${s.clients} plugin${files ? ` [${files}]` : ""}  ${s.uptime}s`;
}

async function cmdStatus(flags: Args["flags"]): Promise<number> {
	const bridges = await scanBridges();
	if (flags.has("json")) { out(JSON.stringify(bridges, null, 2)); return 0; }
	if (bridges.length === 0) {
		out(`${MIN_PORT}–${MAX_PORT} aralığında dinleyen süreç yok. Bridge'i AI aracınız (Claude Desktop / Claude Code / Cursor) açıldığında başlatır; test için: fmcp start`);
		return 0;
	}
	for (const b of bridges) out(describe(b));
	return 0;
}

// ───────────────────────────── start / stop / restart ─────────────────────────────

function readPidFile(): number | null {
	try {
		const pid = parseInt(readFileSync(pidFilePath(), "utf8").trim(), 10);
		return pid > 0 ? pid : null;
	} catch { return null; }
}

async function cmdStart(flags: Args["flags"]): Promise<number> {
	const existing = readPidFile();
	if (existing && isProcessAlive(existing)) {
		out(`Standalone bridge zaten çalışıyor (PID ${existing}). Durum: fmcp status`);
		return 0;
	}
	const entry = join(ROOT, "dist", "cli", "fmcp.js");
	const port = typeof flags.get("port") === "string" ? String(flags.get("port")) : undefined;
	const env = { ...process.env, FMCP_STANDALONE: "1", ...(port ? { FIGMA_PLUGIN_BRIDGE_PORT: port } : {}) };

	if (flags.has("foreground")) {
		process.env.FMCP_STANDALONE = "1";
		if (port) process.env.FIGMA_PLUGIN_BRIDGE_PORT = port;
		await cmdServe();
		return 0;
	}

	mkdirSync(fmcpHome(), { recursive: true });
	const logFd = openSync(logFilePath(), "a");
	const child = spawn(process.execPath, [entry, "serve"], { detached: true, stdio: ["ignore", logFd, logFd], env });
	child.unref();
	if (!child.pid) { err("Bridge başlatılamadı"); return 1; }
	writeFileSync(pidFilePath(), String(child.pid));

	// Find which port it bound: poll /status until a bridge reports our pid.
	const deadline = Date.now() + 8000;
	while (Date.now() < deadline) {
		const bridges = await scanBridges({ withPids: false });
		const mine = bridges.find((b) => b.status?.pid === child.pid);
		if (mine) {
			out(`Standalone bridge çalışıyor: ws://127.0.0.1:${mine.port}  (PID ${child.pid}, log: ${logFilePath()})`);
			out("Figma'da F-MCP Bridge plugin'i birkaç saniye içinde yeşile dönmeli. Bitince: fmcp stop");
			return 0;
		}
		if (!isProcessAlive(child.pid)) break;
		await sleep(250);
	}
	err(`Bridge ${Date.now() >= deadline ? "8 sn içinde port bağlayamadı" : "hemen kapandı"}. Log: ${logFilePath()}`);
	try { unlinkSync(pidFilePath()); } catch { /* ignore */ }
	return 1;
}

async function stopPort(port: number): Promise<boolean> {
	const before = await fetchStatus(port);
	if (!before) return true;
	await requestShutdown(port);
	const deadline = Date.now() + 3000;
	while (Date.now() < deadline) {
		if (!(await fetchStatus(port, "127.0.0.1", 300))) return true;
		await sleep(200);
	}
	if (before.pid && isProcessAlive(before.pid)) { killPid(before.pid); await sleep(500); if (isProcessAlive(before.pid)) killPid(before.pid, "SIGKILL"); }
	return !(await fetchStatus(port, "127.0.0.1", 300));
}

async function cmdStop(flags: Args["flags"]): Promise<number> {
	let code = 0;
	if (flags.has("port")) {
		const port = parseInt(String(flags.get("port")), 10);
		const ok = await stopPort(port);
		out(ok ? `:${port} durduruldu` : `:${port} durdurulamadı`);
		return ok ? 0 : 1;
	}
	if (flags.has("all")) {
		const bridges = (await scanBridges({ withPids: false })).filter((b) => b.kind === "fmcp");
		if (bridges.length === 0) { out("Çalışan FMCP bridge yok"); return 0; }
		for (const b of bridges) {
			const ok = await stopPort(b.port);
			out(`${ok ? "✔" : "✖"} :${b.port} ${b.status?.standalone ? "standalone" : (b.status?.mcpClient ?? "MCP")}`);
			if (!ok) code = 1;
		}
		try { unlinkSync(pidFilePath()); } catch { /* ignore */ }
		return code;
	}
	const pid = readPidFile();
	if (!pid) { out("fmcp start ile başlatılmış bridge yok. Tüm bridge'ler için: fmcp stop --all"); return 0; }
	if (!isProcessAlive(pid)) { try { unlinkSync(pidFilePath()); } catch { /* ignore */ } out("Standalone bridge zaten kapalı (bayat pid dosyası silindi)"); return 0; }
	const bridges = await scanBridges({ withPids: false });
	const mine = bridges.find((b) => b.status?.pid === pid);
	if (mine) await stopPort(mine.port); else { killPid(pid); await sleep(500); if (isProcessAlive(pid)) killPid(pid, "SIGKILL"); }
	try { unlinkSync(pidFilePath()); } catch { /* ignore */ }
	out(`Standalone bridge durduruldu (PID ${pid})`);
	return 0;
}

// ───────────────────────────── versions ─────────────────────────────

function cmdVersions(flags: Args["flags"]): number {
	const sources = collectVersions(ROOT);
	const report = checkVersions(sources);
	if (flags.has("json")) { out(JSON.stringify({ ...report, sources }, null, 2)); return report.ok ? 0 : 1; }
	for (const s of sources) {
		const mark = s.version === null ? "?" : (report.expected && s.version !== report.expected ? "✖" : "✔");
		out(`${mark} ${s.file.padEnd(30)} ${s.version ?? "okunamadı"}${s.note ? `   (${s.note})` : ""}`);
	}
	out(report.ok ? `\nTutarlı: ${report.expected}` : `\nTutarsız — beklenen ${report.expected}`);
	return flags.has("check") ? (report.ok ? 0 : 1) : 0;
}

// ───────────────────────────── help ─────────────────────────────

function help(): void {
	out(`fmcp v${FMCP_VERSION} — F-MCP Bridge CLI

  fmcp doctor [--fix] [--json]   Kurulum ve bağlantı sağlık kontrolü (10 kontrol, her bulguya bir satır çözüm)
  fmcp fix                       doctor --fix (zombie süreçler, bayat pid, bayat bridge)
  fmcp status [--json]           ${MIN_PORT}–${MAX_PORT} portlarında hangi bridge çalışıyor, kim başlattı, hangi Figma dosyaları bağlı
  fmcp start [--port N] [--foreground]
                                 Plugin testi için arka planda standalone bridge (Claude olmadan yeşil ışık)
  fmcp stop [--all | --port N]   Standalone bridge'i (veya hepsini) düzgün kapat
  fmcp restart                   stop + start
  fmcp versions [--check]        Sürüm tutarlılığı (package.json, plugin.json, manifest, ui.html)
  fmcp serve                     MCP sunucusu (stdio) — .mcp.json / Claude Desktop config bunu çağırır
  fmcp version | help

Kurulum kökü: ${ROOT}`);
}

// ───────────────────────────── main ─────────────────────────────

async function main(): Promise<void> {
	const { cmd, flags } = parseArgs(process.argv.slice(2));
	let code = 0;
	switch (cmd) {
		case "serve": await cmdServe(); return;
		case "doctor": code = await cmdDoctor(flags); break;
		case "fix": flags.set("fix", true); code = await cmdDoctor(flags); break;
		case "status": code = await cmdStatus(flags); break;
		case "start": code = await cmdStart(flags); break;
		case "stop": code = await cmdStop(flags); break;
		case "restart": await cmdStop(flags); code = await cmdStart(flags); break;
		case "versions": code = cmdVersions(flags); break;
		case "version": case "--version": case "-v": out(FMCP_VERSION); break;
		case "help": case "--help": case "-h": help(); break;
		default: err(`Bilinmeyen komut: ${cmd}\n`); help(); code = 2;
	}
	process.exit(code);
}

main().catch((e) => { err(e instanceof Error ? (e.stack ?? e.message) : String(e)); process.exit(1); });
