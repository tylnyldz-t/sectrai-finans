import { useState } from 'react';
import { ArrowLeft, LockKeyhole } from 'lucide-react';
import {
  BRAND_LOGO_CONNECTOR_ID,
  BRAND_LOGO_LIVE_DISABLED,
  BRAND_LOGO_REVIEW_NOTICE,
} from '@shared/brand-kit.ts';
import { BrandKitPreviewCard } from '@/components/BrandKitPreviewCard';
import { t } from '@/lib/i18n';

const DEFAULT_SEED = '#745CFF';
const SIX_DIGIT_HEX = /^#[\dA-F]{6}$/u;

export function BrandIdentityModuleView({ brandName, onBack }: { brandName: string; onBack: () => void }) {
  const [seedHex, setSeedHex] = useState(DEFAULT_SEED);
  const [seedInput, setSeedInput] = useState(DEFAULT_SEED);
  const normalizedBrandName = brandName.trim().slice(0, 120) || 'Markam';

  const updateSeedInput = (value: string) => {
    const next = value.trim().toUpperCase();
    setSeedInput(next);
    if (SIX_DIGIT_HEX.test(next)) setSeedHex(next);
  };

  const updateSeedPicker = (value: string) => {
    const next = value.toUpperCase();
    setSeedHex(next);
    setSeedInput(next);
  };

  return (
    <div className="masa-content brand-identity-module" data-module-id="brand-identity" data-active-seed={seedHex}>
      <div className="mv-head">
        <button className="btn" onClick={onBack}><ArrowLeft size={15} aria-hidden="true" /> {t("Masa'ya dön")}</button>
        <h1>{t('Marka Kimliği')}</h1>
        <span className="masa-life accent">{t('Anlık önizleme')}</span>
      </div>
      <p className="masa-honesty">
        {t('Palet, tipografi ve kit ölçüleri tarayıcıda deterministik hesaplanır; bu adımda AI veya sağlayıcı çağrısı yapılmaz.')}
      </p>

      <section className="card brand-seed-controls" aria-labelledby="brand-seed-title">
        <div>
          <span className="eyebrow">{t('Başlangıç girdisi')}</span>
          <h2 id="brand-seed-title">{t('Tohum rengi seç')}</h2>
          <p>{t('Renk değiştiğinde erişilebilir metin renkleriyle birlikte bütün palet anında yenilenir.')}</p>
        </div>
        <label className="brand-seed-field">
          <span>{t('Tohum renk')}</span>
          <span className="brand-seed-inputs">
            <input
              type="color"
              aria-label={t('Tohum renk seçici')}
              data-testid="brand-seed-picker"
              value={seedHex}
              onChange={(event) => updateSeedPicker(event.target.value)}
            />
            <input
              type="text"
              aria-label={t('Tohum renk kodu')}
              data-testid="brand-seed-input"
              value={seedInput}
              maxLength={7}
              spellCheck={false}
              aria-invalid={!SIX_DIGIT_HEX.test(seedInput)}
              onChange={(event) => updateSeedInput(event.target.value)}
            />
          </span>
          {!SIX_DIGIT_HEX.test(seedInput) && <small role="alert">{t('Rengi #RRGGBB biçiminde gir.')}</small>}
        </label>
      </section>

      <BrandKitPreviewCard brand={{ name: normalizedBrandName, seedHex, style: 'modern' }} />

      <section
        className="card brand-logo-step"
        aria-labelledby="brand-logo-step-title"
        data-logo-connector={BRAND_LOGO_CONNECTOR_ID}
        data-logo-mode={BRAND_LOGO_LIVE_DISABLED}
      >
        <div className="brand-logo-step-head">
          <div>
            <span className="eyebrow">{t('Owner-kapılı sağlayıcı adımı')}</span>
            <h2 id="brand-logo-step-title">{t('Logo önerisi')}</h2>
          </div>
          <span className="badge brand-logo-status" role="status">
            {t('Sağlayıcı bağlı değil · {mode}', { mode: BRAND_LOGO_LIVE_DISABLED })}
          </span>
        </div>
        <p>
          {t('Logo konektörü varsayılan olarak kapalıdır. Sağlayıcı ve owner kapısı açılmadan üretim isteği gönderilmez veya örnek aday gösterilmez.')}
        </p>
        <button className="btn" type="button" disabled aria-disabled="true">
          <LockKeyhole size={15} aria-hidden="true" /> {t('Logo adayı iste — bağlantı kapalı')}
        </button>
        <aside className="brand-logo-legal" role="note">
          <b>{t('İnsan ve hukuk kontrolü zorunlu.')}</b>
          <span>{t(BRAND_LOGO_REVIEW_NOTICE)} {t('Marka tescil araması ayrı, owner ve hukuk onaylı bir adımdır.')}</span>
        </aside>
      </section>
    </div>
  );
}
