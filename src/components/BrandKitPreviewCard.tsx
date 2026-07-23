import { BRAND_LOGO_REVIEW_NOTICE, kitPlan, type BrandKitInput, type BrandTone } from '@shared/brand-kit.ts';
import { t } from '@/lib/i18n';

export { BRAND_LOGO_REVIEW_NOTICE } from '@shared/brand-kit.ts';

const PALETTE_LABELS = {
  primary: 'Birincil',
  secondary: 'İkincil',
  accent: 'Vurgu',
  neutral: 'Nötr',
} as const;

export interface BrandKitPreviewCardProps {
  brand: BrandKitInput;
}

function PaletteSwatch({ role, label, tone }: { role: string; label: string; tone: BrandTone }) {
  return (
    <li
      className="brand-kit-swatch"
      data-brand-tone={role}
      data-base={tone.base}
      data-foreground={tone.foreground}
      data-contrast={tone.contrastRatio.toFixed(4)}
    >
      <span className="brand-kit-swatch-color" style={{ backgroundColor: tone.base, color: tone.foreground }}>
        Aa
      </span>
      <span>
        <b>{t(label)}</b>
        <small>{tone.base} · AA {tone.contrastRatio.toFixed(2)}:1</small>
      </span>
    </li>
  );
}

export function BrandKitPreviewCard({ brand }: BrandKitPreviewCardProps) {
  const plan = kitPlan(brand);
  const paletteEntries = (Object.keys(PALETTE_LABELS) as (keyof typeof PALETTE_LABELS)[])
    .map((key) => ({ key, label: PALETTE_LABELS[key], tone: plan.palette[key] }));

  return (
    <section className="card brand-kit-card" aria-label={t('{name} marka kiti önizlemesi', { name: plan.brand.name })}>
      <header className="brand-kit-head">
        <div>
          <span className="eyebrow">{t('Deterministik marka kiti')}</span>
          <h2 style={{ fontFamily: plan.typography.heading.stack }}>{plan.brand.name}</h2>
          {plan.brand.slogan && <p style={{ fontFamily: plan.typography.body.stack }}>{plan.brand.slogan}</p>}
        </div>
        <span className="badge">{t("AI kullanılmadı")}</span>
      </header>

      <div className="brand-kit-grid">
        <section aria-labelledby="brand-kit-palette-title">
          <h3 id="brand-kit-palette-title">{t('Palet')}</h3>
          <ul className="brand-kit-swatches">
            {paletteEntries.map(({ key, label, tone }) => <PaletteSwatch key={key} role={key} label={label} tone={tone} />)}
          </ul>
        </section>

        <section aria-labelledby="brand-kit-type-title">
          <h3 id="brand-kit-type-title">{t('Tipografi')}</h3>
          <div className="brand-kit-type-sample" style={{ fontFamily: plan.typography.heading.stack }}>
            <b>{plan.typography.heading.name}</b>
            <span>{t("Başlık ve wordmark")}</span>
          </div>
          <div className="brand-kit-type-sample" style={{ fontFamily: plan.typography.body.stack }}>
            <b>{plan.typography.body.name}</b>
            <span>{t("Gövde ve arayüz metni")}</span>
          </div>
          <small className="brand-kit-license">{t("Her iki yazı tipi: SIL Open Font License 1.1")}</small>
        </section>
      </div>

      <section aria-labelledby="brand-kit-items-title">
        <h3 id="brand-kit-items-title">{t("Kit öğeleri")}</h3>
        <ul className="brand-kit-items">
          {plan.items.map((item) => (
            <li key={item.id} title={item.note ? t(item.note) : undefined}>
              <b>{t(item.label)}</b>
              <span>{item.width}×{item.height} {item.unit}</span>
            </li>
          ))}
        </ul>
      </section>

      <aside className="brand-kit-honesty" role="note">
        <b>{t("Logo adımı kapalı.")}</b>
        <span>{t("Bu kart gerçek logo üretimi göstermez.")} {t(BRAND_LOGO_REVIEW_NOTICE)}</span>
      </aside>
    </section>
  );
}
