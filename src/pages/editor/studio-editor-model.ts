import {
  ADAPTIVE_BLOCK_TYPES,
  normalizeModuleRevisionInput,
  type AdaptiveBlockType,
  type ModuleBlockInstance,
  type ModuleRevisionV2,
} from '@shared/adaptive-modules.ts';
import { validateModuleRecordInput } from '@shared/module-record-validation.ts';
import type { ModuleSchema } from '@shared/types.ts';
import type { FlatEditorItem } from './FlatLayoutEditor';

export const STUDIO_BLOCK_LABELS: Record<AdaptiveBlockType, string> = {
  'record-ledger': 'Kayıt defteri',
  'record-form': 'Kayıt formu',
  'record-table': 'Kayıt tablosu',
  'step-workflow': 'Manuel adımlar',
  'activity-timeline': 'Etkinlik zaman çizelgesi',
  'summary-metrics': 'Özet metrikler',
  'reference-link': 'Referans bağlantısı',
};

const LEGACY_TYPE_BY_BLOCK: Record<AdaptiveBlockType, string> = {
  'record-ledger': 'Ledger',
  'record-form': 'Form',
  'record-table': 'Table',
  'step-workflow': 'Workflow',
  'activity-timeline': 'Timeline',
  'summary-metrics': 'Metrics',
  'reference-link': 'Reference',
};

const STUDIO_PRESET_FIELDS: ModuleSchema['fields'] = [
  { key: 'title', label: 'Başlık', type: 'text', required: true, maxLength: 180 },
  {
    key: 'visibility',
    label: 'Görünürlük',
    type: 'enum',
    required: true,
    enumValues: [
      { label: 'Görünür', value: 'visible' },
      { label: 'Gizli', value: 'hidden' },
    ],
  },
];

export type StudioPresetSchemaResolver = (blockType: string, label: string) => ModuleSchema;

/** Yedi allowlist blok tipi aynı dar, şema-güdümlü title/visibility presetini kullanır. */
export function studioPresetSchemaFor(blockType: string, label: string): ModuleSchema {
  const known = ADAPTIVE_BLOCK_TYPES.includes(blockType as AdaptiveBlockType);
  return {
    table: known ? `studio_${blockType.replace(/-/g, '_')}` : 'studio_unknown',
    noun: known ? label : 'Bilinmeyen blok',
    fields: known ? STUDIO_PRESET_FIELDS.map((field) => ({ ...field, enumValues: field.enumValues?.map((option) => ({ ...option })) })) : [],
  };
}

export interface StudioEditorData {
  order: string[];
  values: Record<string, Record<string, unknown>>;
}

export function studioEditorDataFromRevision(revision: ModuleRevisionV2): StudioEditorData {
  const byId = new Map(revision.composition.map((block) => [block.id, block]));
  return {
    order: [...revision.presentation.layout],
    values: Object.fromEntries(revision.presentation.layout.map((id) => {
      const block = byId.get(id);
      return [id, {
        title: typeof block?.config.title === 'string' ? block.config.title : block ? STUDIO_BLOCK_LABELS[block.type] : id,
        visibility: block?.config.visible === false ? 'hidden' : 'visible',
      }];
    })),
  };
}

export function studioEditorItems(base: ModuleRevisionV2, values: StudioEditorData['values']): FlatEditorItem[] {
  return base.composition.map((block) => ({
    id: block.id,
    label: typeof values[block.id]?.title === 'string' ? values[block.id].title as string : STUDIO_BLOCK_LABELS[block.type],
    detail: `${STUDIO_BLOCK_LABELS[block.type]} · sabit şablon`,
    preset: values[block.id]?.visibility === 'hidden' ? 'GİZLİ' : 'İZİNLİ BLOK',
  }));
}

export type StudioRevisionResult =
  | { ok: true; value: Pick<ModuleRevisionV2, 'contract' | 'composition' | 'presentation'> }
  | { ok: false; issue: string };

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/**
 * Düzenleyici snapshot'ını güvenli revizyona indirger. Sözleşme ve tip-bağımlı config
 * yalnız base'den taşınır; panelden yalnız şemanın title/visibility presetleri alınır.
 */
export function revisionFromStudioEditor(data: StudioEditorData, base: ModuleRevisionV2): StudioRevisionResult {
  const rawData = object(data);
  if (!rawData || Object.keys(rawData).some((key) => !['order', 'values'].includes(key))) {
    return { ok: false, issue: 'Düzenleyici snapshotında sözleşme, şema, kod, URL veya başka bir yabancı alan algılandı; kayıt yapılmadı.' };
  }
  const order = rawData.order;
  const values = object(rawData.values);
  if (!Array.isArray(order) || order.length !== base.composition.length || !values) {
    return { ok: false, issue: 'Her izinli blok tam olarak bir kez yer almalı.' };
  }
  const originals = new Map(base.composition.map((block) => [block.id, block]));
  if (Object.keys(values).some((blockId) => !originals.has(blockId))) {
    return { ok: false, issue: 'Yabancı blok verisi algılandı; kayıt yapılmadı.' };
  }
  const seen = new Set<string>();
  const composition: ModuleBlockInstance[] = [];

  for (const blockId of order) {
    if (typeof blockId !== 'string') return { ok: false, issue: 'Blok sırası geçersiz.' };
    const original = originals.get(blockId);
    const rawValues = object(values[blockId]);
    if (!original || seen.has(blockId) || !rawValues) {
      return { ok: false, issue: 'Yabancı veya tekrarlı blok algılandı.' };
    }
    const unknownKeys = Object.keys(rawValues).filter((key) => !STUDIO_PRESET_FIELDS.some((field) => field.key === key));
    if (unknownKeys.length) return { ok: false, issue: 'Şemada olmayan düzenleyici alanı algılandı; kayıt yapılmadı.' };
    const checked = validateModuleRecordInput(studioPresetSchemaFor(original.type, STUDIO_BLOCK_LABELS[original.type]), rawValues);
    if (!checked.ok) return { ok: false, issue: checked.issues[0]?.message ?? 'Preset alanları doğrulanamadı.' };
    const title = checked.value.values.title;
    const visibility = checked.value.values.visibility;
    if (typeof title !== 'string' || (visibility !== 'visible' && visibility !== 'hidden')) {
      return { ok: false, issue: 'Blok başlığı veya görünürlük seçimi geçersiz.' };
    }
    seen.add(blockId);
    composition.push({
      ...original,
      config: { ...original.config, title, visible: visibility === 'visible' },
    });
  }

  const normalized = normalizeModuleRevisionInput({
    contract: base.contract,
    composition,
    presentation: { version: 1, layout: [...order] },
  });
  return normalized.ok
    ? { ok: true, value: normalized.value }
    : { ok: false, issue: normalized.issues[0] ?? 'Taslak güvenlik doğrulamasını geçemedi.' };
}

export type LegacyStudioMigration =
  | { ok: true; value: Pick<ModuleRevisionV2, 'contract' | 'composition' | 'presentation'>; note: string }
  | { ok: false; issue: string; preserved: unknown };

/**
 * Eski content/props oturum verisi bulunursa yalnız bilinen biçimi dönüştürür. Okunamayan
 * ham nesneyi çağırana geri vererek overwrite yerine açıkça bloke eder.
 */
export function revisionFromLegacyStudioData(input: unknown, base: ModuleRevisionV2): LegacyStudioMigration {
  const raw = object(input);
  if (!raw || !Array.isArray(raw.content) || raw.content.length !== base.composition.length) {
    return { ok: false, issue: 'Eski düzenleyici verisi okunamadı; ham kayıt korunuyor ve üzerine yazma kapatıldı.', preserved: input };
  }
  const unknownTopLevel = Object.keys(raw).filter((key) => !['content', 'root', 'zones'].includes(key));
  const root = raw.root === undefined ? null : object(raw.root);
  const rootProps = root?.props === undefined ? null : object(root.props);
  const rootHasData = root !== null && (
    Object.keys(root).some((key) => key !== 'props')
    || rootProps === null
    || Object.keys(rootProps).some((key) => key !== 'id')
  );
  const zones = raw.zones === undefined ? null : object(raw.zones);
  if (unknownTopLevel.length || rootHasData || (zones !== null && Object.keys(zones).length > 0) || (raw.zones !== undefined && zones === null)) {
    return { ok: false, issue: 'Eski düzenleyici verisi okunamadı; root, zone veya yabancı üst alan bulundu. Ham kayıt korunuyor.', preserved: input };
  }
  const originals = new Map(base.composition.map((block) => [block.id, block]));
  const order: string[] = [];
  const values: StudioEditorData['values'] = {};

  for (const item of raw.content) {
    const entry = object(item);
    const props = entry ? object(entry.props) : null;
    const blockId = props ? text(props.blockId) : null;
    const original = blockId ? originals.get(blockId) : undefined;
    const allowedProps = props && Object.keys(props).every((key) => ['blockId', 'title', 'visibility', 'id'].includes(key));
    const allowedEntry = entry && Object.keys(entry).every((key) => ['type', 'props'].includes(key));
    if (!entry || !props || !blockId || !original || !allowedEntry || !allowedProps || entry.type !== LEGACY_TYPE_BY_BLOCK[original.type]) {
      return { ok: false, issue: 'Eski düzenleyici verisi okunamadı; yabancı blok veya alan bulundu. Ham kayıt korunuyor.', preserved: input };
    }
    order.push(blockId);
    values[blockId] = { title: props.title, visibility: props.visibility };
  }

  const converted = revisionFromStudioEditor({ order, values }, base);
  return converted.ok
    ? { ...converted, note: 'Eski düzenleyici verisi kayıpsız olarak güvenli modül revizyonuna dönüştürüldü.' }
    : { ok: false, issue: `Eski düzenleyici verisi okunamadı; ${converted.issue} Ham kayıt korunuyor.`, preserved: input };
}
