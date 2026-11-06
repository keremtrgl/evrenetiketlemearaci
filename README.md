# Evren Etiketleme Aracı

[Kerem](https://github.com/keremtrgl) · [Hugging Face](https://huggingface.co/KeremTT) · v0.5.0 beta.1

Evren'de açık fotoğrafı bilgisayarındaki modellerle inceleyen Chrome uzantısı. Kaç görsel üzerinde çalışacağını ve en yüksek hızı seçebilirsin. Yeterli uzman uzlaşması ve sınıf eşlemesi varsa kutuları Evren'in normal çizim aracıyla çizer, normal kayıt adımını bekler ve sonraki görsele geçer. Emin olamadıklarını incelemeye ayırır.

**Ücretli Otomatik Etiketle, AI Meta, SAM, Akıllı Seçim veya Evren çıkarım API'sini kullanmaz. API anahtarı istemez.** Günlük LLM token hakkın bu akışta kullanılmaz.

Bu sürüm beta. Uygulama testlerinde iki görsel için çizim, kayıt ve geçiş sırası doğrulandı. Evren'de normal Kutu aracıyla çizilen bir kutunun sayfa yenilendikten sonra kaldığı da kontrol edildi. **Yeni uzantının kurulu Chrome'daki otomatik akışı henüz uçtan uca doğrulanmadı.** Önce küçük bir deneme yap. Test ayrıntıları [doğrulama notunda](docs/validation-v050.md).

## Kurulum

1. [Sürümler](https://github.com/keremtrgl/evrenetiketlemearaci/releases) bölümünden **v0.5.0-beta.1** hazır ZIP paketini indir.
2. ZIP'e sağ tıkla ve **Tümünü ayıkla** de. İçinde `manifest.json` bulunan klasörü bul.
3. Chrome adres çubuğuna `chrome://extensions` yaz. Sağ üstten **Geliştirici modu**nu aç.
4. **Paketlenmemiş öğe yükle** düğmesine basıp bu klasörü seç.
5. Evren'deki etiketleme sekmesini yenile. Kaydedilmemiş bir çalışman varsa önce kaydet.
6. O sekmedeyken uzantı simgesine tıkla. Yan panel açılır; üstte **Evren bağlı** yazmalı.

Hazır ZIP için Node.js gerekmez. GitHub'ın **Code → Download ZIP** düğmesi kaynak kodu indirir; önce derlenmelidir. Chrome 120 veya üzeri gerekir.

### Eski sürüm yüklüyse

Önce eski çalışmayı durdur. Taslakların varsa **Taslak yedeği indir** ile yedekle. Aynı klasörde güncelleme yapıp uzantı kartındaki yenile simgesine basmak uzantı kimliğini korur. Eski sürümü kaldırıp başka klasörden kurarsan yerel kayıtlarına erişim kaybolabilir. Aynı anda iki sürümü çalıştırma; Evren sekmesini de yenile.

v0.4.0'daki `worker-src blob:` yükleme hatası giderildi. “Receiving end does not exist” hatasında yeni sürüm açık sayfaya yalnız okuma bağlantısını bir kez kurmayı dener. Düzelmezse Evren sekmesini yenileyip paneldeki **Yenile** düğmesini kullan. Çizim ve kayıt komutları bağlantı hatasında otomatik tekrarlanmaz.

## Otomatik çalıştırma

1. Evren'de doğru veri setinin etiketleme ekranını aç. Sol ve sağ paneller açık olsun.
2. Uzantıda doğru **Çalışma alanı**nı seç. Aynı alanda en az iki farklı uzman model yükle. Anadolu için hazırlanan Anadolu1000 ve Anadolu500 paketlerini birlikte kullanabilirsin.
3. **Evren'e aktar** bölümünde **Modeldeki tür adı** alanına modelin gerçek sınıf adını yaz veya listeden seç. Örneğin `Turdus_merula` için Evren'deki `karatavuk` sınıfını seçip **Tür → sınıf eşlemesini kaydet** de. Kullanacağın diğer türleri de eşle. Fotoğrafı almadan da eşleme kaydedebilirsin.
4. **Görsel sınırı**na küçük bir sayı gir. Örneğin 3. **En fazla görsel/dakika** değerini bilgisayarına göre seç; başlangıç için 2–5 yeterli.
5. **Çizimi başlat** düğmesine bas. Evren sekmesini açık tut; görseli, veri setini veya sekmeyi elle değiştirme.
6. Sayaçları ve **İnceleme kuyruğu**nu takip et. Bitince çizilen kutuların türünü ve sınırlarını Evren'de kontrol et.

Sınır 1–1000 görsel, hız 1–60 görsel/dakika arasında ayarlanabilir. **Sınır ziyaret edilen görselleri sayar:** tamamlananlar, mevcut etiketi olduğu için atlananlar ve incelemeye ayrılanlar buna dahildir. 20 sınırı, mutlaka 20 yeni etiket üretileceği anlamına gelmez. Hız bir üst sınırdır; model yavaşsa bu hıza yetişmesi beklenmez. Son görsel işlendiğinde ayrıca ilerleme yapılmaz.

**Durdur**, yeni iş ve sonraki görsele geçişi keser. Siteye çoktan gönderilmiş bir çizimi geri alamaz. Model hesabı sürüyorsa motor kapatılır; uzmanları yeniden yüklemen gerekir. Çizim veya kayıt sonucu belirsizse çalışma durur. Aynı kutuyu yeniden göndermek yerine Evren'deki sonucu kontrol et.

### Ne zaman kendisi çizer?

Görselde mevcut Evren etiketi olmamalı. Genel tespitçi en fazla 20 kutu bulmalı. Her kutu için etkin uzmanların aynı türü önermesi, her birinin ilk tahmin puanının en az %90 olması ve ikinci tahminiyle arasında en az 20 yüzde puanı bulunması gerekir. Tür mevcut bir Evren sınıfına tekil eşlenmiş olmalı. Tek bir kutu bile bu koşulları karşılamazsa görsel otomatik çizilmez; incelemeye ayrılır.

Bu puanlar doğruluk oranı değildir. Benzer verilerle eğitilmiş modeller aynı hatayı yapabilir. Uzman uzlaşması kutunun sınırlarını da doğrulamaz. Sonuçları incele. Yeni sınıf açılmaz, eski etiket silinmez. `bird` tahmini kendiliğinden `karatavuk` yapılmaz. Eşlemeler veri setine özeldir.

Kayıt, Evren'in **Kaydet & Devam / Kaydediliyor / Sonraki** durumlarından izlenir. Bu bir **arayüz onayıdır**; doğrudan sunucu cevabını veya kredi hareketlerini okumaz. Belirsiz kayıtta tekrar deneme ve sonraki görsele geçme yapılmaz.

## Elle kontrol ederek çalışmak

**Evren'den al** ile açık tuvali belleğe al. **Kutu öner** ile önerileri üret veya kutuyu elle çiz. Seçili nesneyi uzmanlara sor, sınırı ve türü düzelt. İncelendi kutusunu işaretle, doğru Evren sınıfını seç ve **Seçili kutuyu çiz** düğmesine bas. Sonra **Çizilenleri Evren'de kaydet** ile normal kayıt adımını çalıştır.

Önceden etiketli görsele farklı bir nesne eklemek için bunu ayrıca işaretlemen gerekir. Aktarım günlüğü geri al/yinele işlemlerinden bağımsızdır. Aynı nesneyi yeni bir kutu olarak tekrar çizersen araç bunun eski etiketle aynı nesne olduğunu anlayamaz.

Yerel poligon çizimi ve dışa aktarım var. **Evren'e poligon aktarımı ve otomatik segmentasyon yok.**

## Modeller neyi yapabiliyor?

Genel tespitçi **Xenova/yolos-tiny**, insan, araba, kuş gibi genel sınıflarda kutu üretir. Anadolu1000 ve Anadolu500 gibi uzmanlar bu kutunun içindeki türü sınıflandırır. Ağırlıklar birleştirilmez; aynı nesne ayrı modellere sorulur. İlk beş tahmin ayrı gösterilir. Farklı sınıfların aynı indeksini aynı tür saymaz; ham puanları toplamaz.

**Genel tespitçi bütün canlıları bulamaz.** Salyangoz, örümcek, böcek veya mikroskop görüntüsü için uygun kutu üretmeyebilir. İki sınıflandırıcı yüklemek bu eksikliği kapatmaz. Böyle bir görsel incelemeye ayrılır; kutuyu elle çizip uzmanlara sorabilirsin. Kendi tespit veya segmentasyon ONNX modelini yükleyen çözücü bu sürümde yok.

### Uzman modeli eklemek

**Hazır model paketini aç** ile aynı modelin `.onnx`, `.labels.json` ve `.info.json` dosyalarını birlikte seç. Birkaç modelin paketini aynı anda seçebilirsin. Fotoğraf seçmiyorsun; model ağırlığı ve sınıf sırası seçiyorsun.

Tek dosya yüklemek için **Tek ONNX uzman ekle** bölümünden ONNX ve sınıf listesini seç, doğru giriş boyutunu girip **Uzman ekle** de. Model seçili çalışma alanına eklenir. Listeden devre dışı bırakabilir veya kaldırabilirsin.

En fazla 3 sınıflandırıcı ve toplam 300 MB ağırlık kabul edilir. Çalışma sırasında daha fazla RAM kullanılır. Dosyalar bu oturumun belleğinde kalır; panel veya motor kapanınca yeniden seçilir. `.pt` dosyası çalışmaz.

Desteklenen biçim: NCHW RGB float32 giriş ve tek `[1, sınıf sayısı]` float32 çıktı. Ön işleme merkez kare kırpma, ölçekleme ve RGB / 255. Eğitim dönüşümleri farklıysa tahmin hatalı olabilir. Sınıf dosyasını eğitimdeki indeks sırasıyla ver; alfabetik sıralama yapma. Hazırlanmış Anadolu1000 ve Anadolu500 paketlerinin giriş boyutu 384.

## Fotoğraflar ve kredi

Fotoğraflar dosya olarak indirilmez. Evren'in zaten açtığı tuval okunur; görsel modele veya başka sunucuya gönderilmez. Evren modunda yeni fotoğrafa geçince önceki fotoğraf bellekten bırakılır. Kalıcı kayıtta yalnız etiket koordinatları, sınıf eşlemeleri ve aktarım notları bulunur.

Evren'in görseli göstermesi normal internet trafiği oluşturur. Genel tespit modeli ilk kullanımda Hugging Face'den indirilir. Kendi ONNX ağırlıklarını da bilgisayarından seçersin. Bunlar fotoğraf arşivinin indirilmesi değildir. Tarayıcı kapalıyken çalışma sürmez.

Yerel motorda Evren çıkarım isteği ve LLM çağrısı bulunmaz. Siteye aktarım normal **Kutu** ve normal kayıt arayüzünü kullanır. Kredi bakiyesi okunmadığı için sunucunun gelecekteki ücret politikasına ilişkin bakiye garantisi verilmez. Diğer sekmelerde başlattığın ücretli işleri engellemez. API anahtarı, çerez veya gizli React durumu okunmaz. Bot tespitini gizleyen davranış bulunmaz.

## Taslak ve dışa aktarım

**Tam atölye** ayrı sekmede yerel dosyalarla çalışır; en fazla 200 görsel açılabilir. Kutu: **B**, poligon: **P**, seçim: **V**. Poligonu Enter ile bitir, Escape ile iptal et. Geri al/yinele: Ctrl+Z / Ctrl+Shift+Z.

YOLO kutu, YOLO poligon, COCO ve proje JSON çıktısı alınır. Varsayılan yalnız incelenmiş etiketlerdir. Evren tuvalinden alınan boyutlar önizleme boyutudur; özgün dosyaya içe aktarırken doğrula. Kutu segmentasyon maskesi değildir.

**Taslak yedeği indir**, geçmiş etiket metadatasını da alır; fotoğraf içermez. **Tanı raporu** yalnız teknik sayımları içerir; fotoğraf, API anahtarı, dosya adı veya veri seti adresi içermez.

## Kaynak koddan kurmak

Node.js 20 veya üzeri:

```sh
npm ci
npm test
npm run check
npm run build
```

Chrome'a yüklenecek klasör `release/` altında oluşur. Model ağırlıkları repoya ve hazır uzantı ZIP'ine eklenmez.

Ultralytics sınıflandırma ONNX dosyasının metadata'sından sınıf paketi hazırlamak için:

```sh
python -m pip install onnx
python scripts/prepare-model.py best.onnx models --name anadolu1000
```

Bu komut eğitim başlatmaz; dosyanın içindeki sıralı isimleri okuyup yanına sınıf listesini yazar.

[Chrome yan paneli](https://developer.chrome.com/docs/extensions/reference/api/sidePanel) · [Ultralytics sınıflandırma](https://docs.ultralytics.com/tasks/classify) · [Evren kılavuzu](https://evren.ssyz.org.tr/guide)

Evren'in resmi uzantısı değildir. Bağımlılık lisansları `THIRD_PARTY_NOTICES.txt` içinde. Geliştirici: [Kerem](https://github.com/keremtrgl) · [KeremTT](https://huggingface.co/KeremTT). Sorun bildirmek için [Issues](https://github.com/keremtrgl/evrenetiketlemearaci/issues).
