// Alt-alan (subdomain) kuralları — kurulumun son adımı: xyz.sectrai.com
// Slug doğrulaması FAIL-CLOSED; rezerve adlar platformundur.

export const ROOT_DOMAIN = 'sectrai.com';

export const RESERVED_SLUGS = new Set([
  'www', 'admin', 'api', 'app', 'mail', 'smtp', 'ftp', 'staging', 'dev', 'test',
  'sectrai', 'panel', 'dashboard', 'auth', 'login', 'kayit', 'giris', 'static', 'cdn',
  // Sektör-demo subdomainleri + kendi domaini olan ürünler — kullanıcı bunları slug olarak ALAMAZ.
  'manufacturing', 'retail', 'hospitality', 'services', 'fuel', 'agriculture',
  'autoservice', 'realestate', 'education', 'health', 'film',
  'construction', 'yapiborsasi', 'logistics', 'xontainer',
]);

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;

export interface SlugCheck {
  ok: boolean;
  error?: string;
}

export function validateSlug(slug: string): SlugCheck {
  const s = slug.trim().toLowerCase();
  if (!SLUG_RE.test(s)) {
    return { ok: false, error: 'Adres 3-30 karakter olmalı; küçük harf, rakam ve tire (başta/sonda tire olmadan).' };
  }
  if (RESERVED_SLUGS.has(s)) return { ok: false, error: `"${s}" platform için rezerve — başka bir ad seç.` };
  return { ok: true };
}

/** Host başlığından çalışma alanı slug'ı çıkar: xyz.sectrai.com → xyz; kök/yerel adresler → null */
export function slugFromHost(hostHeader: string): string | null {
  const host = hostHeader.split(':')[0].toLowerCase();
  if (host === ROOT_DOMAIN || host === `www.${ROOT_DOMAIN}`) return null;
  if (host === 'localhost' || host === '127.0.0.1') return null;
  if (host.endsWith(`.${ROOT_DOMAIN}`)) {
    const slug = host.slice(0, -(ROOT_DOMAIN.length + 1));
    return slug.includes('.') || RESERVED_SLUGS.has(slug) ? null : slug;
  }
  // Yerel geliştirme: xyz.localhost → xyz
  if (host.endsWith('.localhost')) {
    const slug = host.slice(0, -'.localhost'.length);
    return RESERVED_SLUGS.has(slug) ? null : slug;
  }
  return null;
}

export const workspaceUrl = (slug: string) => `https://${slug}.${ROOT_DOMAIN}`;

// Kendi CANLI ürününe yönlenen rezerve alt-alanlar (doğrulandı: www.xontainer.com / www.yapiborsasi.com → 200).
// Bu isimler landing SPA'sına düşmez; gerçek ürüne tam-sayfa redirect edilir.
export const PRODUCT_REDIRECTS: Record<string, string> = {
  xontainer: 'https://www.xontainer.com',
  yapiborsasi: 'https://www.yapiborsasi.com',
};

// Rezerve ama HENÜZ canlı bir ürüne bağlı OLMAYAN slug'lar — dürüst "bağlı değil" mesajı (uydurma/"yakında" yok).
export const RESERVED_INACTIVE = new Set(['logistics', 'construction']);

/** Alt-alan etiketi (xontainer.sectrai.com → 'xontainer'); kök/www/çok-parçalı → null. */
export function subdomainLabel(hostHeader: string): string | null {
  const host = (hostHeader || '').toLowerCase().split(':')[0];
  if (host === ROOT_DOMAIN || host === `www.${ROOT_DOMAIN}`) return null;
  if (host.endsWith(`.${ROOT_DOMAIN}`)) {
    const s = host.slice(0, -(ROOT_DOMAIN.length + 1));
    return s.includes('.') ? null : s;
  }
  return null;
}
