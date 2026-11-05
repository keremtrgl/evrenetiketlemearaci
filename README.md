# Kerem · Yerel Etiketleme

[GitHub](https://github.com/keremtrgl) · [Hugging Face](https://huggingface.co/KeremTT) · v0.3.0

Görselleri kendi bilgisayarında analiz edip kutu ve poligon etiketleri hazırlayabileceğin Chrome uzantısı. Model tarayıcıda çalışır. Görseller çıkarım için bir sunucuya gönderilmez.

**Bu sürüm Evren’in otomatik etiketleme düğmesine basmaz, SAM veya LLM API çağrısı yapmaz. API anahtarı istemez.** Önceki sürümdeki site otomasyonu kaldırıldı; otomatik etiketleme işleminin kredi tükettiği görüldü.

## Neler yapabiliyor?

- Yerel modelle genel nesneler için kutu önerileri üretir.
- Kutu çizmeyi, taşımayı, iki köşesinden boyutlandırmayı ve poligon çizmeyi destekler.
- Etiket sınıfını değiştirebilir, geri alabilir ve incelendi olarak işaretleyebilirsin.
- Aynı sekmede en fazla 200 görsellik sırayı tek tek analiz edebilir. Mevcut etiketi olanları toplu analizde korur.
- Etiket taslaklarını tarayıcıda saklar. Fotoğrafları saklamaz; aynı dosyayı yeniden açınca taslağı geri getirir.
- YOLO kutu, YOLO poligon, COCO JSON ve proje JSON çıktısı verir.
- Uygun YOLO sınıflandırma ONNX modelini yükleyip tür önerisi alabilirsin.

Yerel model, **Xenova/yolos-tiny**. Araba, insan, kuş, kedi gibi genel sınıfları tanır. Bütün canlı türlerini tanıyan veya segmentasyon maskesi üreten bir model değildir. Model puanı da doğruluk garantisi sayılmaz.

## Kurulum

1. [Releases](https://github.com/keremtrgl/evrenetiketlemearaci/releases) bölümünden **evren-etiketleme-araci-v0.3.0.zip** paketini indir.
2. ZIP’e sağ tıkla, **Tümünü ayıkla** de.
3. Chrome adres çubuğuna `chrome://extensions` yaz.
4. **Geliştirici modu**nu aç.
5. **Paketlenmemiş öğe yükle** düğmesinden `manifest.json` dosyasının bulunduğu klasörü seç.
6. Araç çubuğundaki uzantılar menüsünden **Kerem · Yerel Etiketleme** simgesine tıkla. Atölye ayrı sekmede açılır.

Hazır ZIP’i kullanıyorsan Node.js kurmana veya terminal açmana gerek yok. GitHub’ın **Code → Download ZIP** paketi ise kaynak koddur; çalıştırmadan önce aşağıdaki geliştirme adımlarıyla derlenmelidir.

### Eski sürümden geçiyorsan

Önce eski otomasyonu durdur. Yeni paketi ayrı bir klasöre çıkar, eski uzantıyı devre dışı bırakıp yenisini yükle. Evren sekmesini de yenile; eski sayfada yüklenmiş otomasyon kodu yalnız dosyaları değiştirince durmaz.

v0.2.x panelindeki çalışma notları bu atölyeye taşınmaz. Evren’de kaydedilmiş etiketler değiştirilmez.

## İlk kullanım

**Görsel aç** ile bilgisayarındaki görseli seç veya sayfaya sürükle. **Görseli analiz et** düğmesine bas. İlk kullanımda model dosyaları Hugging Face’den indirilir ve tarayıcı önbelleğine alınır. İnternet bağlantısı ve yerel işlemci kullanılır; Evren kredisi kullanılmaz.

Kutular çıkınca sınırları ve sınıf adlarını kontrol et. İşaretlediğin etiketleri **incelendi** kutusuyla onaylayabilirsin. Varsayılan dışa aktarım yalnız incelenmiş etiketleri içerir.

**Sırayı analiz et** açık görselleri sırayla işler. Mevcut etiketi olan görselleri atlar. **Durdur** yerel motoru kapatır; yeni işlem başlatılmaz. Yerel ONNX modelini de bellekten çıkardığı için tekrar tür önerisi almadan önce yeniden yüklemek gerekir.

## Evren’deki görseli almak

1. Evren’in etiketleme ekranını aç.
2. Fotoğrafın tamamını, kenarları kesilmeden tuvale sığdır.
3. O sekmedeyken uzantı simgesine tıkla.
4. Açılan atölyede **Evren’den al** düğmesini kullan.

Bu işlem yalnız görünür görüntü tuvalini belleğe okur. Tuval tarayıcı tarafından korunuyorsa, kenarları kesilmişse veya fotoğraf katmanı güvenilir biçimde ayrılamıyorsa durur. Görseli dosyadan açabilirsin.

Tuvalden alınan görüntü, orijinal dosyanın önizlemesidir. **COCO çıktısındaki piksel boyutları önizleme boyutudur.** Özgün görsele içe aktarmadan önce boyutları ve çerçeveyi doğrula. Bu sürüm Evren’e otomatik etiket yazmaz; kayıt yolunun ücret davranışı henüz doğrulanmadı.

## Çizim ve düzenleme

| İşlem | Kullanım |
| --- | --- |
| Seç / taşı | V. Etiketi seç, sürükleyerek taşı. |
| Kutu | B. Basılı tutup sürükle. |
| Boyutlandır | Seçili kutunun sol üst veya sağ alt köşesini sürükle. |
| Poligon | P. Köşeleri tıkla, Enter ile bitir. |
| Köşe düzelt | Seçili poligonun köşesini sürükle. |
| Son köşeyi kaldır | Poligon çizerken Backspace. |
| Çizimi iptal et | Escape. |
| Sınıf değiştir | Etiketi seç, sağdaki adı düzenle, Uygula’ya bas. |
| Sil | Seçili etiket için Delete veya Seçileni sil. |
| Geri al / yinele | Ctrl+Z / Ctrl+Shift+Z veya araç çubuğu. |

Otomatik maske, OBB ve iskelet çıkarımı bu sürümde yok. Kutuyu poligonmuş gibi dışa aktarıp segmentasyon etiketi üretmez.

## Anadolu modelini kullanmak

Evren’deki **anadolu1000-yolo11m-cls** ve **anadolu500-yolo11m-cls** sınıflandırma modelleri. Fotoğraf veya seçili nesne için tür önerisinde kullanılabilirler; nesnenin konumunu kendileri üretmezler.

Elinde bu modellerden birinin **ONNX dosyası** varsa:

1. Sağdaki **Anadolu / kendi modelin** bölümünü aç.
2. ONNX dosyasını seç.
3. Eğitimde kullanılan sınıf indeks sırasıyla JSON veya satır başına bir isim içeren TXT dosyasını seç. Alfabetik sıralama yapma.
4. Giriş boyutunu ayarla. İncelenen Anadolu1000 kartında **384** yazıyor. Kendi dışa aktarımının giriş boyutu belirleyicidir.
5. **Modeli yükle** düğmesine bas.
6. İstersen bir kutu seç; ardından **Tür öner** düğmesine bas. Seçili kutu yoksa tüm görsel değerlendirilir.

İlk beş öneriden birine tıklarsan seçili etiketin sınıfı değişir. Etiket seçili değilse öneri yeni çizim sınıfı olur. Yanlış tür atamamak için sonucu incele.

Örnek sınıf dosyası:

```json
["Turdus_merula", "Erithacus_rubecula"]
```

Bu yalnız biçim örneğidir; Anadolu modelinin gerçek sınıf listesi değildir. Liste ile çıktı sayısı uyuşmazsa motor reddeder. Ön işleme NCHW RGB, merkez kare kırpma ve 0–1 ölçeklemedir. Eğitimde özel dönüşüm kullandıysan uyarlanmalıdır. `.pt` dosyası tarayıcıda çalışmaz.

Model dosyanın yoksa Evren’deki dışa aktarımın ücretini doğrulamadan dönüştürme başlatma. Uzantı senin adına model indirme veya dönüştürme işlemi başlatmaz. Özel ağırlıklar bu repoda bulunmaz.

## Dışa aktarım ve kayıt

**Proje JSON** taslakların sınıf, geometri, kaynak ve inceleme bilgisini korur. **COCO** bütün açık görselleri kapsar. YOLO çıktısı mevcut görselin etiket dosyasını ve `classes.txt` listesini indirir. Görsellerin kendisi indirilmez.

Model önerileri önce incelenmemiştir. Segmentasyon YOLO çıktısında yalnız gerçek poligonlar kabul edilir. Kutuların segmentasyon maskesi olduğu iddia edilmez.

Taslaklar uzantının kendi IndexedDB deposundadır. Aynı görsel dosyası SHA-256 özetiyle bulunur. Tarayıcı profilini veya uzantı verisini silersen taslaklar silinebilir; **Taslak yedeği indir** ile etiket yedeği alabilirsin. Fotoğrafları tekrar açmak için kaynak dosyalar gerekir. Model çalışırken sekmeyi kapatırsan işlem sürmez.

## Kredi ve veri erişimi

- Evren otomatik etiketleme, akıllı seçim, LLM ve görüntü çıkarım API’si çağrılmaz.
- Evren sayfasında etiket eklenmez, silinmez veya kaydedilmez.
- API anahtarı, çerez veya oturum bilgisi okunmaz.
- Model indirme için yalnız Hugging Face alanlarına GET isteği yapılır. Görsel yükleme isteği yapılmaz.
- ONNX dosyan ve fotoğrafların kendi tarayıcında işlenir.
- Model indirme ve çıkarım bilgisayarının internetini, işlemcisini ve belleğini kullanır.

Bu açıklama uzantının yaptığı işlemler içindir; başka sekmede yaptığın ücretli Evren işlemlerini engellemez.

## Geliştirme

Node.js 20 veya üzeriyle repo klasöründe:

```sh
npm ci
npm test
npm run check
npm run build
```

Kurulum klasörü `release/` altında oluşur. Üçüncü taraf runtime dosyaları ve derlenmiş dosyalar bu adımda eklenir. Hazır paketi paylaşırken bu klasörü ZIP’e koy.

Kaynaklar: [Transformers.js](https://huggingface.co/docs/transformers.js), [YOLOS Tiny](https://huggingface.co/Xenova/yolos-tiny), [Ultralytics sınıflandırma dönüşümleri](https://docs.ultralytics.com/reference/data/augment), [Evren kılavuzu](https://evren.ssyz.org.tr/guide). Bağımlılık lisansları hazır paketteki `THIRD_PARTY_NOTICES.txt` dosyasında bulunur.

Sorun bildirmek için [Issues](https://github.com/keremtrgl/evrenetiketlemearaci/issues) bölümünü kullan. Özel görsel, model ağırlığı veya hesap bilgisi paylaşmadan hata mesajını ve sürümü yaz.

Geliştirici: [Kerem](https://github.com/keremtrgl) · [KeremTT](https://huggingface.co/KeremTT). Evren’in resmi uzantısı değildir.
