// Sektör-demo subdomainleri — login/onay GEREKMEDEN, Host-header'a kilitli demo panoları.
// Modüller UYDURMA DEĞİL: shared/registry.ts (sektral MODULE_REGISTRY'den çıkarılmış) gerçek eşleme.
// İnşaat (yapıborsası) ve lojistik (xontainer) HARİÇ — onların kendi domainleri var.

import { ROOT_DOMAIN } from './domain.js';
import { sectorById } from './registry.js';
import type { Workspace } from './types.js';

/** subdomain → gerçek SectorId. Owner'ın DNS'te açtığı adlar. */
export const DEMO_SUBDOMAINS: Record<string, string> = {
  manufacturing: 'manufacturing',
  retail: 'retail',
  hospitality: 'hospitality',
  services: 'professional-services',
  fuel: 'fuel',
  agriculture: 'agriculture',
  autoservice: 'automotive-service',
  realestate: 'real-estate',
  education: 'education',
  health: 'healthcare',
  film: 'film-production',
};

export const isDemoSubdomain = (name: string): boolean =>
  Object.prototype.hasOwnProperty.call(DEMO_SUBDOMAINS, name.toLowerCase());

/** Host başlığından demo subdomain'i çıkar: manufacturing.sectrai.com / manufacturing.localhost → 'manufacturing'. */
export function demoSubdomainFromHost(hostHeader: string): string | null {
  const host = hostHeader.split(':')[0].toLowerCase();
  for (const suffix of [`.${ROOT_DOMAIN}`, '.localhost']) {
    if (host.endsWith(suffix)) {
      const sub = host.slice(0, -suffix.length);
      if (!sub.includes('.') && isDemoSubdomain(sub)) return sub;
    }
  }
  return null;
}

/** Sektöre önceden-doldurulmuş sentetik demo workspace (kalıcı kayıt DEĞİL; her istekte deterministik üretilir). */
export function buildDemoWorkspace(subdomain: string): Workspace | null {
  const key = subdomain.toLowerCase();
  const sectorId = DEMO_SUBDOMAINS[key];
  if (!sectorId) return null;
  const sector = sectorById(sectorId);
  if (!sector) return null;
  return {
    id: `demo-${key}`,
    userId: 'demo',
    purpose: 'business',
    kind: 'sector',
    title: `${sector.label} — Demo`,
    slug: key,
    customDomain: null,
    sectorId,
    modules: sector.modules,
    sourceConversationId: 'demo',
    installedAt: '2026-07-20T00:00:00.000Z',
  };
}
