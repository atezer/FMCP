// Manifest üretim script'i — kütüphane dosyasının İÇİNDE çalıştırılır
// (Figma agent'ı / v1 skill'in manifest adımı ile).
// Çıktı: manifests/<kütüphane>.json içeriği olarak kaydedilecek JSON.
(async () => {
  // Not: findAllWithCriteria tüm sayfaları tarar; büyük kütüphanelerde
  // sayfa sayfa çalıştırıp birleştirmek gerekebilir (1MB çıktı limiti).
  await figma.loadAllPagesAsync();
  const components = figma.root.findAllWithCriteria({ types: ["COMPONENT"] });
  const manifest = {
    name: figma.root.name.toLowerCase().replace(/\s+/g, "-"),
    fileKey: figma.fileKey || "ELLE-DOLDUR",
    generatedAt: new Date().toISOString().slice(0, 10),
    components: components.map((c) => ({ key: c.key, name: c.name })),
  };
  console.log(`${manifest.components.length} component bulundu`);
  return JSON.stringify(manifest);
})();
