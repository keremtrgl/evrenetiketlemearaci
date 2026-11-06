# Modellerden ortak bir sistem oluşturmak

Kerem · 6 Kasım 2026

Hesapta incelenen 15 model aynı görevi yapmıyor. Anadolu1000/500, bitki38, tty100/20 ve hemato sınıflandırma modelleri görüntüye sınıf öneriyor. hemato-det modelleri nesne tespiti yapıyor. Aynı görevdeki v2/v4 isimleri de ayrı uzmanlık yerine aynı modelin alternatif eğitimlerini temsil edebilir. Dosya adı tek başına sınıf sırası veya eğitim soyu kanıtı değildir.

## Üç farklı yaklaşım

**Ağırlıkları doğrudan birleştirmek:** Bütün dosyaların ağırlıklarını toplayıp tek model yapmak uygun değil. Mimari, başlangıç ağırlığı, çıktı başlığı, sınıf sırası ve görev uyumu gerekir. Anadolu500 ile Anadolu1000 aynı ailede olsa bile sınıf başlıklarının boyutu ve anlamı doğrulanmadan ortalanamaz. Model-soup yöntemleri belirli uyum koşullarında işe yarayabilir; her birleştirme doğruluğu artırmaz.

**Modelleri birlikte çalıştırmak:** İlk uygulanabilir yol. Önce alan ve görev seçilir; yalnız ilgili uzman çağrılır. Genel nesne tespitçisi kuşu kutular, Anadolu sınıflandırıcısı o kırpılmış nesne için tür önerir. Hematoloji fotoğrafı ayrı akışa gider. Normal doğa görüntüsüne kan hücresi sınıflandırıcısı uygulanmaz. En yeni sürüm otomatik en iyi sayılmaz; aynı temiz karşılaştırma kümesinde denenir.

**Tek öğrenci modele öğretmek:** Uzmanların sonuçları, doğru etiketler ve uygun olumsuz örneklerle yeni model eğitilebilir. Bu bir dosya dönüştürme işlemi değil; veri hazırlama, öğrenci mimarisi seçimi, eğitim ve değerlendirme projesidir. Öğretmen hataları öğrenciye taşınabilir. Eğitimin kaynak maliyeti vardır; bu çalışma kredi tüketen eğitim başlatmaz.

## Önerilen yol

1. Her model için görev, giriş boyutu, sınıf kimliği/sırası, eğitim verisi sürümü, lisans ve dışa aktarım dosyasını kaydet.
2. Aynı görevi yapan sürümleri ortak, eğitimden ayrı örneklerde karşılaştır. Gereksiz aynı modelleri her görüntüde çalıştırma.
3. Çakışan tür adlarını ortak sözlüğe bağla; “aynı indeks” ile “aynı sınıf”ı karıştırma.
4. Kullanıcının seçtiği alanla yönlendirme yap. Otomatik alan yönlendirmesi daha sonra ayrı ölçülsün; belirsiz alanda tahmin zorlanmasın.
5. Kutu/maske konumu ve tür sınıflandırmasını iki ayrı çıktı olarak sakla. Tüm fotoğraf için bir tür tahmini, fotoğraftaki her nesnenin aynı türde olduğu anlamına gelmez.
6. Puanları ham halde farklı modeller arasında karşılaştırıp en büyük olanı seçme. Kalibrasyon, ortak test kümesi ve yanlış pozitifler değerlendirilsin.
7. Hız, bellek, kapsam dışı örneklerde reddetme ve sınıf bazlı kalite raporu çıkar. İyileşme yoksa daha karmaşık topluluğu yayına alma.

## v0.4.0 betadaki gerçek durum

Yerel genel nesne kutuları ve en fazla üç ONNX sınıflandırıcı içeren bir model bankası var. Alan seçimi ilgili uzmanları belirler. İlk tahminler aynı sınıf adıyla, en az 0,75 puan ve ikinci tahmine en az 0,15 farkla birleşiyorsa güçlü ortak öneri gösterilir; puanlar ortalanmaz. Farklı sınıflar ve belirsizlik ayrı gösterilir. Kutu başına en fazla 20 yeni kutunun uzmanlarla incelendiği bir akış var. Son karar ve site sınıfı eşlemesi kullanıcıda.

Mevcut hazır Anadolu1000 ve Anadolu500 ONNX dosyaları alındı; uzaktan dönüştürme işi başlatılmadı. Metadata'dan gerçek 1000/500 sınıf listeleri ve 384 giriş boyutu çıkarıldı. İki ağırlık aynı ONNX Runtime Web WASM çalışma zamanında Node.js altında birlikte yüklenip sentetik girdide çalıştı. Canlı Chrome ve gerçek fotoğraflarda kalite değerlendirmesi tamamlanmadı. Ağırlıklar repoya konulmadı; kullanıcı için yerelde ayrı hazırlandı.

Bu sürüm modelleri tek ağırlıkta birleştirmez ve kendi kendine yeni model eğitmez. Sınıflandırma modelleri birlikte çalışabilir; kullanıcının tespit/segmentasyon ONNX modelleri için görev çözücüleri henüz yok. Fotoğraftaki genel nesneyi yerel YOLOS modeli bulur; mikroskop gibi alanlarda kutuyu elle seçmek gerekebilir.

Kaynaklar: [Model soups](https://arxiv.org/abs/2203.05482), [Fisher ağırlıklı birleştirme](https://arxiv.org/abs/2111.09832), [Ultralytics model toplulukları](https://docs.ultralytics.com/yolov5/tutorials/model-ensembling).


## v0.5 otomatik çalışma

Yan panel otomasyonu en az iki farklı etkin uzman ve aynı türde en az 0,90 puan, ikinci tahmine en az 0,20 fark ister. Bir kutu belirsizse bütün görsel incelemeye ayrılır. Bu eşikler elle görünen önerinin eşiklerinden daha sıkıdır; doğruluk veya kutu kalitesi garantisi değildir. Sınıf eşlemesi veri setine özel kaydedilir. Genel tespitçinin kapsamı değişmedi.
