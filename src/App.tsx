// Rota + host çözümü:
//   <sektör>.sectrai.com    → login gerektirmeyen sektör-demo panosu (yerelde /demo/<sektör>)
//   xyz.sectrai.com         → o çalışma alanının panosu (yerelde /w/xyz)
//   www.sectrai.com (kök)   → landing / kayıt / giriş / app / admin

import { useEffect, useState } from 'react';
import { Landing } from '@/pages/Landing';
import { AuthPage } from '@/pages/AuthPage';
import { AppShell } from '@/pages/AppShell';
import { AdminPage } from '@/pages/AdminPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { SectorDemoPage } from '@/pages/SectorDemoPage';
import { api } from '@/lib/api';
import { useRouter } from '@/lib/router';
import { t, useLang } from '@/lib/i18n';

type HostInfo =
  | { mode: 'root' }
  | { mode: 'workspace'; slug: string }
  | { mode: 'sector-demo'; subdomain: string }
  | { mode: 'redirect'; url: string }
  | { mode: 'reserved-inactive'; slug: string };

export function App() {
  useLang();
  const { path } = useRouter();
  const [host, setHost] = useState<HostInfo | null>(null);

  useEffect(() => {
    void api
      .host()
      .then((h) => {
        if (h.mode === 'redirect') { window.location.replace(h.url); setHost({ mode: 'redirect', url: h.url }); }
        else if (h.mode === 'reserved-inactive') setHost({ mode: 'reserved-inactive', slug: h.slug });
        else if (h.mode === 'workspace') setHost({ mode: 'workspace', slug: h.slug });
        else if (h.mode === 'sector-demo') setHost({ mode: 'sector-demo', subdomain: h.subdomain });
        else setHost({ mode: 'root' });
      })
      .catch(() => setHost({ mode: 'root' }));
  }, []);

  if (host === null) return null;

  // Rezerve ürün alt-alanı → gerçek ürüne yönlendiriliyor (kök front-door path'lerinden ÖNCE).
  if (host.mode === 'redirect') return <div className="auth-wrap"><p style={{ color: 'var(--muted)' }}>{t("Yönlendiriliyor…")}</p></div>;
  if (host.mode === 'reserved-inactive') return <ReservedInactive slug={host.slug} />;

  // /giris ve /kayit HER host modunda erişilebilir olmalı: aynı hesap tüm alt-alanlarda
  // geçerli ama localStorage token'ı origin-başına izole — yeni bir alt-alanı (workspace ya
  // da sektör-demo) ilk ziyarette token boştur ve sayfa içi nav('/giris') çağrılır. host.mode
  // dispatch'i path'ten önce geldiğinde bu nav hiçbir zaman AuthPage'e geçemiyor, DashboardPage/
  // SectorDemoPage "Yükleniyor…" durumunda sonsuza dek asılı kalıyordu — bkz. DashboardPage.tsx
  // ve SectorDemoPage.tsx içindeki getToken()-yoksa-nav('/giris') dalları.
  if (path === '/kayit') return <AuthPage mode="register" />;
  if (path === '/giris') return <AuthPage mode="login" />;

  if (host.mode === 'sector-demo') return <SectorDemoPage subdomain={host.subdomain} />;
  if (host.mode === 'workspace') {
    // Alt-alanda: /m/<modül> → modül sayfası, /tasarim → flat dashboard editörü, /modul-studyo → ayrı V2 Puck.
    const mMatch = path.match(/^\/m\/([a-z0-9-]+)$/);
    return <DashboardPage slug={host.slug} basePath="" designMode={path === '/tasarim'} studioMode={path === '/modul-studyo'} moduleId={mMatch ? mMatch[1] : undefined} />;
  }

  // Yerel geliştirme yolları (subdomain olmadan test için)
  const demoMatch = path.match(/^\/demo\/([a-z0-9-]+)$/);
  if (demoMatch) return <SectorDemoPage subdomain={demoMatch[1]} />;
  const wMatch = path.match(/^\/w\/([a-z0-9-]+)(?:\/(tasarim|modul-studyo|m\/([a-z0-9-]+)))?$/);
  if (wMatch) return <DashboardPage slug={wMatch[1]} basePath={`/w/${wMatch[1]}`} designMode={wMatch[2] === 'tasarim'} studioMode={wMatch[2] === 'modul-studyo'} moduleId={wMatch[3]} />;
  if (path === '/app') return <AppShell />;
  if (path === '/admin') return <AdminPage />;
  return <Landing />;
}

/** Rezerve ama henüz canlı ürüne bağlı OLMAYAN alt-alan — dürüst mesaj ("yakında" uydurması yok). */
function ReservedInactive({ slug }: { slug: string }) {
  return (
    <div className="auth-wrap">
      <div className="card auth-card pending-card">
        <div className="orb" aria-hidden="true" />
        <h1 style={{ fontSize: 20 }}>{slug}.sectrai.com</h1>
        <p className="sub">{t("Bu isim şu an aktif bir ürüne bağlı değil.")}</p>
        <a className="btn" href="https://www.sectrai.com">{t("SECTRAI ana sayfası")}</a>
      </div>
    </div>
  );
}
