# Active Design System

> **Bu dosya v1.8.0+ için kullanıcı tercih state'idir.** Kullanıcı bir kez DS seçtiğinde
> burası yazılır ve sonraki tüm ekran/bileşen oluşturma akışlarında otomatik kullanılır.
> Claude'a "hangi DS?" sorusunu tekrar tekrar sormamak için.

---

## Aktif DS

**Status:** ❌ Henüz seçilmedi

**Library Name:** —
**File Key:** —
**Source Path:** —
**Selected At:** —

---

## Nasıl Doldurulur

İlk ekran/bileşen oluşturma talebinde Claude kullanıcıya soracak:

> "Hangi tasarım sistemi ile ilerleyelim?
> - ❖ SUI (varsa)
> - Material Design
> - Apple HIG
> - Kendi DS'iniz (Figma library URL verin)
> - Hiçbiri (DS'siz, ham Figma)"

Kullanıcı seçtiğinde Claude bu dosyayı **otomatik update eder**:

```markdown
## Aktif DS

**Status:** ✅ Aktif

**Library Name:** ❖ SUI
**File Key:** P31qJTP8XVupmZG4BlTtPG
**Source Path:** .claude/design-systems/sui/
**Selected At:** 2026-04-14
```

---

## Değişiklik

Kullanıcı sonraki turda farklı DS isterse:

```
"DS'i değiştir, bundan sonra Material kullan"
→ Claude active-ds.md'yi update eder
→ Sonraki ekran oluşturma akışları Material kullanır
```

Veya DS'siz devam etmek için:

```
"DS'siz, ham Figma ile çalış"
→ active-ds.md "DS bypass mode" olarak işaretlenir
→ Claude bu dosya manuel temizlenene kadar DS soru sormaz
```

---

## Skill Entegrasyonu

Şu SKILL'ler bu dosyayı **ZORUNLU OLARAK** okur:

- `figma-canvas-ops` (her `figma_execute` öncesi)
- `generate-figma-screen` (Step 1)
- `apply-figma-design-system` (Step 1)
- `audit-figma-design-system` (Step 1)
- `generate-figma-library` (Step 1)

Bu dosya yoksa veya `Status: ❌` ise SKILL ilk adım olarak DS sorusunu sorar.
