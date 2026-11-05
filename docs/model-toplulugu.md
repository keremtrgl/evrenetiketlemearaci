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

## v0.3.0’daki gerçek durum

Yerel genel nesne kutuları ve isteğe bağlı tek ONNX sınıflandırıcı yükleme yolu var. Anadolu ağırlıkları bu repoya eklenmedi, ücretli dışa aktarım veya çıkarım çağrısı yapılmadı. Yükleyici NCHW RGB giriş, giriş boyutu ve sınıf sayısını doğrular. Kullanıcının gerçek Anadolu ONNX ağırlıklarıyla uçtan uca doğrulama henüz yapılmadı.

Bu sürüm modelleri tek ağırlıkta birleştirmez, bütün uzmanları aynı anda çalıştırmaz ve kendi kendine yeni model eğitmez. Görevlerine göre birlikte kullanma yaklaşımı bunun üzerine kurulabilir.

Kaynaklar: [Model soups](https://arxiv.org/abs/2203.05482), [Fisher ağırlıklı birleştirme](https://arxiv.org/abs/2111.09832), [Ultralytics model toplulukları](https://docs.ultralytics.com/yolov5/tutorials/model-ensembling).
