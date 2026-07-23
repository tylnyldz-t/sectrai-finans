import { moduleSchemaFor } from '@shared/module-schemas.ts';
import type { ModuleSchema, SchemaField } from '@shared/types.ts';
import type { EditorModule } from './editor-model';
import { t } from '@/lib/i18n';

export type ModuleSchemaResolver = (moduleId: string, label: string) => ModuleSchema;

function fieldInput(
  field: SchemaField,
  value: unknown,
  onChange: (value: unknown) => void,
) {
  const common = {
    id: `schema-field-${field.key}`,
    name: field.key,
    required: field.required,
    'aria-describedby': field.helpText ? `schema-help-${field.key}` : undefined,
  };

  if (field.type === 'boolean') {
    return <input {...common} type="checkbox" checked={value === true} onChange={(event) => onChange(event.target.checked)} />;
  }
  if (field.type === 'enum') {
    return (
      <select {...common} value={typeof value === 'string' ? value : ''} onChange={(event) => onChange(event.target.value)}>
        <option value="">{t("Seçiniz")}</option>
        {(field.enumValues ?? []).map((option) => <option key={option.value} value={option.value}>{t(option.label)}</option>)}
      </select>
    );
  }
  if (field.type === 'textarea') {
    return <textarea {...common} value={typeof value === 'string' ? value : ''} maxLength={field.maxLength} placeholder={field.placeholder ? t(field.placeholder) : undefined} onChange={(event) => onChange(event.target.value)} />;
  }
  if (field.type === 'ref' || field.type === 'user') {
    return <p className="schema-editor-unsupported" data-unsupported-field={field.key}>{t("Bu alanın güvenli seçenek kaynağı tanımlı değil; düzenleme kapalı.")}</p>;
  }

  const inputType = field.type === 'number' || field.type === 'integer'
    ? 'number'
    : field.type === 'datetime'
      ? 'datetime-local'
      : field.type;
  const inputValue = typeof value === 'string' || typeof value === 'number' ? value : '';
  return (
    <input
      {...common}
      type={inputType}
      value={inputValue}
      min={field.min}
      max={field.max}
      maxLength={field.maxLength}
      step={field.type === 'integer' ? 1 : undefined}
      placeholder={field.placeholder ? t(field.placeholder) : undefined}
      onChange={(event) => onChange(field.type === 'number' || field.type === 'integer' ? event.target.valueAsNumber : event.target.value)}
    />
  );
}

export function SchemaFieldPanel({
  module,
  values,
  onChange,
  schemaFor = moduleSchemaFor,
}: {
  module: EditorModule | null;
  values: Record<string, unknown>;
  onChange: (fieldKey: string, value: unknown) => void;
  /** Test/özel taslak şemaları için enjeksiyon noktası; üretimde moduleSchemaFor kullanılır. */
  schemaFor?: ModuleSchemaResolver;
}) {
  if (!module) {
    return <aside className="schema-editor-fields"><p className="schema-editor-empty">{t("Alanlarını görmek için paletten bir modül seç.")}</p></aside>;
  }

  const schema = schemaFor(module.id, module.label);
  return (
    <aside className="schema-editor-fields" aria-label={t('{label} alan paneli', { label: t(module.label) })}>
      <div className="schema-editor-panel-head">
        <strong>{t(module.label)}</strong>
        <span>{t("ŞEMA")}</span>
      </div>
      <p>{t('{noun} alanları · Bu önizleme kendi başına kayıt oluşturmaz.', { noun: t(schema.noun ?? module.label) })}</p>
      <div className="schema-editor-field-list">
        {schema.fields.map((field) => (
          <label key={field.key} className={field.type === 'boolean' ? 'schema-editor-field boolean' : 'schema-editor-field'} htmlFor={`schema-field-${field.key}`}>
            <span>{t(field.label)}{field.required && <b aria-label={t("zorunlu")}> *</b>}</span>
            {fieldInput(field, values[field.key], (value) => onChange(field.key, value))}
            {field.helpText && <small id={`schema-help-${field.key}`}>{t(field.helpText)}</small>}
          </label>
        ))}
      </div>
    </aside>
  );
}
