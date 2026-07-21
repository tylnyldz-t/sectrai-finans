# Sectrai Finans — Investor Demo

`Sectrai Finans`, Finans, Sigorta & InsurTech alanı için bağımsız Vite/React/TypeScript yatırımcı demosudur. Gerçek müşteri, işlem, hesap, poliçe veya piyasa verisi kabul etmez; tüm içerik açıkça **Sentetik demo** olarak etiketlenir.

## Çalıştırma

```bash
npm install
npm run api
# ikinci terminalde
npm run dev
```

Yerel API `8788` portunda çalışır; Vite `/api` isteklerini bu sunucuya yönlendirir. `npm run build && npm start` derlenmiş istemciyi aynı Node sunucusundan sunar.

`data/finance.json` ilk API erişiminde oluşturulur, Git’e dahil edilmez ve atomik yazılır. Bu nedenle yerel Node süreci kapatılıp yeniden başlatıldığında kayıtlar kalır. Vercel dosya sistemi kalıcı olmadığı için canlı yüzey bu JSON kalıcılığını vaat etmez; kalıcı demo akışını yerelde çalıştırın.

## Gerçekten çalışan modüller

- **Nakit akışı tahmini:** Kullanıcı yalnız izinli sentetik şablonu seçip `Senaryoyu kaydet`e bastığında 90 günlük senaryo JSON’a yazılır. Baz, gecikmiş tahsilat ve stres şablonları vardır; serbest metin veya gerçek hesap girdisi yoktur.
- **Tahsilat riski:** Sentetik gecikme kanıtları görünür. Owner, yalnız `Takip incelemesine al` veya `İzlemede tut` kararı kaydedebilir; hiçbir tahsilat iletişimi veya işlem başlatılmaz.
- **Hasar inceleme:** Sentetik eksik-belge kaydı için `Ek kanıt iste` veya `İncelemeyi kapat` owner kaydı yapılır. Poliçe/hasar sonucu üretmez.
- **AML uyarıları:** Sentetik uyarı kanıtları için `Uyum incelemesine aktar` veya `Uyarıyı kapat` kayıtları vardır. Sistem AML kararı, müşteri engeli veya bildirim göndermez.

Üç inceleme modülünde kanıt zinciri boşsa backend kaydı reddeder. Her kayıt bir kez owner kararı alabilir; AI hiçbir onayı üretemez veya kendi kendine işlem yapamaz.

## AI sınırı

`server/aiProvider.mjs` içindeki `SyntheticFinanceAIProvider`, sadece kullanıcı `AI açıklamasını hazırla` eylemine bastığında görünür sentetik kanıtları özetler. Ağ/model sağlayıcı çağrısı yapmaz. Gelecekte gerçek sağlayıcı yalnız sunucu tarafında merkezi anahtar katmanının arkasında bu sözleşmeyi uygulayabilir; geçersiz yanıt fail-closed reddedilir.

## Owner ve dağıtım sınırı

Yerel API `/api/finance` altında `x-sectrai-role: OWNER` başlığını zorunlu tutar; bu yerel demo sözleşmesi tek başına kimlik doğrulama değildir. Vercel’deki [`middleware.ts`](middleware.ts), `ADMIN_GATE_EMAIL`, `ADMIN_GATE_PASSWORD` ve `ADMIN_GATE_SECRET` yoksa bütün yüzeyi `503` ile kapatır. Doğru giriş `303` ile `/` konumuna, `/__admin-logout` ise çerezi silip `303` ile giriş yüzeyine döner.

Canlı Vercel yüzeyi owner gate ile korunur ve aynı sentetik API eylemlerini Vercel Node function üzerinden çalıştırır. Bu function yalnız geçici `/tmp` dosyası kullanır: instance/soğuk başlangıç değiştiğinde kayıtlar sıfırlanabilir. Bu nedenle canlı sitede finansal kayıtların kalıcı olduğu iddia edilmez; dayanıklı kalıcılık için yerel Node API kullanılmalıdır.

## Doğrulama

```bash
npm run verify
npm run test:e2e
```

Sunucu testleri soğuk yeniden başlatma sonrası senaryo/owner karar kalıcılığını, owner-only HTTP sınırını, dört modülün API akışını, geçersiz şablon/kararları ve geçersiz AI yanıtını doğrular. Chromium E2E; senaryo oluşturma, kullanıcı-başlatan AI özeti, owner kararı ve sayfa yenilemesi sonrası kalıcılığı dener.
