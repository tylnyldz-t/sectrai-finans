// SECTRAI landing — platformun ön kapısı. Tüm listeler GERÇEK kayıtlardan gelir:
// sektörler shared/registry (sektral compose), ürünler shared/products (bugün kurulan demolar).

import { useEffect, useState } from 'react';
import {
  Blocks,
  Briefcase,
  Building2,
  Check,
  Gamepad2,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react';
import type { PublicUser } from '@shared/types.ts';
import { BUSINESS_SECTORS } from '@shared/registry.ts';
import { INDIVIDUAL_OFFERINGS } from '@shared/individual.ts';
import { PRODUCTS } from '@shared/products.ts';
import { api } from '@/lib/api';
import { useRouter } from '@/lib/router';
import { HeroPreview } from '@/components/HeroPreview';
import { AppHeader } from '@/components/AppHeader';

const AUDIENCE_TAG: Record<string, string> = { is: 'İş', bireysel: 'Bireysel', capraz: 'Çapraz' };

export function Landing() {
  const { nav } = useRouter();
  const [user, setUser] = useState<PublicUser | null>(null);
  // Girişliyse header CHAT|WORK + avatar gösterir; değilse Giriş/Kayıt. me() 401 → null (sorun değil).
  useEffect(() => { void api.me().then((m) => setUser(m.user)).catch(() => setUser(null)); }, []);
  return (
    <div className="landing-root">
      <AppHeader active="chat" user={user} />

      <section className="hero">
        <div className="hero-bg" aria-hidden="true" />
        <div className="hero-grid" aria-hidden="true" />
        <div className="container hero-inner">
          <div>
            <span className="eyebrow">Yapay zekâ işletim platformu · Sentetik demo</span>
            <h1>
              Konuş. Onayla.<br />
              <span className="grad-text">Sistemin kurulsun.</span>
            </h1>
            <p className="lead">
              Kişisel yaşamından {BUSINESS_SECTORS.length} sektörlü işletme AI-OS'una kadar: ihtiyacını kendi
              cümlelerinle anlat, yapay zekâ kanıtıyla önersin, sen onayla — çalışma alanın gözünün önünde kurulsun.
            </p>
            <div className="hero-ctas">
              <button className="btn btn-primary" onClick={() => nav('/kayit')}>
                <Sparkles size={16} aria-hidden="true" /> Ücretsiz hesap aç
              </button>
              <a className="btn" href="#nasil">Nasıl çalışıyor?</a>
            </div>
            <p className="hero-note">
              <ShieldCheck size={14} aria-hidden="true" />
              AI yalnızca önerir — kurulum her zaman senin onayınla. Kanıtsız öneri yok.
            </p>
          </div>

          <HeroPreview />
        </div>
      </section>

      <section className="section" id="kimin-icin">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Kimin için?</span>
            <h2>Tek kapı, dört dünya</h2>
            <p>Aynı sohbet kapısından girersin; ne istediğine göre bambaşka bir sistem kurulur.</p>
          </div>
          <div className="grid-4">
            <div className="card audience-card">
              <div className="icon"><User size={20} aria-hidden="true" /></div>
              <h3>Bireysel</h3>
              <p>Kendi hayatın için kişisel araçlar.</p>
              <ul>
                {INDIVIDUAL_OFFERINGS.slice(0, 4).map((o) => <li key={o.id}>{o.label}</li>)}
              </ul>
            </div>
            <div className="card audience-card">
              <div className="icon"><Briefcase size={20} aria-hidden="true" /></div>
              <h3>Firma</h3>
              <p>Sektörüne özel hazır iş modülleri.</p>
              <ul>
                <li>{BUSINESS_SECTORS.length} sektör, gerçek kayıt defteri</li>
                <li>Stok, finans, saha, pazaryeri…</li>
                <li>Onay-kapılı AI operatör</li>
                <li>Firma Hafızası (kanıt-zinciri)</li>
              </ul>
            </div>
            <div className="card audience-card">
              <div className="icon"><Gamepad2 size={20} aria-hidden="true" /></div>
              <h3>Hobi &amp; Yaratıcı</h3>
              <p>Üretmek için kurulmuş stüdyolar.</p>
              <ul>
                <li>Studio — prodüksiyon yüzeyi</li>
                <li>Gaming — yaşayan dünyalar</li>
                <li>Velvet — yaratıcı yoldaş</li>
                <li>The Archive — kanon tarayıcı</li>
              </ul>
            </div>
            <div className="card audience-card">
              <div className="icon"><Building2 size={20} aria-hidden="true" /></div>
              <h3>Enterprise AI-OS</h3>
              <p>Şirketinin işletim sistemi.</p>
              <ul>
                <li>Compose: modülden uygulama üret</li>
                <li>Fırsat Motoru &amp; pazaryerleri</li>
                <li>KVKK-öncelikli rıza defteri</li>
                <li>Denetim izi her adımda</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="sektorler" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Gerçek kayıt defteri</span>
            <h2>{BUSINESS_SECTORS.length} sektör, 99 modül — uydurma değil</h2>
            <p>
              Aşağıdaki her sektör, çalışan modül kayıt-defterinden geliyor; yanındaki sayı o sektöre bağlı gerçek
              modül sayısı. Kaydolduğunda AI bu listeden kurar.
            </p>
          </div>
          <div className="sector-strip">
            {BUSINESS_SECTORS.map((s) => (
              <span key={s.id} className="sector-chip">
                {s.label} <span className="count">{s.modules.length} modül</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="urunler" style={{ background: 'var(--bg-2)' }}>
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Bugün çalışan ürünler</span>
            <h2>Vitrindeki her şey gerçek</h2>
            <p>
              Bu kartların her biri bugün kodu ve demosuyla ayakta olan bir SECTRAI ürünü — her birinin altında aynı
              omurga var: öneri → kanıt → insan onayı → icra.
            </p>
          </div>
          <div className="grid-3">
            {PRODUCTS.map((p) => (
              <div key={p.id} className="card product-card">
                <div className="name">
                  {p.name}
                  <span className="badge">{AUDIENCE_TAG[p.audience]}</span>
                </div>
                <div className="tagline">{p.tagline}</div>
                <div className="highlight">{p.highlight}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="nasil">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Nasıl çalışır</span>
            <h2>Öneri → Kanıt → Onay → Kurulum</h2>
            <p>UYGULA moduna geç, anlat; sağdaki tuvalde sistemin panel panel oluşsun.</p>
          </div>
          <div className="steps">
            <div className="card step">
              <div className="num">1</div>
              <h3>Anlat</h3>
              <p>"15 kamyonluk filom var" ya da "kitap koleksiyonumu takip etmek istiyorum" — kendi cümlelerinle.</p>
            </div>
            <div className="card step">
              <div className="num">2</div>
              <h3>AI önerir, kanıt gösterir</h3>
              <p>Sektörünü/ihtiyacını çözer; hangi ifadelere dayandığını panelde açıkça gösterir.</p>
            </div>
            <div className="card step">
              <div className="num">3</div>
              <h3>Sen onayla</h3>
              <p>Onay kapısı her zaman insanda. AI kendi önerisini asla kendisi onaylayamaz.</p>
            </div>
            <div className="card step">
              <div className="num">4</div>
              <h3>Kurulsun</h3>
              <p>Çalışma alanın modülleriyle kurulur; her adım denetim izinde kayıtlıdır.</p>
            </div>
          </div>
          <div className="guarantees">
            <span className="guarantee"><Check size={14} aria-hidden="true" /> <b>Onay insanda</b> — AI kendi onayını üretemez</span>
            <span className="guarantee"><Check size={14} aria-hidden="true" /> <b>Kanıtsız öneri yok</b> — her öneri dayanağını gösterir</span>
            <span className="guarantee"><Check size={14} aria-hidden="true" /> <b>Panel allowlist</b> — keyfi çalıştırılabilir arayüz kapalı</span>
            <span className="guarantee"><Check size={14} aria-hidden="true" /> <b>Sentetik demo</b> — gerçek sistemlere yazmaz</span>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="cta-band">
            <h2>Kapı açık. <span className="grad-text">Sohbet ücretsiz.</span></h2>
            <p>Kaydol, yapay zekâ seni karşılasın; hazır olduğunda UYGULA’ya geç ve ilk sistemini kur.</p>
            <button className="btn btn-primary" onClick={() => nav('/kayit')}>
              <MessageSquareText size={16} aria-hidden="true" /> Ücretsiz hesap aç
            </button>
          </div>
        </div>
      </section>

      <footer className="site">
        <div className="container">
          <span><Blocks size={13} aria-hidden="true" style={{ verticalAlign: '-2px' }} /> SECTRAI — yapay zekâ işletim platformu (sentetik ön-kapı demosu)</span>
          <span>Öneri → Kanıt → Onay → Kurulum</span>
        </div>
      </footer>
    </div>
  );
}
