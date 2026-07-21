// Panel kelime-dağarcığı — sectrai-unified-ai-os-foundation/src/core/panels.mjs'in birebir portu.
// Allowlist FAIL-CLOSED: listede olmayan tip panel üretemez (keyfi çalıştırılabilir UI kapısı kapalı).

import type { Panel, PanelType } from './types.js';

export const ALLOWED_PANEL_TYPES: readonly PanelType[] = Object.freeze([
  'recommendation',
  'requirements-summary',
  'form',
  'workspace-preview',
  'handoff-preview',
  'approval',
  'task-list',
  'notification',
  'audit-timeline',
  'memory-controls',
  'clarification',
]);

export function panel(type: PanelType, data: Record<string, unknown>): Panel {
  if (!ALLOWED_PANEL_TYPES.includes(type)) throw new Error(`PANEL_NOT_ALLOWLISTED:${type}`);
  return { type, data };
}
