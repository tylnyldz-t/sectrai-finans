// Modül-taslağı doğrulaması — sektral compose validateAgainstSchema ruhunda, taslak-üretim tarafı için.
// FAIL-CLOSED: geçersiz taslak paneli hiç görmez.

import type { ModuleDraft, SchemaFieldType } from './types.js';

const FIELD_TYPES: readonly SchemaFieldType[] = ['text', 'number', 'integer', 'boolean', 'date', 'enum', 'ref', 'user'];
const SLUG = /^[a-z][a-z0-9-]{1,40}$/;

export interface DraftValidation {
  ok: boolean;
  errors: string[];
}

export function validateModuleDraft(draft: ModuleDraft): DraftValidation {
  const errors: string[] = [];
  if (!SLUG.test(draft.id)) errors.push(`id slug değil: "${draft.id}"`);
  if (!draft.name.trim()) errors.push('name boş');
  if (!SLUG.test(draft.schema.table.replace(/_/g, '-'))) errors.push(`table slug değil: "${draft.schema.table}"`);
  if (draft.kind !== 'generic') errors.push('taslaklar yalnız generic üretilebilir (native tablo üretimi owner-kapılı)');
  if (draft.schema.fields.length < 2) errors.push('en az 2 alan gerekli');
  if (draft.schema.fields.length > 12) errors.push('en fazla 12 alan');
  const keys = new Set<string>();
  for (const f of draft.schema.fields) {
    if (!f.key || keys.has(f.key)) errors.push(`alan anahtarı boş/tekrarlı: "${f.key}"`);
    keys.add(f.key);
    if (!FIELD_TYPES.includes(f.type)) errors.push(`bilinmeyen alan tipi: "${f.type}"`);
    if (f.type === 'enum' && (!f.enumValues || f.enumValues.length === 0)) errors.push(`enum değerleri boş: "${f.key}"`);
  }
  if (!draft.schema.fields.some((f) => f.required)) errors.push('en az bir zorunlu alan gerekli');
  if (draft.evidence.length === 0) errors.push('kanıtsız taslak üretilemez (Firma Hafızası ilkesi)');
  return { ok: errors.length === 0, errors };
}
