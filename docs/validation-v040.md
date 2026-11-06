# v0.4.0 beta doğrulaması

6 Kasım 2026 · Kerem

## Yapılan kontroller

Son komutlar: `npm test` 30/30 geçti; `npm run check`, `npm run build` ve `git diff --check` başarılı. Bağımsız inceleme bu belgede tanımlanan beta kapsamını onayladı; canlı sitede doğrulama yerine geçmez.

- Model alanı ve etkin uzman seçimi, farklı indekslerde aynı sınıf, farklı sınıflarda aynı indeks, düşük puan ve uyuşmazlık testleri.
- Gerçek Anadolu1000 ve Anadolu500 ONNX dosyaları: metadata'dan 1000 ve 500 sınıf, 384 giriş boyutu; SHA-256 doğrulaması.
- İki gerçek ağırlık aynı anda ONNX Runtime Web WASM oturumlarında yüklendi. Sentetik RGB deseni iki oturumdan da float32 sınıflandırma sonucu üretti. Ortak karar uyuşmazlık oldu ve tek türe zorlanmadı. Bu çalışma Node.js altında yapıldı; Chrome testi veya doğruluk kıyaslaması değildir.
- Editörün gerçek uygulama koduyla jsdom testleri: bozuk görselde doğru hedefi koruma, undo/redo sonrasında güncel etikete uygulama, dosya okuma/kırpma sırasında iptal, Evren modunda tek fotoğraf sınırı, kalıcı kayıtta fotoğraf bulunmaması, aktarım günlüğünün undo/redo ile silinmemesi.
- Site köprüsünün jsdom testleri: normal Kutu aracına tek aktarım, ücretli düğmelere basmama, bilinmeyen sınıfı reddetme, incelenmemiş etiketi reddetme, değişmiş fotoğrafı reddetme, kaymış çizim katmanını reddetme ve belirsiz aktarımı tekrarlamama.
- Yerel motor ağ kuralları: Evren çıkarım uçları ve dışarı görsel gönderme engellenir.
- Bağımsız kod incelemesinin bulduğu iki hata önce testle yeniden üretildi: iptal sonrası görünmeyen model yüklenmesi ve fotoğraf/çizim katmanı hizası. Düzeltme sonrası ilgili testler geçti.

## Canlı tarayıcı sınırı

Chrome'da yeni atölye arayüzü açıldı. Gerçek ağırlıkların dosya seçimine geçildiğinde tarayıcı uzantısının dosya URL erişimi olmadığı görüldü. Normal Windows dosya seçicisine geçişte bilgisayar kullanımı, mevcut tarayıcı adresi güvenilir biçimde doğrulanamadığı için durduruldu. Güvenlik ayarı değiştirilmedi, kısıtlama aşılmadı.

Bu nedenle yeni yan panelin yüklü Chrome uzantısında açılması, canlı Evren tuvalinden fotoğraf alma, çizim olaylarının Evren tarafından kabulü, doğru sınıfa çizim, Ctrl+S sonrasında sunucu kalıcılığı ve kredi hareketleri uçtan uca doğrulanmış sayılmaz. Otomatik toplu kayıt açılmadı. Tek kutu aktarımı açıkça deneysel ve kullanıcı komutuna bağlıdır; poligon aktarımı kapalıdır.

Site köprüsü yalnız arayüz sayacını kontrol eder. Bu kontrol sunucuya kayıt veya geometrinin doğruluğu için kanıt değildir. Kullanıcı çizimi Evren'de inceleyip normal şekilde kaydetmelidir.

## Henüz ölçülmeyenler

Gerçek örneklerde sınıf bazlı doğruluk, yanlış pozitifler, kapsam dışı görüntüler, çok küçük nesneler, hız ve uzun çalışma belleği. İki Anadolu modelinin aynı eğitim ailesinden gelmesi hatalarını bağımsız yapmaz. Uzlaşmanın kalite artışı sağladığı iddia edilmez.

Özel ağırlıklar kaynak kodda veya uzantı ZIP'inde yoktur. Kullanıcı için hazırlanan yerel model klasörü ayrıca tutulur. Fotoğraf indirilmedi, model eğitimi ve ücretli otomatik etiketleme başlatılmadı.
