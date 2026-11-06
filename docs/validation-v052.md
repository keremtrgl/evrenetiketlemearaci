# v0.5.2 beta.1 doğrulama

Kerem · 6 Kasım 2026

## Yeniden üretilen hata

v0.5.1 üretim dosyaları, manifestteki Content-Security-Policy HTTP başlığıyla yerelde sunuldu. Tarayıcıda Deneme görseli aç düğmesi görüntüyü açmadı. Konsolda TypeError: Failed to fetch, open içindeki fetch(data:image...) çağrısına işaret etti. Kullanıcının tam kurulumuna ait konsol okunamadı; aynı hata gerçek tarayıcı ve uygulama koduyla yeniden üretildi.

connect-src data: içermiyor. img-src içindeki data: izni fetch için geçerli değil. Politika gevşetilmedi. Fotoğrafın base64 baytları Blob'a doğrudan açılıyor; uygulama ve sınıflandırma motoru doğrudan bitmap, tespitçi RawImage.fromBlob kullanıyor.

## Doğrulama

- Yeni uygulama testi: fetch kapalıyken Evren tuvalinden dönen bellek görseli açılır. Önce başarısız, sonra başarılı.
- Yerel çözücü: baytlar ve MIME korunur; uzak adres, SVG, boş ve bozuk base64 reddedilir.
- Gerçek worker komut gövdesi: ağ okumaları kapalıyken sınıflandırma ve piksel girdili tespit tamamlanır. Ağır model bağımlılıkları bu testte kontrollü karşılıklarla değiştirilir.
- Tam test: 66/66. Sözdizimi ve bağımsız inceleme başarılı; açık Critical veya Important bulgu yok.
- Aynı CSP altında gerçek tarayıcı önizlemesinde 640×480 deneme görseli açıldı. Gerçek Anadolu1000/500 dosyaları birlikte yüklendi; WASM ile iki uzmanın ayrı tahminleri geldi.
- Genel YOLOS Tiny motoru gerçek tarayıcıda yüklenip çıkarımı tamamladı; sentetik dizüstü çiziminde %50 eşikte sıfır kutu döndürdü. Bu bir kalite ölçümü değildir.
- Gerçek modellerde tür adlarının harf büyüklüğü farklı. Her uzmandaki adın aynı tekil mevcut Evren sınıfına açık eşlenmesiyle otomasyon uzlaşması ve ön kontrolü çalışır. İki regresyon önce başarısız, sonra başarılı. Otomatik isim düzeltme veya bulanık eşleme yok.

## Sınırlar

Tarayıcı önizlemesi yerel HTTP / uygulama içi Chromium üzerinde yapıldı. Kullanıcının Chrome bağlantısı bu denemede yoktu. Kurulu Chrome uzantısının Evren içindeki tam çizim/kayıt/navigasyon akışı halen ayrıca doğrulanmalıdır. Normal kayıt UI onayı ve kaynak kimliği sınırlamaları değişmedi. Yerel motor testi doğruluk, hız veya kredi defteri denetimi değildir.

Fotoğraflar dosyaya yazılmaz ve uzaktaki modele gönderilmez. Ücretli Evren araçları ve çıkarım API'si çağrılmaz. Worker ve CSP ağ izinleri genişletilmedi.

Kaynaklar: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/connect-src ve kurulu Transformers RawImage.fromBlob kaynak uygulaması.
