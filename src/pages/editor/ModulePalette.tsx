import type { EditorModule } from './editor-model';
import { t } from '@/lib/i18n';

export function ModulePalette({
  modules,
  selectedId,
  onSelect,
}: {
  modules: readonly EditorModule[];
  selectedId: string | null;
  onSelect: (moduleId: string) => void;
}) {
  return (
    <aside className="schema-editor-palette" aria-label={t("Modül paleti")}>
      <div className="schema-editor-panel-head">
        <strong>{t("Modül paleti")}</strong>
        <span>REGISTRY</span>
      </div>
      <p>{t("Yalnız bu workspace için kayıt defterinde izinli modüller.")}</p>
      <div className="schema-editor-palette-list">
        {modules.map((module) => (
          <button
            type="button"
            key={module.id}
            data-module-id={module.id}
            aria-pressed={selectedId === module.id}
            className={selectedId === module.id ? 'active' : ''}
            onClick={() => onSelect(module.id)}
          >
            <strong>{t(module.label)}</strong>
            <small>{module.id}</small>
          </button>
        ))}
      </div>
      {modules.length === 0 && <p className="schema-editor-empty">{t("Registry ile eşleşen kurulu modül yok.")}</p>}
    </aside>
  );
}
