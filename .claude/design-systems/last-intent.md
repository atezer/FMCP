# Last Intent

> **Bu dosya fmcp-intent-router tarafından yönetilir (v1.8.1+).**
> Kullanıcı bir F-MCP SKILL'ini başarıyla tamamladığında burası güncellenir.
> Sonraki turda Claude "öncekiyle aynı mı?" sorusu için bu dosyayı okur.

---

## Status
❌ Henüz hiçbir intent tamamlanmadı

## Selected Skill
—

## Inputs
—

## Approach
—

## Result
—

## User Confirmation
—

---

## Format (Dolu Haliyle Nasıl Görünür)

```markdown
## Status
✅ Tamamlandı

## Selected Skill
generate-figma-screen

## Inputs
- device: iPhone 17 (402×874)
- design_system: ❖ SUI
- reference_benchmark: 139:3407 (Vadesiz TL Hesabı)
- screen_type: (from benchmark — not asked)
- sections: (from benchmark — not asked)
- variants: single

## Approach
clone-to-device with SUI token binding

## Result
- output_node: 173:12130
- validation_score: 95/100
- duration_ms: 18200
- instance_count: 7
- binding_count: 24
- status: ✅ Success

## User Confirmation
✅ Onaylandı 2026-04-14 14:23
✅ Başarılı 2026-04-14 14:23:18
```

---

## Repeat Path Usage

Kullanıcı "bir ekran daha yap" / "aynısını yap" dediğinde Claude bu dosyayı okur ve tek soru sorar:

> "Öncekiyle aynı ayarlarla mı devam edeyim?
>  • Skill: [Selected Skill]
>  • Device: [device]
>  • DS: [design_system]
>  • Yaklaşım: [Approach]
>
>  [✅ Aynı] [✏️ Değiştir] [❌ İptal]"

## Partial Reuse Usage

Kullanıcı "aynı ama Android'de yap" derse, ds/reference/type/sections reuse edilir, sadece device sorulur.

## Reset

Kullanıcı "sıfırla" veya "yeni başla" derse bu dosya boş (❌) hâline döndürülür.
