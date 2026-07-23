import {
  defaultMasaLayout,
  focusModule,
  normalizeMasaLayout,
  orderedModules,
  type MasaLayout,
} from '@shared/masa.ts';
import { SECTORS, sectorById } from '@shared/registry.ts';
import type { ModuleSchema, Workspace } from '@shared/types.ts';

export interface EditorModule {
  id: string;
  label: string;
}

/**
 * Palet kaynağı registry'dir. Workspace yalnız hangi registry kayıtlarının bu kurulumda
 * izinli olduğunu daraltır; istemciden gelen etiket veya bilinmeyen id palete giremez.
 */
export function registryPaletteForWorkspace(workspace: Pick<Workspace, 'sectorId' | 'modules'>): EditorModule[] {
  const sectorModules = workspace.sectorId ? sectorById(workspace.sectorId)?.modules : undefined;
  const registryModules = sectorModules ?? Array.from(
    new Map(SECTORS.flatMap((sector) => sector.modules).map((module) => [module.id, module])).values(),
  );
  const installedIds = new Set(workspace.modules.map((module) => module.id));
  return registryModules.filter((module) => installedIds.has(module.id));
}

/** Flat sıra, Masa'nın z/focus modeliyle ifade edilir; ayrı koordinat matematiği tutulmaz. */
export function editorLayoutFromOrder(order: readonly string[], registry: readonly EditorModule[]): MasaLayout {
  const registryIds = new Set(registry.map((module) => module.id));
  const seen = new Set<string>();
  const safeOrder = order.filter((id) => registryIds.has(id) && !seen.has(id) && seen.add(id));
  const missing = registry.map((module) => module.id).filter((id) => !seen.has(id));
  const base = defaultMasaLayout(registry);
  const focused = [...safeOrder, ...missing].reduce((modules, id) => focusModule(modules, id), base);
  return normalizeMasaLayout({ modules: focused, closedModuleIds: [] }, registry);
}

export function editorOrderFromLayout(layout: MasaLayout): string[] {
  return orderedModules(layout.modules).map((module) => module.id);
}

/**
 * Her flat taşıma önce kirli girdiyi temizler, sonra yalnız Masa focus fonksiyonu ile yeni
 * z sırasını kurar ve sonucu tekrar ortak normalizer'dan geçirir.
 */
export function reorderEditorLayout(
  raw: unknown,
  registry: readonly EditorModule[],
  movingId: string,
  targetId: string,
): MasaLayout {
  const normalized = normalizeMasaLayout(raw, registry);
  const order = editorOrderFromLayout(normalized);
  const from = order.indexOf(movingId);
  const to = order.indexOf(targetId);
  if (from < 0 || to < 0 || from === to) return normalized;

  const nextOrder = [...order];
  nextOrder.splice(from, 1);
  nextOrder.splice(to, 0, movingId);
  const focused = nextOrder.reduce((modules, id) => focusModule(modules, id), normalized.modules);
  return normalizeMasaLayout({ ...normalized, modules: focused }, registry);
}

/** Alan panelinden şema dışı bir anahtar hiçbir zaman state'e veya kayıt sınırına taşınmaz. */
export function schemaValuesOnly(schema: ModuleSchema, raw: Record<string, unknown>): Record<string, unknown> {
  const allowed = new Set(schema.fields.map((field) => field.key));
  return Object.fromEntries(Object.entries(raw).filter(([key]) => allowed.has(key)));
}
