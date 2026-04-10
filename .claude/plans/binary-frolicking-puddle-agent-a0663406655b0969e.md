# Implementation Plan: docs/UPDATE.md — F-MCP Güncelleme Rehberi

## Overview

Create a comprehensive Turkish-language update guide at `docs/UPDATE.md` for @atezer/figma-mcp-bridge users. The guide must cover three user scenarios (npx, local clone, Claude Code), handle platform differences (macOS/Windows), address common pitfalls (npx caching, nvm), and provide verification and rollback procedures.

---

## 1. Research Findings

### Existing Documentation Patterns

- **Language**: All user-facing docs in `docs/` are in Turkish (ONBOARDING.md, WINDOWS-INSTALLATION.md, MULTI_INSTANCE.md, PORT-5454-KAPALI.md, etc.). Some docs mix Turkish headings with English technical content (TROUBLESHOOTING.md, SETUP.md). The new UPDATE.md should follow KURULUM.md and ONBOARDING.md style — primarily Turkish with code blocks in English.
- **Emoji usage**: Existing docs use emoji headers (KURULUM.md uses them, ONBOARDING.md uses them). The new doc should match.
- **Table style**: The project heavily uses pipe-delimited markdown tables for quick-reference (README.md, ONBOARDING.md, WINDOWS-INSTALLATION.md).
- **Config examples**: Always shown as full JSON blocks with comments explaining what to replace.
- **Cross-references**: Docs link to each other extensively (CHANGELOG.md, README.md, TROUBLESHOOTING.md, GitHub Releases).

### Key Technical Details Discovered

1. **Two binaries** (from `package.json` "bin" field):
   - `figma-mcp-bridge` → `dist/local.js` (full mode)
   - `figma-mcp-bridge-plugin` → `dist/local-plugin-only.js` (plugin-only, recommended)

2. **Config file locations** (from README.md, KURULUM.md, WINDOWS-INSTALLATION.md):
   - **Cursor**: `.cursor/mcp.json` (project root or user home)
   - **Claude Desktop macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Claude Desktop Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
   - **Claude Code**: `~/.claude/settings.json` or project `.claude/settings.local.json`
   - **Project-level .mcp.json**: exists at repo root with bash wrapper for nvm

3. **npx cache clearing** (from KURULUM.md line 169):
   - Command: `npx clear-npx-cache`
   - Alternative: pin specific version like `@1.7.9`

4. **nvm handling** (from `scripts/cursor-mcp-plugin-bridge.sh`):
   - Script sources `$NVM_DIR/nvm.sh` before running node
   - Used specifically for Cursor where nvm node path isn't in PATH
   - `.mcp.json` references this script with bash wrapper

5. **Figma plugin update** (from README.md, ONBOARDING.md):
   - Plugin location: `f-mcp-plugin/manifest.json`
   - Import via: Figma → Plugins → Development → Import plugin from manifest
   - For npx users: plugin is bundled in npm package under `f-mcp-plugin/`
   - For local clone users: `git pull` updates plugin source

6. **Version checking** (from KURULUM.md, CHANGELOG.md):
   - npm: `npm view @atezer/figma-mcp-bridge version`
   - Local package.json: `node -e "console.log(require('./package.json').version)"`
   - Plugin status bar shows version

7. **Build commands** (from package.json):
   - `npm run build:local` — TypeScript compile for local mode
   - `npm run build` — both local and cloudflare

8. **Node.js requirement**: `>=18.0.0` (from package.json "engines")

9. **WebSocket ports**: 5454-5470 auto-scan (from manifest.json, README.md)

10. **Platform differences** (from WINDOWS-INSTALLATION.md):
    - Windows uses backslash paths (double backslash in JSON)
    - Port check: macOS `lsof -i :5454`, Windows `netstat -ano | findstr :5454`

---

## 2. Document Structure

The file `docs/UPDATE.md` should be structured as follows:

### Header Section
- Title: `F-MCP ATezer — Güncelleme Rehberi`
- Brief intro: Why updating matters (new tools, bug fixes, compatibility)
- Quick-nav table: Jump to your scenario (npx / local clone / Claude Code)

### Section 1: Mevcut Sürümünüzü Kontrol Edin (Check Your Current Version)
- How to check what version you're running
- Three methods:
  1. **npx users**: `npm view @atezer/figma-mcp-bridge version` (shows npm latest)
  2. **Local clone users**: Check `package.json` in repo root
  3. **Plugin version**: `figma_get_status` or `figma_plugin_diagnostics` tool output
- Table: "Hangi sürümdesiniz?" quick reference

### Section 2: Senaryo A — NPX Kullanıcıları (Most Common)
- **Explanation**: If config uses `"command": "npx"`, you are an npx user
- **Tek komut güncelleme**: Restart AI tool (if `@latest` tag used)
- **npx cache problemi**: When `@latest` still gives old version
  - `npx clear-npx-cache` (Node 18+)
  - Alternative: `npm cache clean --force` then restart
  - Nuclear option: Delete `~/.npm/_npx` folder (macOS) or `%LOCALAPPDATA%\npm-cache\_npx` (Windows)
- **Config check**: Verify `@latest` tag is present in args
- **Platform-specific examples**:
  - Cursor (`.cursor/mcp.json`)
  - Claude Desktop (macOS path, Windows path)
- **After update**: Restart AI tool, verify with `figma_get_status`

### Section 3: Senaryo B — Local Clone Kullanıcıları (Developer Setup)
- **Identification**: Config points to local file path like `/Users/.../dist/local-plugin-only.js`
- **Tek komut güncelleme** (if no local changes):
  ```bash
  cd /path/to/FMCP && git pull && npm install && npm run build:local
  ```
- **If you have local changes**:
  - `git stash` → `git pull` → `npm install` → `npm run build:local` → `git stash pop`
  - Handle merge conflicts guidance
- **Figma plugin update**: Plugin files in `f-mcp-plugin/` are updated by `git pull`; need to reimport manifest if plugin code changed, or just close and reopen plugin in Figma
- **After update**: Restart AI tool (Claude/Cursor/Claude Code)

### Section 4: Senaryo C — Claude Code Kullanıcıları
- **Two sub-scenarios**:
  1. Claude Code with npx → Same as Scenario A
  2. Claude Code with local path → Same as Scenario B
- **Config locations**:
  - `~/.claude/settings.json` (global)
  - `.claude/settings.local.json` (project)
- **`claude mcp add` users**: How to check and update via CLI
  - `claude mcp list` to see current config
  - Re-add with: `claude mcp add figma-mcp-bridge -- npx -y @atezer/figma-mcp-bridge@latest figma-mcp-bridge-plugin`
- **nvm users**: Special handling — use the bash wrapper script `scripts/cursor-mcp-plugin-bridge.sh` pattern

### Section 5: Figma Plugin Güncellemesi (Often Forgotten!)
- **Why it matters**: MCP server and plugin must be compatible
- **NPX users**: Plugin bundled in npm package, auto-updates with MCP server. BUT if you imported manifest from a local path previously, the local copy may be stale.
- **Local clone users**: `git pull` updates `f-mcp-plugin/` directory. Options:
  1. Close plugin in Figma, reopen → Figma reloads from manifest path
  2. If structure changed: Figma → Plugins → Development → reimport manifest
- **Organization/Private plugin users**: Admin needs to republish the plugin
- **How to verify plugin version**: Check plugin UI or `figma_plugin_diagnostics`

### Section 6: Doğrulama (Verification)
- Step-by-step verification checklist:
  1. AI tool shows MCP connected (no "Server disconnected")
  2. `figma_get_status` returns connection info
  3. Plugin shows "ready (:5454)" with green dot
  4. `figma_plugin_diagnostics` shows matching bridge version
  5. New tools appear in tool list (if update added new tools)
- Quick test command: Ask AI "Figma durumunu kontrol et"

### Section 7: Sorun Giderme (Troubleshooting Update Issues)
- Table format, matching TROUBLESHOOTING.md style:
  - "Güncelleme sonrası 'Server disconnected'" → Build check, path check
  - "NPX hala eski sürümü indiriyor" → Cache clearing steps
  - "git pull conflict" → Stash/reset guidance
  - "Plugin 'no server' diyor" → Port mismatch, restart order
  - "nvm: node not found" → Source nvm.sh, use bash wrapper
  - "Windows: 'command not found: node'" → PATH issue, use full node path
  - "'MODULE_NOT_FOUND' hatası" → `npm install` + `npm run build:local` needed
  - "Araçlar listesinde yeni araçlar yok" → Restart AI tool completely

### Section 8: Geri Alma (Rollback)
- **NPX users**: Pin specific version in config args: `@atezer/figma-mcp-bridge@1.6.2`
- **Local clone users**: `git checkout v1.6.2` (or specific tag/commit) → `npm install` → `npm run build:local`
- **Clear npx cache after rollback**: Ensure old version is actually used
- **Plugin rollback**: For local clone, git checkout also rolls back `f-mcp-plugin/`

### Section 9: Otomatik Güncelleme Bildirimleri (Stay Informed)
- Watch GitHub releases: github.com/atezer/FMCP → Watch → Custom → Releases
- npm outdated check: `npm outdated -g @atezer/figma-mcp-bridge`
- CHANGELOG.md location

### Footer
- Links to related docs: CHANGELOG.md, TROUBLESHOOTING.md, ONBOARDING.md, SETUP.md
- GitHub Issues link for update problems

---

## 3. Implementation Steps

### Step 1: Create the file at `docs/UPDATE.md`

Write the full document following the structure above. Key authoring guidelines:
- Write in Turkish, matching KURULUM.md / ONBOARDING.md tone
- Use emoji section headers like existing docs (but not excessively)
- Provide full JSON config examples for each scenario
- Include both macOS and Windows commands where relevant
- Use tables for quick-reference information
- Include "tek komut" (single command) blocks prominently
- Code blocks should use appropriate language tags (bash, json, powershell)

### Step 2: Add cross-references from existing docs

Update these files to link to the new UPDATE.md:
1. **README.md** — Add UPDATE.md to the "Dokümanlar" table
2. **KURULUM.md** — Replace the brief update section (line ~166-169) with a link to UPDATE.md
3. **ONBOARDING.md** — Replace the brief "Güncelleme" section (lines 166-174) with a link to UPDATE.md
4. **docs/TROUBLESHOOTING.md** — Add a "Güncelleme sorunları" section linking to UPDATE.md

### Step 3: Verify internal links

Ensure all links within UPDATE.md resolve correctly:
- `../CHANGELOG.md` (from docs/)
- `../README.md`
- `TROUBLESHOOTING.md` (same directory)
- `ONBOARDING.md` (same directory)
- `SETUP.md` (same directory)
- `../f-mcp-plugin/manifest.json`
- `../scripts/cursor-mcp-plugin-bridge.sh`
- External: github.com/atezer/FMCP, npmjs.com/package/@atezer/figma-mcp-bridge

---

## 4. Content Details for Each Section

### Version Check Commands (Section 1)

```bash
# npm'deki en son sürüm
npm view @atezer/figma-mcp-bridge version

# Yerel clone'daki sürüm
cat package.json | grep '"version"'

# Node.js sürümünüz
node -v
```

### NPX Cache Clear Commands (Section 2)

```bash
# Yöntem 1: npx önbelleğini temizle
npx clear-npx-cache

# Yöntem 2: npm önbelleğini temizle
npm cache clean --force

# Yöntem 3: Önbellek klasörünü sil (macOS/Linux)
rm -rf ~/.npm/_npx

# Yöntem 3: Önbellek klasörünü sil (Windows PowerShell)
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\npm-cache\_npx"
```

### Local Clone Update - Single Command (Section 3)

```bash
# Tek komut güncelleme (değişiklik yoksa)
cd /path/to/FMCP && git pull && npm install && npm run build:local

# Yerel değişiklikleriniz varsa
cd /path/to/FMCP && git stash && git pull && npm install && npm run build:local && git stash pop
```

### Claude Code Config Patterns (Section 4)

For `~/.claude/settings.json`:
```json
{
  "mcpServers": {
    "figma-mcp-bridge": {
      "command": "npx",
      "args": ["-y", "@atezer/figma-mcp-bridge@latest", "figma-mcp-bridge-plugin"]
    }
  }
}
```

For `claude mcp add`:
```bash
claude mcp add figma-mcp-bridge -- npx -y @atezer/figma-mcp-bridge@latest figma-mcp-bridge-plugin
```

### nvm Wrapper Pattern (Section 4)

Reference the existing `scripts/cursor-mcp-plugin-bridge.sh` which:
1. Sets `NVM_DIR`
2. Sources `$NVM_DIR/nvm.sh` if it exists
3. Runs `exec node` with the bridge script

Users who installed Node via nvm need either:
- The bash wrapper script approach (used in `.mcp.json`)
- Or adding full node path in config: `"command": "/Users/you/.nvm/versions/node/v20.x.x/bin/node"`

### Rollback Commands (Section 8)

```bash
# NPX: Belirli sürüme sabitle (config'te)
"args": ["-y", "@atezer/figma-mcp-bridge@1.6.2", "figma-mcp-bridge-plugin"]

# Local clone: Belirli tag'e dön
cd /path/to/FMCP
git fetch --tags
git checkout v1.6.2
npm install
npm run build:local
```

---

## 5. Potential Challenges

1. **npx cache behavior varies by npm version**: npm 7+ vs npm 9+ handle caching differently. The guide should mention `npx clear-npx-cache` may not exist on older npm and suggest `npm cache clean` as fallback.

2. **Claude Code `claude mcp add` documentation is limited**: The archived OAUTH_SETUP.md has one example. The guide should provide the CLI syntax but note it may vary by Claude Code version.

3. **Plugin version sync**: There is no automatic mechanism to ensure plugin version matches MCP server version. The guide should emphasize checking both.

4. **Windows path escaping**: JSON requires either double backslashes or forward slashes. The guide must show both patterns.

5. **Organization plugin users**: They depend on admin to republish. The guide should note this and suggest contacting admin.

---

## 6. Estimated Document Size

Based on comparable docs in the project:
- KURULUM.md: ~200 lines
- ONBOARDING.md: ~200 lines  
- WINDOWS-INSTALLATION.md: ~230 lines

The UPDATE.md should target **250-350 lines** to be comprehensive without being overwhelming. Each section should be independently useful (users can jump to their scenario).

---

## 7. Critical Files for Implementation

### Primary file to create:
- `/Users/abdussamed.tezer/FCM/docs/UPDATE.md`

### Files to update with cross-references:
- `/Users/abdussamed.tezer/FCM/README.md` (add to docs table)
- `/Users/abdussamed.tezer/FCM/KURULUM.md` (link update section to new doc)
- `/Users/abdussamed.tezer/FCM/docs/ONBOARDING.md` (link update section to new doc)

### Reference files (read-only, for content accuracy):
- `/Users/abdussamed.tezer/FCM/package.json` (version, engines, bin, scripts)
- `/Users/abdussamed.tezer/FCM/scripts/cursor-mcp-plugin-bridge.sh` (nvm pattern)
- `/Users/abdussamed.tezer/FCM/f-mcp-plugin/manifest.json` (plugin metadata)
- `/Users/abdussamed.tezer/FCM/CHANGELOG.md` (version history)
- `/Users/abdussamed.tezer/FCM/.mcp.json` (Cursor config with bash wrapper example)
- `/Users/abdussamed.tezer/FCM/docs/WINDOWS-INSTALLATION.md` (Windows path patterns)
