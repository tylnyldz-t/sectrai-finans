// Modül kaydı giriş kapısı — formdan gelen değerleri şemaya göre doğrular ve türüne dönüştürür.
// HTTP katmanı ile testler aynı kuralları kullanır; böylece istemci atlatılsa bile depo kirlenmez.

import type { ModuleSchema, SchemaField } from './types.js';

export type ValidatedRecordInput = { values: Record<string, unknown>; status: string | null };
export type RecordInputIssue = { key: string; message: string };
export type RecordInputValidation = { ok: true; value: ValidatedRecordInput } | { ok: false; issues: RecordInputIssue[] };

const isBlank = (value: unknown): boolean =>
  value === undefined || value === null || (typeof value === 'string' && value.trim() === '');

function isDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

function isDateTime(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return false;
  const [date, time] = value.split('T');
  const [hours, minutes] = time.split(':').map(Number);
  return isDate(date) && hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

function normalizeField(field: SchemaField, raw: unknown): { value?: unknown; issue?: string } {
  if (isBlank(raw)) return {};

  if (field.type === 'boolean') {
    if (raw === true || raw === false) return { value: raw };
    if (raw === 'true') return { value: true };
    if (raw === 'false') return { value: false };
    return { issue: `${field.label} evet/hayır olmalı` };
  }

  const text = typeof raw === 'string' ? raw.trim() : String(raw).trim();
  if (field.type === 'number' || field.type === 'integer') {
    const value = Number(text);
    if (!Number.isFinite(value) || (field.type === 'integer' && !Number.isInteger(value))) return { issue: `${field.label} geçerli bir sayı olmalı` };
    if (field.min !== undefined && value < field.min) return { issue: `${field.label} en az ${field.min} olmalı` };
    if (field.max !== undefined && value > field.max) return { issue: `${field.label} en fazla ${field.max} olmalı` };
    return { value };
  }

  if (field.maxLength !== undefined && text.length > field.maxLength) return { issue: `${field.label} en fazla ${field.maxLength} karakter olabilir` };
  if (field.type === 'date' && !isDate(text)) return { issue: `${field.label} geçerli bir tarih olmalı` };
  if (field.type === 'datetime' && !isDateTime(text)) return { issue: `${field.label} geçerli bir tarih ve saat olmalı` };
  if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return { issue: `${field.label} geçerli bir e-posta olmalı` };
  if (field.type === 'tel' && !/^\+?[0-9()[\].\s-]{6,30}$/.test(text)) return { issue: `${field.label} geçerli bir telefon olmalı` };
  if (field.type === 'enum' && !field.enumValues?.some((option) => option.value === text)) return { issue: `${field.label} geçerli bir seçenek olmalı` };
  return { value: field.type === 'email' ? text.toLowerCase() : text };
}

export function validateModuleRecordInput(schema: ModuleSchema, rawValues: unknown, rawStatus?: unknown): RecordInputValidation {
  const raw = rawValues && typeof rawValues === 'object' && !Array.isArray(rawValues) ? rawValues as Record<string, unknown> : {};
  const issues: RecordInputIssue[] = [];
  const values: Record<string, unknown> = {};

  for (const field of schema.fields) {
    const result = normalizeField(field, raw[field.key]);
    if (field.required && result.value === undefined) issues.push({ key: field.key, message: result.issue ?? `${field.label} zorunlu` });
    else if (result.issue) issues.push({ key: field.key, message: result.issue });
    else if (result.value !== undefined) values[field.key] = result.value;
  }

  const requestedStatus = typeof rawStatus === 'string' && rawStatus.trim() ? rawStatus.trim() : undefined;
  const status = requestedStatus ?? schema.statuses?.[0]?.value ?? null;
  if (status !== null && schema.statuses && !schema.statuses.some((option) => option.value === status)) {
    issues.push({ key: 'status', message: 'Geçerli bir durum seç' });
  }

  return issues.length ? { ok: false, issues } : { ok: true, value: { values, status } };
}
