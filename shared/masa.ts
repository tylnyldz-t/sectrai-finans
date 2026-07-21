/**
 * Masa serbest yerleşim çekirdeği. Xontainer Masa deseniyle uyumlu olarak kartlar sabit
 * S/M/L span'leriyle sınırlı değildir: tuvalde x/y + w/h ile taşınır ve boyutlanır.
 * Bu dosya React'ten bağımsızdır; sunucu girişi ile istemci aynı sınırları kullanır.
 */

export const MASA_CANVAS = Object.freeze({ width: 1_680, height: 1_080 });
export const MASA_MIN = Object.freeze({ width: 280, height: 170 });
export const MASA_MAX = Object.freeze({ width: 1_500, height: 900 });
export const MASA_KEY_STEP = 24;

export interface MasaModule {
  id: string;
  /** Registry otoriterdir; istemcinin gönderdiği etiket sunucuda kabul edilmez. */
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  /** Sabitlenen kart taşınmaz veya boyutlanmaz; konumunu kilitler. */
  pinned: boolean;
  collapsed: boolean;
}

export interface MasaLayout {
  modules: MasaModule[];
  /** Kapatılan modüller registry'de kalır, yalnız Masa'dan gizlenir. */
  closedModuleIds: string[];
}

type RegistryModule = { id: string; label: string };

const numberIn = (value: unknown, fallback: number, min: number, max: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value))) : fallback;

function defaultModule(module: RegistryModule, index: number): MasaModule {
  // Soldan başla, üst üste binmeden düzenli grid — bir yatay sırada EN FAZLA 3 kart.
  const COLS = 3;
  const W = 360;
  const H = 210;
  const GAP = 24;
  const col = index % COLS;
  const row = Math.floor(index / COLS);
  return {
    id: module.id,
    label: module.label,
    x: GAP + col * (W + GAP),
    y: GAP + row * (H + GAP),
    w: W,
    h: H,
    z: index + 1,
    pinned: false,
    collapsed: false,
  };
}

export function clampMasaPosition(module: Pick<MasaModule, 'x' | 'y' | 'w' | 'h'>): Pick<MasaModule, 'x' | 'y'> {
  return {
    x: numberIn(module.x, 0, 0, Math.max(0, MASA_CANVAS.width - module.w)),
    y: numberIn(module.y, 0, 0, Math.max(0, MASA_CANVAS.height - module.h)),
  };
}

export function clampMasaSize(module: Pick<MasaModule, 'x' | 'y' | 'w' | 'h'>): Pick<MasaModule, 'w' | 'h'> {
  return {
    w: numberIn(module.w, MASA_MIN.width, MASA_MIN.width, Math.min(MASA_MAX.width, MASA_CANVAS.width - module.x)),
    h: numberIn(module.h, MASA_MIN.height, MASA_MIN.height, Math.min(MASA_MAX.height, MASA_CANVAS.height - module.y)),
  };
}

function normalizedModule(raw: unknown, registry: RegistryModule, index: number): MasaModule {
  const fallback = defaultModule(registry, index);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fallback;
  const saved = raw as Partial<MasaModule>;
  const preliminary = {
    x: numberIn(saved.x, fallback.x, 0, MASA_CANVAS.width - MASA_MIN.width),
    y: numberIn(saved.y, fallback.y, 0, MASA_CANVAS.height - MASA_MIN.height),
    w: numberIn(saved.w, fallback.w, MASA_MIN.width, MASA_MAX.width),
    h: numberIn(saved.h, fallback.h, MASA_MIN.height, MASA_MAX.height),
  };
  const size = clampMasaSize(preliminary);
  const position = clampMasaPosition({ ...preliminary, ...size });
  return {
    id: registry.id,
    label: registry.label,
    ...position,
    ...size,
    z: numberIn(saved.z, fallback.z, 1, 10_000),
    pinned: saved.pinned === true,
    collapsed: saved.collapsed === true,
  };
}

/** Varsayılan, geniş ve üst üste gelmeyen 4-kolon Masa başlangıç yerleşimi. */
export function defaultMasaLayout(modules: readonly RegistryModule[]): MasaModule[] {
  return modules.map(defaultModule);
}

/** Ham API girdisini doğrular; yalnız workspace registry'sindeki modüller kalır. */
export function normalizeMasaLayout(raw: unknown, registry: readonly RegistryModule[]): MasaLayout {
  const data = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Partial<MasaLayout> : {};
  const rawModules = Array.isArray(data.modules) ? data.modules : [];
  const byId = new Map(rawModules.filter((module): module is MasaModule => !!module && typeof module === 'object' && typeof (module as MasaModule).id === 'string').map((module) => [module.id, module]));
  const registryIds = new Set(registry.map((module) => module.id));
  const closedModuleIds = Array.from(new Set(Array.isArray(data.closedModuleIds) ? data.closedModuleIds.filter((id): id is string => typeof id === 'string' && registryIds.has(id)) : []));
  const closed = new Set(closedModuleIds);
  return {
    modules: registry.filter((module) => !closed.has(module.id)).map((module, index) => normalizedModule(byId.get(module.id), module, index)),
    closedModuleIds,
  };
}

/** Görünürlük sırası z-index ile belirlenir; daha yüksek z kartı üsttedir. */
export function orderedModules(modules: readonly MasaModule[]): MasaModule[] {
  return [...modules].sort((a, b) => a.z - b.z || a.id.localeCompare(b.id));
}

export function focusModule(modules: readonly MasaModule[], id: string): MasaModule[] {
  const top = Math.max(0, ...modules.map((module) => module.z));
  return modules.map((module) => module.id === id ? { ...module, z: top + 1 } : module);
}

export function moveModule(modules: readonly MasaModule[], id: string, x: number, y: number): MasaModule[] {
  return modules.map((module) => {
    if (module.id !== id || module.pinned) return module;
    const position = clampMasaPosition({ ...module, x, y });
    return { ...module, ...position };
  });
}

export function resizeModule(modules: readonly MasaModule[], id: string, w: number, h: number): MasaModule[] {
  return modules.map((module) => {
    if (module.id !== id || module.pinned) return module;
    const size = clampMasaSize({ ...module, w, h });
    return { ...module, ...size };
  });
}

export function closeModule(modules: readonly MasaModule[], id: string): MasaModule[] {
  return modules.filter((module) => module.id !== id);
}

export function restoreModule(modules: readonly MasaModule[], registryModule: RegistryModule): MasaModule[] {
  if (modules.some((module) => module.id === registryModule.id)) return [...modules];
  // Mevcut kartlardan sonraki grid slotuna yerleştir (soldan, 3'lü sıra, üst üste binmeden).
  return [...modules, defaultModule(registryModule, modules.length)];
}

export function togglePin(modules: readonly MasaModule[], id: string): MasaModule[] {
  return modules.map((module) => module.id === id ? { ...module, pinned: !module.pinned } : module);
}

export function toggleCollapse(modules: readonly MasaModule[], id: string): MasaModule[] {
  return modules.map((module) => module.id === id ? { ...module, collapsed: !module.collapsed } : module);
}

/** Masa yerleşimi artık gerçek API + storage adaptörü üzerinden kalıcıdır. */
export const masaPersistenceAvailable = true;
