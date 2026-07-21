// Workspace panosu için güvenli tasarım sözleşmesi.
// Yalnız bu dar preset kümesi kalıcılaştırılır: kullanıcı CSS/kod ya da serbest Puck bileşeni yazamaz.

export const DASHBOARD_WIDGET_IDS = ['summary', 'modules', 'schema', 'domain', 'safety'] as const;
export type DashboardWidgetId = (typeof DASHBOARD_WIDGET_IDS)[number];

export const DASHBOARD_PALETTES = ['violet', 'ocean', 'forest'] as const;
export const DASHBOARD_FONTS = ['display', 'humanist', 'system'] as const;
export const DASHBOARD_RADII = ['soft', 'round', 'square'] as const;
export const DASHBOARD_SPACING = ['compact', 'balanced', 'airy'] as const;

export type DashboardPalette = (typeof DASHBOARD_PALETTES)[number];
export type DashboardFont = (typeof DASHBOARD_FONTS)[number];
export type DashboardRadius = (typeof DASHBOARD_RADII)[number];
export type DashboardSpacing = (typeof DASHBOARD_SPACING)[number];

export interface DashboardTheme {
  palette: DashboardPalette;
  font: DashboardFont;
  radius: DashboardRadius;
  spacing: DashboardSpacing;
}

export interface DashboardDesign {
  version: 1;
  theme: DashboardTheme;
  /** Pano blokları yalnız sıralanır; yeni/yabancı blok kabul edilmez. */
  layout: DashboardWidgetId[];
}

export const DEFAULT_DASHBOARD_DESIGN = Object.freeze({
  version: 1,
  theme: { palette: 'violet', font: 'display', radius: 'soft', spacing: 'balanced' },
  layout: ['summary', 'modules', 'schema', 'domain', 'safety'],
}) as DashboardDesign;

const includes = <T extends readonly string[]>(set: T, value: unknown): value is T[number] =>
  typeof value === 'string' && (set as readonly string[]).includes(value);

/**
 * API sınırında kullanılan fail-safe normalizasyon: bilinmeyen değerler varsayılana iner,
 * yinelenen/yabancı widget'lar atılır ve eksik sabit preset'ler geri eklenir.
 */
export function normalizeDashboardDesign(input: unknown): DashboardDesign {
  const raw = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  const rawTheme = raw.theme && typeof raw.theme === 'object' ? raw.theme as Record<string, unknown> : {};
  const defaults = DEFAULT_DASHBOARD_DESIGN.theme;
  const layout: DashboardWidgetId[] = [];
  const rawLayout = Array.isArray(raw.layout) ? raw.layout : [];

  for (const item of rawLayout) {
    if (includes(DASHBOARD_WIDGET_IDS, item) && !layout.includes(item)) layout.push(item);
  }
  for (const required of DASHBOARD_WIDGET_IDS) {
    if (!layout.includes(required)) layout.push(required);
  }

  return {
    version: 1,
    theme: {
      palette: includes(DASHBOARD_PALETTES, rawTheme.palette) ? rawTheme.palette : defaults.palette,
      font: includes(DASHBOARD_FONTS, rawTheme.font) ? rawTheme.font : defaults.font,
      radius: includes(DASHBOARD_RADII, rawTheme.radius) ? rawTheme.radius : defaults.radius,
      spacing: includes(DASHBOARD_SPACING, rawTheme.spacing) ? rawTheme.spacing : defaults.spacing,
    },
    layout,
  };
}
