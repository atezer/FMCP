# AI HANDOFF

## Meta

- handoffVersion: `1.0`
- createdAt: `{{ISO_TIMESTAMP}}`
- sourceFileKey: `{{FIGMA_FILE_KEY}}`
- sourceFileUrl: `{{FIGMA_FILE_URL}}`
- nodeIds:
  - `{{NODE_ID_1}}`
- platforms:
  - `web`
  - `ios`
  - `android`

## Scope

- istekOzeti: `{{TASK_SUMMARY}}`
- kabulKriterleri:
  - `{{ACCEPTANCE_CRITERIA_1}}`
  - `{{ACCEPTANCE_CRITERIA_2}}`

## Design Context (figma_get_design_context)

- depth: `2`
- includeLayout: `true`
- includeVisual: `true`
- includeTypography: `true`
- includeCodeReady: `true`
- outputHint: `{{react|tailwind|swiftui|compose}}`

### Ozet

- anaYerlesim: `{{LAYOUT_SUMMARY}}`
- tipografi: `{{TYPO_SUMMARY}}`
- renkVeYuzey: `{{COLOR_SURFACE_SUMMARY}}`
- interactionNotlari: `{{INTERACTION_NOTES}}`

## Token Binding Ozeti

- colors:
  - `{{TOKEN_NAME}} = {{TOKEN_VALUE}}`
- spacing:
  - `{{TOKEN_NAME}} = {{TOKEN_VALUE}}`
- typography:
  - `{{TOKEN_NAME}} = {{TOKEN_VALUE}}`

## Component Reuse Ozeti

- aramaSorgulari:
  - `{{SEARCH_QUERY}}`
- bulunanlar:
  - name: `{{COMPONENT_NAME}}`
    key: `{{COMPONENT_KEY}}`
    nodeId: `{{NODE_ID}}`
    kullanimKarari: `reuse`

## Screenshot Referanslari

- before:
  - `{{PATH_OR_BASE64_REF}}`
- after:
  - `{{PATH_OR_BASE64_REF}}`

## Drift ve Dogrulama

- selfHealingIterations: `{{0-3}}`
- openIssues:
  - `{{ISSUE_1}}`
- manualReviewNeeded: `{{true|false}}`

## Code Connect (opsiyonel, hazirsa)

- mappings:
  - nodeId: `{{NODE_ID}}`
    platform: `{{web|ios|android}}`
    codePath: `{{PATH}}`
    symbol: `{{COMPONENT_SYMBOL}}`

## Uretim Notlari

- riskler:
  - `{{RISK_1}}`
- fallback:
  - `{{FALLBACK_1}}`
- sonrakiAdimlar:
  - `{{NEXT_STEP_1}}`
