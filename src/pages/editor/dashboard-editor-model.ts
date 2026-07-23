import {
  DEFAULT_DASHBOARD_DESIGN,
  normalizeDashboardDesign,
  type DashboardDesign,
  type DashboardWidgetId,
} from '@shared/dashboard-design.ts';

const LEGACY_WIDGET_IDS: Record<string, DashboardWidgetId> = {
  Summary: 'summary',
  Modules: 'modules',
  Schema: 'schema',
  Domain: 'domain',
  Safety: 'safety',
};

export interface StoredDashboardDesign {
  design: DashboardDesign;
  legacyPuck: boolean;
  blocked: boolean;
  note: string | null;
}

/**
 * Eski Puck oturumu storage'a sızmışsa bilinen root/content biçimini domain nesnesine çevirir.
 * Bilinmeyen blok/prop görülürse ham kayıt overwrite edilmesin diye kaydı kapatır.
 */
export function dashboardDesignFromStoredData(input: unknown): StoredDashboardDesign {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { design: normalizeDashboardDesign(input), legacyPuck: false, blocked: false, note: null };
  }
  const raw = input as Record<string, unknown>;
  if (!Array.isArray(raw.content) && !('root' in raw)) {
    return { design: normalizeDashboardDesign(input), legacyPuck: false, blocked: false, note: null };
  }

  const root = raw.root && typeof raw.root === 'object' && !Array.isArray(raw.root) ? raw.root as Record<string, unknown> : {};
  const props = root.props && typeof root.props === 'object' && !Array.isArray(root.props) ? root.props as Record<string, unknown> : {};
  const allowedThemeKeys = new Set(['palette', 'font', 'radius', 'spacing', 'id']);
  const unknownRootProps = Object.keys(props).filter((key) => !allowedThemeKeys.has(key));
  const layout: DashboardWidgetId[] = [];
  let unknownContent = false;

  for (const item of Array.isArray(raw.content) ? raw.content : []) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      unknownContent = true;
      continue;
    }
    const entry = item as Record<string, unknown>;
    const id = typeof entry.type === 'string' ? LEGACY_WIDGET_IDS[entry.type] : undefined;
    const itemProps = entry.props && typeof entry.props === 'object' && !Array.isArray(entry.props) ? entry.props as Record<string, unknown> : {};
    const unknownItemProps = Object.keys(itemProps).filter((key) => key !== 'id');
    if (!id || unknownItemProps.length > 0) {
      unknownContent = true;
      continue;
    }
    if (!layout.includes(id)) layout.push(id);
  }

  const blocked = unknownContent || unknownRootProps.length > 0;
  const design = normalizeDashboardDesign({ theme: props, layout: layout.length ? layout : DEFAULT_DASHBOARD_DESIGN.layout });
  return {
    design,
    legacyPuck: true,
    blocked,
    note: blocked
      ? 'Bilinmeyen legacy Puck alanı bulundu. Veri kaybını önlemek için kayıt kapatıldı; ham kayıt korunuyor.'
      : 'Legacy Puck verisi kayıpsız olarak dashboard sözleşmesine dönüştürüldü.',
  };
}
