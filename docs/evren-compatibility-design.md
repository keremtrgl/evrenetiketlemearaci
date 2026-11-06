# EVREN uyumu: v0.5 beta

Kerem · 6 Kasım 2026

Amaç: mevcut yerel etiketleme akışını EVREN'in açık görseli, sınıfları ve yükleme durumuyla uyumlu hale getirmek. Fotoğraflar dosya olarak indirilmez; ücretli çıkarım çağrısı yapılmaz. Bu, mevcut v0.4 akışının devamıdır.

## Canlı inceleme

Pilot etiketleme ekranı `annotate/01a1a827-9c99-7271-b797-3d061d020477` üzerinde 400 görsel, 339 sınıf, üç Konva tuvali, `role=application` ve `aria-label=Anotasyon alani` görüldü. Başlık görsel sırası ve dosya adını içeriyor. Öge değişiminde URL değişmiyor; DOM'da öge/sınıf UUID'si sunulmuyor. İlk yüklemede etiket sayacı 0 görünüp sonra gerçek sayıya geçiyor. Sağ ve sol paneller kapatılabiliyor. Normal Kutu aracı `aria-pressed` ile seçimini bildiriyor. Seçili sınıf butonunun görünür ring durumu var. Tema Inter ve koyu mavi zemin kullanıyor.

Chrome güvenlik denetimi `chrome://extensions` protokolüne erişimi reddetti. Bu adres farklı bir yüzeyden açılarak kısıtlama aşılmayacak. Kurulu sürüm kullanıcıdan soruldu; bu cevap kod geliştirmesinin ön koşulu değil, canlı uzantı testinin girdisi.

## Bu sürümde yapılacaklar

1. Ucuz DOM bağlamı sorgusu: sayfa, dosya, sıra, sınıf listesi, araç ve panel durumu. Açık görsel değiştiyse veya yükleniyorsa aktarımı kapat. Başka sekmeye geçildiğinde eski sekmeye çizme.
2. Kararlı kaynak anahtarı: tuval PNG'sinin çözünürlüğü taslak kimliğini değiştirmesin. Kaynak eşleşmesi ve en-boy oranı doğrulanırsa normalize koordinatlı taslak ve bağımsız aktarım günlüğü geri gelsin. Öge UUID'si yokken dosya adı+sıra yedek kimliktir; bunun sınırlaması belgelenir.
3. Veri setine özel, kullanıcı tanımlı sınıf eşlemesi. `bird` otomatik `karatavuk` yapılmaz. Eşleme yalnız mevcut ve tekil sınıfa uygulanır; sınıf silinmişse aktarım durur.
4. Bağlantı göstergesi, seçili etiketin aktarım durumu, anlaşılır engel nedenleri, fotoğraf/anahtar içermeyen tanı raporu. Koyu mavi/camgöbeği palet ve dar panelde erişilebilir yerleşim.
5. Yükleme ve araç seçimi denetimi; iki görüntü katmanı hizası korunur. Elle tek kutu aktarımı korunur. Kullanıcı isteğiyle N görsel sınırına bağlı otomatik normal çizim/kayıt akışı eklenir. Poligon aktarımı kapalı kalır.

## Kapsam ve doğrulama

Kayıt sayacının artması sunucu kalıcılığı sayılmaz. EVREN'in kendi otomatik kaydı mevcut olabilir; panel bunu devre dışı bırakmaz. Yeni ücretli istek, API anahtarı okuma, gizli React durumu veya bot gizleme eklenmez. Modellerin kalite artışı iddia edilmez.

Regresyonlar gerçek uygulama ve site adaptörü üzerinde jsdom ile; iki gerçek Anadolu ağırlığı WASM ile; arayüz Chrome'da yerel önizlemeyle kontrol edilir. Canlı uzantı kurulumu veya gerçek site aktarımı tamamlanmazsa bu sonuç açıkça ayrı yazılır. Kaynak kod yorumsuz kalır; geliştirici adı Kerem ve profil bağlantıları korunur.

## v0.5 otomasyon güncellemesi

Kullanıcının sonraki isteğiyle önceki tek kutu kısıtı genişletildi. Yan panelde N görsel ve hız üst sınırı, iki güçlü uzman ve tekil sınıf eşlemesiyle normal çizim/kayıt/navigasyon akışı var. Belirsiz aktarımda tekrar yok. Başlangıç sekmesi ve veri seti sabit. Yeni otomasyon test karşılıklarında doğrulandı; canlı kurulu Chrome testi ayrı bekliyor. Ücretli araç ve API kullanımı hâlâ kapsam dışı.
