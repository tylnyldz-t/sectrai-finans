import { ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { useState } from 'react';
import type { MasaLayout } from '@shared/masa.ts';
import { editorOrderFromLayout, reorderEditorLayout, type EditorModule } from './editor-model';
import { t } from '@/lib/i18n';

export interface FlatEditorItem extends EditorModule {
  detail: string;
  preset?: string;
}

export function FlatLayoutEditor({
  items,
  layout,
  onChange,
  selectedId,
  onSelect,
  ariaLabel = 'Pano blok sırası',
}: {
  items: readonly FlatEditorItem[];
  layout: MasaLayout;
  onChange: (layout: MasaLayout) => void;
  selectedId?: string | null;
  onSelect?: (itemId: string) => void;
  ariaLabel?: string;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const byId = new Map(items.map((item) => [item.id, item]));
  const order = editorOrderFromLayout(layout).filter((id) => byId.has(id));

  const move = (movingId: string, targetId: string) => {
    onChange(reorderEditorLayout(layout, items, movingId, targetId));
  };

  return (
    <ol className="flat-editor-list" aria-label={t(ariaLabel)}>
      {order.map((id, index) => {
        const item = byId.get(id)!;
        return (
          <li
            key={id}
            data-layout-id={id}
            draggable
            onDragStart={() => setDraggingId(id)}
            onDragEnd={() => setDraggingId(null)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              if (draggingId) move(draggingId, id);
              setDraggingId(null);
            }}
            className={selectedId === id ? 'selected' : undefined}
          >
            <span className="design-widget-handle" title={t('Sürükleyerek sırala')} aria-hidden="true"><GripVertical size={18} /></span>
            {onSelect ? (
              <button type="button" className="flat-editor-select" aria-pressed={selectedId === id} onClick={() => onSelect(id)}>
                <strong>{t(item.label)}</strong><small>{t(item.detail)}</small>
              </button>
            ) : <div><strong>{t(item.label)}</strong><small>{t(item.detail)}</small></div>}
            <span className="design-widget-preset">{t(item.preset ?? 'SABİT PRESET')}</span>
            <div className="flat-editor-controls" aria-label={t('{label} sıra kontrolleri', { label: t(item.label) })}>
              <button type="button" disabled={index === 0} aria-label={t('{label} yukarı taşı', { label: t(item.label) })} onClick={() => move(id, order[index - 1])}><ChevronUp size={16} aria-hidden="true" /></button>
              <button type="button" disabled={index === order.length - 1} aria-label={t('{label} aşağı taşı', { label: t(item.label) })} onClick={() => move(id, order[index + 1])}><ChevronDown size={16} aria-hidden="true" /></button>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
