import { useState } from 'react';
import { ArrowLeft, Check, LockKeyhole, Palette, Save } from 'lucide-react';
import { Puck, type Config, type Data } from '@puckeditor/core';
import '@puckeditor/core/puck.css';
import type { Workspace } from '@shared/types.ts';
import {
  DEFAULT_DASHBOARD_DESIGN,
  normalizeDashboardDesign,
  type DashboardDesign,
  type DashboardTheme,
  type DashboardWidgetId,
} from '@shared/dashboard-design.ts';
import { api } from '@/lib/api';
import { dashboardThemeVars } from '@/lib/dashboard-theme';

type PuckWidgetType = 'Summary' | 'Modules' | 'Schema' | 'Domain' | 'Safety';
type PuckComponents = Record<PuckWidgetType, Record<string, never>>;

const WIDGETS: Array<{ id: DashboardWidgetId; type: PuckWidgetType; title: string; detail: string }> = [
  { id: 'summary', type: 'Summary', title: 'Özet kartları', detail: 'Modül, alan türü, kurulum ve veri modu' },
  { id: 'modules', type: 'Modules', title: 'Modüller', detail: 'Çalışma alanındaki hazır paneller' },
  { id: 'schema', type: 'Schema', title: 'Özel şema', detail: 'Varsa oluşturulan özel modül şeması' },
  { id: 'domain', type: 'Domain', title: 'Alan adı', detail: 'Kendi alan adını bağlama alanı' },
  { id: 'safety', type: 'Safety', title: 'Güvenlik beyanı', detail: 'Sentetik ve sahiplik sınırları' },
];

const idForType = (type: unknown): DashboardWidgetId | null =>
  WIDGETS.find((widget) => widget.type === type)?.id ?? null;

function previewBlock(title: string, detail: string) {
  return function PreviewBlock() {
    return (
      <section className="design-widget-preview">
        <span className="design-widget-handle" aria-hidden="true">⠿</span>
        <div><strong>{title}</strong><small>{detail}</small></div>
        <span className="design-widget-preset">SABİT PRESET</span>
      </section>
    );
  };
}

const puckConfig: Config<PuckComponents, DashboardTheme> = {
  root: {
    fields: {
      palette: { type: 'select', label: 'Renk paleti', options: [
        { label: 'Mor / Sectrai', value: 'violet' }, { label: 'Okyanus', value: 'ocean' }, { label: 'Orman', value: 'forest' },
      ] },
      font: { type: 'select', label: 'Yazı karakteri', options: [
        { label: 'Sectrai Display', value: 'display' }, { label: 'Humanist', value: 'humanist' }, { label: 'Sistem', value: 'system' },
      ] },
      radius: { type: 'select', label: 'Köşe yuvarlaklığı', options: [
        { label: 'Yumuşak', value: 'soft' }, { label: 'Yuvarlak', value: 'round' }, { label: 'Keskin', value: 'square' },
      ] },
      spacing: { type: 'select', label: 'Bölüm aralığı', options: [
        { label: 'Sıkı', value: 'compact' }, { label: 'Dengeli', value: 'balanced' }, { label: 'Havadar', value: 'airy' },
      ] },
    },
    defaultProps: DEFAULT_DASHBOARD_DESIGN.theme,
    render: ({ children, ...theme }) => <div className="design-puck-canvas" style={dashboardThemeVars(normalizeDashboardDesign({ theme }).theme)}>{children}</div>,
  },
  components: {
    Summary: { label: 'Özet kartları', render: previewBlock('Özet kartları', 'Modül, alan türü, kurulum ve veri modu') },
    Modules: { label: 'Modüller', render: previewBlock('Modüller', 'Çalışma alanındaki hazır paneller') },
    Schema: { label: 'Özel şema', render: previewBlock('Özel şema', 'Varsa oluşturulan özel modül şeması') },
    Domain: { label: 'Alan adı', render: previewBlock('Alan adı', 'Kendi alan adını bağlama alanı') },
    Safety: { label: 'Güvenlik beyanı', render: previewBlock('Güvenlik beyanı', 'Sentetik ve sahiplik sınırları') },
  },
};

function puckDataFromDesign(design: DashboardDesign): Data {
  return {
    root: { props: design.theme },
    content: design.layout.map((id) => ({ type: WIDGETS.find((widget) => widget.id === id)!.type, props: {} })),
  } as unknown as Data;
}

function designFromPuck(data: Data): DashboardDesign {
  const root = data.root && 'props' in data.root ? data.root.props : {};
  const layout = Array.isArray(data.content)
    ? data.content.map((item) => idForType(item.type)).filter((id): id is DashboardWidgetId => id !== null)
    : [];
  return normalizeDashboardDesign({ theme: root, layout });
}

export function DashboardDesignPage({ workspace, onBack, onSaved }: {
  workspace: Workspace;
  onBack: () => void;
  onSaved: (workspace: Workspace) => void;
}) {
  const design = normalizeDashboardDesign(workspace.dashboardDesign);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const save = async (data: Data) => {
    setStatus('saving');
    setMessage('');
    try {
      const result = await api.saveDashboardDesign(workspace.id, designFromPuck(data));
      onSaved(result.workspace);
      setStatus('saved');
      setMessage('Tasarım yalnız bu çalışma alanına kaydedildi.');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Tasarım kaydedilemedi');
    }
  };

  return (
    <main className="design-page">
      <div className="design-page-intro">
        <button className="btn design-back" onClick={onBack}><ArrowLeft size={16} aria-hidden="true" /> Panoya dön</button>
        <div>
          <p className="eyebrow"><LockKeyhole size={13} aria-hidden="true" /> YALNIZCA WORKSPACE SAHİBİ</p>
          <h1><Palette size={24} aria-hidden="true" /> {workspace.title} tasarımı</h1>
          <p>Renk, tipografi ve boşluk presetlerini seç; mevcut pano bloklarını sürükleyerek sırala.</p>
        </div>
        <div className="design-rules"><strong>Kod serbestliği yok</strong><span>Yalnız kayıtlı dashboard preset’leri kullanılabilir.</span></div>
      </div>
      {message && <p className={`design-status ${status}`} role={status === 'error' ? 'alert' : 'status'}>{status === 'saved' && <Check size={15} aria-hidden="true" />}{message}</p>}
      <Puck
        key={`${workspace.id}-${JSON.stringify(design)}`}
        config={puckConfig}
        data={puckDataFromDesign(design)}
        headerTitle="Pano tasarımı"
        permissions={{ insert: false, delete: false, duplicate: false, drag: true, edit: true }}
        onPublish={(data) => { void save(data as Data); }}
        renderHeaderActions={({ state }) => (
          <button className="Puck__button Puck__button--primary" type="button" disabled={status === 'saving'} onClick={() => { void save(state.data as Data); }}>
            <Save size={15} aria-hidden="true" /> {status === 'saving' ? 'Kaydediliyor…' : 'Tasarımı kaydet'}
          </button>
        )}
      />
    </main>
  );
}
