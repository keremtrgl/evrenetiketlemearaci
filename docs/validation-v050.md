# v0.5.0 beta.1 doğrulama

Kerem · 6 Kasım 2026

## Tamamlanan kontroller

- Node test: 57/57. Uygulama, site adaptörü, iptal, sekme kimliği, kayıt ve navigasyon regresyonları dahil.
- İki görsel için uygulama düzeyinde sıra: çiz1 → kaydet1 → sonraki1 → çiz2 → kaydet2. Sınırdan sonra ilerleme yok. Bu testte site ve worker kontrollü test karşılıklarıdır.
- Yeni bağlantıda mevcut etiketli görsel piksel alınmadan atlanıp ilerleyebilir.
- Bağlam okunurken Durdur yeni navigasyon göndermez. Sekme değişiminde aynı dosya/sıra kimliği olsa bile çalışma durur.
- Eşleme görsel alınmadan kaydedilebilir ve farklı veri setine taşınmaz. Geçersiz olasılık ve yinelenen uzman oyu otomatik kabul edilmez.
- Bağımsız kod incelemesinde açık Critical veya Important bulgu kalmadı.
- Kaynak kodda ücretli araç çağrısı, çıkarım API'si, anahtar erişimi veya bot gizleme davranışı eklenmedi.

## Canlı Evren gözlemi

400 görsellik pilot veri seti incelendi. Kaynak görsel değişiminde URL sabit. Başlık dosya adı ve sırayı sunuyor; görünür DOM öge UUID'si vermiyor. Sol listede 339 sınıf vardı. Yüklemenin başında etiket sayısı geçici olarak sıfır görünebiliyor.

Son görsel sciurus_anomalus_754636267.jpg üzerinde normal Kutu aracıyla bir sincap kutusu çizildi. Normal kayıt sonrası sayfa tamamen yenilendi; aynı görselde Etiketler (1), sincap ve Kutu kaydı kaldı. Ücretli araç kullanılmadı. Bu, sitenin normal çizim/kayıt yolunun manuel doğrulamasıdır; yeni uzantının otomatik akışının canlı doğrulaması değildir.

Sayfada sunulan herkese açık JavaScript dosyaları statik incelendi. Normal kayıt annotations/bulk yolunu kullanıyor; ücretli auto-label, prelabel ve smart-select yolları ayrı. Normal kayıt başarılıysa site temiz duruma dönüyor ve veriyi yeniden okuyor. İstemcide otomatik kayıt bekleme sabiti 8 saniye; kılavuz metniyle farklı. Uzantı bu API'lere doğrudan istek göndermiyor; normal araç ve klavye yolunu kullanıyor.

## Son paket kontrolleri

- npm test: 57/57, npm run check ve git diff --check başarılı.
- npm run build: Chrome MV3 CSP regresyon kontrolü ve üretim derlemesi başarılı.
- İki gerçek Anadolu modeli WASM altında birlikte yüklendi ve sentetik girdide çalıştı; rapor accuracyBenchmark=false.
- 360 piksel Chrome önizlemesinde yatay taşma yok; sınır/hız ve eşleme alanları panel sınırları içinde. Bu HTTP önizlemesi uzantı izinlerini veya kurulu Chrome akışını sınamaz.

## Sınırlar

- Kurulu Chrome uzantısının v0.5 otomatik akışı henüz uçtan uca doğrulanmadı. Chrome uzantı yönetimi tarayıcı aracı tarafından desteklenmiyor; eski sekme bağlantısı Debugger unattached hatası verdi. Yeni sekmeyle Evren tekrar okunabildi; aynı sincap kutusunun kalıcı olduğu görüldü.
- Kayıt yalnız temiz UI durumundan anlaşılır. Uzantı sunucu cevabını, çakışma cevabını veya kredi defterini okumaz. Çizim sayacı artışı tek başına kalıcılık kanıtı değildir.
- Kaynak anahtarı görünür dosya adı+sıraya dayanır. Veri seti sırası değişirse yeniden kontrol gerekir.
- Genel YOLOS kutu tespitçisi tüm canlı türlerini kapsamaz. Sınıflandırıcılar eksik kutuları tamamlamaz. Yüksek uzlaşma puanı ve kutu kalitesi ayrı değerlendirilir.
- Gerçek Anadolu1000/500 WASM çalışması sentetik girdide çalışma testi; doğruluk ölçümü ve Chrome performans testi değildir.
- Fotoğraf ağırlıkları veya kullanıcı anahtarları sürüm paketine eklenmez. Evren görselleri dosyaya yazılmaz.

## Çalıştırma

npm test
npm run check
npm run build
node scripts/check-models.cjs <model-klasörü> <rapor.json>

Son yayın öncesi sözdizimi, derleme, gerçek WASM ve ZIP içerik sonuçları sürüm notunda belirtilir.
