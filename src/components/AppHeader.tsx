// Ortak üst header — HEM ön kapıda (landing) HEM Masa'da aynı. Owner ekranı: logo · ortada KONUŞ|UYGULA
// pill'i (mor-mavi aurora aktif) · Masa · bildirim · avatar. KONUŞ → AI sohbet (/app), UYGULA/Masa →
// çalışma alanı (Masa). İki uç arasında kaybolmadan geçiş. Alt-alandan CHAT/kök tam-sayfa www'ye gider.

import { useEffect, useState, type ReactNode } from 'react';
import { Bell, LayoutDashboard } from 'lucide-react';
import type { PublicUser } from '@shared/types.ts';
import { ROOT_DOMAIN } from '@shared/domain.ts';
import { api } from '@/lib/api';
import { useRouter } from '@/lib/router';
import { Switcher, wsHref } from '@/components/Switcher';

export function AppHeader({
  active, user, currentSlug, rightExtra,
}: {
  active: 'chat' | 'work' | 'none';
  user: PublicUser | null;
  /** Masa'daysak mevcut workspace slug'ı (UYGULA/Masa onu hedefler). */
  currentSlug?: string;
  /** Sayfaya özel sağ düğme(ler) — ör. Masa'da "Tasarım". */
  rightExtra?: ReactNode;
}) {
  const { nav } = useRouter();
  const [firstSlug, setFirstSlug] = useState<string | null>(currentSlug ?? null);

  // Ön kapıda UYGULA/Masa hedefi için kullanıcının bir workspace'ini bul (Masa'da zaten currentSlug var).
  useEffect(() => {
    if (currentSlug || !user) return;
    void api.workspaces().then((r) => setFirstSlug(r.workspaces.find((w) => w.slug)?.slug ?? null)).catch(() => {});
  }, [user, currentSlug]);

  const hostname = window.location.hostname;
  const onSub = hostname.endsWith(`.${ROOT_DOMAIN}`) && !hostname.startsWith('www.');
  const front = `${window.location.protocol}//www.${ROOT_DOMAIN}`;

  const goHome = () => (onSub ? window.location.assign(front) : nav('/'));
  const goChat = () => (onSub ? window.location.assign(`${front}/app`) : nav('/app'));
  const goWork = () => {
    const slug = currentSlug ?? firstSlug;
    if (slug) {
      const href = wsHref(slug);
      if (href.startsWith('/')) nav(href);
      else window.location.assign(href);
      return;
    }
    if (onSub) window.location.assign(`${front}/app`);
    else nav('/app'); // workspace yoksa ön kapı UYGULA'ya (orada kurulur)
  };

  return (
    <header className="app-header">
      <a className="logo" href="/" onClick={(e) => { e.preventDefault(); goHome(); }}>
        <span className="logo-orb" aria-hidden="true" /> <span className="logo-name">SECTRAI</span>
      </a>
      <div className="seg app-header-seg" role="tablist" aria-label="Görünüm">
        <button role="tab" aria-selected={active === 'chat'} className={active === 'chat' ? 'active' : ''} onClick={goChat}>KONUŞ</button>
        <button role="tab" aria-selected={active === 'work'} className={active === 'work' ? 'active' : ''} onClick={goWork}>UYGULA</button>
      </div>
      <div className="app-header-right">
        {rightExtra}
        {user ? (
          <>
            <button className="btn btn-ghost app-header-panom" onClick={goWork} title="Çalışma alanım"><LayoutDashboard size={15} aria-hidden="true" /> Masa</button>
            <button className="btn btn-ghost" aria-label="Bildirimler" title="Bildirimler"><Bell size={16} aria-hidden="true" /></button>
            <Switcher user={user} activeSlug={currentSlug} />
          </>
        ) : (
          <>
            <button className="btn btn-ghost" onClick={() => nav('/giris')}>Giriş yap</button>
            <button className="btn btn-primary" onClick={() => nav('/kayit')}>Ücretsiz başla</button>
          </>
        )}
      </div>
    </header>
  );
}
