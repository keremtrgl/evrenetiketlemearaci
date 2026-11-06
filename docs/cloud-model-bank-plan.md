# Evren yanında yerel model topluluğu

Kerem'in onayladığı akış: fotoğraflar Evren'de kalır, açık tuval bellekte okunur. Yerel kutu önerileri, alana göre seçilen bir veya birkaç ONNX sınıflandırıcıyla incelenir. Model ağırlıkları birleştirilmez. Ücretli site çıkarımı, AI Meta, SAM ve API anahtarı kullanılmaz.

1. Chrome yan paneli; açık Evren sekmesinden tek görsel alma, eski fotoğraf belleğini bırakma.
2. En fazla üç yerel sınıflandırıcı; alan seçimi, etkinleştirme, kaldırma, çıktı ve giriş doğrulama, bellek sınırı.
3. Kutu → kırpma → ilgili modeller. Her modelin ilk sonuçları ayrı, farklı sınıf indeksleri doğrudan karşılaştırılmaz. Anlaşmazlık ve düşük güven incelemeye ayrılır.
4. Evren'deki mevcut sınıfları okuma; yalnız kullanıcı tarafından incelenmiş tek kutuyu, açıkça seçilen mevcut sınıfa normal çizim aracıyla aktarma. Görsel kimliği ve piksel çerçevesi değiştiyse reddetme. Yeni sınıf açmama. Sonucu belirsiz çizimi tekrar denememe. Poligon aktarımını canlı doğrulamaya kadar kapalı tutma.
5. Ücretli düğmelerin çağrılmadığını, yanlış görsele çizilmediğini, tekrar aktarımın engellendiğini ve alan yönlendirmesini test etme. Chrome ve gerçek ağırlık testlerinin sınırlarını açıkça belgeleme.

Siteye aktarım deneysel kalır. Normal çizim yolunun canlı Chrome doğrulaması tamamlanmadan otomatik toplu kayıt açılmaz. Bir milyon görseli yerel bilgisayar kapalıyken işleme bu sürümün kapsamında değildir.
