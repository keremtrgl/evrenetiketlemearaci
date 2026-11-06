# EVREN uyumu uygulama planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Yerel analiz, taslak, normal çizim ve sınırlı otomasyonu canlı EVREN ekranıyla uyumlu hale getirmek.

**Architecture:** `site.js` yalnız görünür DOM ve tuval üzerinden bağlam sunar. `core/site-state.js` kimlik, eşleme ve aktarım engellerini tanımlar. Mevcut editör bu kuralları kullanır; ücretli API veya gizli sayfa durumu kullanılmaz.

**Tech Stack:** Chrome MV3, JavaScript, IndexedDB, Node test, jsdom, ONNX Runtime Web WASM.

**Spec:** `docs/evren-compatibility-design.md`

## Global Constraints

- Fotoğraflar kalıcı depoya veya dosyaya yazılmaz.
- Ücretli Otomatik Etiketle, AI Meta, Akıllı Seçim, SAM ve EVREN çıkarım API'si çağrılmaz.
- Elle incelenmiş veya güçlü uzman politikasıyla kabul edilmiş kutular mevcut sınıfa aktarılır. Otomasyon kullanıcı sınırıyla çalışır; poligon aktarımı kapalı.
- Öge UUID'si yoksa dosya adı+sıra yedek kimliği kullanılır; gizli uygulama durumuna erişilmez.
- Kod açıklama yorumları eklenmez. Geliştirici adı Kerem.

## Review Focus

- Yeniden boyutlanan aynı görselde aktarım günlüğünün kaybolmaması.
- Sekme veya görsel değişince eski hedefe işlem gitmemesi.
- Yüklenen/saklanan eşlemenin farklı veri setine taşınmaması ve silinmiş sınıfa uygulanmaması.
- Site yüklenirken geçici sıfır etiket sayısının hazır durum sayılmaması.
- Tanı raporuna fotoğraf, API anahtarı ve model ağırlığı girmemesi.

### 1. Kaynak ve aktarım kuralları

Files: `core/site-state.js`, `tests/site-state.test.cjs`, `src/app.js`, `tests/editor.test.cjs`.

- [x] Çözünürlükten bağımsız kaynak kimliği, en-boy oranı uyumu, aktif sekme engeli ve aktarım günlüğü testlerini önce yaz ve başarısızlığı gör.
- [x] `sourceKey(source)`, `canRestore(stored,item)`, `transferReason(item,annotation,context,className)` kurallarını uygula.
- [x] Normalize etiketleri ve bağımsız günlüğü geri yükle; eski v0.4 piksel anahtarlı kayıtlar için aynı görselde okuma geçişi ekle.
- [x] İlgili testleri ve tüm testleri çalıştır.

### 2. Site bağlamı ve eşleme

Files: `site.js`, `src/app.js`, `tests/cloud-bridge.test.cjs`, `tests/editor.test.cjs`.

- [x] Yükleniyor durumu, gizli paneller, seçili sınıf ve yanlış sekme için önce kırmızı testleri ekle.
- [x] `GET_SITE_CONTEXT` komutunu yalnız DOM okuyacak şekilde ekle; aktarım öncesinde de yeniden doğrula.
- [x] Veri seti yoluna bağlı eşlemeyi IndexedDB'de sakla; var olmayan/çift sınıfı reddet.
- [x] Bağlam sorgusunu tek seferde bir istekle sınırla; kapalı/görünmeyen panelde sürekli sorgulama yapma.
- [x] Testleri çalıştır.

### 3. Panel, tanı ve paket

Files: `app.html`, `app.css`, `src/app.js`, `README.md`, `docs/validation-v050.md`, `manifest.json`, `package.json`.

- [x] Düğmelerin engel nedenini, bağlı görseli ve seçili kutunun durumunu göster.
- [x] Sınıf eşlemesini aktarımın yanında, modelleri ayrı açılır bölümde tut; EVREN paletine ve 360 px panele uyarla.
- [x] Yalnız teknik sayımlar ve hata kodları içeren tanı raporu hazırla.
- [x] Tüm test, sözdizimi, derleme, gerçek ağırlık WASM kontrolü ve ZIP içerik denetimini çalıştır.
- [x] Canlı tarayıcıda doğrulanmış ve doğrulanmamış alanları ayrı kaydet. Bağımsız kod incelemesi sonrası GitHub ve beta paketini güncelle.

## Kullanıcının genişlettiği kapsam: otomatik çalışma

Önceki tek kutu kısıtı kullanıcı isteğiyle genişletildi. v0.5 yan panelinde belirlenen N görsel ve hız üst sınırıyla yerel tespit → uzman uzlaşması → normal Kutu çizimi → normal kayıt → sonraki sırası var. En az iki uzman, güçlü uzlaşma ve mevcut tekil sınıf eşlemesi gerekiyor. Mevcut etiketli görseller atlanır; belirsiz görseller incelemeye ayrılır; belirsiz aktarım/kayıt tüm çalışmayı durdurur. Ücretli çıkarım ve bot gizleme kapsam dışıdır. Başlangıç sekmesi ve veri seti çalışma boyunca sabitlenir.

### 4. Otomasyon

- [x] Kaynak/navigasyon tokenları, yeni bağlantıda etiketli görseli atlama ve normal Ctrl+S kayıt adımı.
- [x] N sınırı, hız üst sınırı, iptal sinyali, sekme sabitleme, model/sınıf ön kontrolü.
- [x] İnceleme kuyruğu ve kalıcı aktarım günlüğü; belirsiz yazımı tekrarlamama.
- [x] Uygulama düzeyinde iki görsel otomasyon testi, iptal ve sekme değişimi regresyonları.
- [x] Bağımsız inceleme ve 57 test.
- [ ] Kurulu uzantıyla canlı otomasyon testi; uzantı yönetim ekranı araçta desteklenmiyor.
