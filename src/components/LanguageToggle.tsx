import type { KeyboardEvent } from 'react';
import { t, useLang, type Lang } from '@/lib/i18n';

export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useLang();
  const choose = (nextLang: Lang) => () => setLang(nextLang);
  const chooseWithKeyboard = (nextLang: Lang) => (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    setLang(nextLang);
  };

  return (
    <div
      className={`language-toggle${compact ? ' language-toggle-compact' : ''}`}
      role="group"
      aria-label={t('Dil seçimi')}
    >
      <button type="button" aria-pressed={lang === 'tr'} onClick={choose('tr')} onKeyDown={chooseWithKeyboard('tr')}>TR</button>
      <span aria-hidden="true">|</span>
      <button type="button" aria-pressed={lang === 'en'} onClick={choose('en')} onKeyDown={chooseWithKeyboard('en')}>EN</button>
    </div>
  );
}
