// Bireysel taraf teklifleri — sectrai-unified-ai-os-foundation/src/core/routing.mjs bireysel-authority
// taksonomisi (Symbiosis/KFM/actor.coach) + bugün kurulan gerçek ürünler (sectrai-individual/velvet/archive).

export interface OfferingInfo {
  id: string;
  label: string;
  authority: string;
  product: string;
  tagline: string;
  keywords: string[];
  modules: { id: string; label: string }[];
}

const M = (id: string, label: string) => ({ id, label });

export const INDIVIDUAL_OFFERINGS: OfferingInfo[] = [
  {
    id: 'personal-reflection',
    label: 'Kişisel Yansıma',
    authority: 'Symbiosis',
    product: 'Sectrai Personal',
    tagline: 'Nasıl değiştiğini anla — verin sende, kontrol sende.',
    keywords: ['yansıma', 'günlük', 'değişim', 'nasıl değiştim', 'kendim', 'düşüncelerim', 'reflection', 'journal'],
    modules: [M('reflection', 'Yansıma'), M('timeline', 'Zaman Çizelgesi'), M('memory-controls', 'Hafıza Kontrolleri')],
  },
  {
    id: 'learning',
    label: 'Öğrenme Dünyaları',
    authority: 'KFM Learning Worlds',
    product: 'Sectrai Learn',
    tagline: 'Yaş bandına uygun, aile-güvenli öğrenme dünyaları.',
    keywords: ['öğren', 'öğrenmek', 'kurs', 'ders', 'çocuğum', 'eğitim', 'çalışmak istiyorum', 'learn', 'study', 'course'],
    modules: [M('learning-world', 'Öğrenme Dünyası'), M('family-brief', 'Aile Brifingi'), M('age-bands', 'Yaş Bantları')],
  },
  {
    id: 'coaching',
    label: 'Performans Koçu',
    authority: 'actor.coach',
    product: 'Sectrai Coach',
    tagline: 'Prova, konuşma, sahne — kanıta dayalı performans geri bildirimi.',
    keywords: ['koç', 'koçluk', 'prova', 'konuşma', 'sunum', 'oyunculuk', 'sahne', 'performans', 'coach', 'rehearsal'],
    modules: [M('performance-eye', 'Performans Gözü'), M('rehearsal', 'Prova Analizi'), M('evidence-pack', 'Kanıt Paketleri')],
  },
  {
    id: 'creative-companion',
    label: 'Velvet — Yaratıcı Yoldaş',
    authority: 'Velvet',
    product: 'Sectrai Velvet',
    tagline: 'Hikâyeni birlikte kur; her adım senin onayınla.',
    keywords: ['hikaye', 'hikâye', 'yoldaş', 'yaratıcı', 'yazmak', 'kurgu', 'karakter', 'story', 'companion', 'creative'],
    modules: [M('story-drafts', 'Hikâye Taslakları'), M('approval-chain', 'Onay Zinciri'), M('mood-board', 'Pano')],
  },
  {
    id: 'personal-archive',
    label: 'Kişisel Arşiv',
    authority: 'THE ARCHIVE',
    product: 'Sectrai Archive',
    tagline: 'Kanonunu, koleksiyonunu, karar geçmişini tek yerde sakla.',
    keywords: ['arşiv', 'koleksiyon', 'kanon', 'saklamak', 'belgelerim', 'anılar', 'archive', 'collection'],
    modules: [M('canon', 'Kanon'), M('timeline', 'Zaman Tüneli'), M('decision-table', 'Karar Tablosu')],
  },
  {
    id: 'personal-assistant',
    label: 'Kişisel Asistan & Cihazlar',
    authority: 'Sectrai Individual',
    product: 'Sectrai Individual',
    tagline: 'Cihazlarını güvenle eşleştir; her komut imzalı ve denetimli.',
    keywords: ['cihaz', 'asistan', 'eşleştir', 'telefon', 'bilgisayar', 'oturum', 'device', 'assistant', 'pairing'],
    modules: [M('device-pairing', 'Cihaz Eşleştirme'), M('session-plans', 'Oturum Planları'), M('security-audit', 'Güvenlik Denetimi')],
  },
];

export const offeringById = (id: string): OfferingInfo | undefined => INDIVIDUAL_OFFERINGS.find((o) => o.id === id);
