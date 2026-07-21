// GERÇEK sektör ve modül kayıt defteri — sektral/packages/compose/src/registry.ts'ten
// (feat/film-production-sector-20260720 dalı dahil) makine ile çıkarıldı; UYDURMA DEĞİL.
// Her sektörün modül listesi MODULE_REGISTRY'deki sectorLabels eşlemesinin kendisidir.

export interface SectorInfo {
  id: string;
  label: string;
  /** TR+EN niyet anahtar kelimeleri (routing.mjs deseni) */
  keywords: string[];
  modules: { id: string; label: string }[];
}

const M = (id: string, label: string) => ({ id, label });

export const SECTORS: SectorInfo[] = [
  {
    id: 'logistics',
    label: 'Lojistik & Taşımacılık',
    keywords: ['lojistik', 'kamyon', 'tır', 'filo', 'nakliye', 'sevkiyat', 'taşıma', 'navlun', 'truck', 'fleet', 'logistics'],
    modules: [
      M('asset', 'Araç & Ekipman'), M('shipment', 'Sevkiyatlar'), M('shipment-leg', 'Sevkiyat Bacakları'),
      M('shipment-document', 'Belgeler & Gümrük'), M('freight-quote', 'Navlun Teklifleri'), M('carrier-schedule', 'Sefer Tarifeleri'),
      M('work-item', 'Seferler'), M('crm', 'Taşıyıcılar & Müşteriler'), M('schedule', 'Sefer Planı'),
      M('finance', 'Avans & Cüzdan'), M('marketplace', 'Yük Borsası'), M('marketplace-offer', 'Yük Teklifleri'),
      M('location', 'Filo Takibi'), M('geofence', 'Bölge Takibi'), M('trust', 'Taşıyıcı Puanları'),
      M('agreements', 'Navlun Anlaşmaları'), M('escrow', 'Navlun Teminatı'), M('compliance', 'Taşıyıcı Uyumluluğu'),
      M('order', 'Taşıma Siparişleri'), M('surveillance', 'Depo & Terminal Kameraları'),
    ],
  },
  {
    id: 'healthcare',
    label: 'Sağlık',
    keywords: ['sağlık', 'klinik', 'hasta', 'muayene', 'poliklinik', 'diş', 'doktor', 'randevu', 'health', 'clinic', 'patient'],
    modules: [
      M('appointment', 'Randevular'), M('clinical-encounter', 'Muayeneler / Klinik Kayıt'), M('prescription', 'Reçeteler / e-Reçete'),
      M('lab-order', 'Laboratuvar İstemleri'), M('treatment-plan', 'Tedavi Paketleri'), M('crm', 'Hastalar'),
      M('documents', 'Hasta Dosyaları'), M('stock', 'Sarf Malzeme'), M('asset', 'Cihaz & Oda'),
      M('finance', 'Tahsilat'), M('consent', 'Onam & Rıza'), M('compliance', 'Regülasyon'),
      M('obligation', 'Ruhsat & Tescil'), M('ncr', 'QC & Kalibrasyon'),
    ],
  },
  {
    id: 'construction',
    label: 'İnşaat & Saha',
    keywords: ['inşaat', 'şantiye', 'müteahhit', 'taşeron', 'hakediş', 'metraj', 'construction', 'renovation'],
    modules: [
      M('boq-poz', 'Keşif / Metraj (BoQ)'), M('takeoff-line', 'Metraj Ölçümleri'), M('progress-payment', 'Hakedişler'),
      M('site-daily-log', 'Şantiye Günlük Defteri'), M('feasibility-study', 'Maliyet & Fizibilite'), M('work-item', 'İş Emirleri'),
      M('crm', 'Taşeronlar'), M('stock', 'Şantiye Stoğu'), M('asset', 'Makine & Malzeme'),
      M('schedule', 'Saha Programı'), M('finance', 'Şantiye Finansı'), M('marketplace', 'Malzeme & Taşeron Pazarı'),
      M('agreements', 'Taşeron Sözleşmeleri'), M('escrow', 'Hakediş Teminatı'), M('obligation', 'Ruhsat & İzinler'),
      M('ncr', 'İSG & Yapı-Denetim'), M('geofence', 'Saha Bölgeleri'), M('surveillance', 'Şantiye Güvenliği'),
    ],
  },
  {
    id: 'manufacturing',
    label: 'İmalat & Üretim',
    keywords: ['imalat', 'üretim', 'fabrika', 'atölye', 'tezgah', 'fason', 'reçete', 'bom', 'manufacturing', 'factory', 'production'],
    modules: [
      M('production-order', 'Üretim Emirleri'), M('machine', 'Makineler'), M('bom-recipe', 'Ürün Reçeteleri / BOM'),
      M('bom-item', 'Reçete Kalemleri'), M('quality-check', 'Kalite Muayeneleri (QC)'), M('goods-receipt', 'Hammadde Kabul'),
      M('stock', 'Ardiye & Depo'), M('order', 'Satış Siparişleri'), M('ncr', 'Uygunsuzluk & CAPA'),
      M('marketplace', 'Fason & Kapasite Pazarı'), M('agreements', 'Tedarik Sözleşmeleri'), M('finance', 'Maliyet & Kasa'),
      M('documents', 'Kalite & Teknik Belgeler'),
    ],
  },
  {
    id: 'retail',
    label: 'Perakende & Ticaret',
    keywords: ['perakende', 'mağaza', 'market', 'bakkal', 'butik', 'satış', 'e-ticaret', 'dükkan', 'retail', 'store', 'shop'],
    modules: [
      M('pos-order', 'Satış Fişleri'), M('stock', 'Stok & Depo'), M('goods-receipt', 'Mal Kabul / Depo Giriş'),
      M('customer-return', 'İadeler / RMA'), M('order', 'Satınalma Siparişleri'), M('crm', 'Müşteriler & Tedarikçiler'),
      M('finance', 'Kasa & Ödeme'), M('marketplace', 'Tedarik Pazarı'), M('trust', 'Müşteri Değerlendirme'),
      M('agreements', 'Tedarik Anlaşmaları'), M('social-media', 'E-ticaret & Marka'), M('site-builder', 'Mağaza Landing'),
      M('google-presence', 'Google İşletme'), M('surveillance', 'Mağaza Kameraları'),
    ],
  },
  {
    id: 'hospitality',
    label: 'Konaklama & Restoran',
    keywords: ['otel', 'pansiyon', 'restoran', 'kafe', 'lokanta', 'konaklama', 'rezervasyon', 'misafir', 'hotel', 'restaurant', 'cafe'],
    modules: [
      M('room', 'Odalar'), M('reservation', 'Rezervasyonlar / Ön-büro'), M('kbs-notification', 'KBS Bildirimleri'),
      M('hk-task', 'Housekeeping'), M('pos-order', 'Adisyonlar / POS'), M('pos-line', 'Adisyon Kalemleri'),
      M('bom-recipe', 'Yemek Reçeteleri'), M('crm', 'Misafirler'), M('schedule', 'Rezervasyon Takvimi'),
      M('finance', 'Gelir & Kasa'), M('consent', 'Misafir Rızaları'), M('ncr', 'HACCP Bulguları'),
      M('incentive', 'Ekip Primi'), M('google-presence', 'Google Yorumları'),
    ],
  },
  {
    id: 'professional-services',
    label: 'SECTRAI Finans · Muhasebe ve Danışmanlık',
    keywords: ['finans', 'muhasebe', 'mali müşavir', 'tahsilat', 'nakit akışı', 'mutabakat', 'alacak', 'borç', 'aml', 'uyum', 'finance', 'accounting', 'cashflow', 'collections'],
    modules: [
      M('collections', 'Tahsilat & Cari İnceleme'), M('claims', 'Belge & İddia İnceleme'), M('aml', 'Uyum & AML Kontrolleri'),
      M('cashflow-scenarios', 'Nakit Akışı Senaryoları'), M('workflow', 'Worker–Checker İş Akışı'), M('ledger', 'Kanıt & Kayıt Defteri'),
      M('team-roles', 'Finans Ekip Hiyerarşisi'), M('audit-trail', 'Denetim İzi'),
    ],
  },
  {
    id: 'fuel',
    label: 'Akaryakıt & İstasyon',
    keywords: ['akaryakıt', 'istasyon', 'benzin', 'pompa', 'yakıt', 'petrol', 'lpg', 'fuel', 'gas station'],
    modules: [
      M('fuel-tank', 'Yakıt Tankları'), M('pump-sale', 'Pompa & Vardiya'), M('shift-reconciliation', 'Vardiya Mutabakatı'),
      M('tank-dip', 'Tank Ölçümleri (Dip/Kaçak)'), M('license', 'EPDK Lisansları'), M('stock', 'Market & Yağ Stoğu'),
      M('crm', 'Bayiler & Müşteriler'), M('finance', 'Kasa & Cari'), M('marketplace', 'Akaryakıt Borsası'),
      M('obligation', 'EPDK & Muayene'), M('incentive', 'Personel Primi'), M('camera-scan', 'Ada/Market Taramaları'),
    ],
  },
  {
    id: 'agriculture',
    label: 'Tarım & Çiftçilik',
    keywords: ['tarım', 'çiftlik', 'çiftçi', 'tarla', 'parsel', 'hasat', 'sera', 'hayvancılık', 'süt', 'agriculture', 'farm', 'harvest'],
    modules: [
      M('crop-parcel', 'Parseller & Ekim'), M('harvest', 'Hasat & Verim'), M('harvest-lot', 'Hasat Lotları / Köken'),
      M('input-application', 'İlaç/Gübre Defteri (PHI)'), M('animal-treatment', 'Sürü Sağlık Defteri'), M('subsidy', 'Destek Başvuruları (ÇKS)'),
      M('stock', 'Girdi & Hasat Deposu'), M('asset', 'Ekipman & Makine'), M('work-item', 'Tarla İşleri'),
      M('crm', 'Alıcılar & Tedarikçiler'), M('finance', 'Gelir & Maliyet'), M('marketplace', 'Ürün & Girdi Borsası'),
      M('agreements', 'Alım Sözleşmeleri'),
    ],
  },
  {
    id: 'automotive-service',
    label: 'Oto Servis & Tamir',
    keywords: ['oto servis', 'tamirhane', 'tamir', 'kaporta', 'oto', 'araç servis', 'lastik', 'ekspertiz', 'garage', 'auto repair'],
    modules: [
      M('work-order', 'Servis İş Emirleri'), M('stock', 'Yedek Parça Stoğu'), M('goods-receipt', 'Parça Kabul'),
      M('customer-return', 'Garanti İadeleri'), M('quality-check', 'Ekspertiz/Muayene'), M('order', 'İş-Siparişleri'),
      M('crm', 'Müşteriler & Tedarikçiler'), M('finance', 'Kasa & Tahsilat'), M('marketplace', 'Servis & Parça Pazarı'),
      M('agreements', 'Servis Sözleşmeleri'), M('ncr', 'Araç Muayene-Bulgu'), M('asset', 'Servis Ekipmanı'),
    ],
  },
  {
    id: 'real-estate',
    label: 'Emlak & Gayrimenkul',
    keywords: ['emlak', 'gayrimenkul', 'kiralama', 'portföy', 'komisyon', 'tapu', 'real estate', 'property'],
    modules: [
      M('deal-commission', 'Satış & Komisyon'), M('marketplace', 'Portföy & İlanlar'), M('marketplace-offer', 'Alıcı Teklifleri'),
      M('crm', 'Müşteriler & Mal Sahipleri'), M('work-item', 'Portföy İşleri'), M('finance', 'Kasa & Komisyon'),
      M('agreements', 'Satış/Kira Sözleşmeleri'),
    ],
  },
  {
    id: 'education',
    label: 'Eğitim & Kurs',
    keywords: ['okul', 'kurs', 'dershane', 'etüt merkezi', 'öğrenci', 'eğitim kurumu', 'anaokulu', 'kreş', 'school', 'course', 'tuition'],
    modules: [
      M('student', 'Öğrenciler'), M('tuition', 'Taksit & Tahsilat'), M('attendance', 'Yoklama / Devamsızlık'),
      M('engagement', 'Programlar'), M('time-entry', 'Ders Saatleri'), M('crm', 'Öğrenci & Veliler'),
      M('finance', 'Tahsilat & Kasa'), M('consent', 'Veli Onayları'),
    ],
  },
  {
    id: 'film-production',
    label: 'Film Yapım & Stüdyo',
    keywords: ['film', 'dizi', 'set', 'yapım', 'çekim', 'stüdyo', 'senaryo', 'cast', 'prodüksiyon', 'movie', 'shoot'],
    modules: [
      M('film-project', 'Yapım Slate'), M('scene-card', 'Kanon & Sahne Konsensüsü'), M('scene-breakdown', 'Sahne Breakdown'),
      M('shooting-schedule', 'Çekim Programı'), M('call-sheet', 'Günlük Call Sheet'), M('dood', 'Day Out of Days'),
      M('cast-seat', 'Cast Katmanları'), M('crew-seat', 'Crew & Departmanlar'), M('vendor-engagement', 'Taşeronlar & Vendorlar'),
      M('cost-report', 'Bütçe & Cost Report'), M('production-document', 'Belgeler & Deliller'), M('post-delivery', 'Post & Delivery'),
    ],
  },
  {
    id: 'generic',
    label: 'Diğer / Genel',
    keywords: [],
    modules: [
      M('work-item', 'İşler'), M('workflow', 'Süreçler'), M('crm', 'Kişiler'), M('documents', 'Belgeler'),
      M('schedule', 'Takvim'), M('finance', 'Finans'), M('analytics', 'Raporlar'), M('ai-assistant', 'AI Asistan'),
    ],
  },
];

export const sectorById = (id: string): SectorInfo | undefined => SECTORS.find((s) => s.id === id);

/** Landing/karşılama listelerinde gösterilen sektörler (generic hariç) */
export const BUSINESS_SECTORS = SECTORS.filter((s) => s.id !== 'generic');
