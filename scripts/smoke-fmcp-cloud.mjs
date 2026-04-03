#!/usr/bin/env node
/**
 * Yerel smoke: Worker kökünde Cloud Mode HTTP uçları (wrangler dev çalışırken).
 * Kullanım: BASE_URL=http://127.0.0.1:8787 node scripts/smoke-fmcp-cloud.mjs
 */
const base = (process.env.BASE_URL || "http://127.0.0.1:8787").replace(/\/$/, "");

async function main() {
	const health = await fetch(`${base}/fmcp-cloud/health`);
	console.log("GET /fmcp-cloud/health", health.status, await health.text());

	const opt = await fetch(`${base}/mcp`, { method: "OPTIONS", headers: { Origin: "https://claude.ai" } });
	console.log("OPTIONS /mcp", opt.status, "ACAO=", opt.headers.get("access-control-allow-origin"));

	const pair = await fetch(`${base}/fmcp-cloud/pairing`, { method: "POST", headers: { "Content-Type": "application/json" } });
	console.log("POST /fmcp-cloud/pairing", pair.status, (await pair.text()).slice(0, 200));
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
