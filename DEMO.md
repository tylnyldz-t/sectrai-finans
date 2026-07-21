# Sectrai Finans — Profesyonel Hizmetler Masa Demosu

Bu repo, muhasebe ve danışmanlık için **sentetik** bir Worker–Checker çalışma alanıdır. Gerçek müşteri, hesap, poliçe, piyasa verisi veya dış finansal işlem kabul etmez.

## Çalıştırma

```bash
npm install
npm run api
# ikinci terminalde
npm run dev
```

Yerelde KV değişkenleri yokken API ilk istekte `data/finance.json` ile aynı dizinde `proofs/` klasörünü oluşturur. JSON atomik yazılır; kanıt dosyası yerelde saklanır ve SHA-256 özeti audit olayına eklenir. Bu dosyalar Git’e dahil değildir.

## Uygulanan masa modeli

- Dinamik ana konteyner: **Müvekkil / Danışmanlık Proje Dosyası**.
- Kanonik kabuk: solda ÇALIŞMA (Masa / Bugün / AI Operatör) ve MODÜLLER, ortada AI Operatör, sağda KONUŞ / UYGULA, Yönetici düzenleme, MASA, karşılama ve stat şeridi.
- Masa tuvali dört sektör modülünü sürükle/boyutlandır, kilitle ve daralt kontrolleriyle gösterir. L1 yerleşimi `PUT /api/finance/masa-layout` üzerinden kalıcı kayda alınır; yerelde JSON, üretimde Upstash KV kullanılır.
- Sektör hiyerarşisi: L1 Yönetici Ortak, L2 Proje/Hesap Müdürü (Checker), L3 Mali Müşavir/Danışman (Worker), L4 Dokümantasyon Desteği (Field).

## Worker–Checker sözleşmesi

1. L3 veya L4, yalnız kendisine atanmış göreve en fazla 2 MB kanıt dosyası yükler. Sunucu dosyayı yazar, SHA-256 özetini doğrular ve `PROOF_UPLOADED` audit olayı ekler.
2. Zorunlu kanıt türlerinin tümü bulunmadan “İncelemeye gönder” arayüzde pasiftir; doğrudan API çağrısı da `PROOF_REQUIRED` ile reddedilir.
3. L2 yalnız kendisine atanmış `PENDING_REVIEW` görevi onaylayabilir veya zorunlu gerekçeyle reddedebilir.
4. Onaylanana kadar bağımlı görev `LOCKED` kalır. Onay sonrası ancak tüm bağımlılıkları onaylanmış görevler `READY` olur.
5. Red, görevi `REJECTED` durumuyla worker’a döndürür; gerekçe ve olay audit izi içinde korunur.

Audit API’de yalnız ekleme yoluyla yazılır; silme veya güncelleme ucu yoktur. Olaylar kullanıcı kimliği, rol, zaman, IP ve GPS alanlarını taşır. GPS bilgisi istemciden verilmezse `null`/“sağlanmadı” olarak görünür; konum uydurulmaz.

## AI sınırı

L1/L2 “AI ön-denetimini hazırla” ile yalnız sentetik, kural-temelli risk işaretleri alabilir. Sonuç `HUMAN_REVIEW_REQUIRED` döner; kanıtı onaylamaz, görev durumu değiştirmez, finansal/hukuki/uyum kararı vermez ve dış model/ağ çağrısı yapmaz. Yanıt sözleşmesi sunucuda doğrulanır; geçersiz yanıt fail-closed reddedilir.

## Dağıtım ve erişim sınırı

Yerel API, `x-sectrai-role` başlığında yalnız `L1_ADMIN`, `L2_CHECKER`, `L3_WORKER` veya `L4_FIELD` değerlerini kabul eder. Bu, demo RBAC sözleşmesidir; üretim kimliği yerine geçmez. Vercel middleware’i `ADMIN_GATE_EMAIL`, `ADMIN_GATE_PASSWORD` ve `ADMIN_GATE_SECRET` yoksa tüm yüzeyi 503 ile kapatır.

Vercel catch-all function'ı `/api/[...all]` üzerinden çalışır; `/api/health` seçili persistence türünü, seed edilen dört RBAC aktörünü ve modül sayısını döndürür. Üretimde `KV_REST_API_URL` ile `KV_REST_API_TOKEN` birlikte zorunludur: biri eksikse veya Upstash erişilemezse API 503 ile fail-closed kalır ve dosya fallback'i yapmaz. Upstash anahtarları `sectrai:finans:store` ve `sectrai:finans:evidence:*` ad alanındadır.

## Doğrulama

```bash
npm run verify
npm run test:e2e
```

Testler kanıtsız/izinsiz geçişlerin reddini, SHA-256 kanıt saklamayı, gerekçeli red döngüsünü, sıradaki görev kilidini, RBAC görünürlüğünü, AI ön-denetim sözleşmesini ve tarayıcıdaki worker → checker → kalıcılık akışını doğrular.
