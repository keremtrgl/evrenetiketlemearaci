# Evren Etiketleme Aracı

[Kerem](https://github.com/keremtrgl) · [Hugging Face](https://huggingface.co/KeremTT) · Sürüm 0.2.1

Evren'de görselleri tek tek açıp aynı düğmelere basmak yerine, etiketleme adımlarını sırayla çalıştıran bir Chrome uzantısı.

Araç, sitenin **AI Meta Oluştur → Otomatik Etiketle → Onayla ve Etiketle → Sonraki** akışını kullanır. Mevcut AI Meta varsa tekrar oluşturmaz. Görselleri bilgisayarınıza indirmez ve ayrı bir API anahtarı istemez.

Bu sürüm geliştirme aşamasında. Önce birkaç görselle deneyin ve çıkan etiketlere bakın. Uzantı, modelin çizdiği sınırların veya seçtiği sınıfların doğru olduğunu kendi başına denetlemiyor.

## Kurulum

Bilgisayarınızda Google Chrome bulunması yeterli. Uzantıyı kullanmak için Node.js kurmanız veya terminal açmanız gerekmiyor.

1. Bu sayfanın üstündeki yeşil **Code** düğmesine, ardından **Download ZIP** seçeneğine basın.
2. İnen ZIP dosyasına sağ tıklayıp **Tümünü ayıkla** seçeneğini kullanın.
3. Çıkan klasörü açın. İçinde `manifest.json`, `content.js` ve `flow.js` dosyalarını görmelisiniz. Bir klasör daha varsa onun içine girin.
4. Chrome adres çubuğuna `chrome://extensions` yazıp Enter'a basın.
5. Sağ üstteki **Geliştirici modu** anahtarını açın.
6. **Paketlenmemiş öğe yükle** düğmesine basın.
7. Üçüncü adımda bulduğunuz, içinde `manifest.json` olan klasörü seçin. ZIP dosyasını seçmeyin.
8. Uzantı listesinde **Evren Etiketleme Yardımcısı** görünüyorsa kurulum tamamdır.

Yüklediğiniz klasörü sonradan silmeyin veya taşımayın. Chrome uzantıyı o klasörden okur.

## İlk deneme

1. [Evren](https://evren.ssyz.org.tr)'e giriş yapın.
2. Etiketleme yetkinizin olduğu veri setini açıp **Etiketle** ekranına girin.
3. Sayfa kurulumdan önce açıksa yenileyin. Kaydedilmemiş çiziminiz varsa önce kaydedin.
4. Sağ alttaki **Etiketleme yardımcısı** panelinde çalışma sınırını **1**, hızı **1 görsel/dakika** yapın.
5. **Başlat** düğmesine basın. İşlem günlüğünden hangi adımda olduğunu takip edebilirsiniz.
6. Sonraki görsele geçtiğinde önceki görseli açıp sınıfları ve çizimleri kontrol edin.

Yeni sınıf önerileri çıkarsa ve ilgili izin kapalıysa o görsel onaylanmadan ertelenir. Önerilere bakıp veri setinize uygun olup olmadığına karar verebilirsiniz.

## Ayarlar ne işe yarıyor?

| Ayar | Açıklama |
| --- | --- |
| Görsel / dakika | Yeni görselleri işlemeye başlama hızının üst sınırı. 0,1 ile 60 arasında ayarlanabilir. |
| Çalışma sınırı | İlk turda ziyaret edilecek görsel sayısı. Etiketli olduğu için atlananlar dahildir. En fazla 1.000 girilebilir. Tur sonundaki geri dönüş denemeleri bu sayıya eklenir. |
| Yeni sınıf önerilerini de onayla | Sitenin önerdiği yeni sınıfların onaylanmasına izin verir. Başlangıçta kapalıdır. |
| Durdur | Yeni adımların başlamasını engeller. Sunucuda zaten başlamış bir işlem tamamlanabilir. |

Örneğin hızı **2** yaparsanız görsel başlangıçları arasında en az 30 saniye bırakılır. Sitenin bir görseli etiketlemesi 50 saniye sürüyorsa bu ayar onu 30 saniyede bitiremez. Aynı anda tek görsel işlenir.

**Yeni sınıflar konusunda dikkatli olun.** Site, “kuş” yerine “siyah renkli küçük kuş” veya sahneye özel başka adlar önerebilir. Bu seçeneği her görselde açık tutmak sınıf listenizi gereksiz büyütebilir. Eğitim için belirli bir sınıf listeniz varsa önerileri kontrol ederek ilerleyin.

## Etiketli görsellere ne oluyor?

Üzerinde en az bir etiketi olan görsel atlanır. Mevcut etiketler silinmez. Ancak bu, eksik etiketli bir görselin de atlanacağı anlamına gelir; bu sürüm eksik nesneleri tamamlamaz.

Yeni etiket oluşması ve sonraki görsele geçiş izlenir. Paneldeki **Tamamlanan** sayısı bu arayüz akışının tamamlandığını gösterir. Her görselin sunucuda kayıtlı içeriği ayrıca okunup doğrulanmaz; etiket kalitesi de bu sayıya dahil değildir.

## Bir yerde durursa

**Panel görünmüyor:** `chrome://extensions` sayfasında uzantının açık olduğunu kontrol edin. Ardından Evren'deki veri seti veya etiketleme sayfasını yenileyin.

**“Manifest dosyası bulunamadı” yazıyor:** Yanlış klasör seçilmiştir. `manifest.json` dosyasını doğrudan gördüğünüz klasörü yükleyin.

**Onay düğmesi geç açılıyor:** Araç düğmenin etkinleşmesini en fazla 30 saniye bekler. Süre dolarsa görselin sırasını ve hata nedenini erteleme listesine yazar.

**Yarım kalan işlemler:** Elle kilit kaldırma yoktur. Başlat dediğinizde önceki onayın sonucu kontrol edilir. Etiketler görünüyorsa tekrar onay gönderilmez. Onay gönderilmiş ama sonuç belirsizse görsel inceleme notuyla saklanır; aynı istek tekrar gönderilmez.

**Ertelenen görseller:** İşlem başarısız olursa mümkün olduğunda açık öneri penceresi kapatılır ve sonraki görsele geçilir. Tur sonunda sıra numarasıyla geri dönülür. Her turda bir dönüş, kayıt başına toplam en fazla iki otomatik dönüş denenir. Çözülemeyenler panelde nedenleriyle kalır. Dönüş için sitenin sıra göstergesi ve önceki görsel düğmesi gerekir; veri seti sırası değişmişse yanlış görsel etiketlenmez.

**Yeni etiket oluşmuyor:** Bekleme sonunda sonuç not edilir. Onay gönderilmişse yalnız sonuç kontrolü yapılır; otomatik olarak ikinci kez maske üretimi başlatılmaz. Sunucu hâlâ çalışıyorsa, öneri penceresi güvenli biçimde kapatılabilene kadar beklenir.

Çalışırken elle başka görsele veya veri setine geçmeyin. Son görselde sonraki düğmesi olmadığında araç durabilir. Notlar aynı sekmenin oturumunda, sayfa yenilense de korunur. Sekme kapatıldıktan sonra kalıcı kuyruk ve kapalı tarayıcıda çalışma desteği yoktur. Kota, erişim engeli veya veri seti değişiminde çalışma durur.

## Güncelleme

1. Çalışmayı durdurun ve açık görseli kontrol edin.
2. Yeni dosyaları indirip daha önce yüklediğiniz klasördeki dosyaları değiştirin.
3. `chrome://extensions` ekranında uzantının yenile düğmesine basın.
4. Evren sekmesini de yenileyin.

## Veri erişimi ve kotalar

Uzantı yalnızca `https://evren.ssyz.org.tr/` üzerinde çalışır. Kendi kodu dış servise veri göndermez, çerez veya API anahtarı okumaz. Sitenin düğmelerine basıldığında Evren'in normal istekleri yapılır.

Evren'deki LLM token kotanız bu uzantıya bağlı değildir. Sitenin otomatik etiketleme işlemlerinin kullandığı kaynaklar ve ücretler ayrıca değerlendirilmelidir. Hız ayarı hesap veya servis sınırlarını değiştirmez. Kota ve erişim uyarıları görüldüğünde çalışma durur.

## Geliştirme ve test

`manifest.json` uzantının kimliğini ve çalışacağı adresi, `flow.js` adım sırasını, `content.js` sayfa etkileşimlerini ve paneli içerir.

Kaynak kodu değiştirecekseniz Node.js ve npm ile repo klasöründe:

```sh
npm ci
npm test
npm run check
```

Testler akış ve benzetilmiş sayfa etkileşimlerini kapsar. Canlı sitenin her durumunu veya üretilen etiketlerin doğruluğunu garanti etmez.

Hata bildirirken hangi adımda durduğunu, uzantı sürümünü ve işlem günlüğündeki hata mesajını [Issues](https://github.com/keremtrgl/evrenetiketlemearaci/issues) bölümüne ekleyebilirsiniz. API anahtarı, hesap bilgisi veya özel veri seti içeriği paylaşmayın.

## Geliştirici

Kerem

- GitHub: [keremtrgl](https://github.com/keremtrgl)
- Hugging Face: [KeremTT](https://huggingface.co/KeremTT)

Evren'in resmi uzantısı değildir.
