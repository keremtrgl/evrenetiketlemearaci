# Kerem · Yerel Etiketleme

[Kerem](https://github.com/keremtrgl) · [Hugging Face](https://huggingface.co/KeremTT) · v0.4.0 beta

Evren'de açık fotoğrafı yerel modellerle incelemek için Chrome uzantısı. Yan panelde kutu önerileri hazırlayabilir, birden fazla uzman modelin tür tahminlerini karşılaştırabilir ve kontrol ettiğin kutuyu Evren'in normal çizim aracına aktarabilirsin.

**Ücretli Otomatik Etiketle, AI Meta, SAM, Akıllı Seçim ve Evren çıkarım API'si kullanılmaz. API anahtarı gerekmez.** Eski v0.2 otomasyonu bu sürümde bulunmaz.

Bu bir beta sürüm. Gerçek Anadolu1000 ve Anadolu500 ağırlıkları aynı WASM motorunda yüklenip çalıştırıldı. Canlı Chrome'da yan panelden Evren'e çizim ve sunucuya kayıt henüz uçtan uca doğrulanmadı. Önce birkaç görselle dene. Bir milyon görsel için gözetimsiz otomatik kayıt açık değil.

## Fotoğraflarım bilgisayarıma mı inecek?

Hayır, fotoğraflar dosya olarak indirilmez. Evren'in zaten açtığı tuvaldeki pikseller tarayıcı belleğine alınır. Evren yan panelinde yeni fotoğraf alınca önceki fotoğraf bırakılır. Tarayıcıda yalnız etiket taslağı ve aktarım notu kalır.

Evren fotoğrafı gösterirken normal internet trafiği oluşur. Fotoğraf için ikinci bir indirme isteği yapılmaz; tüm veri seti bilgisayara çekilmez. Yerel modeller bilgisayarın işlemcisini ve belleğini kullanır. Tarayıcı kapalıyken işlem sürmez.

Model dosyaları fotoğraflardan ayrı. Genel nesne modeli ilk kullanımda Hugging Face'den indirilir. Kendi uzmanlarının ONNX dosyalarını da bir kez edinip panelde seçmen gerekir. Bunlar fotoğraf arşivi değildir.

## Kurulum

1. [Sürümler](https://github.com/keremtrgl/evrenetiketlemearaci/releases) bölümünden **v0.4.0-beta.1** hazır uzantı ZIP'ini indir.
2. ZIP'e sağ tıkla, **Tümünü ayıkla** de.
3. Chrome adres çubuğuna `chrome://extensions` yaz.
4. **Geliştirici modu**nu aç.
5. **Paketlenmemiş öğe yükle** ile `manifest.json` dosyasının olduğu klasörü seç.
6. Evren'de bir veri setinin etiketleme ekranını aç. Uzantı simgesine tıklayınca yan panel açılır.

Hazır ZIP için Node.js gerekmez. GitHub'ın **Code → Download ZIP** paketi kaynak koddur ve derlenmelidir. Chrome 120 veya üzeri gerekir.

Eski v0.2 otomasyonu yüklüyse önce durdurup devre dışı bırak. Evren sekmesini yenile. Yeni dosyaları yüklemek, eski sayfadaki çalışan kodu kendiliğinden durdurmaz. v0.3 taslakları aynı uzantı kimliği ve tarayıcı profili korunursa okunur; yeni klasörden kurulumda kimlik değişebilir. Önce taslak yedeğini al.

## Evren'deki fotoğrafla çalışma

1. Fotoğrafı Evren tuvaline sığdır. Kenarları kesilmesin.
2. Yan panelde **Evren'den al** düğmesine bas.
3. **Kutu öner** ile genel nesne kutularını üret. Kutuyu elle çizmen de mümkün.
4. Uzmanların yüklüyse kutuyu seçip **Seçili nesneyi uzmanlara sor** düğmesini kullan.
5. Türü ve kutunun sınırlarını kontrol et. Etiketin yanındaki **incelendi** kutusunu işaretle.
6. **Evren'e aktar** bölümünde gerçek Evren sınıfını kendin seç. Örneğin modelin `bird` önerisini doğrudan `karatavuk` kabul etme.
7. **İncelediğim seçili kutuyu çiz** düğmesine bas. Görselde önceden etiket varsa farklı bir nesne eklediğini ayrıca işaretle.
8. Evren'deki sınırı kontrol et, **Ctrl+S** ile kaydet ve sitenin kayıt durumuna bak. Evren'in otomatik kaydı da devrede olabilir.
9. Evren'de sonraki görsele geç. Panelde yeniden **Evren'den al** de.

Aktarım yalnız seçtiğin tek kutuyu normal **Kutu** aracıyla çizer. Mevcut etiketler silinmez, yeni sınıf açılmaz. Panel sunucu kaydının tamamlandığını doğrulamaz; çizim sayacının artması kayıt kanıtı değildir. Site görünümü değişirse, fotoğraf veya çizim katmanı hizalanmıyorsa işlem reddedilir. Tuval güvenilir biçimde ayrılamazsa analiz de başlamaz.

Sonucu belirsiz kalan kutu kendiliğinden tekrar gönderilmez. Aktarım notu geri alma işleminden bağımsız tutulur. Aynı nesneyi yeni kimlikle tekrar çizersen araç bunun eski etikete denk geldiğini anlayamaz; mevcut Evren etiketlerini gözle kontrol et. Taslak verisini silmek aktarım geçmişini de siler.

Poligonlar yerelde çizilip dışa aktarılabilir. **Bu betada Evren'e poligon aktarımı kapalı.**

## Modeller birlikte nasıl çalışıyor?

Genel nesne tespitçisi **Xenova/yolos-tiny** kutuyu bulur. Seçtiğin alandaki uzmanlar kutunun içini sınıflandırır. Anadolu fotoğrafında kan hücresi modelleri çağrılmaz. Alanı sen seçersin; otomatik alan tanıma yok.

Örneğin Anadolu1000 ve Anadolu500 birlikte yüklüyse aynı kırpılmış nesne ikisine de sorulur. Her modelin ilk beş tahmini ayrı gösterilir. Sınıf indeksleri ve ham puanlar birbirine eklenmez. İki model aynı güçlü sınıfı önerirse uzlaşma gösterilir. Farklı sınıflar, düşük puan veya birbirine yakın ilk iki tahmin incelemeye ayrılır. Tek uzman varsa bağımsız doğrulama olduğu söylenmez.

**Kutu bul → uzmanlarla incele**, yeni bulunan en fazla 20 kutuyu bu sırayla değerlendirir. Eski etiketlere dokunmaz ve Evren'e kendiliğinden çizmez. Model dosyaları tek bir ağırlıkta birleştirilmez, yeni model eğitimi başlatılmaz. Daha fazla modelin aynı hatayı tekrarlaması mümkün; uzlaşma doğruluk garantisi değildir.

Genel model araba, insan, kuş gibi sınıflar içindir. Mikroskop görüntüsündeki hücreyi veya bütün böcek türlerini bulması beklenmez. Bu durumda kutuyu elle çizip uygun uzmanı sorabilirsin. Kendi tespit/segmentasyon ONNX modelini çalıştıran çözücü bu sürümde yok.

## Uzman modeli eklemek

Hazırlanmış model klasörün varsa **Hazır model paketini aç** ile aynı modelin `.onnx`, `.labels.json` ve `.info.json` dosyalarını birlikte seç. Birden fazla modelin dosyaları birlikte seçilebilir. Fotoğraf seçmiyorsun; ağırlık ve sınıf dosyası seçiyorsun. Dosyalar çıkarım sunucusuna gönderilmez.

Tek model için **Tek ONNX uzman ekle** bölümünden ONNX ve sıralı sınıf listesi seç, giriş boyutunu gir, **Uzman ekle** de. Model o anda seçili çalışma alanına eklenir. Listeden devre dışı bırakabilir veya kaldırabilirsin.

En fazla 3 sınıflandırıcı ve toplam 300 MB ağırlık kabul edilir. Bu, çalışma belleği sınırı değildir; çalışma sırasında daha fazla RAM kullanılır. Uzman dosyaları kalıcı depoya yazılmaz. Paneli kapatınca veya **Durdur** ile motoru kapatınca yeniden seçmen gerekir.

Desteklenen biçim NCHW RGB float32 giriş, tek `[1, sınıf sayısı]` float32 sınıflandırma çıktısıdır. Ön işleme merkez kare kırpma, kareye ölçekleme ve RGB / 255. Özel eğitim dönüşümleri veya kapsam dışı görüntüler hatalı tahmin üretebilir. `.pt`, tespit ve segmentasyon çıktıları bu yükleyicide çalışmaz.

Sınıf dosyası eğitimdeki **indeks sırasıyla** olmalı. Alfabetik sıralama yapma. Anadolu1000 ve Anadolu500 için mevcut ONNX metadata'sından gerçek sıralı listeler hazırlandı; ikisinin giriş boyutu 384. Ağırlıklar kaynak kod reposuna konulmadı ve uzantı arka planda bütün modellerini indirmez.

## Dosyalarla çalışma ve dışa aktarım

**Tam atölye** bağlantısı ayrı çalışma sekmesini açar. Burada bilgisayarındaki en fazla 200 görseli açabilirsin. Kutu çizme: **B**, poligon: **P**, seçim: **V**. Poligonu Enter ile bitir, Escape ile iptal et. Kutunun köşelerini sürükleyerek düzelt. Geri al/yinele: Ctrl+Z / Ctrl+Shift+Z.

YOLO kutu, YOLO poligon, COCO ve proje JSON çıktısı verilir. Varsayılan olarak yalnız incelenmiş etiketler dışa aktarılır. Fotoğraflar indirilmez. COCO çıktısındaki boyutlar Evren tuvalinden alınmışsa önizleme çözünürlüğüdür; özgün görsele içe aktarmadan önce boyutları doğrula. Kutu, segmentasyon maskesi olarak gösterilmez.

**Taslak yedeği indir** yalnız etiket metadatasını yedekler. Evren modunda eski fotoğraf bellekten bırakıldığı için geçmiş görselleri topluca dışa aktarmak istiyorsan bu yedeği kullan.

## Kredi konusunda

Yerel analiz Evren çıkarım API'sini kullanmaz. 15 milyon tokenlık LLM kotası da bu akışta kullanılmaz. Normal çizim aktarımı Evren'in kendi arayüzündeki Kutu aracını kullanır; ücretli otomatik etiketleme düğmesine basmaz. Evren kılavuzu normal etiket kaydını katkı işlemi olarak anlatır. Canlı sunucu kaydı ve kredi hareketleri bu betanın testinde doğrulanmadı; büyük toplu işlem açılmadı.

Uzantı diğer sekmelerde başlattığın ücretli işleri engellemez. API anahtarı, çerez veya gizli sayfa durumu okunmaz. Yerel motorun ağ erişimi kendi dosyaları ve Hugging Face model indirmeleriyle sınırlıdır; görsel gönderme isteği yapılmaz.

## Geliştirme

Node.js 20 veya üzeri:

```sh
npm ci
npm test
npm run check
npm run build
```

Kurulum klasörü `release/` altında oluşur. Test sınırları [v0.4 doğrulama notunda](docs/validation-v040.md).

Kendi Ultralytics sınıflandırma ONNX dosyasından paket hazırlamak için Python ve `onnx` paketi gerekir:

```sh
python -m pip install onnx
python scripts/prepare-model.py best.onnx models --name anadolu1000
```

Bu komut eğitim veya uzaktaki dönüştürme işi başlatmaz. Dosyanın metadata'sındaki isimleri okur ve yanına sınıf listesini yazar.

Kaynaklar: [Chrome yan paneli](https://developer.chrome.com/docs/extensions/reference/api/sidePanel), [Ultralytics sınıflandırma](https://docs.ultralytics.com/tasks/classify), [Evren kılavuzu](https://evren.ssyz.org.tr/guide). Bağımlılık lisansları `THIRD_PARTY_NOTICES.txt` içinde. Evren'in resmi uzantısı değildir.

Geliştirici: [Kerem](https://github.com/keremtrgl) · [KeremTT](https://huggingface.co/KeremTT). Sorunlar için [Issues](https://github.com/keremtrgl/evrenetiketlemearaci/issues).
