// Serbest Masa kart çerçevesi — Xontainer deseni: tutup taşı, köşeden büyüt, klavyeyle eşdeğerini yap.
// Pointer hareketi boyunca yalnız DOM stili güncellenir; storage'a tek kayıt pointerup'ta gider.

import { GripVertical, Minus, Pin, Plus, X } from 'lucide-react';
import { useCallback, useRef, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { MASA_KEY_STEP, type MasaModule } from '@shared/masa.ts';
import { t } from '@/lib/i18n';

export type MasaLifecycle = 'live' | 'pending' | 'empty' | 'synthetic';

const LIFECYCLE: Record<MasaLifecycle, { label: string; cls: string }> = {
  live: { label: 'Canlı', cls: 'good' },
  pending: { label: 'Onay bekliyor', cls: 'warn' },
  empty: { label: 'Kayıt yok', cls: 'muted' },
  synthetic: { label: 'Sentetik demo', cls: 'accent' },
};

export function MasaModuleCard({
  module,
  typeLabel,
  metaLine,
  lifecycle,
  editable,
  onFocus,
  onMove,
  onResize,
  onToggleCollapse,
  onTogglePin,
  onClose,
  children,
}: {
  module: MasaModule;
  typeLabel: string;
  metaLine: string;
  lifecycle: MasaLifecycle;
  editable: boolean;
  onFocus: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onResize: (id: string, w: number, h: number) => void;
  onToggleCollapse: (id: string) => void;
  onTogglePin: (id: string) => void;
  onClose: (id: string) => void;
  children: ReactNode;
}) {
  const elRef = useRef<HTMLElement | null>(null);
  const life = LIFECYCLE[lifecycle];

  const startDrag = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (!editable || module.pinned || (event.target as HTMLElement).closest('button')) return;
    event.preventDefault();
    onFocus(module.id);
    const element = elRef.current;
    if (!element) return;
    const startX = event.clientX;
    const startY = event.clientY;
    const originX = module.x;
    const originY = module.y;
    const move = (pointer: PointerEvent) => {
      element.style.left = `${Math.max(0, originX + pointer.clientX - startX)}px`;
      element.style.top = `${Math.max(0, originY + pointer.clientY - startY)}px`;
    };
    const up = (pointer: PointerEvent) => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      onMove(module.id, originX + pointer.clientX - startX, originY + pointer.clientY - startY);
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  }, [editable, module.id, module.pinned, module.x, module.y, onFocus, onMove]);

  const startResize = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!editable || module.pinned) return;
    event.preventDefault();
    event.stopPropagation();
    onFocus(module.id);
    const element = elRef.current;
    if (!element) return;
    const startX = event.clientX;
    const startY = event.clientY;
    const originW = module.w;
    const originH = module.h;
    const move = (pointer: PointerEvent) => {
      element.style.width = `${Math.max(1, originW + pointer.clientX - startX)}px`;
      element.style.height = `${Math.max(1, originH + pointer.clientY - startY)}px`;
    };
    const up = (pointer: PointerEvent) => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      onResize(module.id, originW + pointer.clientX - startX, originH + pointer.clientY - startY);
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  }, [editable, module.h, module.id, module.pinned, module.w, onFocus, onResize]);

  const onHeadKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const delta: Record<string, [number, number]> = {
      ArrowLeft: [-MASA_KEY_STEP, 0], ArrowRight: [MASA_KEY_STEP, 0], ArrowUp: [0, -MASA_KEY_STEP], ArrowDown: [0, MASA_KEY_STEP],
    };
    const step = delta[event.key];
    if (!step) return;
    event.preventDefault();
    if (!editable || module.pinned) return;
    onFocus(module.id);
    if (event.shiftKey) onResize(module.id, module.w + step[0], module.h + step[1]);
    else onMove(module.id, module.x + step[0], module.y + step[1]);
  };

  return (
    <section
      ref={elRef}
      className={`masa-card${module.pinned ? ' pinned' : ''}${module.collapsed ? ' collapsed' : ''}`}
      aria-label={t('{label} modülü', { label: t(module.label) })}
      style={{ left: module.x, top: module.y, width: module.w, height: module.collapsed ? undefined : module.h, zIndex: module.z }}
      onPointerDown={() => { if (editable) onFocus(module.id); }}
    >
      <div
        className={`masa-card-head${module.pinned ? ' locked' : ''}`}
        role="toolbar"
        tabIndex={editable ? 0 : -1}
        aria-label={editable
          ? t('{label}: ok tuşlarıyla taşı, Shift+ok ile boyutlandır', { label: t(module.label) })
          : t('{label} modülü', { label: t(module.label) })}
        onPointerDown={startDrag}
        onKeyDown={onHeadKeyDown}
      >
        {editable && <GripVertical className="masa-drag-handle" size={15} aria-hidden="true" />}
        <span className="masa-type">{t(typeLabel)}</span>
        <h3 className="masa-card-title">{t(module.label)}</h3>
        {editable && <span className="masa-dimensions" title={t('Kart boyutu')}>{module.w}×{module.h}</span>}
        {editable && <div className="masa-card-ctrls">
          <button className={`masa-ic${module.pinned ? ' on' : ''}`} title={t(module.pinned ? 'Konumu aç' : 'Konumu kilitle')} aria-label={t(module.pinned ? 'Konumu aç' : 'Konumu kilitle')} aria-pressed={module.pinned} onClick={() => onTogglePin(module.id)}>
            <Pin size={15} aria-hidden="true" fill={module.pinned ? 'currentColor' : 'none'} />
          </button>
          <button className="masa-ic" title={t(module.collapsed ? 'Genişlet' : 'Daralt')} aria-label={t(module.collapsed ? 'Genişlet' : 'Daralt')} onClick={() => onToggleCollapse(module.id)}>
            {module.collapsed ? <Plus size={15} aria-hidden="true" /> : <Minus size={15} aria-hidden="true" />}
          </button>
          <button className="masa-ic" title={t("Modülü kapat")} aria-label={t("Modülü kapat")} onClick={() => onClose(module.id)}><X size={15} aria-hidden="true" /></button>
        </div>}
      </div>
      <div className="masa-card-meta">
        <span className="masa-meta-src">{t(metaLine)}</span>
        <span className={`masa-life ${life.cls}`}>{t(life.label)}</span>
      </div>
      {!module.collapsed && <div className="masa-card-body">{children}</div>}
      {editable && !module.collapsed && !module.pinned && (
        <button className="masa-resize-handle" type="button" onPointerDown={startResize} aria-label={t('{label} kartını boyutlandır', { label: t(module.label) })} title={t("Köşeden boyutlandır")}>
          <GripVertical size={14} aria-hidden="true" />
        </button>
      )}
    </section>
  );
}
