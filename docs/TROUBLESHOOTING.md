# Troubleshooting Guide

## Common Issues and Solutions

### "Yeni araçlar entegre değil" / Araçlar listesinde görünmüyor

Aşağıdaki araçlar **sadece plugin-only giriş noktasında** tanımlıdır:  
`figma_get_component_for_development`, `figma_get_component_image`, `figma_set_description`, `figma_batch_create_variables`, `figma_batch_update_variables`, `figma_setup_design_tokens`, `figma_arrange_component_set`, `figma_get_console_logs`, `figma_watch_console`, `figma_clear_console`.

**Olası nedenler ve çözümler:**

1. **Yanlış MCP giriş noktası**  
   Claude config’te **mutlaka** `dist/local-plugin-only.js` kullanılmalı (tam mod için kullanılan `dist/local.js` değil).  
   Örnek:
   ```json
   "figma-mcp-bridge": {
     "command": "node",
     "args": ["<PROJE-YOLU>/dist/local-plugin-only.js"]
   }
   ```
   `<PROJE-YOLU>` yerine FMCP klasörünün tam yolunu yazın (örn. `/Users/.../FMCP`).

2. **Eski build**  
   Araçlar eklendikten sonra build alınmamış olabilir. Proje kökünde:
   ```bash
   npm run build:local
   ```
   Ardından Claude Desktop’u **tamamen kapatıp** tekrar açın.

3. **Claude eski tool listesini kullanıyor**  
   MCP sunucusu Claude açıldığında başlar; sunucu yeniden başlamazsa tool listesi güncellenmez.  
   **Çözüm:** Claude Desktop’u tamamen kapatın, tekrar açın (ve gerekirse önce `npm run build:local` yapın).

**Kontrol:** Claude’a “Figma MCP’de hangi araçlar var?” veya “figma_get_status çağır” dediğinizde bağlantı geliyorsa, aynı config’teki sunucu çalışıyordur. Araç listesinde yukarıdaki isimler yoksa config’te `local-plugin-only.js` kullanıldığını ve build’in güncel olduğunu tekrar kontrol edin.

### Plugin Dev Mode'da görünmüyor

**Dikkat:** Plugin'in **Dev Mode**'da da listelenmesi için `f-mcp-plugin/manifest.json` içinde şu tanım olmalı:

```json
"editorType": ["figma", "dev"]
```

Sadece `"figma"` yazıyorsa plugin Dev Mode'da görünmeyebilir. Bu repodaki manifest'te `["figma", "dev"]` tanımlı; fork veya kendi plugin'inizde Dev Mode kullanacaksanız kontrol edin.

### "Claude's response could not be fully generated"

Bu mesaj Claude Desktop’un yanıtı tamamlayamadığını gösterir. Sıklıkla MCP’den dönen **çok büyük** veya **çok uzun süren** yanıtlar tetikler.

**Yapılacaklar:**

1. **Önce hafif bir araçla deneyin** — Örn. sadece `figma_get_status` veya `figma_get_design_system_summary`. Kısa yanıt döner; hata devam ediyorsa sorun büyük ihtimalle başka (ağ, bellek, Claude limiti).
2. **Büyük yanıt veren araçlar:** `figma_get_component_for_development` / `figma_get_component_image` base64 screenshot ile context’i şişirir. Önce `figma_get_component` (görsel olmadan) kullanın; gerekirse screenshot için `scale: 1` veya `format: "JPG"` deneyin. `figma_get_file_data` için `depth: 1`, `verbosity: "summary"` ile başlayın. `figma_watch_console` için `timeoutSeconds: 5` veya 10 deneyin.
3. **Yeni konuşma açın** — Eski konuşmada context çok dolmuş olabilir.
4. **Claude / internet** — Geçici sunucu veya ağ sorunları da bu hataya yol açabilir; bir süre sonra tekrar deneyin.

**Özet:** Önce `figma_get_status` ile kısa yanıt alıp almadığınızı kontrol edin; hata orada da oluyorsa büyük/uzun yanıt vermeyen basit bir istekle (ve mümkünse yeni konuşmada) tekrar deneyin.

### Plugin Debugging: Simple Workflow ✅

**For Plugin Developers in Local Mode:**

> **💡 Plugin-only (no debug port):** If you only need variables, components, execute, and screenshot, use **`local-plugin-only.js`** in MCP config. Open Figma **normally**, run the plugin; no 9222 or token required. The steps below are **only for console log** capture.
>
> **If you need console logs**, follow this first-time setup:
>
> **Step 1:** Quit Figma Desktop completely (Cmd+Q on macOS / Alt+F4 on Windows)
>
> **Step 2:** Relaunch Figma with remote debugging enabled:
> - **macOS:** Open Terminal and run:
>   ```bash
>   open -a "Figma" --args --remote-debugging-port=9222
>   ```
> - **Windows:** Open CMD or PowerShell and run:
>   ```
>   cmd /c "%LOCALAPPDATA%\Figma\Figma.exe" --remote-debugging-port=9222
>   ```
>
> **Step 3:** Verify setup worked by visiting http://localhost:9222 in Chrome
> - You should see a list of inspectable pages
> - If you see this, the setup is correct!
>
> **Step 4:** Open your design file and run your plugin
>
> ✅ **You only need to do this once per Figma session** (and only if using console log tools). For plugin-only mode, open Figma normally; no relaunch with debug flag needed.

### How to Verify Setup is Working

Before trying to get console logs, verify your setup:

```
"Check Figma status"
```

You should see:
```json
{
  "setup": {
    "valid": true,
    "message": "✅ Figma Desktop is running with remote debugging enabled"
  }
}
```

If you see `"valid": false`, the AI will provide step-by-step setup instructions.

---

### The Simplest Workflow - No Navigation Needed!

Once setup is complete, just ask your AI to check console logs:

```
"Check the last 20 console logs"
```

Then run your plugin in Figma Desktop, and ask again:

```
"Check the last 20 console logs"
```

You'll see all your `[Main]`, `[Swapper]`, `[Serializer]`, etc. plugin logs immediately:

```json
{
  "logs": [
    {
      "timestamp": 1759747593482,
      "level": "log",
      "message": "[Main] ✓ Instance Swapping: 0 swapped, 20 unmatched",
      "source": "figma"
    },
    {
      "timestamp": 1759747593880,
      "level": "log",
      "message": "[Serializer] Collected 280 variables, 144 paint styles",
      "source": "figma"
    }
  ]
}
```

**That's it!** No navigation, no browser setup, no complex configuration.

---

### For Cloud Mode (Figma Web)

If you're using cloud mode or need to navigate to a specific file:

```javascript
figma_navigate({ url: 'https://www.figma.com/design/...' })
figma_get_console_logs({ count: 100 })
```

**How It Works:**
- Monitors main page console (Figma web app)
- Monitors all Web Worker consoles (Figma plugins)
- Automatically detects when workers are created/destroyed
- Merges all console logs into a single stream
- Tags logs with source: `'plugin'`, `'figma'`, `'page'`

**If You Still Don't See Plugin Logs:**

1. **Check timing:** Make sure you run the plugin AFTER navigating
   ```javascript
   figma_navigate({ url: '...' })
   // Now run your plugin in Figma
   figma_get_console_logs() // Should capture plugin logs
   ```

2. **Check worker count:** Use `figma_get_status()` to verify workers are detected
   ```json
   {
     "consoleMonitor": {
       "isMonitoring": true,
       "workerCount": 2  // Should be > 0 when plugin is running
     }
   }
   ```

3. **Check log levels:** Use `level: 'all'` to ensure nothing is filtered
   ```javascript
   figma_get_console_logs({ level: 'all', count: 500 })
   ```

**Technical Details:**
The MCP uses Puppeteer's Worker APIs to:
- Enumerate existing workers via `page.workers()`
- Listen for new workers via `page.on('workercreated')`
- Attach console listeners to each worker
- Tag worker logs with `source: 'plugin'`

This is the same mechanism Figma's own DevTools uses, just exposed natively through the MCP.

---

### Issue: "Browser isn't currently running"

**Symptoms:**
- Error message: "The browser isn't currently running"
- `figma_get_status` shows `browser.running: false`

**Cause:**
You haven't called `figma_navigate` yet to initialize the browser.

**Solution:**

Always start with `figma_navigate`:

```javascript
figma_navigate({ url: 'https://www.figma.com/design/your-file-id' })
```

This tool:
- Launches the headless Chrome browser
- Initializes console monitoring
- Navigates to your Figma file

Then check status:

```javascript
figma_get_status()
```

Should show:
- `browser.running: true`
- `initialized: true`
- `consoleMonitor.isMonitoring: true`

**Note:** If using a remote MCP SSE server, ensure its URL is correctly set and browser launch may be handled by the server.

---

### Issue: "Failed to retrieve console logs"

**Symptoms:**
- Error: "Console monitor not initialized"
- Error: "Make sure to call figma_navigate first"

**Solution:**
Always use this workflow:
```
1. figma_navigate({ url: 'https://www.figma.com/design/...' })
2. Wait for success response
3. Then use figma_get_console_logs()
```

---

### Issue: Screenshot Returns Empty Data

**Symptoms:**
- Screenshot tool succeeds but image is blank
- Base64 data is present but doesn't render

**Possible Causes:**
1. Page hasn't fully loaded yet
2. Plugin UI isn't visible
3. Timing issue

**Solution:**
```
1. figma_navigate({ url: 'https://www.figma.com/design/...' })
2. Wait 2-3 seconds (automatic in figma_navigate)
3. figma_take_screenshot({ target: 'full-page' })
```

Try different targets:
- `'full-page'` - Entire page including scrollable areas
- `'viewport'` - Currently visible area
- `'plugin'` - Plugin UI only (may need to be visible first)

---

### Issue: No Console Logs Captured

**Symptoms:**
- `figma_get_console_logs()` returns empty array
- Log count is 0

**Possible Causes:**
1. Plugin hasn't executed yet
2. Plugin doesn't produce console output
3. Logs are being filtered out

**Solutions:**

#### Check Plugin Execution
```
1. figma_navigate({ url: 'https://www.figma.com/design/...' })
2. Interact with the plugin in Figma
3. figma_get_console_logs({ level: 'all' })
```

#### Check Log Levels
Try different level filters:
```
figma_get_console_logs({ level: 'all' })     // Everything
figma_get_console_logs({ level: 'error' })   // Only errors
figma_get_console_logs({ level: 'log' })     // Only console.log
figma_get_console_logs({ level: 'warn' })    // Only warnings
```

#### Check Timing
```
1. figma_navigate({ url: '...' })
2. figma_get_status()  // Check log count
3. If logCount > 0, logs are being captured
```

---

### Issue: "Connection timed out" or Network Errors

**Symptoms:**
- Claude Desktop shows connection timeout
- Tools take very long to respond
- Intermittent failures

**Possible Causes:**
1. Cloudflare Workers cold start
2. Browser initialization takes time
3. Figma page load is slow

**Solutions:**

#### Allow More Time
The first call to `figma_navigate` can take 10-30 seconds:
- Browser needs to launch
- Figma needs to load
- Console monitoring needs to initialize

Just wait - subsequent calls will be faster!

#### Use figma_get_status
This is a lightweight call that doesn't require browser initialization:
```
figma_get_status()  // Fast, shows current state
```

#### Check Server Health
```bash
curl https://your-worker.workers.dev/health
```

Should return:
```json
{
  "status": "healthy",
  "service": "F-MCP ATezer",
  "version": "0.1.0",
  "endpoints": ["/sse", "/mcp", "/test-browser"]
}
```

---

### Issue: Claude Desktop Not Seeing Tools

**Symptoms:**
- MCP server connected but no tools visible
- Tools list is empty

**Solutions:**

#### Check Configuration

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "figma-mcp-bridge": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://your-worker.workers.dev/sse"
      ]
    }
  }
}
```

**Important:** Use your deployment URL with the `/sse` endpoint (e.g. `https://your-worker.workers.dev/sse`).

#### Restart Claude Desktop
After changing configuration:
1. Quit Claude Desktop completely
2. Restart it
3. Check the tools menu

#### Verify mcp-remote
Make sure `mcp-remote` is installed:
```bash
npm list -g mcp-remote
```

If not installed:
```bash
npm install -g mcp-remote
```

---

## Workflow Best Practices

### Recommended Workflow

```
# 1. Start session
figma_navigate({ url: 'https://www.figma.com/design/your-file' })

# 2. Check initial state
figma_get_status()

# 3. Work with plugin, then check logs
figma_get_console_logs({ level: 'error' })

# 4. Capture UI state
figma_take_screenshot({ target: 'plugin' })

# 5. Make code changes, reload
figma_reload_plugin({ clearConsole: true })

# 6. Clear for next test
figma_clear_console()
```

### Tips

**1. Always Navigate First**
- `figma_navigate` must be the first call
- It initializes everything
- Subsequent calls will fail without it

**2. Use figma_get_status for Health Checks**
- Lightweight and fast
- Shows browser state
- Shows log count without retrieving logs

**3. Clear Console Between Tests**
- Prevents old logs from mixing with new ones
- `figma_clear_console()` or `figma_reload_plugin({ clearConsole: true })`

**4. Be Patient on First Call**
- Browser launch takes time
- First navigation is slowest
- Subsequent operations are faster

**5. Check Error Messages**
- Error messages include helpful hints
- Often suggest the next step to try
- Include troubleshooting tips

---

## Getting Help

If you're still experiencing issues:

1. **Check Error Message Details**
   - Error messages include specific troubleshooting steps
   - Follow the hints provided

2. **Verify Deployment**
   ```bash
   curl https://your-worker.workers.dev/health
   ```

3. **Check Cloudflare Status**
   - Visit status.cloudflare.com
   - Browser Rendering API status

4. **Report Issues**
   - GitHub Issues: https://github.com/atezer/FMCP/issues
   - Include error messages
   - Include steps to reproduce
   - Include figma_get_status output

---

## Technical Details

### Browser Session Lifecycle

1. **First Call to figma_navigate:**
   - Launches Puppeteer browser (10-15s)
   - Initializes console monitoring
   - Navigates to Figma URL
   - Starts capturing logs

2. **Subsequent Calls:**
   - Reuse existing browser instance
   - Much faster (1-2s)
   - Logs accumulated in circular buffer

3. **Session Timeout:**
   - Browser kept alive for 10 minutes
   - After timeout, automatically relaunches on next call

### Console Log Buffer

- **Size:** 1000 logs (configurable)
- **Type:** Circular buffer (oldest logs dropped when full)
- **Capture:** Real-time via Chrome DevTools Protocol
- **Source Detection:** Automatically identifies plugin vs Figma logs

### Screenshot Format

- **Formats:** PNG (lossless), JPEG (with quality control)
- **Encoding:** Base64 for easy transmission
- **Targets:**
  - `full-page`: Entire page with scrollable content
  - `viewport`: Currently visible area only
  - `plugin`: Plugin iframe only (experimental)

---

## Environment Variables

For local development or custom deployments:

```bash
# Log level (trace, debug, info, warn, error, fatal)
LOG_LEVEL=info

# Configuration file location
FIGMA_CONSOLE_CONFIG=/path/to/config.json

# Node environment
NODE_ENV=production
```

---

## Advanced Configuration

Create `~/.config/figma-mcp-bridge/config.json`:

```json
{
  "browser": {
    "headless": true,
    "args": ["--disable-blink-features=AutomationControlled"]
  },
  "console": {
    "bufferSize": 2000,
    "filterLevels": ["log", "info", "warn", "error", "debug"],
    "truncation": {
      "maxStringLength": 1000,
      "maxArrayLength": 20,
      "maxObjectDepth": 5
    }
  },
  "screenshots": {
    "defaultFormat": "png",
    "quality": 95
  }
}
```

**Note:** Custom configuration is optional. When using your own deployment, set `MCP_OAUTH_BASE_URL` to your worker URL so OAuth redirects work.
