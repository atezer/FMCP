/**
 * fmcp CLI — `fmcp doctor`: 10 checks, one line of fix per finding. Dependency-free.
 */
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { candidateMcpConfigs, isCloudEnv, pidFilePath } from "./paths.js";
import { isProcessAlive, killPid, listFmcpProcesses, MAX_PORT, MIN_PORT, requestShutdown, scanBridges, sleep, } from "./probe.js";
import { judgeEntry, readFmcpEntries } from "./configs.js";
import { checkVersions, collectVersions } from "./versions.js";
const REQUIRED_DEPS = ["@modelcontextprotocol/sdk", "ws", "zod", "pino"];
/** A bridge with 0 plugin clients for longer than this is treated as stale (mirrors server takeover rule). */
const STALE_UPTIME_S = 30;
function nodeMajor(v) {
    return parseInt(v.replace(/^v/, "").split(".")[0] || "0", 10);
}
export async function runDoctor(ctx) {
    const f = [];
    // 1. Node
    const major = nodeMajor(ctx.nodeVersion);
    if (major < 18)
        f.push({ check: "node", level: "fail", title: `Node ${ctx.nodeVersion} çok eski`, fix: "Node 20 LTS kurun (https://nodejs.org)" });
    else if (major < 20)
        f.push({ check: "node", level: "warn", title: `Node ${ctx.nodeVersion} çalışır, 20+ önerilir`, fix: "Node 20 LTS'e güncelleyin" });
    else
        f.push({ check: "node", level: "ok", title: `Node ${ctx.nodeVersion}` });
    // 2. Build output
    const distEntry = join(ctx.installRoot, "dist", "local-plugin-only.js");
    if (!existsSync(distEntry)) {
        f.push({ check: "dist", level: "fail", title: "dist/local-plugin-only.js yok (build alınmamış)", fix: `cd ${ctx.installRoot} && npm run build` });
    }
    else {
        f.push({ check: "dist", level: "ok", title: "Build çıktısı mevcut", detail: distEntry });
    }
    // 3. Dependencies
    const missingDeps = REQUIRED_DEPS.filter((d) => !existsSync(join(ctx.installRoot, "node_modules", d)));
    if (missingDeps.length > 0) {
        f.push({ check: "deps", level: "fail", title: `Bağımlılık eksik: ${missingDeps.join(", ")}`, detail: "Sunucu 'Cannot find package' ile çöker; istemci 'Connection closed' görür.", fix: `cd ${ctx.installRoot} && npm ci` });
    }
    else {
        f.push({ check: "deps", level: "ok", title: "Bağımlılıklar kurulu" });
    }
    // 4. Environment
    const cloud = isCloudEnv(ctx.env);
    if (cloud.cloud) {
        f.push({ check: "env", level: "warn", title: `Bulut/uzak oturum (${cloud.reason})`, detail: "Figma plugin'i bu makineye ulaşamaz; sunucu degraded modda yalnız figma_get_status sunar.", fix: "Figma işleri için Claude Desktop veya bilgisayarınızda terminalden Claude Code kullanın" });
    }
    else {
        f.push({ check: "env", level: "ok", title: "Yerel ortam" });
    }
    // 5–7. Ports, plugin connection, zombies
    const bridges = await scanBridges({ platform: ctx.platform });
    const fmcp = bridges.filter((b) => b.kind === "fmcp");
    const others = bridges.filter((b) => b.kind !== "fmcp");
    if (fmcp.length === 0) {
        f.push({ check: "ports", level: "info", title: `${MIN_PORT}–${MAX_PORT} aralığında çalışan FMCP bridge yok`, detail: "Normal: bridge'i Claude Desktop / Claude Code / Cursor açıldığında başlatır. Plugin sarı kalıyorsa AI aracını açın.", fix: "Test için: fmcp start  (bitince: fmcp stop)" });
    }
    else {
        for (const b of fmcp)
            f.push(describeBridge(b, ctx));
    }
    for (const o of others) {
        f.push({
            check: "ports", level: o.kind === "dead" ? "warn" : "info",
            title: `Port ${o.port}: ${o.kind === "dead" ? "cevap vermeyen süreç" : "FMCP olmayan servis"}${o.pid ? ` (PID ${o.pid})` : ""}`,
            detail: o.command ?? undefined,
            fix: o.kind === "dead" ? "Süreci kapatın veya FIGMA_PLUGIN_BRIDGE_PORT ile başka port seçin; bridge zaten bir sonraki boş porta geçer" : undefined,
        });
    }
    const connected = fmcp.filter((b) => (b.status?.clients ?? 0) > 0);
    if (fmcp.length > 0) {
        if (connected.length === 0) {
            f.push({ check: "plugin", level: "warn", title: "Bridge çalışıyor ama plugin bağlı değil", fix: "Figma → Plugins → Development → F-MCP ATezer Bridge çalıştırın; 30 sn içinde yeşil olmalı" });
        }
        else {
            const files = connected.flatMap((b) => (b.status?.files ?? []).map((x) => `${x.fileName ?? "?"} (plugin v${x.pluginVersion ?? "<1.8"}) → :${b.port}`));
            f.push({ check: "plugin", level: "ok", title: `Plugin bağlı: ${files.length} dosya`, detail: files.join("; ") });
            const serverVersions = new Set(connected.map((b) => b.status?.version));
            const mismatched = connected.flatMap((b) => (b.status?.files ?? []).filter((x) => x.pluginVersion && x.pluginVersion !== b.status?.version));
            if (mismatched.length > 0) {
                f.push({ check: "plugin", level: "warn", title: `Plugin/sunucu sürüm farkı (sunucu ${[...serverVersions].join("/")}, plugin ${[...new Set(mismatched.map((m) => m.pluginVersion))].join("/")})`, fix: "Figma → Plugins → Development → Manage plugins → Remove → Import plugin from manifest (f-mcp-plugin/manifest.json)" });
            }
        }
    }
    // Zombies: fmcp processes not listening anywhere, or stale bridges with 0 clients
    const listeningPids = new Set(fmcp.map((b) => b.pid).filter((p) => p !== null));
    const procs = listFmcpProcesses(ctx.platform).filter((p) => !listeningPids.has(p.pid));
    const stale = fmcp.filter((b) => (b.status?.clients ?? 0) === 0 && (b.status?.uptime ?? 0) >= STALE_UPTIME_S && !b.status?.standalone);
    if (procs.length === 0 && stale.length === 0) {
        f.push({ check: "zombies", level: "ok", title: "Zombie FMCP süreci yok" });
    }
    else {
        if (procs.length > 0) {
            f.push({
                check: "zombies", level: "warn",
                title: `${procs.length} FMCP süreci port dinlemiyor (zombie olası)`,
                detail: procs.map((p) => `PID ${p.pid}: ${p.command.slice(0, 80)}`).join("\n"),
                fix: "fmcp fix  (yalnızca FMCP süreçlerini kapatır)",
                action: async () => {
                    let n = 0;
                    for (const p of procs)
                        if (killPid(p.pid))
                            n++;
                    await sleep(500);
                    for (const p of procs)
                        if (isProcessAlive(p.pid))
                            killPid(p.pid, "SIGKILL");
                    return `${n} zombie süreç kapatıldı`;
                },
            });
        }
        if (stale.length > 0) {
            f.push({
                check: "zombies", level: "warn",
                title: `${stale.length} bridge ${STALE_UPTIME_S}+ sn boyunca plugin'siz (bayat)`,
                detail: stale.map((b) => `:${b.port} PID ${b.pid ?? "?"} (${b.status?.mcpClient ?? "MCP"}, ${b.status?.uptime}s)`).join("; "),
                fix: "Bir AI aracı açık ve Figma'da plugin kapalı olabilir — normal. Kapanmış bir aracın artığıysa: fmcp fix",
                action: async () => {
                    let n = 0;
                    for (const b of stale)
                        if (await requestShutdown(b.port))
                            n++;
                    return `${n} bayat bridge'e kapanma isteği gönderildi`;
                },
            });
        }
    }
    // 8. Client configs
    const configs = candidateMcpConfigs(ctx.cwd, { platform: ctx.platform, home: ctx.home, env: ctx.env });
    if (configs.length === 0) {
        f.push({ check: "configs", level: "info", title: "Bu dizinde/kullanıcıda FMCP tanımlı MCP config bulunamadı", fix: "Kurulum: README → Kurulum (5 dakika)" });
    }
    for (const c of configs) {
        try {
            const entries = readFmcpEntries(c.file);
            if (entries.length === 0) {
                f.push({ check: "configs", level: "info", title: `${c.label}: FMCP girdisi yok`, detail: c.file });
                continue;
            }
            for (const e of entries) {
                const v = judgeEntry(e, ctx.installRoot);
                f.push({ check: "configs", level: v.level, title: `${c.label} → ${e.name}: ${v.detail}`, detail: c.file, fix: "fix" in v ? v.fix : undefined });
            }
        }
        catch (err) {
            f.push({ check: "configs", level: "fail", title: `${c.label}: JSON okunamadı`, detail: `${c.file}: ${err instanceof Error ? err.message : String(err)}`, fix: "Dosyayı bir JSON doğrulayıcıdan geçirin" });
        }
    }
    // 9. Version consistency
    const versions = collectVersions(ctx.installRoot);
    const report = checkVersions(versions);
    if (report.ok) {
        f.push({ check: "versions", level: "ok", title: `Sürüm tutarlı: ${report.expected}` });
    }
    else {
        const lines = [...report.mismatches.map((m) => `${m.file}: ${m.version}${m.note ? ` (${m.note})` : ""}`), ...report.missing.map((m) => `${m.file}: okunamadı`)];
        const onlyDist = report.mismatches.every((m) => !m.required) && report.missing.length === 0;
        f.push({ check: "versions", level: onlyDist ? "warn" : "fail", title: `Sürüm tutarsız (package.json ${report.expected})`, detail: lines.join("\n"), fix: onlyDist ? "npm run build" : "Tüm sürümleri package.json ile eşitleyin (node dist/cli/fmcp.js versions)" });
    }
    // 10. Stale pidfile
    const pidFile = pidFilePath(ctx.home);
    if (existsSync(pidFile)) {
        const pid = parseInt(readFileSync(pidFile, "utf8").trim(), 10);
        if (!pid || !isProcessAlive(pid)) {
            f.push({ check: "pidfile", level: "warn", title: `Bayat pid dosyası: ${pidFile} (PID ${pid || "?"} yaşamıyor)`, fix: "fmcp fix", action: async () => { unlinkSync(pidFile); return "pid dosyası silindi"; } });
        }
        else {
            f.push({ check: "pidfile", level: "ok", title: `Standalone bridge çalışıyor (PID ${pid}, fmcp start ile)`, fix: "İşiniz bitince: fmcp stop" });
        }
    }
    return f;
}
function describeBridge(b, ctx) {
    const s = b.status;
    if (!s)
        return { check: "ports", level: "warn", title: `Port ${b.port}: FMCP bridge (eski sürüm, /status yok)`, fix: "Sunucuyu güncelleyin: npm run update" };
    const who = s.standalone ? "standalone (fmcp start)" : `${s.mcpClient ?? "MCP"} istemcisi`;
    const parts = [`v${s.version}`, who, `PID ${s.pid ?? b.pid ?? "?"}`, `${s.clients} plugin`, `${s.uptime}s`];
    const otherInstall = s.installPath && s.installPath !== ctx.installRoot;
    return {
        check: "ports",
        level: otherInstall ? "warn" : "ok",
        title: `Port ${b.port}: FMCP bridge — ${parts.join(", ")}`,
        detail: otherInstall ? `farklı kurulumdan çalışıyor: ${s.installPath}` : undefined,
        fix: otherInstall ? "İki kurulum var; birini kaldırın veya config'leri tek kuruluma yönlendirin" : undefined,
    };
}
const ICON = { ok: "✅", info: "ℹ️ ", warn: "⚠️ ", fail: "❌" };
export function formatFindings(findings, fixResults = new Map()) {
    const lines = [];
    for (const x of findings) {
        lines.push(`${ICON[x.level]} ${x.title}`);
        if (x.detail)
            for (const d of x.detail.split("\n"))
                lines.push(`     ${d}`);
        if (x.fix && x.level !== "ok")
            lines.push(`     → ${x.fix}`);
        const r = fixResults.get(x);
        if (r)
            lines.push(`     ✔ ${r}`);
    }
    const fails = findings.filter((x) => x.level === "fail").length;
    const warns = findings.filter((x) => x.level === "warn").length;
    lines.push("");
    lines.push(fails === 0 && warns === 0 ? "Sonuç: her şey yolunda." : `Sonuç: ${fails} hata, ${warns} uyarı.`);
    return lines.join("\n");
}
export function exitCodeFor(findings) {
    return findings.some((x) => x.level === "fail") ? 1 : 0;
}
//# sourceMappingURL=doctor.js.map