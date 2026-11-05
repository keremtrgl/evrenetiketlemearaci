# Yerel etiketleme motoru — v0.3.0

Kerem · 6 Kasım 2026

Kullanıcının kesin koşulu: uzantı Evren kredisi harcamasın. Bu nedenle yeni sürümde ücretli site otomasyonu kaldırılır. API anahtarı, LLM veya SAM isteği kullanılmaz. Genel nesne kutularını tarayıcıda çalışan Xenova/yolos-tiny üretir. Model dosyaları ilk kullanımda Hugging Face'den indirilir; görüntüler dış servise gönderilmez.

İşler: yerel model, kullanıcı incelemesi, kutu/poligon düzenleme, sınıf eşleme, YOLO/COCO/JSON çıktısı. Kaynak görüntü dosya seçimiyle veya izin verilen Evren sekmesindeki okunabilir tuvalden belleğe alınır. Tuvalin fotoğraf katmanı opak dikdörtgen olarak güvenilir biçimde ayrılamıyorsa aktarım reddedilir; ekran koordinatları orijinal görsel koordinatı gibi kaydedilmez.

Evren'e doğrudan yazım bu sürümde yoktur. Normal çizim ve toplu yazım yollarının kredi davranışı doğrulanmadığı için görüntü alanına otomatik tıklama veya API yazımı yapılmaz. Etiketler önizlenebilir ve dışa aktarılabilir. Dışa aktarma kullanıcı komutuyla etiket metnini indirir; fotoğraf kopyası indirmez.

Model sınırlaması: genel nesne kutuları; tür ayrımı, kusursuz maske ve tüm biyolojik sınıflar destekleniyor iddiası yoktur. Poligonlar bu sürümde kullanıcı tarafından çizilir. Nokta/OBB/poz üretimi vaat edilmez.

Geliştirme sırası: 1) geometri ve dışa aktarım testleri; 2) sıfır ücretli çağrı içeren tuval adaptörü; 3) worker içinde yerel model; 4) düzenleme çalışma alanı; 5) paket ve gerçek yerel çıkarım doğrulaması.

Kararlar: Önceki büyük plandaki ücretli tamamlama motoru yerel üretimle değiştirildi. Bu, kredi riskini azaltır; genel modelin sınırlı sınıf kümesi nedeniyle insan kontrolünü gerektirir. Ücret garantisi için modele ait fiyat alanını kontrol etmek yerine uzantıdan çıkarım API çağrısı tamamen çıkarıldı.

Doğrulama: çalıştırılan testler, gerçek model denemesi ve paket kontrolü sonuçları yayın notunda yazılır. Canlı Evren'e yeni anotasyon yazılmadıysa yazılmış gibi raporlanmaz.
