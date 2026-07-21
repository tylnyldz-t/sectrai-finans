// Modül form şemaları — registry modülleri yalnız {id,label} taşır (şema yok). Buradaki şemalar,
// Masa'daki HER pinlenebilir modülün gerçek kayıt defteridir: alanlı form, doğrulanabilir değerler,
// durum ve tablo kolonları. Şablonlar sektör ailelerine göre paylaşılır; bilinmeyen/özel modüller de
// yüzeysel bir "başlık + not" formuna düşmez, ayrıntılı genel kayıt şemasını alır.

import type { ModuleSchema, SchemaField } from './types.js';

const DEFAULT_STATUSES = [
  { value: 'draft', label: 'Taslak', tone: 'neutral' as const },
  { value: 'active', label: 'Aktif', tone: 'info' as const },
  { value: 'done', label: 'Tamamlandı', tone: 'good' as const },
];

const f = (key: string, label: string, type: SchemaField['type'], extra: Partial<SchemaField> = {}): SchemaField =>
  ({ key, label, type, ...extra });

const priority = f('priority', 'Öncelik', 'enum', {
  enumValues: [
    { value: 'low', label: 'Düşük', tone: 'neutral' },
    { value: 'normal', label: 'Normal', tone: 'info' },
    { value: 'high', label: 'Yüksek', tone: 'warn' },
    { value: 'critical', label: 'Kritik', tone: 'bad' },
  ],
});

const currency = f('currency', 'Para birimi', 'enum', {
  enumValues: [{ value: 'TRY', label: 'TRY' }, { value: 'EUR', label: 'EUR' }, { value: 'USD', label: 'USD' }, { value: 'GBP', label: 'GBP' }],
});

const note = (key = 'notes', label = 'Notlar') => f(key, label, 'textarea', { maxLength: 2_000, placeholder: 'Bağlam, açıklama veya takip notu' });
const description = (label = 'Açıklama') => f('description', label, 'textarea', { maxLength: 2_000, placeholder: 'Kapsamı ve önemli ayrıntıları yaz' });
const reference = () => f('reference', 'Referans no', 'text', { maxLength: 80, placeholder: 'İç referans / harici kayıt no' });
const owner = () => f('owner', 'Sorumlu', 'text', { maxLength: 120, placeholder: 'Kişi veya ekip' });

const WORK_STATUSES = [
  { value: 'todo', label: 'Yapılacak', tone: 'neutral' as const },
  { value: 'doing', label: 'Devam ediyor', tone: 'info' as const },
  { value: 'blocked', label: 'Bloklu', tone: 'warn' as const },
  { value: 'done', label: 'Tamamlandı', tone: 'good' as const },
];

const CONTRACT_STATUSES = [
  { value: 'draft', label: 'Taslak', tone: 'neutral' as const },
  { value: 'review', label: 'İncelemede', tone: 'warn' as const },
  { value: 'active', label: 'Aktif', tone: 'good' as const },
  { value: 'closed', label: 'Kapandı', tone: 'neutral' as const },
];

const GENERAL_FIELDS = (): SchemaField[] => [
  f('title', 'Başlık', 'text', { required: true, maxLength: 180, placeholder: 'Kaydı tanımlayan kısa başlık' }),
  f('category', 'Kategori', 'text', { maxLength: 100, placeholder: 'Kayıt türü veya sınıfı' }),
  description(),
  reference(),
  owner(),
  priority,
  f('startDate', 'Başlangıç tarihi', 'date'),
  f('dueDate', 'Hedef / bitiş tarihi', 'date'),
  f('amount', 'Tutar', 'number', { min: 0, currency: true }),
  currency,
  note(),
];

const WORK_FIELDS = (): SchemaField[] => [
  f('title', 'İş başlığı', 'text', { required: true, maxLength: 180 }),
  description('İş kapsamı'),
  priority,
  owner(),
  f('startDate', 'Başlangıç tarihi', 'date'),
  f('dueDate', 'Bitiş tarihi', 'date'),
  f('estimatedHours', 'Tahmini süre (saat)', 'number', { min: 0 }),
  reference(),
  note('Teslim / takip notu'),
];

const DOCUMENT_FIELDS = (): SchemaField[] => [
  f('title', 'Belge adı', 'text', { required: true, maxLength: 180 }),
  f('documentType', 'Belge türü', 'enum', { enumValues: [{ value: 'contract', label: 'Sözleşme' }, { value: 'invoice', label: 'Fatura' }, { value: 'report', label: 'Rapor' }, { value: 'certificate', label: 'Sertifika' }, { value: 'other', label: 'Diğer' }] }),
  f('documentNo', 'Belge no', 'text', { maxLength: 100, unique: true }),
  f('issuedDate', 'Düzenleme tarihi', 'date'),
  f('expiryDate', 'Geçerlilik bitişi', 'date'),
  f('issuer', 'Düzenleyen', 'text', { maxLength: 160 }),
  reference(),
  note('Belge notu'),
];

// Yaygın (sektörler-arası paylaşılan) modül id'leri → özel şema.
const BY_ID: Record<string, Omit<ModuleSchema, 'table'>> = {
  collections: {
    noun: 'Tahsilat incelemesi',
    fields: [
      f('title', 'İnceleme başlığı', 'text', { required: true, maxLength: 180 }),
      f('counterparty', 'Müvekkil / borçlu', 'text', { required: true, maxLength: 180 }),
      f('amount', 'Açık tutar', 'number', { required: true, min: 0, currency: true }), currency,
      f('dueDate', 'Vade tarihi', 'date'), f('daysOverdue', 'Gecikme günü', 'integer', { min: 0 }),
      f('evidenceRef', 'Kanıt referansı', 'text', { maxLength: 120 }), owner(), note('Mutabakat / takip notu'),
    ],
    statuses: [{ value: 'pending_review', label: 'İnceleme bekliyor', tone: 'warn' }, { value: 'follow_up', label: 'Takipte', tone: 'info' }, { value: 'closed', label: 'Kapandı', tone: 'good' }],
    columns: ['title', 'counterparty', 'amount'],
  },
  claims: {
    noun: 'Belge incelemesi',
    fields: [
      f('title', 'İnceleme başlığı', 'text', { required: true, maxLength: 180 }),
      f('referenceNo', 'Dosya / poliçe referansı', 'text', { required: true, maxLength: 100, unique: true }),
      f('amount', 'İlgili tutar', 'number', { min: 0, currency: true }), currency,
      f('evidenceRef', 'Eksik / kanıt referansı', 'text', { maxLength: 120 }), owner(), note('Checker notu'),
    ],
    statuses: [{ value: 'pending_review', label: 'İnceleme bekliyor', tone: 'warn' }, { value: 'request_evidence', label: 'Kanıt istendi', tone: 'info' }, { value: 'closed', label: 'Kapandı', tone: 'good' }],
    columns: ['title', 'referenceNo', 'amount'],
  },
  aml: {
    noun: 'Uyum uyarısı',
    fields: [
      f('title', 'Uyarı başlığı', 'text', { required: true, maxLength: 180 }),
      f('referenceNo', 'Uyarı referansı', 'text', { required: true, maxLength: 100, unique: true }),
      f('amount', 'İlgili tutar', 'number', { min: 0, currency: true }), currency,
      f('riskLevel', 'Risk seviyesi', 'enum', { required: true, enumValues: [{ value: 'low', label: 'Düşük', tone: 'neutral' }, { value: 'medium', label: 'Orta', tone: 'warn' }, { value: 'high', label: 'Yüksek', tone: 'bad' }] }),
      f('evidenceRef', 'Kanıt referansı', 'text', { maxLength: 120 }), owner(), note('İnsan inceleme notu'),
    ],
    statuses: [{ value: 'pending_review', label: 'İnsan incelemesi gerekli', tone: 'warn' }, { value: 'escalated', label: 'Yükseltildi', tone: 'bad' }, { value: 'closed', label: 'Kapandı', tone: 'good' }],
    columns: ['title', 'riskLevel', 'amount'],
  },
  'cashflow-scenarios': {
    noun: 'Nakit akışı senaryosu',
    fields: [
      f('title', 'Senaryo adı', 'text', { required: true, maxLength: 180 }),
      f('horizon', 'Ufuk', 'text', { required: true, maxLength: 40 }),
      f('opening', 'Açılış bakiyesi', 'number', { required: true, min: 0, currency: true }),
      f('inflow', 'Beklenen giriş', 'number', { required: true, min: 0, currency: true }),
      f('outflow', 'Beklenen çıkış', 'number', { required: true, min: 0, currency: true }),
      f('closing', 'Kapanış bakiyesi', 'number', { required: true, min: 0, currency: true }), currency, note('Varsayım ve kanıt özeti'),
    ],
    statuses: [{ value: 'draft', label: 'Taslak', tone: 'neutral' }, { value: 'review', label: 'İncelemede', tone: 'warn' }, { value: 'approved', label: 'Onaylandı', tone: 'good' }],
    columns: ['title', 'horizon', 'closing'],
  },
  crm: {
    noun: 'Kişi/Firma',
    fields: [
      f('name', 'Ad / Unvan', 'text', { required: true, maxLength: 180 }),
      f('partyType', 'Kayıt türü', 'enum', { enumValues: [{ value: 'customer', label: 'Müşteri' }, { value: 'supplier', label: 'Tedarikçi' }, { value: 'partner', label: 'İş ortağı' }, { value: 'person', label: 'Kişi' }] }),
      f('phone', 'Telefon', 'tel', { maxLength: 30 }),
      f('email', 'E-posta', 'email', { maxLength: 180, unique: true }),
      f('city', 'Şehir / bölge', 'text', { maxLength: 100 }),
      f('taxOrIdentityNo', 'Vergi / kimlik no', 'text', { maxLength: 40 }),
      owner(),
      note('İlişki notu'),
    ],
    statuses: [{ value: 'active', label: 'Aktif', tone: 'good' }, { value: 'passive', label: 'Pasif', tone: 'neutral' }],
    columns: ['name', 'phone', 'email'],
  },
  finance: {
    noun: 'Hareket',
    fields: [
      f('title', 'Açıklama', 'text', { required: true, maxLength: 180 }),
      f('kind', 'Tür', 'enum', { required: true, enumValues: [{ value: 'income', label: 'Gelir', tone: 'good' }, { value: 'expense', label: 'Gider', tone: 'warn' }] }),
      f('amount', 'Tutar', 'number', { min: 0, currency: true, required: true }), currency,
      f('date', 'İşlem tarihi', 'date', { required: true }),
      f('counterparty', 'Karşı taraf', 'text', { maxLength: 180 }),
      f('paymentMethod', 'Ödeme yöntemi', 'enum', { enumValues: [{ value: 'cash', label: 'Nakit' }, { value: 'bank', label: 'Banka' }, { value: 'card', label: 'Kart' }, { value: 'other', label: 'Diğer' }] }),
      reference(), note('Açıklama / ödeme notu'),
    ],
    statuses: [{ value: 'pending', label: 'Beklemede', tone: 'warn' }, { value: 'paid', label: 'Ödendi', tone: 'good' }],
    columns: ['title', 'kind', 'amount'],
  },
  appointment: {
    noun: 'Randevu',
    fields: [f('title', 'Başlık', 'text', { required: true, maxLength: 180 }), f('person', 'Kişi / kurum', 'text', { maxLength: 180 }), f('startsAt', 'Başlangıç', 'datetime', { required: true }), f('endsAt', 'Bitiş', 'datetime'), f('location', 'Yer / bağlantı', 'text', { maxLength: 180 }), owner(), note('Görüşme notu')],
    statuses: [{ value: 'scheduled', label: 'Planlandı', tone: 'info' }, { value: 'done', label: 'Tamamlandı', tone: 'good' }, { value: 'cancelled', label: 'İptal', tone: 'bad' }],
    columns: ['title', 'person', 'startsAt'],
  },
  asset: {
    noun: 'Varlık',
    fields: [f('name', 'Ad', 'text', { required: true, maxLength: 180 }), f('assetType', 'Varlık türü', 'text', { maxLength: 100 }), f('code', 'Kod / Plaka', 'text', { maxLength: 80, unique: true }), f('serialNo', 'Seri no', 'text', { maxLength: 100, unique: true }), f('location', 'Konum', 'text', { maxLength: 180 }), f('acquiredDate', 'Edinim tarihi', 'date'), f('value', 'Değer', 'number', { min: 0, currency: true }), currency, note('Bakım / kullanım notu')],
    statuses: [{ value: 'active', label: 'Aktif', tone: 'good' }, { value: 'maintenance', label: 'Bakımda', tone: 'warn' }, { value: 'retired', label: 'Pasif', tone: 'neutral' }],
    columns: ['name', 'code'],
  },
  stock: {
    noun: 'Stok Kalemi',
    fields: [f('name', 'Malzeme', 'text', { required: true, maxLength: 180 }), f('sku', 'Stok / barkod kodu', 'text', { maxLength: 100, unique: true }), f('quantity', 'Mevcut miktar', 'number', { min: 0, required: true }), f('unit', 'Birim', 'enum', { required: true, enumValues: [{ value: 'adet', label: 'Adet' }, { value: 'kg', label: 'Kg' }, { value: 'lt', label: 'Litre' }, { value: 'm', label: 'Metre' }, { value: 'paket', label: 'Paket' }] }), f('reorderLevel', 'Yeniden sipariş seviyesi', 'number', { min: 0 }), f('warehouse', 'Depo / konum', 'text', { maxLength: 140 }), f('unitCost', 'Birim maliyet', 'number', { min: 0, currency: true }), currency, f('expiryDate', 'Son kullanma tarihi', 'date'), note('Stok notu')],
    statuses: DEFAULT_STATUSES,
    columns: ['name', 'quantity', 'unit'],
  },
  schedule: {
    noun: 'Plan',
    fields: [f('title', 'Başlık', 'text', { required: true, maxLength: 180 }), f('startsAt', 'Başlangıç', 'datetime', { required: true }), f('endsAt', 'Bitiş', 'datetime'), owner(), f('location', 'Yer', 'text', { maxLength: 180 }), priority, reference(), note('Plan notu')],
    statuses: DEFAULT_STATUSES,
    columns: ['title', 'startsAt', 'owner'],
  },
  'work-item': {
    noun: 'İş Emri',
    fields: WORK_FIELDS(),
    statuses: WORK_STATUSES,
    columns: ['title', 'owner', 'dueDate'],
  },
  documents: {
    noun: 'Belge',
    fields: DOCUMENT_FIELDS(),
    statuses: DEFAULT_STATUSES,
    columns: ['title', 'documentType', 'issuedDate'],
  },
};

const add = (ids: string[], schema: Omit<ModuleSchema, 'table'>) => {
  for (const id of ids) BY_ID[id] = schema;
};

// Lojistik / teklif-odası deseni: hareket, taraf, tarih ve ticari koşullar aynı kayıtta tutulur.
add(['shipment', 'shipment-leg', 'carrier-schedule', 'location', 'geofence'], {
  noun: 'Operasyon kaydı',
  fields: [f('title', 'Sefer / kayıt başlığı', 'text', { required: true, maxLength: 180 }), f('origin', 'Çıkış noktası', 'text', { maxLength: 180 }), f('destination', 'Varış noktası', 'text', { maxLength: 180 }), f('startsAt', 'Planlanan başlangıç', 'datetime'), f('endsAt', 'Planlanan bitiş', 'datetime'), f('carrier', 'Taşıyıcı / sorumlu', 'text', { maxLength: 180 }), f('vehicleOrResource', 'Araç / kaynak', 'text', { maxLength: 120 }), reference(), note('Operasyon notu')],
  statuses: [{ value: 'planned', label: 'Planlandı', tone: 'neutral' }, { value: 'in_progress', label: 'Devam ediyor', tone: 'info' }, { value: 'delivered', label: 'Tamamlandı', tone: 'good' }, { value: 'exception', label: 'İstisna', tone: 'warn' }],
  columns: ['title', 'origin', 'destination'],
});
add(['freight-quote', 'marketplace-offer', 'marketplace'], {
  noun: 'Teklif',
  fields: [f('title', 'Talep / teklif başlığı', 'text', { required: true, maxLength: 180 }), f('counterparty', 'Karşı taraf', 'text', { maxLength: 180 }), f('amount', 'Teklif tutarı', 'number', { min: 0, currency: true, required: true }), currency, f('validUntil', 'Geçerlilik tarihi', 'date'), f('terms', 'Koşullar', 'textarea', { maxLength: 2_000 }), f('scope', 'Kapsam', 'textarea', { maxLength: 2_000 }), reference(), owner()],
  statuses: [{ value: 'draft', label: 'Taslak', tone: 'neutral' }, { value: 'sent', label: 'Gönderildi', tone: 'info' }, { value: 'accepted', label: 'Kabul edildi', tone: 'good' }, { value: 'rejected', label: 'Reddedildi', tone: 'bad' }, { value: 'expired', label: 'Süresi doldu', tone: 'warn' }],
  columns: ['title', 'counterparty', 'amount'],
});
add(['agreements', 'escrow', 'compliance', 'consent', 'obligation', 'license'], {
  noun: 'Sözleşme / uyum kaydı',
  fields: [f('title', 'Başlık', 'text', { required: true, maxLength: 180 }), f('counterparty', 'Taraf / kurum', 'text', { maxLength: 180 }), f('agreementNo', 'Sözleşme / kayıt no', 'text', { maxLength: 100, unique: true }), f('effectiveDate', 'Başlangıç tarihi', 'date'), f('expiryDate', 'Bitiş / yenileme tarihi', 'date'), f('amount', 'Tutar / teminat', 'number', { min: 0, currency: true }), currency, owner(), note('Yükümlülük / inceleme notu')],
  statuses: CONTRACT_STATUSES,
  columns: ['title', 'counterparty', 'expiryDate'],
});

// Üretim, saha ve servis: iş emri + ölçülebilir çıktı.
add(['production-order', 'work-order', 'hk-task', 'quality-check', 'ncr', 'scene-breakdown', 'post-delivery'], {
  noun: 'İş / kalite kaydı',
  fields: [...WORK_FIELDS(), f('quantity', 'Miktar', 'number', { min: 0 }), f('unit', 'Birim', 'text', { maxLength: 40 }), f('result', 'Sonuç / bulgu', 'textarea', { maxLength: 2_000 })],
  statuses: WORK_STATUSES,
  columns: ['title', 'owner', 'dueDate'],
});
add(['machine', 'bom-recipe', 'bom-item', 'goods-receipt', 'customer-return', 'pos-order', 'pos-line'], {
  noun: 'Üretim / ticaret kaydı',
  fields: [f('title', 'Başlık', 'text', { required: true, maxLength: 180 }), f('code', 'Kod', 'text', { maxLength: 100, unique: true }), f('quantity', 'Miktar', 'number', { min: 0, required: true }), f('unit', 'Birim', 'text', { maxLength: 40 }), f('unitPrice', 'Birim fiyat', 'number', { min: 0, currency: true }), currency, f('counterparty', 'Tedarikçi / müşteri', 'text', { maxLength: 180 }), f('date', 'İşlem tarihi', 'date'), reference(), note()],
  statuses: DEFAULT_STATUSES,
  columns: ['title', 'code', 'quantity'],
});

// Sağlık, konaklama ve eğitim: kişi/konu/tarih/izlenebilirlik alanları.
add(['clinical-encounter', 'prescription', 'lab-order', 'treatment-plan'], {
  noun: 'Klinik kayıt',
  fields: [f('title', 'Kayıt başlığı', 'text', { required: true, maxLength: 180 }), f('person', 'Hasta / kişi', 'text', { required: true, maxLength: 180 }), f('recordDate', 'Kayıt tarihi', 'datetime', { required: true }), f('provider', 'Uygulayan', 'text', { maxLength: 180 }), f('referenceNo', 'Referans no', 'text', { maxLength: 100, unique: true }), f('summary', 'Klinik özet', 'textarea', { maxLength: 2_000 }), f('followUpDate', 'Takip tarihi', 'date'), note('Ek not')],
  statuses: [{ value: 'open', label: 'Açık', tone: 'info' }, { value: 'review', label: 'İncelemede', tone: 'warn' }, { value: 'closed', label: 'Kapandı', tone: 'good' }],
  columns: ['title', 'person', 'recordDate'],
});
add(['room', 'reservation', 'kbs-notification'], {
  noun: 'Konaklama kaydı',
  fields: [f('title', 'Başlık / konuk', 'text', { required: true, maxLength: 180 }), f('resource', 'Oda / kaynak', 'text', { maxLength: 100 }), f('checkIn', 'Giriş', 'datetime'), f('checkOut', 'Çıkış', 'datetime'), f('guestCount', 'Kişi sayısı', 'integer', { min: 0 }), f('amount', 'Tutar', 'number', { min: 0, currency: true }), currency, f('contact', 'İletişim', 'tel', { maxLength: 30 }), note()],
  statuses: [{ value: 'reserved', label: 'Rezerve', tone: 'info' }, { value: 'checked_in', label: 'Giriş yaptı', tone: 'good' }, { value: 'checked_out', label: 'Çıkış yaptı', tone: 'neutral' }, { value: 'cancelled', label: 'İptal', tone: 'bad' }],
  columns: ['title', 'resource', 'checkIn'],
});
add(['student', 'tuition', 'attendance', 'engagement', 'time-entry'], {
  noun: 'Eğitim / hizmet kaydı',
  fields: [f('title', 'Başlık', 'text', { required: true, maxLength: 180 }), f('person', 'Öğrenci / müvekkil', 'text', { maxLength: 180 }), f('date', 'Tarih', 'date'), f('duration', 'Süre (saat)', 'number', { min: 0 }), f('amount', 'Tutar', 'number', { min: 0, currency: true }), currency, owner(), f('summary', 'Özet', 'textarea', { maxLength: 2_000 }), reference()],
  statuses: DEFAULT_STATUSES,
  columns: ['title', 'person', 'date'],
});

// Tarım, yakıt ve saha: parsel/varlık, miktar, ölçüm ve tarih.
add(['crop-parcel', 'harvest', 'harvest-lot', 'input-application', 'animal-treatment', 'subsidy', 'fuel-tank', 'pump-sale', 'shift-reconciliation', 'tank-dip'], {
  noun: 'Saha / ölçüm kaydı',
  fields: [f('title', 'Başlık', 'text', { required: true, maxLength: 180 }), f('resource', 'Parsel / tank / varlık', 'text', { maxLength: 180 }), f('quantity', 'Miktar / ölçüm', 'number', { min: 0, required: true }), f('unit', 'Birim', 'text', { maxLength: 40 }), f('recordDate', 'Kayıt tarihi', 'date', { required: true }), f('amount', 'Tutar', 'number', { min: 0, currency: true }), currency, owner(), note('Ölçüm / uygulama notu')],
  statuses: DEFAULT_STATUSES,
  columns: ['title', 'resource', 'quantity'],
});

// Yapım ve bireysel çalışma alanları: kaynak, kanıt ve onay bağlamı saklanır.
add(['film-project', 'scene-card', 'shooting-schedule', 'call-sheet', 'dood', 'cast-seat', 'crew-seat', 'vendor-engagement', 'cost-report'], {
  noun: 'Yapım kaydı',
  fields: [f('title', 'Başlık', 'text', { required: true, maxLength: 180 }), f('department', 'Departman / katman', 'text', { maxLength: 120 }), f('date', 'Tarih', 'date'), f('owner', 'Sorumlu', 'text', { maxLength: 120 }), f('budget', 'Bütçe / maliyet', 'number', { min: 0, currency: true }), currency, f('evidence', 'Kanıt / kaynak', 'textarea', { maxLength: 2_000 }), f('notes', 'Yapım notu', 'textarea', { maxLength: 2_000 })],
  statuses: WORK_STATUSES,
  columns: ['title', 'department', 'date'],
});
add(['reflection', 'timeline', 'memory-controls', 'learning-world', 'family-brief', 'age-bands', 'performance-eye', 'rehearsal', 'evidence-pack', 'story-drafts', 'approval-chain', 'mood-board', 'canon', 'decision-table', 'device-pairing', 'session-plans', 'security-audit'], {
  noun: 'Kişisel kayıt',
  fields: [f('title', 'Başlık', 'text', { required: true, maxLength: 180 }), f('entryDate', 'Kayıt tarihi', 'date', { required: true }), f('category', 'Kategori', 'text', { maxLength: 100 }), f('content', 'İçerik', 'textarea', { required: true, maxLength: 2_000 }), f('evidence', 'Kanıt / kaynak', 'textarea', { maxLength: 2_000 }), f('privacy', 'Görünürlük', 'enum', { enumValues: [{ value: 'private', label: 'Yalnız ben' }, { value: 'shared', label: 'Paylaşımlı' }] }), f('reviewDate', 'Gözden geçirme tarihi', 'date'), note('Ek not')],
  statuses: [{ value: 'draft', label: 'Taslak', tone: 'neutral' }, { value: 'active', label: 'Aktif', tone: 'info' }, { value: 'archived', label: 'Arşivlendi', tone: 'good' }],
  columns: ['title', 'category', 'entryDate'],
});

/** Kayıt formu + liste şeması. Özel yoksa dahi ayrıntılı genel kayıt şeması döner. */
export function moduleSchemaFor(moduleId: string, label: string, draftSchema?: ModuleSchema): ModuleSchema {
  const table = moduleId.replace(/-/g, '_');
  // Bireysel "özel modül" kurulumunda kullanıcının onayladığı şema otoriterdir.
  if (draftSchema) return { ...draftSchema, table: draftSchema.table || table };
  const spec = BY_ID[moduleId];
  if (spec) return { table, ...spec };
  return {
    table,
    noun: label,
    fields: GENERAL_FIELDS(),
    statuses: WORK_STATUSES,
    columns: ['title', 'owner', 'dueDate'],
  };
}
