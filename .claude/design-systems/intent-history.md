# Intent History (Last 5 — LRU)

> **Bu dosya fmcp-intent-router tarafından yönetilir (v1.8.1+).**
> Her tamamlanan intent başa eklenir; 6. entry olduğunda en eski silinir.
> Amaç: Claude'un son oturumdaki çalışmayı hatırlaması + Fast Path partial reuse.

---

## (empty — henüz hiçbir intent tamamlanmadı)

---

## Format (Dolu Haliyle Nasıl Görünür)

```markdown
## 1. 2026-04-14 14:23 — generate-figma-screen ✅
device=iPhone 17, ds=❖ SUI, ref=139:3407 → score=95, 18s

## 2. 2026-04-14 14:00 — audit-figma-design-system ✅
scope=current_page → 12 findings, md report

## 3. 2026-04-14 13:45 — generate-figma-screen ✅
device=iPhone 16, ds=❖ SUI, ref=none, type=login → score=82

## 4. 2026-04-14 13:20 — apply-figma-design-system ✅
scope=frame 155:2200, ds=❖ SUI → 18 bindings applied

## 5. 2026-04-14 12:55 — figma-screen-analyzer ✅
target=139:3407 → md summary
```

---

## Entry Format

Her entry şu alanları içerir:

1. **Sıra no** (1-5, 1 = en yeni)
2. **Tarih-saat** (ISO 8601 kısaltılmış)
3. **Skill adı**
4. **Status emoji** (✅ başarılı, ⚠️ kısmi, ❌ hata)
5. **Özet inputs** (virgülle ayrılmış key=value)
6. **Özet result** (score, duration, item count)

## LRU Rule

```
IF history.length >= 5:
  Remove last entry (position 5)
PREPEND new entry at position 1
Shift positions 1-4 → 2-5
```

## Fast Path 3 — Partial Reuse

Claude kullanıcının yeni talebini history ile karşılaştırır. Eğer bir entry'nin %80'i yeni talebe uyuyorsa, sadece farklı alanları sorar.

Örnek:
- History #1: `generate-figma-screen, device=iPhone 17, ds=SUI, ref=139:3407`
- Kullanıcı: "aynısını Android Compact'ta yap"
- Claude: ref/ds/type reuse, sadece `device=Android Compact` set eder
- Onay sor, execute

## Reset

Kullanıcı "geçmişi temizle" derse bu dosya boşaltılır ("empty" mesajı kalır).
