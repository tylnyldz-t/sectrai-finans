export const WCAG_AA_NORMAL_TEXT_RATIO = 4.5;
// Tarayıcı yüzeyi ile sunucu konektörü aynı fail-closed sözleşmeyi kullanır. Konektör bu
// sabitleri yeniden export eder; böylece istemci node:crypto kullanan sunucu modülünü bundle etmez.
export const BRAND_LOGO_CONNECTOR_ID = 'brand-logo-local-sdxl';
export const BRAND_LOGO_SCOPE = 'brand:generate';
export const BRAND_LOGO_LIVE_DISABLED = 'LIVE_DISABLED' as const;
export const BRAND_LOGO_LIVE_ENABLED = 'LIVE_ENABLED' as const;
export type BrandLogoLiveMode = typeof BRAND_LOGO_LIVE_DISABLED | typeof BRAND_LOGO_LIVE_ENABLED;
export const BRAND_LOGO_REVIEW_NOTICE =
  'AI çıktısı yalnız bir öneridir. Marka tescil kontrolü ayrı ve owner-kapılı bir adımdır; AI çıktısı özgünlük garantisi taşımaz.';

export type BrandStyle = 'modern' | 'editorial' | 'friendly' | 'technical' | 'classic';
export type KitUnit = 'px' | 'mm';

export interface BrandTone {
  base: string;
  dark: string;
  light: string;
  foreground: '#000000' | '#FFFFFF';
  contrastRatio: number;
  aaNormalText: boolean;
}

export interface BrandPalette {
  seed: string;
  primary: BrandTone;
  secondary: BrandTone;
  accent: BrandTone;
  neutral: BrandTone;
  standard: 'WCAG 2.x AA normal text';
  minimumContrastRatio: typeof WCAG_AA_NORMAL_TEXT_RATIO;
}

export interface FontChoice {
  name: string;
  stack: string;
  license: 'SIL Open Font License 1.1';
  licenseUrl: string;
}

export interface TypePairing {
  style: BrandStyle;
  heading: FontChoice;
  body: FontChoice;
}

export interface BrandKitInput {
  name: string;
  seedHex: string;
  style: BrandStyle;
  slogan?: string;
}

export interface KitItem {
  id: string;
  label: string;
  width: number;
  height: number;
  unit: KitUnit;
  purpose: string;
  note?: string;
}

export interface BrandKitPlan {
  brand: { name: string; slogan?: string };
  palette: BrandPalette;
  typography: TypePairing;
  items: KitItem[];
  rendering: 'deterministic-data-only';
}

const HEX_PATTERN = /^#?(?:[\da-f]{3}|[\da-f]{6})$/iu;

function normalizeHex(input: string): string {
  const value = input.trim();
  if (!HEX_PATTERN.test(value)) throw new Error('INVALID_SEED_HEX');
  const raw = value.replace('#', '').toUpperCase();
  const expanded = raw.length === 3 ? raw.split('').map((part) => `${part}${part}`).join('') : raw;
  return `#${expanded}`;
}

function rgb(hex: string): [number, number, number] {
  const normalized = normalizeHex(hex);
  return [
    Number.parseInt(normalized.slice(1, 3), 16),
    Number.parseInt(normalized.slice(3, 5), 16),
    Number.parseInt(normalized.slice(5, 7), 16),
  ];
}

function hueFromHex(hex: string): number {
  const [red, green, blue] = rgb(hex).map((channel) => channel / 255) as [number, number, number];
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  if (delta === 0) return 0;
  const segment = max === red
    ? ((green - blue) / delta) % 6
    : max === green
      ? (blue - red) / delta + 2
      : (red - green) / delta + 4;
  return Math.round((segment * 60 + 360) % 360);
}

function hslToHex(hue: number, saturation: number, lightness: number): string {
  const h = ((hue % 360) + 360) % 360;
  const s = Math.max(0, Math.min(100, saturation)) / 100;
  const l = Math.max(0, Math.min(100, lightness)) / 100;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const x = chroma * (1 - Math.abs((h / 60) % 2 - 1));
  const offset = l - chroma / 2;
  const [red, green, blue] = h < 60 ? [chroma, x, 0]
    : h < 120 ? [x, chroma, 0]
      : h < 180 ? [0, chroma, x]
        : h < 240 ? [0, x, chroma]
          : h < 300 ? [x, 0, chroma]
            : [chroma, 0, x];
  return `#${[red, green, blue]
    .map((channel) => Math.round((channel + offset) * 255).toString(16).padStart(2, '0'))
    .join('').toUpperCase()}`;
}

function relativeLuminance(hex: string): number {
  const channels = rgb(hex).map((channel) => {
    const srgb = channel / 255;
    return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export function contrastRatio(firstHex: string, secondHex: string): number {
  const first = relativeLuminance(firstHex);
  const second = relativeLuminance(secondHex);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

export function meetsWcagAA(
  foregroundHex: string,
  backgroundHex: string,
  minimum = WCAG_AA_NORMAL_TEXT_RATIO,
): boolean {
  if (!Number.isFinite(minimum) || minimum <= 1) throw new Error('INVALID_CONTRAST_MINIMUM');
  return contrastRatio(foregroundHex, backgroundHex) >= minimum;
}

function tone(hue: number, saturation: number, lightness: number): BrandTone {
  const base = hslToHex(hue, saturation, lightness);
  const blackRatio = contrastRatio(base, '#000000');
  const whiteRatio = contrastRatio(base, '#FFFFFF');
  const foreground = blackRatio >= whiteRatio ? '#000000' : '#FFFFFF';
  const ratio = Math.max(blackRatio, whiteRatio);
  return {
    base,
    dark: hslToHex(hue, Math.min(88, saturation + 6), Math.max(16, lightness - 22)),
    light: hslToHex(hue, Math.max(8, saturation - 18), Math.min(94, lightness + 42)),
    foreground,
    contrastRatio: ratio,
    aaNormalText: ratio >= WCAG_AA_NORMAL_TEXT_RATIO,
  };
}

export function paletteFrom(seedHex: string): BrandPalette {
  const seed = normalizeHex(seedHex);
  const hue = hueFromHex(seed);
  return {
    seed,
    primary: tone(hue, 68, 44),
    secondary: tone(hue + 42, 58, 42),
    accent: tone(hue + 184, 72, 43),
    neutral: tone(hue + 12, 10, 46),
    standard: 'WCAG 2.x AA normal text',
    minimumContrastRatio: WCAG_AA_NORMAL_TEXT_RATIO,
  };
}

const FONT = {
  spaceGrotesk: {
    name: 'Space Grotesk',
    stack: "'Space Grotesk', system-ui, sans-serif",
    license: 'SIL Open Font License 1.1',
    licenseUrl: 'https://raw.githubusercontent.com/google/fonts/main/ofl/spacegrotesk/OFL.txt',
  },
  inter: {
    name: 'Inter',
    stack: "Inter, system-ui, sans-serif",
    license: 'SIL Open Font License 1.1',
    licenseUrl: 'https://raw.githubusercontent.com/google/fonts/main/ofl/inter/OFL.txt',
  },
  lora: {
    name: 'Lora',
    stack: "Lora, Georgia, serif",
    license: 'SIL Open Font License 1.1',
    licenseUrl: 'https://raw.githubusercontent.com/google/fonts/main/ofl/lora/OFL.txt',
  },
  sourceSans: {
    name: 'Source Sans 3',
    stack: "'Source Sans 3', system-ui, sans-serif",
    license: 'SIL Open Font License 1.1',
    licenseUrl: 'https://raw.githubusercontent.com/google/fonts/main/ofl/sourcesans3/OFL.txt',
  },
  nunito: {
    name: 'Nunito',
    stack: "Nunito, system-ui, sans-serif",
    license: 'SIL Open Font License 1.1',
    licenseUrl: 'https://raw.githubusercontent.com/google/fonts/main/ofl/nunito/OFL.txt',
  },
  nunitoSans: {
    name: 'Nunito Sans',
    stack: "'Nunito Sans', system-ui, sans-serif",
    license: 'SIL Open Font License 1.1',
    licenseUrl: 'https://raw.githubusercontent.com/google/fonts/main/ofl/nunitosans/OFL.txt',
  },
  plexMono: {
    name: 'IBM Plex Mono',
    stack: "'IBM Plex Mono', ui-monospace, monospace",
    license: 'SIL Open Font License 1.1',
    licenseUrl: 'https://raw.githubusercontent.com/google/fonts/main/ofl/ibmplexmono/OFL.txt',
  },
  plexSans: {
    name: 'IBM Plex Sans',
    stack: "'IBM Plex Sans', system-ui, sans-serif",
    license: 'SIL Open Font License 1.1',
    licenseUrl: 'https://raw.githubusercontent.com/google/fonts/main/ofl/ibmplexsans/OFL.txt',
  },
  libreBaskerville: {
    name: 'Libre Baskerville',
    stack: "'Libre Baskerville', Georgia, serif",
    license: 'SIL Open Font License 1.1',
    licenseUrl: 'https://raw.githubusercontent.com/google/fonts/main/ofl/librebaskerville/OFL.txt',
  },
  workSans: {
    name: 'Work Sans',
    stack: "'Work Sans', system-ui, sans-serif",
    license: 'SIL Open Font License 1.1',
    licenseUrl: 'https://raw.githubusercontent.com/google/fonts/main/ofl/worksans/OFL.txt',
  },
} as const satisfies Record<string, FontChoice>;

const PAIRINGS: Record<BrandStyle, readonly [FontChoice, FontChoice]> = {
  modern: [FONT.spaceGrotesk, FONT.inter],
  editorial: [FONT.lora, FONT.sourceSans],
  friendly: [FONT.nunito, FONT.nunitoSans],
  technical: [FONT.plexMono, FONT.plexSans],
  classic: [FONT.libreBaskerville, FONT.workSans],
};

export function typePairing(style: BrandStyle): TypePairing {
  const pairing = PAIRINGS[style];
  if (!pairing) throw new Error('UNSUPPORTED_BRAND_STYLE');
  return {
    style,
    heading: { ...pairing[0] },
    body: { ...pairing[1] },
  };
}

const KIT_ITEMS: readonly KitItem[] = [
  { id: 'favicon', label: 'Favicon', width: 32, height: 32, unit: 'px', purpose: 'Tarayıcı sekmesi için kare işaret' },
  { id: 'app-icon', label: 'Uygulama ikonu', width: 512, height: 512, unit: 'px', purpose: 'Kare uygulama ana ikonu' },
  { id: 'business-card', label: 'Kartvizit', width: 85, height: 55, unit: 'mm', purpose: 'Yatay baskı yerleşim planı' },
  { id: 'social-avatar', label: 'Sosyal profil', width: 1080, height: 1080, unit: 'px', purpose: 'Kare profil görseli' },
  { id: 'social-header', label: 'Sosyal başlık', width: 1500, height: 500, unit: 'px', purpose: 'Genel amaçlı 3:1 başlık tuvali' },
  { id: 'email-signature', label: 'E-posta imzası', width: 600, height: 200, unit: 'px', purpose: 'İmza yerleşim planı' },
  { id: 'presentation-cover', label: 'Sunum kapağı', width: 1920, height: 1080, unit: 'px', purpose: '16:9 sunum kapağı' },
  { id: 'letterhead', label: 'Antetli kâğıt', width: 210, height: 297, unit: 'mm', purpose: 'A4 baskı yerleşim planı' },
  {
    id: 'vehicle-side-concept',
    label: 'Araç giydirme konsepti',
    width: 2400,
    height: 1000,
    unit: 'px',
    purpose: 'Oransal yan görünüş konsept tuvali',
    note: 'Üretim dosyası değildir; araç kalıbı ve saha ölçüsü owner onayından sonra ayrıca alınır.',
  },
];

function normalizedText(value: string, error: string): string {
  const normalized = value.trim().replace(/\s+/gu, ' ');
  if (!normalized || normalized.length > 120 || /\p{C}/u.test(normalized)) throw new Error(error);
  return normalized;
}

export function kitPlan(input: BrandKitInput): BrandKitPlan {
  const name = normalizedText(input.name, 'INVALID_BRAND_NAME');
  const slogan = input.slogan === undefined ? undefined : normalizedText(input.slogan, 'INVALID_BRAND_SLOGAN');
  return {
    brand: { name, ...(slogan ? { slogan } : {}) },
    palette: paletteFrom(input.seedHex),
    typography: typePairing(input.style),
    items: KIT_ITEMS.map((item) => ({ ...item })),
    rendering: 'deterministic-data-only',
  };
}
