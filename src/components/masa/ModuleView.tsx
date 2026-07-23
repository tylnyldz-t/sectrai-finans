// Masa modül sayfası — alanlı form → doğrulanmış kalıcı kayıt → liste → düzenle/sil.
// Şema sunucunun otoritesindedir; istemci yalnız doğru kontrolü seçer. Bu nedenle özel modül
// şemaları da, registry'den gelen tüm sektör modülleri de aynı güvenli CRUD yolunu kullanır.

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, Pencil, Plus, Trash2, X } from 'lucide-react';
import { BRAND_IDENTITY_MODULE_ID } from '@shared/registry.ts';
import type { ModuleRecord, ModuleSchema, SchemaField, Workspace } from '@shared/types.ts';
import { api } from '@/lib/api';
import { BrandIdentityModuleView } from '@/components/BrandIdentityModuleView';
import { t } from '@/lib/i18n';

type FormValues = Record<string, string | boolean>;

function fmt(value: unknown): string {
  if (value === undefined || value === null || value === '') return '—';
  if (typeof value === 'boolean') return t(value ? 'Evet' : 'Hayır');
  if (typeof value === 'number') return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(value);
  return String(value);
}

function formValuesFor(schema: ModuleSchema, record?: ModuleRecord): FormValues {
  const values: FormValues = {};
  for (const field of schema.fields) {
    const value = record?.values[field.key];
    values[field.key] = field.type === 'boolean' ? value === true : value == null ? '' : String(value);
  }
  return values;
}

export function ModuleView(props: { workspace: Workspace; moduleId: string; onBack: () => void }) {
  if (props.moduleId === BRAND_IDENTITY_MODULE_ID) {
    return <BrandIdentityModuleView brandName={props.workspace.title} onBack={props.onBack} />;
  }
  return <RecordsModuleView {...props} />;
}

function RecordsModuleView({ workspace, moduleId, onBack }: { workspace: Workspace; moduleId: string; onBack: () => void }) {
  const [schema, setSchema] = useState<ModuleSchema | null>(null);
  const [label, setLabel] = useState('');
  const [records, setRecords] = useState<ModuleRecord[]>([]);
  const [values, setValues] = useState<FormValues>({});
  const [status, setStatus] = useState('');
  const [editing, setEditing] = useState<ModuleRecord | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const resetForm = useCallback((nextSchema = schema) => {
    if (!nextSchema) return;
    setValues(formValuesFor(nextSchema));
    setStatus(nextSchema.statuses?.[0]?.value ?? '');
    setEditing(null);
  }, [schema]);

  const load = useCallback(async () => {
    setError('');
    try {
      const response = await api.moduleRecords(workspace.id, moduleId);
      setSchema(response.schema);
      setLabel(response.moduleLabel);
      setRecords(response.records);
      setValues(formValuesFor(response.schema));
      setStatus(response.schema.statuses?.[0]?.value ?? '');
      setEditing(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Kayıtlar yüklenemedi');
    }
  }, [workspace.id, moduleId]);

  useEffect(() => { void load(); }, [load]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!schema) return;
    setBusy(true);
    setError('');
    try {
      if (editing) {
        const response = await api.updateModuleRecord(workspace.id, moduleId, editing.id, values, status || undefined);
        setRecords((current) => current.map((record) => record.id === response.record.id ? response.record : record));
      } else {
        const response = await api.createModuleRecord(workspace.id, moduleId, values, status || undefined);
        setRecords((current) => [response.record, ...current]);
      }
      resetForm(schema);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Kayıt kaydedilemedi');
    } finally {
      setBusy(false);
    }
  };

  const beginEdit = (record: ModuleRecord) => {
    if (!schema) return;
    setError('');
    setEditing(record);
    setValues(formValuesFor(schema, record));
    setStatus(record.status ?? schema.statuses?.[0]?.value ?? '');
    document.getElementById('module-record-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const remove = async (id: string) => {
    setError('');
    try {
      await api.deleteModuleRecord(workspace.id, moduleId, id);
      setRecords((current) => current.filter((record) => record.id !== id));
      if (editing?.id === id) resetForm();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Kayıt silinemedi');
    }
  };

  if (!schema) return <div className="masa-content"><p style={{ color: 'var(--muted)' }}>{t(error || 'Yükleniyor…')}</p></div>;

  const columns = schema.columns?.length ? schema.columns : schema.fields.slice(0, 3).map((field) => field.key);
  const statusLabel = (value: string | null) => schema.statuses?.find((item) => item.value === value)?.label ?? value ?? '—';
  const fieldLabel = (key: string) => schema.fields.find((field) => field.key === key)?.label ?? key;
  const setValue = (key: string, value: string | boolean) => setValues((current) => ({ ...current, [key]: value }));

  const renderInput = (field: SchemaField) => {
    const rawValue = values[field.key];
    const value = typeof rawValue === 'boolean' ? '' : rawValue ?? '';
    const shared = {
      required: field.required,
      min: field.min,
      max: field.max,
      maxLength: field.maxLength,
    };
    if (field.type === 'enum' && field.enumValues) {
      return (
        <select value={value} onChange={(event) => setValue(field.key, event.target.value)} required={field.required}>
          <option value="">{t('— Seç —')}</option>
          {field.enumValues.map((option) => <option key={option.value} value={option.value}>{t(option.label)}</option>)}
        </select>
      );
    }
    if (field.type === 'textarea') {
      return <textarea value={value} onChange={(event) => setValue(field.key, event.target.value)} placeholder={t(field.placeholder ?? field.label)} {...shared} />;
    }
    if (field.type === 'boolean') {
      return <input className="mv-checkbox" type="checkbox" checked={rawValue === true} onChange={(event) => setValue(field.key, event.target.checked)} required={field.required} />;
    }
    const type = field.type === 'date' ? 'date'
      : field.type === 'datetime' ? 'datetime-local'
        : field.type === 'number' || field.type === 'integer' ? 'number'
          : field.type === 'email' ? 'email'
            : field.type === 'tel' ? 'tel'
              : 'text';
    return <input type={type} value={value} onChange={(event) => setValue(field.key, event.target.value)} placeholder={t(field.placeholder ?? field.label)} step={field.type === 'integer' ? '1' : undefined} {...shared} />;
  };

  return (
    <div className="masa-content">
      <div className="mv-head">
        <button className="btn" onClick={onBack}><ArrowLeft size={15} aria-hidden="true" /> {t("Masa'ya dön")}</button>
        <h1>{t(label)}</h1>
        <span className="masa-slug-pill">{t('{n} kayıt', { n: records.length })}</span>
        <span className="masa-life accent">{t('Sentetik demo')}</span>
      </div>
      <p className="masa-honesty">{t('Bu kayıt defteri kalıcıdır; ancak SECTRAI demo ortamında üretim sistemlerine yazmaz.')}</p>
      {error && <p className="form-error" role="alert">{t(error)}</p>}

      <form id="module-record-form" className="card mv-form" onSubmit={(event) => void submit(event)}>
        <div className="mv-form-head">
          <div className="mv-form-title">{editing ? <Pencil size={15} aria-hidden="true" /> : <Plus size={15} aria-hidden="true" />}{editing
            ? t('{noun} düzenle', { noun: t(schema.noun ?? 'Kayıt') })
            : t('Yeni {noun}', { noun: t(schema.noun ?? 'kayıt') })}</div>
          {editing && <button className="btn mv-cancel" type="button" onClick={() => resetForm()}><X size={14} aria-hidden="true" /> {t('Vazgeç')}</button>}
        </div>
        <div className="mv-fields">
          {schema.fields.map((field) => (
            <label key={field.key} className={`mv-field${field.type === 'textarea' ? ' wide' : ''}${field.type === 'boolean' ? ' checkbox' : ''}`}>
              <span>{t(field.label)}{field.required && <span className="req-star">*</span>}</span>
              {renderInput(field)}
              {field.helpText && <small>{t(field.helpText)}</small>}
            </label>
          ))}
          {schema.statuses && schema.statuses.length > 0 && (
            <label className="mv-field">
              <span>{t('Durum')}</span>
              <select value={status} onChange={(event) => setStatus(event.target.value)}>
                {schema.statuses.map((item) => <option key={item.value} value={item.value}>{t(item.label)}</option>)}
              </select>
            </label>
          )}
        </div>
        <div className="mv-form-actions">
          <button className="btn btn-primary" disabled={busy} style={{ height: 42 }}>{t(busy ? 'Kaydediliyor…' : editing ? 'Değişiklikleri kaydet' : 'Kaydı oluştur')}</button>
          <span>{t('Yıldızlı alanlar zorunludur. Kaydetme sunucuda alan türü ve kurallarla yeniden doğrulanır.')}</span>
        </div>
      </form>

      <div className="card mv-table-wrap">
        {records.length === 0 ? (
          <p className="mv-empty">{t('Henüz kayıt yok — yukarıdaki ayrıntılı formla ilk kaydı oluştur.')}</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>{columns.map((column) => <th key={column}>{t(fieldLabel(column))}</th>)}<th>{t('Durum')}</th><th>{t('Son değişiklik')}</th><th aria-label={t('işlemler')}></th></tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id}>
                    {columns.map((column) => <td key={column}>{fmt(record.values[column])}</td>)}
                    <td>{t(statusLabel(record.status))}</td>
                    <td className="mono" style={{ fontSize: 11.5, color: 'var(--muted-2)', whiteSpace: 'nowrap' }}>{record.updatedAt.slice(0, 10)}</td>
                    <td className="mv-row-actions">
                      <button className="masa-ic" title={t('Kaydı düzenle')} aria-label={t('Kaydı düzenle')} onClick={() => beginEdit(record)}><Pencil size={14} aria-hidden="true" /></button>
                      <button className="masa-ic" title={t('Kaydı sil')} aria-label={t('Kaydı sil')} onClick={() => void remove(record.id)}><Trash2 size={14} aria-hidden="true" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
