// Çalışma alanı panosu — owner-only. Kimlik + workspace yükler, F6 ÇALIŞMA MASASI (MasaDashboard)
// 3-sütunlu koyu-mor kabuğunu render eder. Cross-subdomain SSO: token'ı ön-kontrol etme; api.me()
// çerezle de doğrular, başarısızsa /giris.

import { Suspense, lazy, useEffect, useState } from 'react';
import type { PublicUser, Workspace } from '@shared/types.ts';
import { ROOT_DOMAIN } from '@shared/domain.ts';
import { api, doLogout } from '@/lib/api';
import { useRouter } from '@/lib/router';
import { MasaDashboard } from '@/components/masa/MasaDashboard';
import { MobileMasaDashboard } from '@/components/masa/MobileMasaDashboard';

// Puck editörü yalnız owner'ın /tasarim rotasında yüklenir; normal dashboard yükünü büyütmez.
const DashboardDesignPage = lazy(() => import('@/pages/DashboardDesignPage').then(({ DashboardDesignPage: Page }) => ({ default: Page })));
// Modül Studio kendi Puck config'i ve kendi API'siyle yüklenir; Dashboard Design'a ortak değildir.
const ModuleStudioPage = lazy(() => import('@/pages/ModuleStudioPage').then(({ ModuleStudioPage: Page }) => ({ default: Page })));

export function DashboardPage({ slug, basePath, designMode = false, studioMode = false, moduleId }: { slug: string; basePath: string; designMode?: boolean; studioMode?: boolean; moduleId?: string }) {
  const { nav } = useRouter();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [ws, setWs] = useState<Workspace | null>(null);
  const [adaptiveModulesEnabled, setAdaptiveModulesEnabled] = useState(false);
  const [error, setError] = useState('');
  // Mobil tasarım dosyası 0–1199px kabuğunu, 900px'te tablet yan panelini tanımlar.
  // Mevcut geniş Masa düzeni 1200px ve üzerinde korunur.
  const [compactMasa, setCompactMasa] = useState(() => window.matchMedia('(max-width: 1199px)').matches);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 1199px)');
    const sync = () => setCompactMasa(query.matches);
    query.addEventListener?.('change', sync);
    return () => query.removeEventListener?.('change', sync);
  }, []);

  useEffect(() => {
    void (async () => {
      let me;
      try {
        me = await api.me();
      } catch {
        nav('/giris');
        return;
      }
      setUser(me.user);
      setAdaptiveModulesEnabled(me.features.adaptiveModulesV2 === true);
      try {
        const r = await api.workspaceBySlug(slug);
        setWs(r.workspace);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Çalışma alanına erişilemedi');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  if (error) {
    // Alt-alandayken (xyz.sectrai.com) client nav('/app') aynı alt-alanda kalıp bu hatayı tekrar gösterir
    // → kullanıcı SIKIŞIR. Kök ön-kapıya (www) TAM SAYFA git. Localhost'ta client nav yeterli.
    const host = window.location.hostname;
    const onSub = host.endsWith(`.${ROOT_DOMAIN}`) && !host.startsWith('www.');
    const front = `${window.location.protocol}//www.${ROOT_DOMAIN}`;
    const goFront = () => { if (onSub) window.location.assign(`${front}/app`); else nav('/app'); };
    const switchAccount = async () => {
      await doLogout();
      if (onSub) window.location.assign(`${front}/giris`);
      else nav('/giris');
    };
    return (
      <div className="auth-wrap">
        <div className="card auth-card pending-card">
          <div className="orb" aria-hidden="true" />
          <h1 style={{ fontSize: 20 }}>Bu alana erişimin yok</h1>
          <p className="sub">{error}</p>
          <p className="sub" style={{ fontSize: 12.5 }}>
            Bu çalışma alanı başka bir hesaba ait olabilir. Onu kuran hesapla ya da yönetici hesabıyla giriş yap.
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn" onClick={goFront}>Ön kapıya dön</button>
            <button className="btn btn-primary" onClick={() => void switchAccount()}>Çıkış yap / başka hesapla gir</button>
          </div>
        </div>
      </div>
    );
  }
  if (!user || !ws) return <div className="auth-wrap"><p style={{ color: 'var(--muted)' }}>Yükleniyor…</p></div>;

  if (designMode) {
    return (
      <Suspense fallback={<div className="auth-wrap"><p style={{ color: 'var(--muted)' }}>Tasarım editörü yükleniyor…</p></div>}>
        <DashboardDesignPage workspace={ws} onBack={() => nav(`/w/${slug}`)} onSaved={setWs} />
      </Suspense>
    );
  }

  if (studioMode) {
    if (!adaptiveModulesEnabled) {
      return <div className="auth-wrap"><div className="card auth-card pending-card"><h1 style={{ fontSize: 20 }}>Modül Studio etkin değil</h1><p className="sub">Bu çalışma alanında uyarlanabilir modül beta flag’i kapalı.</p><button className="btn" onClick={() => nav(basePath || '/')}>Panoya dön</button></div></div>;
    }
    return (
      <Suspense fallback={<div className="auth-wrap"><p style={{ color: 'var(--muted)' }}>Modül Studio yükleniyor…</p></div>}>
        <ModuleStudioPage workspace={ws} onBack={() => nav(basePath || '/')} />
      </Suspense>
    );
  }

  // Kayıtların masa-içi modül olarak açılması mobil kabuğun içinde gerçekleşir;
  // doğrudan /m rotası ise gerçek CRUD görünümünü korur.
  if (compactMasa && !moduleId) return <MobileMasaDashboard workspace={ws} user={user} />;

  return <MasaDashboard workspace={ws} user={user} slug={slug} basePath={basePath} moduleId={moduleId} adaptiveModulesEnabled={adaptiveModulesEnabled} onWorkspaceChange={setWs} />;
}
