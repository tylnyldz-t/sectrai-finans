import { useSyncExternalStore } from 'react';
import { ROOT_DOMAIN } from '@shared/domain';
import { DICT } from './i18n-dict.js';

export type Lang = 'tr' | 'en';
export type TranslationParams = Record<string, string | number>;

const STORAGE_KEY = 'sectrai.lang';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const listeners = new Set<() => void>();
const runtime = globalThis as typeof globalThis & {
  window?: {
    localStorage: { getItem: (key: string) => string | null; setItem: (key: string, value: string) => void };
    location?: { hostname: string; protocol: string };
  };
  document?: { cookie: string; documentElement: { lang: string } };
};

function isLang(value: unknown): value is Lang {
  return value === 'tr' || value === 'en';
}

function cookieLang(): Lang | undefined {
  if (!runtime.document) return undefined;
  try {
    for (const part of runtime.document.cookie.split(';')) {
      const [rawName, ...rawValue] = part.trim().split('=');
      if (decodeURIComponent(rawName) !== STORAGE_KEY) continue;
      const value = decodeURIComponent(rawValue.join('='));
      return isLang(value) ? value : undefined;
    }
  } catch {
    // Çerezler okunamıyorsa origin'e özel localStorage yedeği denenir.
  }
  return undefined;
}

function localStorageLang(): Lang | undefined {
  if (!runtime.window) return undefined;
  try {
    const value = runtime.window.localStorage.getItem(STORAGE_KEY);
    return isLang(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

function storedLang(): Lang {
  return cookieLang() ?? localStorageLang() ?? 'tr';
}

function isLocalHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return normalized === 'localhost'
    || normalized.endsWith('.localhost')
    || normalized === '127.0.0.1'
    || normalized === '::1'
    || normalized === '[::1]';
}

function writeLangCookie(lang: Lang): void {
  if (!runtime.document) return;
  try {
    const location = runtime.window?.location;
    const attributes = [
      `${STORAGE_KEY}=${encodeURIComponent(lang)}`,
      'Path=/',
      'SameSite=Lax',
      `Max-Age=${COOKIE_MAX_AGE_SECONDS}`,
    ];
    if (!isLocalHostname(location?.hostname ?? '')) attributes.push(`Domain=.${ROOT_DOMAIN}`);
    if (location?.protocol === 'https:') attributes.push('Secure');
    runtime.document.cookie = attributes.join('; ');
  } catch {
    // Çerez engelliyse localStorage yedeği aşağıda yine yazılır.
  }
}

let currentLang: Lang = storedLang();

function syncEnvironment(lang: Lang): void {
  if (runtime.document) runtime.document.documentElement.lang = lang;
  writeLangCookie(lang);
  if (!runtime.window) return;
  try {
    runtime.window.localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Depolama kapalıysa dil yine bu oturumda ve <html lang> üzerinde çalışır.
  }
}

syncEnvironment(currentLang);

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function snapshot(): Lang {
  return currentLang;
}

export function setLang(lang: Lang): void {
  if (lang === currentLang) {
    syncEnvironment(lang);
    return;
  }
  currentLang = lang;
  syncEnvironment(lang);
  listeners.forEach((listener) => listener());
}

export function useLang(): { lang: Lang; setLang: (lang: Lang) => void } {
  const lang = useSyncExternalStore(subscribe, snapshot, (): Lang => 'tr');
  return { lang, setLang };
}

const PARAM_TOKEN = /\$\{([^{}]+)\}|\{([A-Za-z0-9_.[\]]+)\}/g;
const canonicalTemplates = new Map<string, string>();
const dynamicTemplates: Array<{ pattern: RegExp; translated: string }> = [];
const dynamicCache = new Map<string, string>();

function canonicalTemplate(value: string): string {
  return value.replace(PARAM_TOKEN, '{}');
}

function templatePattern(value: string): RegExp | null {
  PARAM_TOKEN.lastIndex = 0;
  let cursor = 0;
  let found = false;
  let pattern = '^';
  for (const match of value.matchAll(PARAM_TOKEN)) {
    found = true;
    const index = match.index ?? 0;
    pattern += value.slice(cursor, index).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    pattern += '(.+?)';
    cursor = index + match[0].length;
  }
  if (!found) return null;
  pattern += `${value.slice(cursor).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`;
  return new RegExp(pattern, 'u');
}

for (const [source, translated] of Object.entries(DICT)) {
  if (!translated.trim()) continue;
  const canonical = canonicalTemplate(source);
  if (canonical !== source && !canonicalTemplates.has(canonical)) canonicalTemplates.set(canonical, translated);
  const pattern = templatePattern(source);
  if (pattern) dynamicTemplates.push({ pattern, translated });
}

function fillTemplate(template: string, values: Array<string | number>, params?: TranslationParams): string {
  let index = 0;
  return template.replace(PARAM_TOKEN, (_token, dollarName: string | undefined, braceName: string | undefined) => {
    const name = dollarName ?? braceName ?? '';
    const direct = params?.[name];
    const value = direct ?? values[index];
    index += 1;
    return value === undefined ? _token : String(value);
  });
}

function translateDynamic(value: string): string | undefined {
  const cached = dynamicCache.get(value);
  if (cached) return cached;
  for (const template of dynamicTemplates) {
    const match = template.pattern.exec(value);
    if (!match) continue;
    const translated = fillTemplate(template.translated, match.slice(1));
    dynamicCache.set(value, translated);
    return translated;
  }
  return undefined;
}

export function t(tr: string, params?: TranslationParams): string {
  const values = params ? Object.values(params) : [];
  if (currentLang === 'tr') return params ? fillTemplate(tr, values, params) : tr;
  const translated = DICT[tr]
    ?? (params ? canonicalTemplates.get(canonicalTemplate(tr)) : undefined);
  if (typeof translated === 'string' && translated.trim()) return fillTemplate(translated, values, params);
  if (!params) return translateDynamic(tr) ?? tr;
  return fillTemplate(tr, values, params);
}
