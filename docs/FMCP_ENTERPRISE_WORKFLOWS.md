# FMCP Enterprise workflow kiti

Kurumsal tasarim sistemleri icin Cursor / Claude skill’leri ve MCP araclari tek akista nasil kullanilir.

## 1. Temel akis (tasarim → kod)

1. Baglanti: `figma_get_status` → plugin `ready`.
2. Baglam: `figma_get_design_context` veya `figma_use` intent `handoff_export` ([FIGMA_USE_STRUCTURED_INTENT.md](./FIGMA_USE_STRUCTURED_INTENT.md)).
3. Teslim: [ai-handoff-export](../.cursor/skills/f-mcp/ai-handoff-export/SKILL.md) — `HANDOFF_TEMPLATE.md` + `handoff.manifest.json`.
4. Kod: [implement-design](../.cursor/skills/f-mcp/implement-design/SKILL.md) (platform secimi).

## 2. Token ve parite

- Export / coklu platform: [design-token-pipeline](../.cursor/skills/f-mcp/design-token-pipeline/SKILL.md).
- Figma ↔ kod deger karsilastirma: `figma_check_design_parity` + [design-drift-detector](../.cursor/skills/f-mcp/design-drift-detector/SKILL.md).

## 3. Bilesen eslemesi

- Figma ↔ repo bileseni: [code-design-mapper](../.cursor/skills/f-mcp/code-design-mapper/SKILL.md).
- Node bazli baglantilar: `figma_get_code_connect` + (gerekirse) Code Connect CLI / resmi MCP.

## 4. Tasarim sistemi kurallari

- Platform kurallari: [design-system-rules](../.cursor/skills/f-mcp/design-system-rules/SKILL.md).

## 5. FigJam ve diyagram

- Programatik cizim (payload guvenli): [figjam-diagram-builder](../.cursor/skills/f-mcp/figjam-diagram-builder/SKILL.md).

## 6. Arac envanteri

- Guncel `figma_*` listesi: [TOOLS.md](./TOOLS.md).
