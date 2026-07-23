import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  LockKeyhole,
  Monitor,
  Palette,
  Redo2,
  Save,
  Smartphone,
  Tablet,
  Undo2,
} from 'lucide-react';
import type { MasaLayout } from '@shared/masa.ts';
import { normalizeMasaLayout } from '@shared/masa.ts';
import { moduleSchemaFor } from '@shared/module-schemas.ts';
import type { Workspace } from '@shared/types.ts';
import {
  DASHBOARD_FONTS,
  DASHBOARD_PALETTES,
  DASHBOARD_RADII,
  DASHBOARD_SPACING,
  normalizeDashboardDesign,
  type DashboardFont,
  type DashboardPalette,
  type DashboardRadius,
  type DashboardSpacing,
  type DashboardTheme,
  type DashboardWidgetId,
} from '@shared/dashboard-design.ts';
import { api } from '@/lib/api';
import { dashboardThemeVars } from '@/lib/dashboard-theme';
import { dashboardDesignFromStoredData } from './editor/dashboard-editor-model';
import { FlatLayoutEditor, type FlatEditorItem } from './editor/FlatLayoutEditor';
import { ModulePalette } from './editor/ModulePalette';
import { SchemaFieldPanel } from './editor/SchemaFieldPanel';
import {
  editorLayoutFromOrder,
  editorOrderFromLayout,
  registryPaletteForWorkspace,
  schemaValuesOnly,
} from './editor/editor-model';
import './editor/editor.css';
import { t } from '@/lib/i18n';

const WIDGETS: readonly FlatEditorItem[] = [
  { id: 'summary', label: 'Özet kartları', detail: 'Modül, alan türü, kurulum ve veri modu' },
  { id: 'modules', label: 'Modüller', detail: 'Çalışma alanındaki hazır paneller' },
  { id: 'schema', label: 'Özel şema', detail: 'Varsa oluşturulan özel modül şeması' },
  { id: 'domain', label: 'Alan adı', detail: 'Kendi alan adını bağlama alanı' },
  { id: 'safety', label: 'Güvenlik beyanı', detail: 'Sentetik ve sahiplik sınırları' },
];

const THEME_FIELDS = [
  { key: 'palette', label: 'Renk paleti', values: DASHBOARD_PALETTES, labels: ['Mor / Sectrai', 'Okyanus', 'Orman'] },
  { key: 'font', label: 'Yazı karakteri', values: DASHBOARD_FONTS, labels: ['Sectrai Display', 'Humanist', 'Sistem'] },
  { key: 'radius', label: 'Köşe yuvarlaklığı', values: DASHBOARD_RADII, labels: ['Yumuşak', 'Yuvarlak', 'Keskin'] },
  { key: 'spacing', label: 'Bölüm aralığı', values: DASHBOARD_SPACING, labels: ['Sıkı', 'Dengeli', 'Havadar'] },
] as const;

type EditorSnapshot = { theme: DashboardTheme; layout: MasaLayout };
type EditorHistory = { past: EditorSnapshot[]; present: EditorSnapshot; future: EditorSnapshot[] };

function snapshotFromStoredData(input: unknown): { stored: ReturnType<typeof dashboardDesignFromStoredData>; snapshot: EditorSnapshot } {
  const stored = dashboardDesignFromStoredData(input);
  return { stored, snapshot: { theme: stored.design.theme, layout: editorLayoutFromOrder(stored.design.layout, WIDGETS) } };
}

export function DashboardDesignPage({ workspace, onBack, onSaved }: {
  workspace: Workspace;
  onBack: () => void;
  onSaved: (workspace: Workspace) => void;
}) {
  const initial = useMemo(() => snapshotFromStoredData(workspace.dashboardDesign), [workspace.dashboardDesign]);
  const [history, setHistory] = useState<EditorHistory>(() => ({ past: [], present: initial.snapshot, future: [] }));
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [viewport, setViewport] = useState<360 | 768 | 1280>(1280);
  const paletteModules = useMemo(() => registryPaletteForWorkspace(workspace), [workspace]);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(() => paletteModules[0]?.id ?? null);
  const [fieldValues, setFieldValues] = useState<Record<string, Record<string, unknown>>>({});
  const selectedModule = paletteModules.find((module) => module.id === selectedModuleId) ?? null;

  const commit = (next: EditorSnapshot) => {
    setHistory((current) => ({ past: [...current.past.slice(-49), current.present], present: next, future: [] }));
    setStatus('idle');
    setMessage('');
  };
  const undo = () => {
    setHistory((current) => {
      const previous = current.past.at(-1);
      return previous ? { past: current.past.slice(0, -1), present: previous, future: [current.present, ...current.future] } : current;
    });
    setStatus('idle'); setMessage('');
  };
  const redo = () => {
    setHistory((current) => {
      const next = current.future[0];
      return next ? { past: [...current.past, current.present].slice(-50), present: next, future: current.future.slice(1) } : current;
    });
    setStatus('idle'); setMessage('');
  };

  const setTheme = (key: keyof DashboardTheme, value: string) => {
    const theme = {
      ...history.present.theme,
      [key]: value,
    } as DashboardTheme;
    commit({ ...history.present, theme: normalizeDashboardDesign({ theme }).theme });
  };

  const setSchemaValue = (fieldKey: string, value: unknown) => {
    if (!selectedModule) return;
    const schema = moduleSchemaFor(selectedModule.id, selectedModule.label);
    setFieldValues((current) => ({
      ...current,
      [selectedModule.id]: schemaValuesOnly(schema, { ...(current[selectedModule.id] ?? {}), [fieldKey]: value }),
    }));
  };

  const save = async () => {
    if (initial.stored.blocked) return;
    setStatus('saving');
    setMessage('');
    try {
      // Kalıcı sınıra kirli/elle üretilmiş bir layout ulaşamaz.
      const cleanLayout = normalizeMasaLayout(history.present.layout, WIDGETS);
      const layout = editorOrderFromLayout(cleanLayout) as DashboardWidgetId[];
      const design = normalizeDashboardDesign({ theme: history.present.theme, layout });
      const result = await api.saveDashboardDesign(workspace.id, design);
      onSaved(result.workspace);
      setStatus('saved');
      setMessage('Tasarım yalnız bu çalışma alanına kaydedildi. Yayınlama veya harici aksiyon yapılmadı.');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Tasarım kaydedilemedi');
    }
  };

  return (
    <main className="design-page schema-editor-page">
      <div className="design-page-intro">
        <button className="btn design-back" onClick={onBack}><ArrowLeft size={16} aria-hidden="true" /> {t("Panoya dön")}</button>
        <div>
          <p className="eyebrow"><LockKeyhole size={13} aria-hidden="true" /> {t("YALNIZCA WORKSPACE SAHİBİ")}</p>
          <h1><Palette size={24} aria-hidden="true" /> {t('{workspace} tasarımı', { workspace: workspace.title })}</h1>
          <p>{t("Flat blok sırasını ve güvenli presetleri düzenle. İç içe alan, serbest kod ve otomatik yayın yoktur.")}</p>
        </div>
        <div className="design-rules"><strong>{t("İnsan onayı gerekir")}</strong><span>{t("AI yalnız önerir; kayıt ancak “Tasarımı kaydet” ile başlar.")}</span></div>
      </div>

      {initial.stored.note && <p className={`design-status ${initial.stored.blocked ? 'error' : 'saved'}`} role={initial.stored.blocked ? 'alert' : 'status'}>{t(initial.stored.note)}</p>}
      {message && <p className={`design-status ${status}`} role={status === 'error' ? 'alert' : 'status'}>{status === 'saved' && <Check size={15} aria-hidden="true" />}{t(message)}</p>}

      <div className="schema-editor-toolbar" aria-label={t("Düzenleyici araçları")}>
        <div>
          <button type="button" className="btn" disabled={history.past.length === 0} onClick={undo}><Undo2 size={15} aria-hidden="true" /> {t("Geri al")}</button>
          <button type="button" className="btn" disabled={history.future.length === 0} onClick={redo}><Redo2 size={15} aria-hidden="true" /> {t("İleri al")}</button>
        </div>
        <div className="schema-editor-viewports" aria-label={t("Önizleme genişliği")}>
          <button type="button" className={viewport === 360 ? 'active' : ''} aria-pressed={viewport === 360} onClick={() => setViewport(360)}><Smartphone size={15} aria-hidden="true" /> 360</button>
          <button type="button" className={viewport === 768 ? 'active' : ''} aria-pressed={viewport === 768} onClick={() => setViewport(768)}><Tablet size={15} aria-hidden="true" /> 768</button>
          <button type="button" className={viewport === 1280 ? 'active' : ''} aria-pressed={viewport === 1280} onClick={() => setViewport(1280)}><Monitor size={15} aria-hidden="true" /> 1280</button>
        </div>
        <button className="btn btn-primary" type="button" disabled={status === 'saving' || initial.stored.blocked} onClick={() => void save()}>
          <Save size={15} aria-hidden="true" /> {t(status === 'saving' ? 'Kaydediliyor…' : 'Tasarımı kaydet')}
        </button>
      </div>

      <div className="schema-editor-shell">
        <ModulePalette modules={paletteModules} selectedId={selectedModuleId} onSelect={setSelectedModuleId} />
        <section className="schema-editor-workspace" aria-label={t("Pano düzeni")}>
          <div className="schema-editor-presets">
            {THEME_FIELDS.map((field) => (
              <label key={field.key}>
                <span>{t(field.label)}</span>
                <select value={history.present.theme[field.key]} onChange={(event) => setTheme(field.key, event.target.value)}>
                  {field.values.map((value, index) => <option key={value} value={value}>{t(field.labels[index])}</option>)}
                </select>
              </label>
            ))}
          </div>
          <div className="schema-editor-preview-stage">
            <div className="design-flat-canvas" data-viewport={viewport} style={{ ...dashboardThemeVars(history.present.theme), width: viewport, maxWidth: '100%' }}>
              <FlatLayoutEditor items={WIDGETS} layout={history.present.layout} onChange={(layout) => commit({ ...history.present, layout })} />
            </div>
          </div>
        </section>
        <SchemaFieldPanel
          module={selectedModule}
          values={selectedModule ? fieldValues[selectedModule.id] ?? {} : {}}
          onChange={setSchemaValue}
        />
      </div>
    </main>
  );
}

// Bu dar preset yüzeyinde tema değerlerini tip güvenli tutan görünür alias'lar.
export type DashboardEditorPreset = DashboardPalette | DashboardFont | DashboardRadius | DashboardSpacing;

export default DashboardDesignPage;
