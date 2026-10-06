---
description: Figma design system dosyalarındaki değişiklikleri takip et, özetle ve iş taslağı hazırla.
argument-hint: <figma-file-url> [<figma-file-url> ...]
---

# DS Değişiklik Takibi

`ds-change-tracker` skill'ini uygula ([skills/ds-change-tracker/SKILL.md](../skills/ds-change-tracker/SKILL.md)).

Girdi: $ARGUMENTS (Figma dosya URL'leri; fileKey'leri URL'den çıkar).

1. `figma_get_status` ile bağlantıyı doğrula; bağlı değilse kullanıcıdan plugin'i açmasını iste.
2. Dosya için önceki snapshot varsa snapshot karşılaştırması yap; yoksa baz snapshot al.
3. Kullanıcı geçmişteki bir anı soruyorsa ve REST token varsa sürüm geçmişiyle bileşen/yapı farkını çıkar (token değer farkı bu yolla alınamaz — bunu belirt).
4. Raporu "eski → yeni" biçiminde sun.
5. Değişiklik varsa iş taslağı öner; onay almadan iş açma.
