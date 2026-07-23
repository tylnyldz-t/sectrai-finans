// Ortak üst header — HEM ön kapıda (landing) HEM Masa'da aynı. Owner ekranı: logo · ortada
// KONUŞ|KEŞFET|UYGULA|MASA pill'i (mor-mavi aurora aktif) · bildirim · avatar. KONUŞ → AI sohbet (/app),
// UYGULA → /app içindeki çalışma görünümü, MASA → ayrı çalışma alanı. Alt-alandan app/kök tam-sayfa www'ye gider.

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Bell, Lock } from 'lucide-react';
import type { PublicUser } from '@shared/types.ts';
import { ROOT_DOMAIN } from '@shared/domain.ts';
import { api } from '@/lib/api';
import { t, useLang } from '@/lib/i18n';
import { useRouter } from '@/lib/router';
import { LanguageToggle } from '@/components/LanguageToggle';
import { Switcher, wsHref } from '@/components/Switcher';

export function AppHeader({
  active, user, currentSlug, rightExtra, className, lockGuestModes = false,
}: {
  active: 'chat' | 'discover' | 'work' | 'desk' | 'none';
  user: PublicUser | null;
  /** Masa'daysak mevcut workspace slug'ı (yalnız MASA onu hedefler). */
  currentSlug?: string;
  /** Sayfaya özel sağ düğme(ler) — ör. Masa'da "Tasarım". */
  rightExtra?: ReactNode;
  /** Yerleşime ait ek sınıf — ortak header'ı sayfanın yükseklik bütçesine bağlamak için. */
  className?: string;
  /** KEŞFET gibi açık sayfalarda, misafirin hesap isteyen modlara açıklamalı geçiş kapısı. */
  lockGuestModes?: boolean;
}) {
  useLang();
  const { nav } = useRouter();
  const [firstSlug, setFirstSlug] = useState<string | null>(currentSlug ?? null);
  const [gateNotice, setGateNotice] = useState('');
  const gateTimerRef = useRef<number | undefined>(undefined);
  const workspaceLookupRef = useRef<Promise<string | null> | null>(null);

  // Ön kapıda MASA hedefi için kullanıcının bir workspace'ini bul (Masa'da zaten currentSlug var).
  useEffect(() => {
    if (currentSlug || !user) return;
    const lookup = api.workspaces().then((result) => result.workspaces.find((workspace) => workspace.slug)?.slug ?? null);
    workspaceLookupRef.current = lookup;
    void lookup.then(setFirstSlug).catch(() => {});
  }, [user, currentSlug]);

  useEffect(() => () => {
    if (gateTimerRef.current !== undefined) window.clearTimeout(gateTimerRef.current);
  }, []);

  const hostname = window.location.hostname;
  const onSub = hostname.endsWith(`.${ROOT_DOMAIN}`) && !hostname.startsWith('www.');
  const front = `${window.location.protocol}//www.${ROOT_DOMAIN}`;
  const guestModesLocked = lockGuestModes && !user;
  const deskSlug = currentSlug ?? firstSlug;

  const goHome = () => (onSub ? window.location.assign(front) : nav('/'));
  const goRegister = () => (onSub ? window.location.assign(`${front}/kayit`) : nav('/kayit'));
  const requireAccount = () => {
    setGateNotice('Bu bölüm hesap ister; ücretsiz açabilirsin. Kayıt sayfasına yönlendiriliyorsun.');
    if (gateTimerRef.current !== undefined) window.clearTimeout(gateTimerRef.current);
    gateTimerRef.current = window.setTimeout(goRegister, 800);
  };
  const goChat = () => {
    if (guestModesLocked) {
      requireAccount();
      return;
    }
    if (onSub) window.location.assign(`${front}/app`);
    else nav('/app');
  };
  // KEŞFET: giriş/şifre gerektirmez — ön kapıda KONUŞ ile UYGULA arasında durur.
  const goDiscover = () => {
    if (active === 'discover') return;
    if (onSub) window.location.assign(`${front}/kesfet`);
    else nav('/kesfet');
  };
  const goApply = () => {
    if (guestModesLocked) {
      requireAccount();
      return;
    }
    if (onSub) window.location.assign(`${front}/app?view=work`);
    else nav('/app?view=work');
  };
  const openWork = (slug: string | null) => {
    if (slug) {
      const href = wsHref(slug);
      if (href.startsWith('/')) nav(href);
      else window.location.assign(href);
      return;
    }
    if (onSub) window.location.assign(`${front}/app`);
    else nav('/app'); // workspace çözülemezse uygulama kabuğuna dön
  };
  const goDesk = () => {
    if (guestModesLocked) {
      requireAccount();
      return;
    }
    const slug = currentSlug ?? firstSlug;
    if (slug) {
      openWork(slug);
      return;
    }
    if (user) {
      const lookup = workspaceLookupRef.current
        ?? api.workspaces().then((result) => result.workspaces.find((workspace) => workspace.slug)?.slug ?? null);
      workspaceLookupRef.current = lookup;
      void lookup.then((resolvedSlug) => {
        setFirstSlug(resolvedSlug);
        openWork(resolvedSlug);
      }).catch(() => openWork(null));
      return;
    }
    openWork(null);
  };

  return (
    <header className={`app-header${className ? ` ${className}` : ''}`}>
      <a className="logo" href="/" onClick={(e) => { e.preventDefault(); goHome(); }}>
        <span className="logo-orb" aria-hidden="true" /> <span className="logo-name">SECTRAI</span>
      </a>
      <div className="seg app-header-seg" role="tablist" aria-label={t('Görünüm')}>
        <button
          type="button"
          role="tab"
          aria-selected={active === 'chat'}
          aria-label={guestModesLocked ? t('KONUŞ — hesap gerekir') : undefined}
          className={`${active === 'chat' ? 'active' : ''}${guestModesLocked ? ' app-header-tab--locked' : ''}`}
          data-locked={guestModesLocked ? 'true' : undefined}
          onClick={goChat}
        >
          {t('KONUŞ')} {guestModesLocked && <Lock className="app-header-lock" size={12} aria-hidden="true" />}
        </button>
        <button type="button" role="tab" aria-selected={active === 'discover'} className={active === 'discover' ? 'active' : ''} onClick={goDiscover}>{t('KEŞFET')}</button>
        <button
          type="button"
          role="tab"
          aria-selected={active === 'work'}
          aria-label={guestModesLocked ? t('UYGULA — hesap gerekir') : undefined}
          className={`${active === 'work' ? 'active' : ''}${guestModesLocked ? ' app-header-tab--locked' : ''}`}
          data-locked={guestModesLocked ? 'true' : undefined}
          onClick={goApply}
        >
          {t('UYGULA')} {guestModesLocked && <Lock className="app-header-lock" size={12} aria-hidden="true" />}
        </button>
        {deskSlug && (
          <button
            type="button"
            role="tab"
            aria-selected={active === 'desk'}
            aria-label={guestModesLocked ? t('MASA — hesap gerekir') : undefined}
            className={`${active === 'desk' ? 'active' : ''}${guestModesLocked ? ' app-header-tab--locked' : ''}`}
            data-locked={guestModesLocked ? 'true' : undefined}
            onClick={goDesk}
          >
            {t('MASA')} {guestModesLocked && <Lock className="app-header-lock" size={12} aria-hidden="true" />}
          </button>
        )}
      </div>
      <div className="app-header-right">
        {rightExtra}
        <LanguageToggle compact />
        {user ? (
          <>
            <button className="btn btn-ghost app-header-notifications" aria-label={t('Bildirimler')} title={t('Bildirimler')}><Bell size={16} aria-hidden="true" /></button>
            <Switcher user={user} activeSlug={currentSlug} />
          </>
        ) : (
          <>
            <button className="btn btn-ghost app-header-login" onClick={() => nav('/giris')}>{t('Giriş yap')}</button>
            <button className="btn btn-primary app-header-signup" onClick={() => nav('/kayit')}>{t('Ücretsiz başla')}</button>
          </>
        )}
      </div>
      {gateNotice && <p className="app-header-gate-notice" role="status" aria-live="polite">{gateNotice}</p>}
    </header>
  );
}
