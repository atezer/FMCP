# Privacy Policy — F-MCP ATezer (Figma MCP Bridge)

**Last updated:** March 2026

## Overview

F-MCP ATezer (Figma MCP Bridge) is a local MCP server that connects AI assistants (Claude, Cursor) to Figma through a plugin. This privacy policy explains how the software handles data.

## Data Processing

- **All data stays local.** Design data flows only between your machine's MCP server, the Figma plugin running in your browser or desktop app, and the AI assistant. No design data is transmitted to external servers through MCP.
- **No Figma REST API calls.** The bridge communicates directly with the Figma plugin via a local WebSocket connection (default port 5454). No Figma API tokens are consumed.
- **No data storage.** The MCP server does not persist any design data to disk. All data exists only in memory during the active session.
- **No telemetry or analytics.** The software does not collect usage data, crash reports, or any form of telemetry.

## Data Flow

```
AI Assistant (Claude/Cursor) <-> MCP Server (localhost) <-> Figma Plugin (localhost) <-> Figma
```

All communication happens on `localhost` (127.0.0.1) by default. Remote access requires explicit configuration (`FIGMA_BRIDGE_HOST=0.0.0.0`).

## Third-Party Data Sharing

F-MCP ATezer does not share any data with third parties. The only external communication is between the AI assistant and the MCP server, which is initiated and controlled by the user.

## AI Assistant Context

Design data retrieved through MCP tools becomes part of the AI assistant's conversation context. This data is subject to the AI provider's own privacy policy (e.g., Anthropic's privacy policy for Claude, Cursor's privacy policy for Cursor IDE).

## Audit Logging

Optional audit logging (`FIGMA_MCP_AUDIT_LOG_PATH`) records MCP tool calls locally. This log stays on the user's machine and is not transmitted anywhere.

## GDPR / KVKK Compliance

- **Data minimization:** Only requested design data is retrieved per tool call.
- **Local processing:** All data processing happens on the user's machine.
- **No cross-border transfer:** Design data does not leave the user's network through MCP.
- **Right to deletion:** No persistent data is stored; closing the MCP server clears all data from memory.

## Contact

For privacy-related questions, open an issue at [github.com/atezer/FMCP](https://github.com/atezer/FMCP/issues).
