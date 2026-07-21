// SECTRAI ön-kapı beyni — deterministik, anahtarsız (LLM-hazır).
// Desen kaynakları (salt-okunur port):
//   • front-door.mjs  → öneri-only akış: proposal → consent → handoff-preview → ApprovalRequest
//   • routing.mjs     → TR+EN anahtar-kelime niyet çözümü
//   • operator.ts     → hazır-aksiyon + risk sınıfı; "AI kendi onayını üretemez" (Sözleşme-4)
//   • company-memory  → her öneri kanıt gösterir

import { panel } from './panels.js';
import { BUSINESS_SECTORS, type SectorInfo } from './registry.js';
import { INDIVIDUAL_OFFERINGS, type OfferingInfo } from './individual.js';
import { validateModuleDraft } from './validate.js';
import type {
  ApprovalRequest,
  ModuleDraft,
  Panel,
  PendingProposal,
  Purpose,
  SchemaField,
} from './types.js';

const lower = (s: string) => s.toLocaleLowerCase('tr-TR');

// ── Karşılama ──────────────────────────────────────────────────────────────────

export function welcomeText(name: string): string {
  return (
    `Merhaba ${name}, SECTRAI'ye hoş geldin! 👋\n\n` +
    `Ben platformun yapay zekâ asistanıyım. Bu platformda neler yapabilirsin:\n\n` +
    `• **KONUŞ** — bana her şeyi sorabilirsin; sol taraftaki arşivde sohbetlerin saklanır (ücretsiz).\n` +
    `• **UYGULA** — üstteki UYGULA düğmesine geçersen sana gerçek bir sistem kurarım: ` +
    `işletmen için ${BUSINESS_SECTORS.length} sektörde hazır AI-OS modülleri, ya da bireysel hayatın için ` +
    `${INDIVIDUAL_OFFERINGS.length} kişisel ürün — ve bunlar yetmezse tarif ettiğin şeyi senin için taslaklarım.\n\n` +
    `Kural basit: ben yalnızca ÖNERİRİM ve kanıt gösteririm; kurulum ancak senin onayınla olur. ` +
    `Hazır olduğunda UYGULA’ya geç, ya da buradan sormaya başla.`
  );
}

export function chatReply(text: string): string {
  const t = lower(text);
  if (/(neler yapabilir|ne yapabilir|nasıl çalış|özellik)/.test(t)) {
    return (
      `Şunları yapabilirim:\n\n` +
      `• İşletmen için sektörüne özel bir AI-OS kurabilirim (${BUSINESS_SECTORS.map((s) => s.label).slice(0, 5).join(', ')}… dahil ${BUSINESS_SECTORS.length} sektör).\n` +
      `• Bireysel tarafta kişisel yansıma, öğrenme, koçluk, yaratıcı yoldaş, arşiv ve cihaz asistanı kurabilirim.\n` +
      `• Var olan hiçbir şey işine yaramıyorsa, tarif et — sana gerçek şema dilinde yeni bir modül taslağı çıkarırım.\n\n` +
      `Bunları kurmak için üstteki **UYGULA** düğmesine geç; orada anlattıkça sağdaki tuvalde sistemin canlı oluşur.`
    );
  }
  const sector = detectSector(text);
  if (sector) {
    return (
      `${sector.label} alanında çalıştığını anladım. Bu sektör için ${sector.modules.length} hazır modülüm var ` +
      `(örn. ${sector.modules.slice(0, 3).map((m) => m.label).join(', ')}). ` +
      `Kurulumu başlatmak istersen üstteki **UYGULA** düğmesine geç — orada önerimi tuvalde gösterip onayına sunarım.`
    );
  }
  return (
    `Anladım. Sana en iyi iki şekilde yardım edebilirim: sorularını burada yanıtlarım, ` +
    `ya da üstteki **UYGULA** moduna geçersen anlattığın ihtiyaç için gerçek bir çalışma alanı kurarım — ` +
    `önce öneririm, sen onaylarsın, sonra kurulur. Denemek ister misin?`
  );
}

// ── Niyet çözümü (routing.mjs deseni) ─────────────────────────────────────────

/**
 * operator.ts eşleşme deseninin Türkçe-uyarlaması: tek-kelime anahtarlar token-ÖNEK eşleşir
 * (sondan-eklemeli dil: "kamyonluk/şantiyemde" yakalanır; "yaptır" ⊄ "tır" kaçağı kapalı),
 * çok-kelimeli/tireli anahtarlar alt-dizgi eşleşir.
 */
function makeMatcher(text: string): (kw: string) => boolean {
  const t = lower(text);
  const tokens = t.split(/[^\p{L}0-9]+/u).filter(Boolean);
  return (kw) =>
    /[^\p{L}0-9]/u.test(kw)
      ? t.includes(kw)
      : tokens.some((tok) => (kw.length >= 3 ? tok.startsWith(kw) : tok === kw));
}

export function detectSector(text: string): SectorInfo | null {
  const t = lower(text);
  // 1. geçiş: etiket birebir (çip tıklaması) — anahtar-kelime kaçağına karşı önceliklidir
  for (const s of BUSINESS_SECTORS) if (t.includes(lower(s.label))) return s;
  const match = makeMatcher(text);
  for (const s of BUSINESS_SECTORS) if (s.keywords.some(match)) return s;
  return null;
}

export function detectOffering(text: string): OfferingInfo | null {
  const t = lower(text);
  for (const o of INDIVIDUAL_OFFERINGS) if (t.includes(lower(o.label))) return o;
  const match = makeMatcher(text);
  for (const o of INDIVIDUAL_OFFERINGS) if (o.keywords.some(match)) return o;
  return null;
}

/** front-door.mjs confirmedFacts deseni: mesajdan doğrulanmış ölçek/ölçüt çıkar */
export function confirmedFacts(text: string): string[] {
  const facts: string[] = [];
  const t = lower(text);
  const qty = t.match(/(\d+)\s*(araç|kamyon|tır|oda|yatak|öğrenci|kişi|çalışan|şube|masa|makine|dönüm|parsel|daire|mağaza|istasyon|sahne|set)/);
  if (qty) facts.push(`Ölçek: ${qty[1]} ${qty[2]}`);
  if (/(avrupa|europe)/.test(t)) facts.push('Bölge: Avrupa');
  if (/(türkiye|turkey)/.test(t)) facts.push('Bölge: Türkiye');
  if (/(bugün|hemen|acil)/.test(t)) facts.push('Zamanlama: hemen başlamak istiyor');
  return facts;
}

// ── Otomatik amaç mesajları (İş / Bireysel çipleri) ───────────────────────────

export function purposeReply(purpose: Purpose): { text: string; chips: { value: string; label: string }[] } {
  if (purpose === 'business') {
    return {
      text:
        `Harika — işletmen için kuruyoruz. AI-OS sistem kurabileceğim sektörler şunlar ` +
        `(hepsi gerçek modül kayıt-defterinden geliyor):\n\n` +
        BUSINESS_SECTORS.map((s) => `• **${s.label}** — ${s.modules.length} modül`).join('\n') +
        `\n\nSektörünü seç ya da işini kendi cümlelerinle anlat ("15 kamyonluk filom var" gibi) — ` +
        `anlattıkça sağdaki tuvalde sistemini kurmaya başlarım.`,
      chips: BUSINESS_SECTORS.map((s) => ({ value: s.label, label: s.label })),
    };
  }
  return {
    text:
      `Güzel — bireysel tarafta şunları kurabilirim (hepsi bugün çalışan gerçek ürünler):\n\n` +
      INDIVIDUAL_OFFERINGS.map((o) => `• **${o.label}** (${o.product}) — ${o.tagline}`).join('\n') +
      `\n\nBirini seç, ya da bambaşka bir şey istiyorsan tarif et — ` +
      `senin için gerçek şema dilinde YENİ bir modül taslağı çıkarır, onayına sunarım.`,
    chips: [
      ...INDIVIDUAL_OFFERINGS.map((o) => ({ value: o.label, label: o.label })),
      { value: 'Yeni bir şey tarif etmek istiyorum', label: '✦ Yeni bir şey yarat' },
    ],
  };
}

// ── CAP-032: yeni-modül taslağı (gerçek ModuleSchema dilinde) ─────────────────

const TR_MAP: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };
export function slugify(text: string): string {
  const s = lower(text)
    .replace(/[çğıöşüâîû]/g, (c) => TR_MAP[c] ?? c)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32)
    .replace(/-+$/g, '');
  return s.length >= 2 ? s : 'ozel-modul';
}

interface FieldRule {
  pattern: RegExp;
  field: SchemaField;
  evidence: string;
}

// Deterministik alan çıkarımı: tariften bilinen kavramlar yakalanır, her alan kanıtıyla eklenir.
const FIELD_RULES: FieldRule[] = [
  { pattern: /(tarih|gün|zaman|ne zaman|hatırlat|date)/, field: { key: 'date', label: 'Tarih', type: 'date' }, evidence: 'tarih/zaman ifadesi' },
  { pattern: /(adet|miktar|sayı|kaç|quantity)/, field: { key: 'quantity', label: 'Miktar', type: 'number', min: 0 }, evidence: 'miktar ifadesi' },
  { pattern: /(fiyat|ücret|bütçe|maliyet|tl|lira|para|price)/, field: { key: 'amount', label: 'Tutar', type: 'number', min: 0, currency: true }, evidence: 'para/tutar ifadesi' },
  { pattern: /(kişi|sorumlu|üye|arkadaş|aile|ekip|person)/, field: { key: 'person', label: 'İlgili Kişi', type: 'user' }, evidence: 'kişi ifadesi' },
  { pattern: /(konum|yer|adres|nerede|şehir|location)/, field: { key: 'place', label: 'Konum', type: 'text' }, evidence: 'konum ifadesi' },
  { pattern: /(kategori|tür|tip|çeşit|sınıf)/, field: { key: 'category', label: 'Kategori', type: 'text' }, evidence: 'kategori ifadesi' },
  { pattern: /(puan|değerlendir|yıldız|skor|rating)/, field: { key: 'rating', label: 'Puan', type: 'integer', min: 1, max: 5 }, evidence: 'puan ifadesi' },
  { pattern: /(tamamla|bitir|takip|ilerleme|durum)/, field: { key: 'progress', label: 'İlerleme (%)', type: 'number', min: 0, max: 100 }, evidence: 'ilerleme ifadesi' },
];

/** Tariften ad çıkar: ilk anlamlı 2-4 kelime (fiil/dolgu kelimeleri atılır) */
const STOPWORDS = new Set([
  'bir', 'için', 'benim', 'kendi', 'yeni', 'istiyorum', 'istiyor', 'lazım', 'gerek', 'takip', 'etmek',
  'yapmak', 'kurmak', 'oluşturmak', 'sistemi', 'sistem', 'uygulama', 'app', 've', 'ile', 'gibi', 'şey',
]);

export function draftName(text: string): string {
  const words = text
    .replace(/[^\p{L}0-9 ]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(lower(w)));
  const picked = words.slice(0, 3).join(' ').trim();
  return picked ? picked.charAt(0).toLocaleUpperCase('tr-TR') + picked.slice(1) : 'Özel Takip';
}

export function draftCustomModule(description: string): ModuleDraft {
  const t = lower(description);
  const name = draftName(description);
  const id = slugify(name);
  const evidence: string[] = [`tarif: "${description.slice(0, 120)}"`];

  const fields: SchemaField[] = [{ key: 'title', label: 'Başlık', type: 'text', required: true }];
  for (const rule of FIELD_RULES) {
    const m = t.match(rule.pattern);
    if (m && !fields.some((f) => f.key === rule.field.key)) {
      fields.push(rule.field);
      evidence.push(`${rule.evidence} ("${m[0]}")`);
    }
  }
  fields.push({ key: 'notes', label: 'Notlar', type: 'text' });

  return {
    id,
    tier: 1,
    kind: 'generic',
    name,
    description: description.slice(0, 200),
    capabilities: [`custom.${id}`],
    dependencies: [],
    sectorLabels: { generic: name },
    schema: {
      table: id.replace(/-/g, '_'),
      noun: name,
      fields,
      statuses: [
        { value: 'draft', label: 'Taslak', tone: 'neutral' },
        { value: 'active', label: 'Aktif', tone: 'info' },
        { value: 'done', label: 'Tamamlandı', tone: 'good' },
      ],
      columns: fields.slice(0, 4).map((f) => f.key),
    },
    evidence,
  };
}

// ── WORK önerisi kurma (front-door.mjs handleMessage deseni) ──────────────────

export interface BrainResult {
  aiText: string;
  chips?: { value: string; label: string }[];
  panels: Panel[];
  auditEvents: { eventType: string; decision: string; evidenceRefs: string[] }[];
  approval: ApprovalRequest | null;
  pendingProposal: PendingProposal | null;
}

let approvalCounter = 0;
const approvalId = () => `appr-${Date.now().toString(36)}-${(approvalCounter++).toString(36)}`;

function noProposal(aiText: string, questions: string[], chips?: { value: string; label: string }[]): BrainResult {
  return {
    aiText,
    chips,
    panels: [panel('clarification', { title: 'Güvenli yönlendirme için netleştirelim', questions })],
    auditEvents: [{ eventType: 'INTENT_CLARIFICATION_REQUIRED', decision: 'NO_PRODUCT_SELECTED', evidenceRefs: [] }],
    approval: null,
    pendingProposal: null,
  };
}

export function processWork(purpose: Purpose | null, text: string): BrainResult {
  if (!purpose) {
    const sector = detectSector(text);
    const offering = detectOffering(text);
    if (!sector && !offering) {
      return noProposal(
        'Başlamadan önce tek bir şeyi netleştirelim: bu kurulum işletmen için mi, yoksa kendin için mi? Aşağıdaki çiplerden seçebilirsin.',
        ['Bu kurulum iş için mi, bireysel mi?'],
        [
          { value: '__purpose:business', label: 'İş' },
          { value: '__purpose:individual', label: 'Bireysel' },
        ],
      );
    }
    // Niyet açıkça belliyse amacı çıkarımla ilerlet (fail-open değil: tek adım, yine onay kapılı)
    return sector ? businessProposal(sector, text) : individualProposal(offering!, text);
  }
  if (purpose === 'business') {
    const sector = detectSector(text);
    if (!sector) {
      return noProposal(
        'Hangi sektörde çalıştığını tam çıkaramadım. Yukarıdaki listeden seçebilir ya da işini bir cümleyle anlatabilirsin ("üç şubeli restoranım var" gibi).',
        ['Hangi sektörde faaliyet gösteriyorsun?'],
      );
    }
    return businessProposal(sector, text);
  }
  const offering = detectOffering(text);
  if (offering) return individualProposal(offering, text);
  // Eşleşme yok → tarif yeterliyse CAP-032 taslağı; değilse netleştir
  const meaningful = text.replace(/[^\p{L}]/gu, '').length;
  if (/(yeni bir şey|tarif etmek)/i.test(text) || meaningful < 12) {
    return noProposal(
      'Süper — ne istediğini kendi cümlelerinle anlat: neyi takip etmek ya da yönetmek istiyorsun, içinde neler olsun? (örn. "kitap koleksiyonumu takip etmek istiyorum, tarih ve puan da olsun")',
      ['Ne takip etmek/yönetmek istiyorsun? Hangi bilgiler olsun?'],
    );
  }
  return customProposal(text);
}

function businessProposal(sector: SectorInfo, text: string): BrainResult {
  const facts = confirmedFacts(text);
  const matched = sector.keywords.filter((k) => lower(text).includes(k));
  const evidence = matched.length ? [`eşleşen ifadeler: ${matched.join(', ')}`] : [`sektör seçimi: ${sector.label}`];
  const missing = facts.length ? [] : ['Ölçeği paylaşır mısın? (örn. araç/oda/öğrenci sayısı)'];
  const approval: ApprovalRequest = {
    approvalId: approvalId(),
    action: `INSTALL_SECTOR_${sector.id.toUpperCase().replace(/-/g, '_')}`,
    risk: 'medium',
    status: 'PROPOSED',
    summary: `${sector.label} çalışma alanı — ${sector.modules.length} modül`,
  };
  return {
    aiText:
      `**${sector.label}** için hazırım. Sağdaki tuvalde önerimi kurdum: ${sector.modules.length} modüllük bir çalışma alanı ` +
      `(${sector.modules.slice(0, 4).map((m) => m.label).join(', ')}…). ` +
      (facts.length ? `Şunları not ettim: ${facts.join(' · ')}. ` : '') +
      `İncele — onaylarsan kurulumu yapıyorum. Ben kendi kendime kuramam; karar senin.`,
    panels: [
      panel('recommendation', {
        product: `SECTRAI AI-OS · ${sector.label}`,
        authority: 'Sektral Compose Registry',
        reason: `${sector.label} bu ihtiyacın mevcut otoritesi; modüller gerçek kayıt-defterinden seçildi.`,
        evidence,
      }),
      panel('requirements-summary', { confirmedFacts: facts, missingQuestions: missing }),
      panel('workspace-preview', { product: `${sector.label} Çalışma Alanı`, modules: sector.modules }),
      panel('approval', { approval }),
    ],
    auditEvents: [
      { eventType: 'INTENT_RECEIVED', decision: `sector:${sector.id}`, evidenceRefs: evidence },
      { eventType: 'PROPOSAL_CREATED', decision: `${sector.modules.length}_MODULES`, evidenceRefs: [approval.approvalId] },
      { eventType: 'APPROVAL_PROPOSED', decision: approval.action, evidenceRefs: [approval.approvalId] },
    ],
    approval,
    pendingProposal: {
      kind: 'sector',
      title: `${sector.label} Çalışma Alanı`,
      sectorId: sector.id,
      modules: sector.modules,
    },
  };
}

function individualProposal(offering: OfferingInfo, text: string): BrainResult {
  const matched = offering.keywords.filter((k) => lower(text).includes(k));
  const evidence = matched.length ? [`eşleşen ifadeler: ${matched.join(', ')}`] : [`seçim: ${offering.label}`];
  const approval: ApprovalRequest = {
    approvalId: approvalId(),
    action: `INSTALL_OFFERING_${offering.id.toUpperCase().replace(/-/g, '_')}`,
    risk: 'low',
    status: 'PROPOSED',
    summary: `${offering.label} (${offering.product})`,
  };
  const needsMemory = offering.id === 'personal-reflection';
  const panels: Panel[] = [
    panel('recommendation', {
      product: offering.product,
      authority: offering.authority,
      reason: `${offering.authority}, "${offering.label}" ihtiyacının mevcut otoritesi. ${offering.tagline}`,
      evidence,
    }),
    panel('workspace-preview', { product: offering.product, modules: offering.modules }),
  ];
  if (needsMemory) {
    panels.push(panel('memory-controls', { required: true, enabled: false, scopes: ['sentetik-yıl-özeti'] }));
  }
  panels.push(panel('approval', { approval }));
  return {
    aiText:
      `**${offering.label}** için önerimi tuvale kurdum — ${offering.product} (otorite: ${offering.authority}). ` +
      `${offering.tagline} ` +
      (needsMemory ? 'Not: bu ürün kişisel hafıza erişimi ister; kontrol tamamen sende olacak. ' : '') +
      `Onaylarsan çalışma alanını kuruyorum.`,
    panels,
    auditEvents: [
      { eventType: 'INTENT_RECEIVED', decision: `offering:${offering.id}`, evidenceRefs: evidence },
      { eventType: 'PROPOSAL_CREATED', decision: offering.product, evidenceRefs: [approval.approvalId] },
      { eventType: 'APPROVAL_PROPOSED', decision: approval.action, evidenceRefs: [approval.approvalId] },
    ],
    approval,
    pendingProposal: {
      kind: 'offering',
      title: offering.label,
      offeringId: offering.id,
      modules: offering.modules,
    },
  };
}

function customProposal(text: string): BrainResult {
  const draft = draftCustomModule(text);
  const validation = validateModuleDraft(draft);
  if (!validation.ok) {
    return noProposal(
      `Tarifinden bir taslak çıkarmayı denedim ama doğrulamadan geçmedi (${validation.errors[0]}). Biraz daha ayrıntı verir misin?`,
      ['Neyi takip etmek istiyorsun? Hangi bilgiler kayıtta olsun?'],
    );
  }
  const approval: ApprovalRequest = {
    approvalId: approvalId(),
    action: `CREATE_CUSTOM_MODULE_${draft.id.toUpperCase().replace(/-/g, '_')}`,
    risk: 'medium',
    status: 'PROPOSED',
    summary: `Yeni modül taslağı: ${draft.name} (${draft.schema.fields.length} alan)`,
  };
  return {
    aiText:
      `Tarifinden yola çıkıp senin için **"${draft.name}"** adında yeni bir modül taslağı çıkardım — ` +
      `gerçek şema dilinde, ${draft.schema.fields.length} alanla (${draft.schema.fields.map((f) => f.label).join(', ')}). ` +
      `Tuvalde alanları ve taslağın kanıtını görebilirsin. Onaylarsan kişisel çalışma alanına kurarım.`,
    panels: [
      panel('recommendation', {
        product: `Özel Modül · ${draft.name}`,
        authority: 'SECTRAI Compose (taslak)',
        reason: 'Mevcut ürünler bu tarifi karşılamıyor; tarifinden yeni bir modül taslağı üretildi.',
        evidence: draft.evidence,
      }),
      panel('form', {
        noun: draft.schema.noun,
        fields: draft.schema.fields,
        statuses: draft.schema.statuses,
      }),
      panel('handoff-preview', { package: { draft } }),
      panel('approval', { approval }),
    ],
    auditEvents: [
      { eventType: 'INTENT_RECEIVED', decision: 'custom-module', evidenceRefs: draft.evidence },
      { eventType: 'MODULE_DRAFTED', decision: draft.id, evidenceRefs: draft.evidence },
      { eventType: 'APPROVAL_PROPOSED', decision: approval.action, evidenceRefs: [approval.approvalId] },
    ],
    approval,
    pendingProposal: {
      kind: 'custom',
      title: draft.name,
      modules: [{ id: draft.id, label: draft.name }],
      draft,
    },
  };
}
