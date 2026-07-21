// Uyarlanabilir Modül Studio — Dashboard Design Puck'ından bilinçli olarak AYRI.
// Burada yalnız sabit blok kimlikleri ve tiplenmiş başlık/görünürlük alanları düzenlenir;
// sözleşme, veri şeması, kod/URL ve üçüncü taraf Puck props'ları saklanmaz.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, ClipboardCheck, FileDiff, LockKeyhole, Plus, Save, Send, ShieldCheck } from 'lucide-react';
import { Puck, type Config, type Data } from '@puckeditor/core';
import '@puckeditor/core/puck.css';
import type { Workspace } from '@shared/types.ts';
import {
  normalizeModuleRevisionInput,
  type AdaptiveBlockType,
  type ModuleBlockInstance,
  type ModuleRevisionV2,
  type WorkflowInstanceBundle,
  type WorkflowStepStatus,
  type WorkflowTemplateSpec,
} from '@shared/adaptive-modules.ts';
import { api, type AdaptiveModuleStudioItem } from '@/lib/api';

type StudioPuckType = 'Ledger' | 'Form' | 'Table' | 'Workflow' | 'Timeline' | 'Metrics' | 'Reference';
// blockId yalnız istemci-içi eşleme anahtarıdır; Puck alanı değildir ve kullanıcı düzenleyemez.
type StudioBlockProps = { blockId?: string; title: string; visibility: 'visible' | 'hidden' };
type StudioPuckComponents = Record<StudioPuckType, StudioBlockProps>;

const PUCK_TYPE_BY_BLOCK: Record<AdaptiveBlockType, StudioPuckType> = {
  'record-ledger': 'Ledger',
  'record-form': 'Form',
  'record-table': 'Table',
  'step-workflow': 'Workflow',
  'activity-timeline': 'Timeline',
  'summary-metrics': 'Metrics',
  'reference-link': 'Reference',
};

const BLOCK_LABEL: Record<StudioPuckType, string> = {
  Ledger: 'Kayıt defteri', Form: 'Kayıt formu', Table: 'Kayıt tablosu', Workflow: 'Manuel adımlar',
  Timeline: 'Etkinlik zaman çizelgesi', Metrics: 'Özet metrikler', Reference: 'Referans bağlantısı',
};

function studioPreview(type: StudioPuckType) {
  return function StudioPreview({ title, visibility }: StudioBlockProps) {
    return (
      <section className={`module-studio-preview${visibility === 'hidden' ? ' is-hidden' : ''}`}>
        <span className="module-studio-preview-handle" aria-hidden="true">⠿</span>
        <div><strong>{title}</strong><small>{BLOCK_LABEL[type]} · sabit şablon</small></div>
        <span className="module-studio-preset">{visibility === 'hidden' ? 'GİZLİ' : 'İZİNLİ BLOK'}</span>
      </section>
    );
  };
}

// Bu config bir katalog değildir ve dışarıdan yüklenmez: yalnız derleme-zamanı allowlist.
const studioPuckConfig: Config<StudioPuckComponents> = {
  components: {
    Ledger: { label: 'Kayıt defteri', fields: { title: { type: 'text', label: 'Başlık' }, visibility: { type: 'select', label: 'Görünürlük', options: [{ label: 'Görünür', value: 'visible' }, { label: 'Gizli', value: 'hidden' }] } }, render: studioPreview('Ledger') },
    Form: { label: 'Kayıt formu', fields: { title: { type: 'text', label: 'Başlık' }, visibility: { type: 'select', label: 'Görünürlük', options: [{ label: 'Görünür', value: 'visible' }, { label: 'Gizli', value: 'hidden' }] } }, render: studioPreview('Form') },
    Table: { label: 'Kayıt tablosu', fields: { title: { type: 'text', label: 'Başlık' }, visibility: { type: 'select', label: 'Görünürlük', options: [{ label: 'Görünür', value: 'visible' }, { label: 'Gizli', value: 'hidden' }] } }, render: studioPreview('Table') },
    Workflow: { label: 'Manuel adımlar', fields: { title: { type: 'text', label: 'Başlık' }, visibility: { type: 'select', label: 'Görünürlük', options: [{ label: 'Görünür', value: 'visible' }, { label: 'Gizli', value: 'hidden' }] } }, render: studioPreview('Workflow') },
    Timeline: { label: 'Etkinlik zaman çizelgesi', fields: { title: { type: 'text', label: 'Başlık' }, visibility: { type: 'select', label: 'Görünürlük', options: [{ label: 'Görünür', value: 'visible' }, { label: 'Gizli', value: 'hidden' }] } }, render: studioPreview('Timeline') },
    Metrics: { label: 'Özet metrikler', fields: { title: { type: 'text', label: 'Başlık' }, visibility: { type: 'select', label: 'Görünürlük', options: [{ label: 'Görünür', value: 'visible' }, { label: 'Gizli', value: 'hidden' }] } }, render: studioPreview('Metrics') },
    Reference: { label: 'Referans bağlantısı', fields: { title: { type: 'text', label: 'Başlık' }, visibility: { type: 'select', label: 'Görünürlük', options: [{ label: 'Görünür', value: 'visible' }, { label: 'Gizli', value: 'hidden' }] } }, render: studioPreview('Reference') },
  },
};

function text(value: unknown): string | null {
  return typeof value === 'string' ? value.trim() : null;
}

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function puckDataFromRevision(revision: ModuleRevisionV2): Data {
  const blocks = new Map(revision.composition.map((block) => [block.id, block]));
  return {
    content: revision.presentation.layout.map((id) => {
      const block = blocks.get(id)!;
      return {
        type: PUCK_TYPE_BY_BLOCK[block.type],
        props: {
          blockId: block.id,
          title: typeof block.config.title === 'string' ? block.config.title : BLOCK_LABEL[PUCK_TYPE_BY_BLOCK[block.type]],
          visibility: block.config.visible === false ? 'hidden' : 'visible',
        },
      };
    }),
  } as unknown as Data;
}

/**
 * Puck verisini güvenli revizyona indirger. Puck'ın kendi ara verisi ASLA kalıcılaşmaz:
 * her blok yalnız tanınan kimliğiyle mevcut blokla eşleştirilir, yalnız iki typed prop alınır.
 */
export function revisionFromStudioPuck(data: Data, base: ModuleRevisionV2): { ok: true; value: Pick<ModuleRevisionV2, 'contract' | 'composition' | 'presentation'> } | { ok: false; issue: string } {
  const raw = data as unknown as Record<string, unknown>;
  if (!Array.isArray(raw.content) || raw.content.length !== base.composition.length) return { ok: false, issue: 'Her izinli blok tam olarak bir kez yer almalı.' };
  const originals = new Map(base.composition.map((block) => [block.id, block]));
  const seen = new Set<string>();
  const composition: ModuleBlockInstance[] = [];
  const layout: string[] = [];
  for (const item of raw.content) {
    const entry = object(item);
    const props = entry ? object(entry.props) : null;
    const blockId = props ? text(props.blockId) : null;
    const title = props ? text(props.title) : null;
    const visibility = props?.visibility;
    if (!entry || !props || !blockId || !title || title.length > 180) return { ok: false, issue: 'Blok başlığı veya kimliği geçersiz.' };
    if (Object.keys(props).some((key) => !['blockId', 'title', 'visibility'].includes(key))) return { ok: false, issue: 'İzinli olmayan Puck özelliği algılandı.' };
    if (visibility !== 'visible' && visibility !== 'hidden') return { ok: false, issue: 'Görünürlük seçimi geçersiz.' };
    const original = originals.get(blockId);
    if (!original || seen.has(blockId) || entry.type !== PUCK_TYPE_BY_BLOCK[original.type]) return { ok: false, issue: 'Yabancı veya tekrarlı Puck bloğu algılandı.' };
    seen.add(blockId);
    composition.push({ ...original, config: { ...original.config, title, visible: visibility === 'visible' } });
    layout.push(blockId);
  }
  const normalized = normalizeModuleRevisionInput({ contract: base.contract, composition, presentation: { version: 1, layout } });
  return normalized.ok ? { ok: true, value: normalized.value } : { ok: false, issue: normalized.issues[0] ?? 'Taslak güvenlik doğrulamasını geçemedi.' };
}

function diffSummary(base: ModuleRevisionV2, next: ModuleRevisionV2): string[] {
  const before = new Map(base.composition.map((block) => [block.id, block]));
  const changes: string[] = [];
  next.presentation.layout.forEach((id, index) => {
    const old = before.get(id)!;
    const current = next.composition.find((block) => block.id === id)!;
    if (base.presentation.layout[index] !== id) changes.push(`${String(index + 1)}. sıraya taşındı: ${String(current.config.title)}`);
    if (old.config.title !== current.config.title) changes.push(`Başlık: “${String(old.config.title)}” → “${String(current.config.title)}”`);
    if (old.config.visible !== current.config.visible) changes.push(`${String(current.config.title)} görünürlüğü değişti.`);
  });
  return changes.length ? changes : ['Yapısal değişiklik yok; yine de owner onayı gerekir.'];
}

function WorkflowTracker({
  workspaceId, definitionId, workflows, instances, onRefresh,
}: {
  workspaceId: string;
  definitionId: string;
  workflows: WorkflowTemplateSpec[];
  instances: WorkflowInstanceBundle[];
  onRefresh: () => Promise<void>;
}) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const create = async (workflow: WorkflowTemplateSpec) => {
    setBusy(true); setMessage('');
    try {
      await api.createAdaptiveWorkflow(workspaceId, {
        definitionId, workflowId: workflow.id, title: `Yeni ${workflow.title}`,
        // Aynı kullanıcı tıklaması aynı anahtarı tekrar göndermez; sunucu yine de idempotenttir.
        idempotencyKey: `studio-${workflow.id}-${Date.now()}`,
      });
      await onRefresh(); setMessage('Manuel adım örneği oluşturuldu. Hiçbir dış aksiyon tetiklenmedi.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Workflow örneği oluşturulamadı'); }
    finally { setBusy(false); }
  };

  const update = async (instance: WorkflowInstanceBundle, stepId: string, status: WorkflowStepStatus) => {
    setBusy(true); setMessage('');
    try {
      await api.updateAdaptiveWorkflowStep(workspaceId, instance.instance.id, stepId, { status, ...(notes[stepId] ? { manualNote: notes[stepId] } : {}) });
      await onRefresh(); setMessage('Adım durumu manuel olarak kaydedildi.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Adım güncellenemedi'); }
    finally { setBusy(false); }
  };

  const relevant = instances.filter((item) => item.instance.moduleDefinitionId === definitionId);
  return (
    <section className="module-workflow-tracker">
      <div className="module-workflow-head"><div><h2><ClipboardCheck size={17} aria-hidden="true" /> Manuel adım takibi · sentetik beta</h2><p>Konum, dosya, URL, bildirim ve harici entegrasyon kapalıdır.</p></div></div>
      {workflows.map((workflow) => (
        <div className="module-workflow-template" key={workflow.id}>
          <div><strong>{workflow.title}</strong><small>{workflow.steps.length} sabit sıralı adım · yeni örnekler bu yayın revizyonunu snapshot alır.</small></div>
          <button className="btn" disabled={busy} onClick={() => void create(workflow)}><Plus size={15} aria-hidden="true" /> Yeni manuel tur</button>
        </div>
      ))}
      {message && <p className="module-workflow-message" role="status">{message}</p>}
      {relevant.map((bundle) => (
        <section className="module-workflow-instance" key={bundle.instance.id}>
          <h3>{bundle.instance.title}</h3>
          <p>Şablon snapshot: revizyon {bundle.template.moduleRevisionId.slice(0, 8)} · {bundle.audit.length} denetim olayı</p>
          {bundle.steps.map((step) => (
            <div className="module-workflow-step" key={step.id}>
              <div><strong>{step.order + 1}. {step.title}</strong><small>{step.assigneeLabel ?? 'Owner manuel takibi'}{step.requiresManualEvidence ? ' · tamamlamak için manuel not gerekli' : ''}</small></div>
              <textarea value={notes[step.id] ?? step.manualNote ?? ''} onChange={(event) => setNotes((current) => ({ ...current, [step.id]: event.target.value }))} maxLength={2000} placeholder={step.requiresManualEvidence ? 'Tamamlama kanıtı olarak manuel not yaz' : 'İsteğe bağlı manuel not'} aria-label={`${step.title} manuel notu`} />
              <select value={step.status} disabled={busy} onChange={(event) => void update(bundle, step.id, event.target.value as WorkflowStepStatus)} aria-label={`${step.title} durumu`}>
                {bundle.template.allowedStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </div>
          ))}
        </section>
      ))}
    </section>
  );
}

export function ModuleStudioPage({ workspace, onBack }: { workspace: Workspace; onBack: () => void }) {
  const [modules, setModules] = useState<AdaptiveModuleStudioItem[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [savedDraft, setSavedDraft] = useState<ModuleRevisionV2 | null>(null);
  const [workflowInstances, setWorkflowInstances] = useState<WorkflowInstanceBundle[]>([]);
  const [status, setStatus] = useState<'idle' | 'saving' | 'error' | 'saved'>('idle');
  const [message, setMessage] = useState('');

  const reload = useCallback(async () => {
    const [response, workflowResponse] = await Promise.all([api.adaptiveModules(workspace.id), api.adaptiveWorkflows(workspace.id)]);
    setModules(response.modules);
    setWorkflowInstances(workflowResponse.instances);
    setSelectedId((current) => response.modules.some((item) => item.definition.id === current) ? current : response.modules[0]?.definition.id ?? '');
  }, [workspace.id]);

  useEffect(() => { void reload().catch((error: unknown) => { setStatus('error'); setMessage(error instanceof Error ? error.message : 'Modüller yüklenemedi'); }); }, [reload]);

  const selected = modules.find((item) => item.definition.id === selectedId) ?? null;
  const base = selected?.activeRevision ?? null;
  const reviewRevision = savedDraft ?? selected?.revisions.find((revision) => revision.state === 'proposed' && revision.basedOnRevisionId === base?.id) ?? null;
  const diff = useMemo(() => base && reviewRevision ? diffSummary(base, reviewRevision) : [], [base, reviewRevision]);

  const save = async (data: Data) => {
    if (!selected || !base) return;
    const next = revisionFromStudioPuck(data, base);
    if (!next.ok) { setStatus('error'); setMessage(next.issue); return; }
    setStatus('saving'); setMessage('');
    try {
      const response = await api.saveAdaptiveDraft(workspace.id, selected.definition.id, base.id, next.value);
      setSavedDraft(response.revision);
      setStatus('saved'); setMessage('Taslak kaydedildi. Yayın için önce farkı incelemeye gönder, sonra açıkça onayla.');
      await reload();
    } catch (error) { setStatus('error'); setMessage(error instanceof Error ? error.message : 'Taslak kaydedilemedi'); }
  };

  const propose = async () => {
    if (!selected || !reviewRevision) return;
    setStatus('saving');
    try { await api.proposeAdaptiveRevision(workspace.id, selected.definition.id, reviewRevision.id); setStatus('saved'); setMessage('Fark owner incelemesine hazır. Yayın için ayrı onay gerekir.'); await reload(); }
    catch (error) { setStatus('error'); setMessage(error instanceof Error ? error.message : 'İnceleme başlatılamadı'); }
  };

  const approve = async () => {
    if (!selected || !reviewRevision) return;
    setStatus('saving');
    try { await api.approveAdaptiveRevision(workspace.id, selected.definition.id, reviewRevision.id); setSavedDraft(null); setStatus('saved'); setMessage('Owner onayıyla yayınlandı; önceki revizyon korunarak superseded oldu.'); await reload(); }
    catch (error) { setStatus('error'); setMessage(error instanceof Error ? error.message : 'Yayın onayı başarısız'); }
  };

  return (
    <main className="design-page module-studio-page">
      <div className="design-page-intro">
        <button className="btn design-back" onClick={onBack}><ArrowLeft size={16} aria-hidden="true" /> Panoya dön</button>
        <div>
          <p className="eyebrow"><LockKeyhole size={13} aria-hidden="true" /> YALNIZCA WORKSPACE SAHİBİ</p>
          <h1><ShieldCheck size={24} aria-hidden="true" /> {workspace.title} Modül Studio</h1>
          <p>Yalnız izinli blokların sırasını, başlığını ve görünürlüğünü düzenle. Veri sözleşmesi, şema ve yetenekler korunur.</p>
        </div>
        <div className="design-rules"><strong>Yayın insan onaylıdır</strong><span>Taslak → fark → açık owner onayı olmadan yayın yok.</span></div>
      </div>
      {message && <p className={`design-status ${status}`} role={status === 'error' ? 'alert' : 'status'}>{status === 'saved' && <Check size={15} aria-hidden="true" />}{message}</p>}
      {!selected || !base ? <div className="module-studio-empty">Bu sentetik beta çalışma alanında düzenlenebilir V2 modül bulunmuyor.</div> : (
        <div className="module-studio-shell">
          <aside className="module-studio-list" aria-label="Uyarlanabilir modüller">
            {modules.map((item) => <button key={item.definition.id} className={item.definition.id === selectedId ? 'active' : ''} onClick={() => { setSelectedId(item.definition.id); setSavedDraft(null); }}><strong>{item.definition.title}</strong><small>{item.definition.origin.kind === 'catalog' ? 'Katalog eşleşmesi' : 'İzinli parçalardan oluşturuldu'}</small></button>)}
          </aside>
          <section className="module-studio-editor">
            <div className="module-studio-protected"><LockKeyhole size={14} aria-hidden="true" /><span>Korunan sözleşme: {base.contract.entities.length} varlık, {base.contract.workflows.length} manuel akış, yalnız standart veri. Kod, URL, yabancı blok ve serbest prop saklanmaz.</span></div>
            <Puck
              key={`${selected.definition.id}-${base.id}`}
              config={studioPuckConfig}
              data={puckDataFromRevision(base)}
              headerTitle={`${selected.definition.title} düzenleme`}
              permissions={{ insert: false, delete: false, duplicate: false, drag: true, edit: true }}
              onPublish={(data) => { void save(data as Data); }}
              renderHeaderActions={({ state }) => <button className="Puck__button Puck__button--primary" type="button" disabled={status === 'saving'} onClick={() => { void save(state.data as Data); }}><Save size={15} aria-hidden="true" /> {status === 'saving' ? 'Kaydediliyor…' : 'Taslağı kaydet'}</button>}
            />
            {reviewRevision && <section className="module-studio-diff"><h2><FileDiff size={17} aria-hidden="true" /> Yayın öncesi fark</h2><ul>{diff.map((line) => <li key={line}>{line}</li>)}</ul>{reviewRevision.state === 'draft' ? <button className="btn" disabled={status === 'saving'} onClick={() => void propose()}><Send size={15} aria-hidden="true" /> İncelemeye gönder</button> : reviewRevision.state === 'proposed' ? <button className="btn btn-primary" disabled={status === 'saving'} onClick={() => void approve()}><ShieldCheck size={15} aria-hidden="true" /> Owner olarak onayla ve yayınla</button> : null}</section>}
            {base.contract.workflows.length > 0 && <WorkflowTracker workspaceId={workspace.id} definitionId={selected.definition.id} workflows={base.contract.workflows} instances={workflowInstances} onRefresh={reload} />}
          </section>
        </div>
      )}
    </main>
  );
}
