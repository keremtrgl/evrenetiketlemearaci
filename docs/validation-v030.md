# v0.3.0 doğrulama kaydı

6 Kasım 2026 · Kerem

## Çalıştırılan kontroller

- `npm test`: 17 test geçti. Geometri, YOLO/COCO dönüşümü, sınıf sırası, ağ kısıtları, salt okunur site köprüsü ve iki editör regresyonu kapsanıyor.
- `npm run check`: kaynak sözdizimi kontrolleri geçti.
- `npm run build`: hazır klasör üretildi; model runtime dosyaları pakete alındı.
- Chrome’da localhost üzerinden gerçek Transformers.js/ONNX WASM çıkarımı çalıştırıldı. Sentetik deneme görselinde 0 kutu döndü. Bu, motorun çalıştığını gösterir; model doğruluğu veya gerçek veri seti başarısı ölçümü değildir.
- Aynı çalışma alanında kutu çizme, geri al, yinele ve incelendi işaretleme denendi.
- Sayfa yenilenip aynı deneme görseli açıldığında bir etiket ve incelendi durumu geri geldi.
- COCO dosyası tarayıcıdan indirildi ve dosya içeriği okundu: 640×480 görsel, bir anotasyon, reviewed=true.
- Bağımsız kod incelemesinde bulunan yanlış görsel hedefi ve eski öneri referansı hataları önce başarısız testle üretildi, sonra düzeltildi.

## Henüz doğrulanmayanlar

- Kullanıcının gerçek Anadolu ONNX ağırlıklarıyla çıkarım. Yükleyici ve sınıf eşleme yolu hazır; model dosyası olmadan gerçek entegrasyon tamamlandı denmez.
- Kurulu yeni uzantının gerçek Evren fotoğraf katmanını başarıyla ayırması. Köprü yalnız okunabilir, tamamı görünen opak fotoğraf katmanını kabul eder; aksi durumda dosyadan açma gerekir.
- Büyük ve gerçek veri üzerinde nesne bulma başarısı, hız ve bellek ölçümü. 200 görsel sınırı destek sınırıdır; 200 gerçek görsellik saha testi yapıldı anlamına gelmez.
- Gerçek segmentasyon, OBB ve poz üretimi. Bu özellikler üründe yoktur.
- Evren’e anotasyon kaydı veya içe aktarım ücretinin sıfır olması. Bu nedenle bu sürüm siteye yazım yapmaz.

## Kredi sınırı

Yeni sürümün akışında Evren çıkarım API çağrısı veya ücretli düğme otomasyonu yoktur. Yerel model dosyası indirilir; görseller dış çıkarım hizmetine gönderilmez. Başka sekmedeki işlemlerin veya açık kalmış eski v0.2.x otomasyonunun harcamasını engellediği iddia edilmez. Eski sürüm devre dışı bırakılıp Evren sekmesi yenilenmelidir.

## Değişen kapsam

Eski ücretli otomasyonun 22 testi, kaldırılan akışa aitti. v0.3.0 aynı akışın devamı değildir; yeni yerel atölyedir. Eski test sayısı yeni sürümün test sayısına eklenmedi. Kredi kullanmama koşulu nedeniyle otomatik site kaydı yerine yerel düzenleme ve etiket dışa aktarımı seçildi.
