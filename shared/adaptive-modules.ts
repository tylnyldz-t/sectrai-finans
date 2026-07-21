// Uyarlanabilir modül sözleşmesi (FAZ 2 / 1A).
// Bu dosya yalnız izinli, bildirimsel veri taşır. Puck/istemci asla kod, HTML, CSS,
// URL, dış aksiyon ya da serbest sorgu saklayamaz. Sunucu her yazıda bu normalizer'ı kullanır.

import type { ModuleSchema, Purpose, SchemaField, SchemaFieldType, Tone } from './types.js';

export const ADAPTIVE_BLOCK_TYPES = [
  'record-ledger',
  'record-form',
  'record-table',
  'step-workflow',
  'activity-timeline',
  'summary-metrics',
  'reference-link',
] as const;

export type AdaptiveBlockType = (typeof ADAPTIVE_BLOCK_TYPES)[number];

export const ADAPTIVE_BLOCK_TEMPLATES = {
  'record-ledger': { id: 'sectrai.record-ledger.v1', allowedProps: ['title', 'visible', 'entityId'] },
  'record-form': { id: 'sectrai.record-form.v1', allowedProps: ['title', 'visible', 'entityId'] },
  'record-table': { id: 'sectrai.record-table.v1', allowedProps: ['title', 'visible', 'entityId', 'columns'] },
  'step-workflow': { id: 'sectrai.step-workflow.v1', allowedProps: ['title', 'visible', 'workflowId'] },
  'activity-timeline': { id: 'sectrai.activity-timeline.v1', allowedProps: ['title', 'visible'] },
  'summary-metrics': { id: 'sectrai.summary-metrics.v1', allowedProps: ['title', 'visible'] },
  'reference-link': { id: 'sectrai.reference-link.v1', allowedProps: ['title', 'visible', 'relationId'] },
} as const satisfies Record<AdaptiveBlockType, { id: string; allowedProps: readonly string[] }>;

export type ModuleBlockTemplateId = (typeof ADAPTIVE_BLOCK_TEMPLATES)[AdaptiveBlockType]['id'];

export type ModuleDefinitionState = 'draft' | 'proposed' | 'active' | 'archived';
export type ModuleRevisionState = 'draft' | 'proposed' | 'approved' | 'published' | 'superseded';
export type ModuleOriginKind = 'catalog' | 'composed' | 'owner-created';
export type WorkflowStepStatus = 'planned' | 'in_progress' | 'blocked' | 'completed' | 'skipped' | 'cancelled';

export interface TemplateRef {
  id: ModuleBlockTemplateId;
  version: 1;
}

export interface ModuleOrigin {
  kind: ModuleOriginKind;
  catalogModuleId?: string;
  templateRefs: TemplateRef[];
}

/** İlk sürüm yalnız standart veri kabul eder. Çocuk/özel nitelikli veri için ayrı owner kararı gerekir. */
export interface DataClassification {
  level: 'standard';
  containsMinorData: false;
  containsSpecialCategoryData: false;
  containsPreciseLocation: false;
  containsFiles: false;
}

export const STANDARD_DATA_CLASSIFICATION: DataClassification = Object.freeze({
  level: 'standard',
  containsMinorData: false,
  containsSpecialCategoryData: false,
  containsPreciseLocation: false,
  containsFiles: false,
});

/** Dış sistem yazımı veya üretim aksiyonu değil; yalnız landing içi, manuel kabiliyet bildirimi. */
export interface CapabilityDeclaration {
  id: 'record-management' | 'manual-workflow' | 'activity-history' | 'summary-metrics';
  mode: 'manual';
}

export interface RecordEntitySpec {
  id: string;
  label: string;
  schema: ModuleSchema;
}

export interface RelationSpec {
  id: string;
  label: string;
  fromEntityId: string;
  toEntityId: string;
  kind: 'one-to-many';
}

export interface WorkflowStepTemplate {
  id: string;
  order: number;
  title: string;
  description?: string;
  assigneeLabel?: string;
  requiresManualEvidence: boolean;
}

export interface WorkflowTemplateSpec {
  id: string;
  title: string;
  steps: WorkflowStepTemplate[];
  allowedStatuses: WorkflowStepStatus[];
}

export interface ModuleContract {
  entities: RecordEntitySpec[];
  relations: RelationSpec[];
  workflows: WorkflowTemplateSpec[];
}

export interface ModuleBlockInstance {
  id: string;
  type: AdaptiveBlockType;
  sourceTemplate: TemplateRef;
  config: Record<string, unknown>;
}

export interface ModulePresentation {
  version: 1;
  /** Her izinli blok tam bir kez görünür; görünürlük block.config.visible ile belirlenir. */
  layout: string[];
}

export interface ModuleDefinitionV2 {
  id: string;
  workspaceId: string;
  state: ModuleDefinitionState;
  activeRevisionId: string | null;
  title: string;
  purpose: Purpose;
  origin: ModuleOrigin;
  capabilityDeclaration: CapabilityDeclaration[];
  dataClassification: DataClassification;
  createdFromProposalId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ModuleRevisionV2 {
  id: string;
  moduleId: string;
  revision: number;
  state: ModuleRevisionState;
  contract: ModuleContract;
  composition: ModuleBlockInstance[];
  presentation: ModulePresentation;
  contentHash: string;
  basedOnRevisionId: string | null;
  createdBy: 'owner' | 'ai-proposal';
  createdAt: string;
  updatedAt: string;
}

/** Yayımlanmış modül revizyonundan alınan, değişmez manuel workflow şablon anlık görüntüsü. */
export interface WorkflowTemplateRevision {
  id: string;
  workspaceId: string;
  moduleDefinitionId: string;
  moduleRevisionId: string;
  workflowId: string;
  title: string;
  steps: WorkflowStepTemplate[];
  allowedStatuses: WorkflowStepStatus[];
  sourceContentHash: string;
  createdAt: string;
}

/** Bir iş/tur için workflow örneği. Aynı idempotencyKey aynı örneği döndürür; asla ezmez. */
export interface WorkflowInstance {
  id: string;
  workspaceId: string;
  moduleDefinitionId: string;
  workflowTemplateRevisionId: string;
  title: string;
  idempotencyKey: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/** İlk beta yalnız manuel not taşır; konum, dosya, URL, otomasyon veya dış kanıt yoktur. */
export interface StepInstance {
  id: string;
  workflowInstanceId: string;
  templateStepId: string;
  order: number;
  title: string;
  description?: string;
  assigneeLabel?: string;
  requiresManualEvidence: boolean;
  status: WorkflowStepStatus;
  plannedAt: string;
  completedAt: string | null;
  manualNote: string | null;
  updatedAt: string;
}

export interface WorkflowAuditEvent {
  id: string;
  workspaceId: string;
  workflowInstanceId: string;
  stepInstanceId: string | null;
  type: 'WORKFLOW_INSTANCE_CREATED' | 'STEP_STATE_CHANGED' | 'STEP_NOTE_UPDATED';
  actorId: string;
  at: string;
  /** Not/kanıt içeriği taşımayan, yalnız işlem özeti. */
  detail: string;
}

export interface WorkflowInstanceBundle {
  instance: WorkflowInstance;
  template: WorkflowTemplateRevision;
  steps: StepInstance[];
  audit: WorkflowAuditEvent[];
}

export interface AdaptiveModulePlan {
  id: string;
  title: string;
  compatibilityModule: { id: string; label: string };
  origin: ModuleOrigin;
  capabilityDeclaration: CapabilityDeclaration[];
  dataClassification: DataClassification;
  evidence: string[];
  revision: Pick<ModuleRevisionV2, 'contract' | 'composition' | 'presentation'>;
}

export interface AdaptiveCapabilityGap {
  code: 'MINOR_DATA_DECISION_REQUIRED' | 'IMAGE_GENERATION_NOT_AVAILABLE' | 'NO_SAFE_MODULE_MATCH';
  title: string;
  reason: string;
  evidence: string[];
}

export interface AdaptiveProposalSet {
  proposalId: string;
  approvalId: string;
  purpose: Purpose;
  title: string;
  contentHash: string;
  expiresAt: string;
  status: 'PROPOSED' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  plans: AdaptiveModulePlan[];
  capabilityGaps: AdaptiveCapabilityGap[];
}

export interface AdaptiveValidationSuccess<T> {
  ok: true;
  value: T;
}

export interface AdaptiveValidationFailure {
  ok: false;
  issues: string[];
}

export type AdaptiveValidation<T> = AdaptiveValidationSuccess<T> | AdaptiveValidationFailure;

const BLOCK_TYPES = new Set<string>(ADAPTIVE_BLOCK_TYPES);
const FIELD_TYPES = new Set<SchemaFieldType>([
  'text', 'textarea', 'email', 'tel', 'number', 'integer', 'boolean', 'date', 'datetime', 'enum', 'ref', 'user',
]);
const TONES = new Set<Tone>(['neutral', 'info', 'good', 'warn', 'bad']);
const STEP_STATUSES = new Set<WorkflowStepStatus>(['planned', 'in_progress', 'blocked', 'completed', 'skipped', 'cancelled']);
const CAPABILITY_IDS = new Set<CapabilityDeclaration['id']>(['record-management', 'manual-workflow', 'activity-history', 'summary-metrics']);
const IDENTIFIER = /^[a-z][a-z0-9-]{1,63}$/;
const FIELD_IDENTIFIER = /^[a-z][a-zA-Z0-9_]{0,63}$/;

const hasOwn = (value: Record<string, unknown>, key: string) => Object.prototype.hasOwnProperty.call(value, key);

function record(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null ? value as Record<string, unknown> : null;
}

function cleanText(value: unknown, label: string, issues: string[], maxLength = 180): string | null {
  if (typeof value !== 'string') {
    issues.push(`${label}: metin olmalı`);
    return null;
  }
  const cleaned = value.trim();
  if (!cleaned || cleaned.length > maxLength) {
    issues.push(`${label}: boş veya çok uzun`);
    return null;
  }
  return cleaned;
}

function cleanIdentifier(value: unknown, label: string, issues: string[], field = false): string | null {
  const cleaned = cleanText(value, label, issues, 64);
  if (!cleaned) return null;
  if (!(field ? FIELD_IDENTIFIER : IDENTIFIER).test(cleaned)) {
    issues.push(`${label}: güvenli kimlik değil`);
    return null;
  }
  return cleaned;
}

function exactKeys(raw: Record<string, unknown>, allowed: readonly string[], label: string, issues: string[]): void {
  for (const key of Object.keys(raw)) if (!allowed.includes(key)) issues.push(`${label}: izinli olmayan alan "${key}"`);
}

function normalizeSchemaField(input: unknown, index: number, issues: string[]): SchemaField | null {
  const raw = record(input);
  if (!raw) {
    issues.push(`entities.fields[${index}]: nesne olmalı`);
    return null;
  }
  const allowed = ['key', 'label', 'type', 'required', 'enumValues', 'refModule', 'min', 'max', 'maxLength', 'unique', 'currency', 'placeholder', 'helpText'];
  exactKeys(raw, allowed, `entities.fields[${index}]`, issues);
  const key = cleanIdentifier(raw.key, `entities.fields[${index}].key`, issues, true);
  const label = cleanText(raw.label, `entities.fields[${index}].label`, issues);
  const type = typeof raw.type === 'string' && FIELD_TYPES.has(raw.type as SchemaFieldType) ? raw.type as SchemaFieldType : null;
  if (!type) issues.push(`entities.fields[${index}].type: izinli değil`);
  if (!key || !label || !type) return null;
  const field: SchemaField = { key, label, type };
  for (const booleanKey of ['required', 'unique', 'currency'] as const) {
    if (raw[booleanKey] !== undefined) {
      if (typeof raw[booleanKey] !== 'boolean') issues.push(`entities.fields[${index}].${booleanKey}: boolean olmalı`);
      else field[booleanKey] = raw[booleanKey];
    }
  }
  for (const numericKey of ['min', 'max', 'maxLength'] as const) {
    if (raw[numericKey] !== undefined) {
      if (typeof raw[numericKey] !== 'number' || !Number.isFinite(raw[numericKey])) issues.push(`entities.fields[${index}].${numericKey}: sayı olmalı`);
      else field[numericKey] = raw[numericKey];
    }
  }
  for (const textKey of ['refModule', 'placeholder', 'helpText'] as const) {
    if (raw[textKey] !== undefined) {
      const value = cleanText(raw[textKey], `entities.fields[${index}].${textKey}`, issues, 2_000);
      if (value) field[textKey] = value;
    }
  }
  if (raw.enumValues !== undefined) {
    if (!Array.isArray(raw.enumValues) || raw.enumValues.length === 0 || raw.enumValues.length > 24) {
      issues.push(`entities.fields[${index}].enumValues: 1-24 seçenek olmalı`);
    } else {
      const values: NonNullable<SchemaField['enumValues']> = [];
      const seen = new Set<string>();
      raw.enumValues.forEach((entry, enumIndex) => {
        const option = record(entry);
        if (!option) {
          issues.push(`entities.fields[${index}].enumValues[${enumIndex}]: nesne olmalı`);
          return;
        }
        exactKeys(option, ['value', 'label', 'tone'], `entities.fields[${index}].enumValues[${enumIndex}]`, issues);
        const value = cleanIdentifier(option.value, `entities.fields[${index}].enumValues[${enumIndex}].value`, issues);
        const optionLabel = cleanText(option.label, `entities.fields[${index}].enumValues[${enumIndex}].label`, issues);
        if (value && optionLabel) {
          if (seen.has(value)) issues.push(`entities.fields[${index}].enumValues: tekrarlı değer`);
          seen.add(value);
          const normalized: NonNullable<SchemaField['enumValues']>[number] = { value, label: optionLabel };
          if (option.tone !== undefined) {
            if (typeof option.tone !== 'string' || !TONES.has(option.tone as Tone)) issues.push(`entities.fields[${index}].enumValues[${enumIndex}].tone: izinli değil`);
            else normalized.tone = option.tone as Tone;
          }
          values.push(normalized);
        }
      });
      if (values.length === raw.enumValues.length) field.enumValues = values;
    }
  }
  if (type === 'enum' && !field.enumValues) issues.push(`entities.fields[${index}].enumValues: enum için zorunlu`);
  if (type !== 'enum' && field.enumValues) issues.push(`entities.fields[${index}].enumValues: yalnız enum alanında kullanılabilir`);
  if (field.min !== undefined && field.max !== undefined && field.min > field.max) issues.push(`entities.fields[${index}]: min max'tan büyük olamaz`);
  return field;
}

function normalizeEntity(input: unknown, index: number, issues: string[]): RecordEntitySpec | null {
  const raw = record(input);
  if (!raw) {
    issues.push(`entities[${index}]: nesne olmalı`);
    return null;
  }
  exactKeys(raw, ['id', 'label', 'schema'], `entities[${index}]`, issues);
  const id = cleanIdentifier(raw.id, `entities[${index}].id`, issues);
  const label = cleanText(raw.label, `entities[${index}].label`, issues);
  const schemaRaw = record(raw.schema);
  if (!schemaRaw) {
    issues.push(`entities[${index}].schema: nesne olmalı`);
    return null;
  }
  exactKeys(schemaRaw, ['table', 'noun', 'fields', 'statuses', 'columns'], `entities[${index}].schema`, issues);
  const table = cleanIdentifier(schemaRaw.table, `entities[${index}].schema.table`, issues, true);
  const noun = schemaRaw.noun === undefined ? undefined : cleanText(schemaRaw.noun, `entities[${index}].schema.noun`, issues);
  if (!Array.isArray(schemaRaw.fields) || schemaRaw.fields.length < 1 || schemaRaw.fields.length > 24) {
    issues.push(`entities[${index}].schema.fields: 1-24 alan olmalı`);
  }
  const fields = Array.isArray(schemaRaw.fields)
    ? schemaRaw.fields.map((field, fieldIndex) => normalizeSchemaField(field, fieldIndex, issues)).filter((field): field is SchemaField => field !== null)
    : [];
  const fieldKeys = new Set<string>();
  for (const field of fields) {
    if (fieldKeys.has(field.key)) issues.push(`entities[${index}].schema.fields: tekrarlı alan anahtarı`);
    fieldKeys.add(field.key);
  }
  const schema: ModuleSchema = { table: table ?? '', fields };
  if (noun) schema.noun = noun;
  if (schemaRaw.statuses !== undefined) {
    if (!Array.isArray(schemaRaw.statuses) || schemaRaw.statuses.length === 0 || schemaRaw.statuses.length > 12) {
      issues.push(`entities[${index}].schema.statuses: 1-12 durum olmalı`);
    } else {
      const statuses: NonNullable<ModuleSchema['statuses']> = [];
      const values = new Set<string>();
      schemaRaw.statuses.forEach((status, statusIndex) => {
        const item = record(status);
        if (!item) {
          issues.push(`entities[${index}].schema.statuses[${statusIndex}]: nesne olmalı`);
          return;
        }
        exactKeys(item, ['value', 'label', 'tone', 'approval'], `entities[${index}].schema.statuses[${statusIndex}]`, issues);
        const value = cleanIdentifier(item.value, `entities[${index}].schema.statuses[${statusIndex}].value`, issues);
        const statusLabel = cleanText(item.label, `entities[${index}].schema.statuses[${statusIndex}].label`, issues);
        if (!value || !statusLabel) return;
        if (values.has(value)) issues.push(`entities[${index}].schema.statuses: tekrarlı değer`);
        values.add(value);
        const normalized: NonNullable<ModuleSchema['statuses']>[number] = { value, label: statusLabel };
        if (item.tone !== undefined) {
          if (typeof item.tone !== 'string' || !TONES.has(item.tone as Tone)) issues.push(`entities[${index}].schema.statuses[${statusIndex}].tone: izinli değil`);
          else normalized.tone = item.tone as Tone;
        }
        if (item.approval !== undefined) {
          if (typeof item.approval !== 'boolean') issues.push(`entities[${index}].schema.statuses[${statusIndex}].approval: boolean olmalı`);
          else normalized.approval = item.approval;
        }
        statuses.push(normalized);
      });
      if (statuses.length === schemaRaw.statuses.length) schema.statuses = statuses;
    }
  }
  if (schemaRaw.columns !== undefined) {
    if (!Array.isArray(schemaRaw.columns) || schemaRaw.columns.length > 8) {
      issues.push(`entities[${index}].schema.columns: en fazla 8 alan olmalı`);
    } else {
      const columns = schemaRaw.columns.map((column, columnIndex) => cleanIdentifier(column, `entities[${index}].schema.columns[${columnIndex}]`, issues, true)).filter((column): column is string => column !== null);
      const unique = new Set(columns);
      if (unique.size !== columns.length || columns.some((column) => !fieldKeys.has(column))) issues.push(`entities[${index}].schema.columns: alan listesi geçersiz`);
      else schema.columns = columns;
    }
  }
  if (!id || !label || !table || fields.length !== (Array.isArray(schemaRaw.fields) ? schemaRaw.fields.length : 0)) return null;
  return { id, label, schema };
}

function normalizeRelation(input: unknown, index: number, entityIds: Set<string>, issues: string[]): RelationSpec | null {
  const raw = record(input);
  if (!raw) {
    issues.push(`relations[${index}]: nesne olmalı`);
    return null;
  }
  exactKeys(raw, ['id', 'label', 'fromEntityId', 'toEntityId', 'kind'], `relations[${index}]`, issues);
  const id = cleanIdentifier(raw.id, `relations[${index}].id`, issues);
  const label = cleanText(raw.label, `relations[${index}].label`, issues);
  const fromEntityId = cleanIdentifier(raw.fromEntityId, `relations[${index}].fromEntityId`, issues);
  const toEntityId = cleanIdentifier(raw.toEntityId, `relations[${index}].toEntityId`, issues);
  if (!id || !label || !fromEntityId || !toEntityId) return null;
  if (!entityIds.has(fromEntityId) || !entityIds.has(toEntityId) || fromEntityId === toEntityId) issues.push(`relations[${index}]: varlık referansı geçersiz`);
  if (raw.kind !== 'one-to-many') issues.push(`relations[${index}].kind: yalnız one-to-many izinli`);
  return { id, label, fromEntityId, toEntityId, kind: 'one-to-many' };
}

function normalizeWorkflow(input: unknown, index: number, issues: string[]): WorkflowTemplateSpec | null {
  const raw = record(input);
  if (!raw) {
    issues.push(`workflows[${index}]: nesne olmalı`);
    return null;
  }
  exactKeys(raw, ['id', 'title', 'steps', 'allowedStatuses'], `workflows[${index}]`, issues);
  const id = cleanIdentifier(raw.id, `workflows[${index}].id`, issues);
  const title = cleanText(raw.title, `workflows[${index}].title`, issues);
  if (!Array.isArray(raw.steps) || raw.steps.length < 1 || raw.steps.length > 20) issues.push(`workflows[${index}].steps: 1-20 adım olmalı`);
  const steps: WorkflowStepTemplate[] = [];
  if (Array.isArray(raw.steps)) raw.steps.forEach((entry, stepIndex) => {
    const step = record(entry);
    if (!step) {
      issues.push(`workflows[${index}].steps[${stepIndex}]: nesne olmalı`);
      return;
    }
    exactKeys(step, ['id', 'order', 'title', 'description', 'assigneeLabel', 'requiresManualEvidence'], `workflows[${index}].steps[${stepIndex}]`, issues);
    const stepId = cleanIdentifier(step.id, `workflows[${index}].steps[${stepIndex}].id`, issues);
    const stepTitle = cleanText(step.title, `workflows[${index}].steps[${stepIndex}].title`, issues);
    const order = step.order;
    if (!Number.isInteger(order) || typeof order !== 'number' || order < 0 || order > 99) issues.push(`workflows[${index}].steps[${stepIndex}].order: 0-99 tamsayı olmalı`);
    if (typeof step.requiresManualEvidence !== 'boolean') issues.push(`workflows[${index}].steps[${stepIndex}].requiresManualEvidence: boolean olmalı`);
    if (!stepId || !stepTitle || typeof order !== 'number' || !Number.isInteger(order) || typeof step.requiresManualEvidence !== 'boolean') return;
    const normalized: WorkflowStepTemplate = { id: stepId, order, title: stepTitle, requiresManualEvidence: step.requiresManualEvidence };
    if (step.description !== undefined) {
      const description = cleanText(step.description, `workflows[${index}].steps[${stepIndex}].description`, issues, 2_000);
      if (description) normalized.description = description;
    }
    if (step.assigneeLabel !== undefined) {
      const assigneeLabel = cleanText(step.assigneeLabel, `workflows[${index}].steps[${stepIndex}].assigneeLabel`, issues);
      if (assigneeLabel) normalized.assigneeLabel = assigneeLabel;
    }
    steps.push(normalized);
  });
  const stepIds = new Set<string>();
  const orders = new Set<number>();
  for (const step of steps) {
    if (stepIds.has(step.id)) issues.push(`workflows[${index}].steps: tekrarlı adım kimliği`);
    if (orders.has(step.order)) issues.push(`workflows[${index}].steps: tekrarlı sıra`);
    stepIds.add(step.id);
    orders.add(step.order);
  }
  if (!Array.isArray(raw.allowedStatuses) || raw.allowedStatuses.length < 2 || raw.allowedStatuses.length > STEP_STATUSES.size) {
    issues.push(`workflows[${index}].allowedStatuses: 2-${STEP_STATUSES.size} durum olmalı`);
  }
  const allowedStatuses = Array.isArray(raw.allowedStatuses)
    ? raw.allowedStatuses.filter((status): status is WorkflowStepStatus => typeof status === 'string' && STEP_STATUSES.has(status as WorkflowStepStatus))
    : [];
  if (Array.isArray(raw.allowedStatuses) && (allowedStatuses.length !== raw.allowedStatuses.length || new Set(allowedStatuses).size !== allowedStatuses.length)) {
    issues.push(`workflows[${index}].allowedStatuses: izinli ve tekil olmalı`);
  }
  if (!allowedStatuses.includes('planned') || !allowedStatuses.includes('completed')) issues.push(`workflows[${index}].allowedStatuses: planned ve completed içermeli`);
  if (!id || !title || steps.length !== (Array.isArray(raw.steps) ? raw.steps.length : 0)) return null;
  return { id, title, steps, allowedStatuses };
}

function normalizeBlock(input: unknown, index: number, contract: ModuleContract, issues: string[]): ModuleBlockInstance | null {
  const raw = record(input);
  if (!raw) {
    issues.push(`composition[${index}]: nesne olmalı`);
    return null;
  }
  exactKeys(raw, ['id', 'type', 'sourceTemplate', 'config'], `composition[${index}]`, issues);
  const id = cleanIdentifier(raw.id, `composition[${index}].id`, issues);
  const type = typeof raw.type === 'string' && BLOCK_TYPES.has(raw.type) ? raw.type as AdaptiveBlockType : null;
  if (!type) issues.push(`composition[${index}].type: izinli blok değil`);
  const sourceRaw = record(raw.sourceTemplate);
  if (!sourceRaw) issues.push(`composition[${index}].sourceTemplate: nesne olmalı`);
  const sourceTemplateId = sourceRaw ? cleanText(sourceRaw.id, `composition[${index}].sourceTemplate.id`, issues, 80) : null;
  const version = sourceRaw?.version;
  if (version !== 1) issues.push(`composition[${index}].sourceTemplate.version: yalnız 1 izinli`);
  const config = record(raw.config);
  if (!config) issues.push(`composition[${index}].config: nesne olmalı`);
  if (!id || !type || !sourceTemplateId || version !== 1 || !config) return null;
  const expectedTemplate = ADAPTIVE_BLOCK_TEMPLATES[type];
  const allowedProps: readonly string[] = expectedTemplate.allowedProps;
  if (sourceTemplateId !== expectedTemplate.id) issues.push(`composition[${index}].sourceTemplate: blokla eşleşmiyor`);
  exactKeys(config, allowedProps, `composition[${index}].config`, issues);
  const normalizedConfig: Record<string, unknown> = {};
  if (hasOwn(config, 'title')) {
    const title = cleanText(config.title, `composition[${index}].config.title`, issues);
    if (title) normalizedConfig.title = title;
  }
  if (hasOwn(config, 'visible')) {
    if (typeof config.visible !== 'boolean') issues.push(`composition[${index}].config.visible: boolean olmalı`);
    else normalizedConfig.visible = config.visible;
  } else {
    normalizedConfig.visible = true;
  }
  const entityIds = new Set(contract.entities.map((entity) => entity.id));
  if (allowedProps.includes('entityId')) {
    const entityId = cleanIdentifier(config.entityId, `composition[${index}].config.entityId`, issues);
    if (!entityId || !entityIds.has(entityId)) issues.push(`composition[${index}].config.entityId: izinli varlık değil`);
    else normalizedConfig.entityId = entityId;
  }
  if (allowedProps.includes('columns')) {
    if (!Array.isArray(config.columns) || config.columns.length < 1 || config.columns.length > 8) {
      issues.push(`composition[${index}].config.columns: 1-8 kolon olmalı`);
    } else {
      const entityId = normalizedConfig.entityId;
      const entity = typeof entityId === 'string' ? contract.entities.find((candidate) => candidate.id === entityId) : undefined;
      const columns = config.columns.map((column, columnIndex) => cleanIdentifier(column, `composition[${index}].config.columns[${columnIndex}]`, issues, true)).filter((column): column is string => column !== null);
      if (!entity || columns.length !== config.columns.length || new Set(columns).size !== columns.length || columns.some((column) => !entity.schema.fields.some((field) => field.key === column))) {
        issues.push(`composition[${index}].config.columns: varlık alanlarıyla eşleşmiyor`);
      } else normalizedConfig.columns = columns;
    }
  }
  if (allowedProps.includes('workflowId')) {
    const workflowId = cleanIdentifier(config.workflowId, `composition[${index}].config.workflowId`, issues);
    if (!workflowId || !contract.workflows.some((workflow) => workflow.id === workflowId)) issues.push(`composition[${index}].config.workflowId: izinli workflow değil`);
    else normalizedConfig.workflowId = workflowId;
  }
  if (allowedProps.includes('relationId')) {
    const relationId = cleanIdentifier(config.relationId, `composition[${index}].config.relationId`, issues);
    if (!relationId || !contract.relations.some((relation) => relation.id === relationId)) issues.push(`composition[${index}].config.relationId: izinli ilişki değil`);
    else normalizedConfig.relationId = relationId;
  }
  return { id, type, sourceTemplate: { id: expectedTemplate.id, version: 1 }, config: normalizedConfig };
}

/** Ham Puck/HTTP verisini tek güvenli modül-revizyon taslağına dönüştürür. */
export function normalizeModuleRevisionInput(input: unknown): AdaptiveValidation<Pick<ModuleRevisionV2, 'contract' | 'composition' | 'presentation'>> {
  const issues: string[] = [];
  const raw = record(input);
  if (!raw) return { ok: false, issues: ['revision: nesne olmalı'] };
  exactKeys(raw, ['contract', 'composition', 'presentation'], 'revision', issues);
  const contractRaw = record(raw.contract);
  if (!contractRaw) issues.push('contract: nesne olmalı');
  const contract: ModuleContract = { entities: [], relations: [], workflows: [] };
  if (contractRaw) {
    exactKeys(contractRaw, ['entities', 'relations', 'workflows'], 'contract', issues);
    if (!Array.isArray(contractRaw.entities) || contractRaw.entities.length < 1 || contractRaw.entities.length > 8) issues.push('contract.entities: 1-8 varlık olmalı');
    if (Array.isArray(contractRaw.entities)) contract.entities = contractRaw.entities.map((entity, index) => normalizeEntity(entity, index, issues)).filter((entity): entity is RecordEntitySpec => entity !== null);
    const entityIds = new Set<string>();
    for (const entity of contract.entities) {
      if (entityIds.has(entity.id)) issues.push('contract.entities: tekrarlı varlık kimliği');
      entityIds.add(entity.id);
    }
    if (!Array.isArray(contractRaw.relations) || contractRaw.relations.length > 12) issues.push('contract.relations: dizi ve en fazla 12 olmalı');
    if (Array.isArray(contractRaw.relations)) contract.relations = contractRaw.relations.map((relation, index) => normalizeRelation(relation, index, entityIds, issues)).filter((relation): relation is RelationSpec => relation !== null);
    const relationIds = new Set<string>();
    for (const relation of contract.relations) {
      if (relationIds.has(relation.id)) issues.push('contract.relations: tekrarlı ilişki kimliği');
      relationIds.add(relation.id);
    }
    if (!Array.isArray(contractRaw.workflows) || contractRaw.workflows.length > 4) issues.push('contract.workflows: dizi ve en fazla 4 olmalı');
    if (Array.isArray(contractRaw.workflows)) contract.workflows = contractRaw.workflows.map((workflow, index) => normalizeWorkflow(workflow, index, issues)).filter((workflow): workflow is WorkflowTemplateSpec => workflow !== null);
    const workflowIds = new Set<string>();
    for (const workflow of contract.workflows) {
      if (workflowIds.has(workflow.id)) issues.push('contract.workflows: tekrarlı workflow kimliği');
      workflowIds.add(workflow.id);
    }
  }
  if (!Array.isArray(raw.composition) || raw.composition.length < 1 || raw.composition.length > 12) issues.push('composition: 1-12 blok olmalı');
  const composition = Array.isArray(raw.composition)
    ? raw.composition.map((block, index) => normalizeBlock(block, index, contract, issues)).filter((block): block is ModuleBlockInstance => block !== null)
    : [];
  const blockIds = new Set<string>();
  for (const block of composition) {
    if (blockIds.has(block.id)) issues.push('composition: tekrarlı blok kimliği');
    blockIds.add(block.id);
  }
  const presentationRaw = record(raw.presentation);
  if (!presentationRaw) issues.push('presentation: nesne olmalı');
  let presentation: ModulePresentation = { version: 1, layout: [] };
  if (presentationRaw) {
    exactKeys(presentationRaw, ['version', 'layout'], 'presentation', issues);
    if (presentationRaw.version !== 1) issues.push('presentation.version: yalnız 1 izinli');
    if (!Array.isArray(presentationRaw.layout)) issues.push('presentation.layout: dizi olmalı');
    const layout = Array.isArray(presentationRaw.layout)
      ? presentationRaw.layout.map((id, index) => cleanIdentifier(id, `presentation.layout[${index}]`, issues)).filter((id): id is string => id !== null)
      : [];
    if (layout.length !== composition.length || new Set(layout).size !== layout.length || layout.some((id) => !blockIds.has(id))) issues.push('presentation.layout: blokların tam ve tekil sırası olmalı');
    presentation = { version: 1, layout };
  }
  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, value: { contract, composition, presentation } };
}

/** Sunucu tarafı hash üretimi için anahtar sırasından bağımsız, çalıştırılamaz JSON temsili. */
export function stableAdaptiveJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableAdaptiveJson).join(',')}]`;
  const raw = record(value);
  if (raw) return `{${Object.keys(raw).sort().map((key) => `${JSON.stringify(key)}:${stableAdaptiveJson(raw[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

export function normalizeDataClassification(input: unknown): AdaptiveValidation<DataClassification> {
  const raw = record(input);
  if (!raw) return { ok: false, issues: ['dataClassification: nesne olmalı'] };
  const issues: string[] = [];
  exactKeys(raw, ['level', 'containsMinorData', 'containsSpecialCategoryData', 'containsPreciseLocation', 'containsFiles'], 'dataClassification', issues);
  if (
    raw.level !== 'standard' ||
    raw.containsMinorData !== false ||
    raw.containsSpecialCategoryData !== false ||
    raw.containsPreciseLocation !== false ||
    raw.containsFiles !== false
  ) issues.push('dataClassification: yalnız standart, çocuk/özel nitelikli/konum/dosyasız veri izinli');
  return issues.length ? { ok: false, issues } : { ok: true, value: { ...STANDARD_DATA_CLASSIFICATION } };
}

export function normalizeCapabilityDeclarations(input: unknown): AdaptiveValidation<CapabilityDeclaration[]> {
  if (!Array.isArray(input) || input.length < 1 || input.length > CAPABILITY_IDS.size) return { ok: false, issues: ['capabilityDeclaration: 1-4 izinli bildirim olmalı'] };
  const issues: string[] = [];
  const capabilities: CapabilityDeclaration[] = [];
  const seen = new Set<string>();
  input.forEach((entry, index) => {
    const raw = record(entry);
    if (!raw) {
      issues.push(`capabilityDeclaration[${index}]: nesne olmalı`);
      return;
    }
    exactKeys(raw, ['id', 'mode'], `capabilityDeclaration[${index}]`, issues);
    if (typeof raw.id !== 'string' || !CAPABILITY_IDS.has(raw.id as CapabilityDeclaration['id'])) issues.push(`capabilityDeclaration[${index}].id: izinli değil`);
    if (raw.mode !== 'manual') issues.push(`capabilityDeclaration[${index}].mode: yalnız manual izinli`);
    if (typeof raw.id === 'string' && CAPABILITY_IDS.has(raw.id as CapabilityDeclaration['id']) && raw.mode === 'manual') {
      if (seen.has(raw.id)) issues.push('capabilityDeclaration: tekrarlı bildirim');
      seen.add(raw.id);
      capabilities.push({ id: raw.id as CapabilityDeclaration['id'], mode: 'manual' });
    }
  });
  return issues.length ? { ok: false, issues } : { ok: true, value: capabilities };
}
