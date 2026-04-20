# Active Design System

> **Bu dosya v1.8.0+ için kullanıcı tercih state'idir.** Kullanıcı bir kez DS seçtiğinde
> burası yazılır ve sonraki tüm ekran/bileşen oluşturma akışlarında otomatik kullanılır.
> Claude'a "hangi DS?" sorusunu tekrar tekrar sormamak için.

---

## Aktif DS

**Status:** ❌ Henüz seçilmedi

**Primary Library:** —
**Source Path:** `.claude/design-systems/<lib>/` (public pattern) + `~/.claude/data/fcm-ds/<file-key>/` (user-local cache)
**Selected At:** —

### Secondary Libraries (opsiyonel — multi-library DS için)

Bir DS birden fazla Figma dosyasından oluşuyorsa (örn. ana + mobil + ikon + asset) buraya kaydedin. Gerçek `File Key`'ler **repo'ya yazılmaz** — `~/.claude/data/fcm-ds/active.md` user-local'e gider.

| Library Adı | Rol | User-Local Cache |
|---|---|---|
| — | — | — |

> **Güvenlik:** Gerçek `file key`, `variableKey`, `componentKey` **bu dosyada tutulmaz**.
> Hepsi user-local cache'tedir (gitignored) ve Figma library IP'si olarak korunur.
> Bu repo template'i başka kullanıcıya dağıtıldığında "❌ Henüz seçilmedi" default'una dönmelidir.

---

## Nasıl Doldurulur

İlk ekran/bileşen oluşturma talebinde Claude kullanıcıya soracak:

> "Hangi tasarım sistemi ile ilerleyelim?
> - ❖ SUI (varsa)
> - Material Design
> - Apple HIG
> - Kendi DS'iniz (Figma library URL verin)
> - Hiçbiri (DS'siz, ham Figma)"

Kullanıcı seçtiğinde Claude bu dosyayı **otomatik update eder** (gerçek file key repo'ya YAZILMAZ — user-local'e gider):

```markdown
## Aktif DS

**Status:** ✅ Aktif

**Primary Library:** ❖ <DS Name>
**Source Path:** `.claude/design-systems/<lib>/` (public pattern)
**Selected At:** YYYY-MM-DD

### Secondary Libraries

| Library Adı | Rol | User-Local Cache |
|---|---|---|
| <DS Name> Mobile | mobile components | → user-local |
| <DS Name> Icons | icon library | → user-local |
```

**Gerçek file key'leri ve cache yolları** `~/.claude/data/fcm-ds/active.md`'e yazılır (gitignored). Multi-library DS için her file-key ayrı cache dizini alır: `~/.claude/data/fcm-ds/<key1>/`, `<key2>/`, vb.

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
