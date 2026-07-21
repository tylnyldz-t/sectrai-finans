import type { CSSProperties } from 'react';
import type { DashboardTheme } from '@shared/dashboard-design.ts';

type CssVars = CSSProperties & Record<`--${string}`, string>;

// SEKTRAL "MOR TEMA" — koyu (dark) varyant. Owner referansı: sektral apps/web/src/index.css `.dark`
// bloğu (Xontainer #06061a soyu: derin mavimsi-mor zemin, bir tık parlak violet primary). Workspace
// panosu (Masa) bu koyu-mor kabukta yaşar. Değerler .dash alt-ağacında global :root'u INLINE override
// eder → yalnız pano koyu-mor; landing/app kendi teması. Kayda serbest CSS girmez (dar preset kümesi).
//
// SHELL token'ları: sol sidebar HER iki paletle koyu (Masa imza görünümü — sektral AppShell bg-shell).
interface PaletteTokens {
  bg: string; bg2: string; surface: string; surface2: string;
  text: string; muted: string; muted2: string; border: string; borderStrong: string;
  primary: string; primaryFg: string; primarySoft: string; accent: string;
  gradBtn: string; brand: string;
  shell: string; shellFg: string; shellMuted: string; shellHover: string; shellActive: string; shellBorder: string;
}

const PALETTES: Record<DashboardTheme['palette'], PaletteTokens> = {
  // violet = SEKTRAL MOR TEMA (dark). --background 248 42% 7%, --primary 262 84% 70%, --card 250 34% 11%.
  violet: {
    bg: 'hsl(248, 42%, 7%)', bg2: 'hsl(250, 40%, 9.5%)',
    surface: 'hsl(250, 34%, 11%)', surface2: 'hsl(250, 30%, 14.5%)',
    text: 'hsl(250, 20%, 93%)', muted: 'hsl(250, 14%, 68%)', muted2: 'hsl(250, 12%, 54%)',
    border: 'hsl(250, 26%, 24%)', borderStrong: 'hsl(250, 24%, 32%)',
    primary: 'hsl(262, 84%, 70%)', primaryFg: 'hsl(262, 90%, 80%)', primarySoft: 'hsl(262, 42%, 20%)',
    accent: 'hsl(262, 84%, 70%)',
    gradBtn: 'linear-gradient(135deg, hsl(262, 86%, 72%), hsl(262, 78%, 62%))',
    brand: 'hsl(44, 90%, 56%)',
    shell: 'hsl(250, 46%, 6%)', shellFg: 'hsl(250, 18%, 89%)', shellMuted: 'hsl(250, 13%, 60%)',
    shellHover: 'hsl(250, 34%, 13%)', shellActive: 'hsl(262, 42%, 22%)', shellBorder: 'hsl(250, 30%, 16%)',
  },
  // ocean/forest: aynı koyu-mor disiplininde hue-öteli koyu varyantlar (palet değiştirici tutarlı kalsın).
  ocean: {
    bg: 'hsl(212, 44%, 7%)', bg2: 'hsl(210, 40%, 9.5%)',
    surface: 'hsl(210, 34%, 11%)', surface2: 'hsl(210, 30%, 14.5%)',
    text: 'hsl(200, 20%, 93%)', muted: 'hsl(205, 14%, 68%)', muted2: 'hsl(205, 12%, 54%)',
    border: 'hsl(208, 26%, 24%)', borderStrong: 'hsl(208, 24%, 32%)',
    primary: 'hsl(190, 84%, 60%)', primaryFg: 'hsl(190, 90%, 72%)', primarySoft: 'hsl(196, 46%, 18%)',
    accent: 'hsl(190, 84%, 60%)',
    gradBtn: 'linear-gradient(135deg, hsl(190, 86%, 62%), hsl(194, 80%, 50%))',
    brand: 'hsl(44, 90%, 56%)',
    shell: 'hsl(212, 46%, 6%)', shellFg: 'hsl(205, 18%, 89%)', shellMuted: 'hsl(205, 13%, 60%)',
    shellHover: 'hsl(210, 34%, 13%)', shellActive: 'hsl(196, 46%, 20%)', shellBorder: 'hsl(210, 30%, 16%)',
  },
  forest: {
    bg: 'hsl(160, 38%, 6.5%)', bg2: 'hsl(158, 34%, 9%)',
    surface: 'hsl(158, 30%, 10.5%)', surface2: 'hsl(158, 26%, 14%)',
    text: 'hsl(150, 18%, 93%)', muted: 'hsl(152, 12%, 66%)', muted2: 'hsl(152, 10%, 52%)',
    border: 'hsl(156, 24%, 22%)', borderStrong: 'hsl(156, 22%, 30%)',
    primary: 'hsl(150, 68%, 58%)', primaryFg: 'hsl(150, 74%, 70%)', primarySoft: 'hsl(152, 40%, 16%)',
    accent: 'hsl(150, 68%, 58%)',
    gradBtn: 'linear-gradient(135deg, hsl(150, 70%, 60%), hsl(152, 64%, 48%))',
    brand: 'hsl(44, 90%, 56%)',
    shell: 'hsl(160, 40%, 5.5%)', shellFg: 'hsl(150, 16%, 89%)', shellMuted: 'hsl(152, 11%, 58%)',
    shellHover: 'hsl(158, 30%, 12%)', shellActive: 'hsl(152, 40%, 18%)', shellBorder: 'hsl(158, 26%, 15%)',
  },
};

/** Preset seçimi CSS değişkenlerine iner; kayda serbest CSS değeri giremez. */
export function dashboardThemeVars(theme: DashboardTheme): CssVars {
  const p = PALETTES[theme.palette] ?? PALETTES.violet;
  const font = {
    display: 'var(--font-display)',
    humanist: 'ui-rounded, "Avenir Next", "Segoe UI", sans-serif',
    system: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  }[theme.font];
  const radius = { soft: '14px', round: '22px', square: '6px' }[theme.radius];
  const spacing = { compact: '12px', balanced: '20px', airy: '30px' }[theme.spacing];

  return {
    // Yüzey (global :root'u .dash alt-ağacında override eder → koyu-mor Masa)
    '--bg': p.bg,
    '--bg-2': p.bg2,
    '--surface': p.surface,
    '--surface-2': p.surface2,
    '--text': p.text,
    '--muted': p.muted,
    '--muted-2': p.muted2,
    '--border': p.border,
    '--border-strong': p.borderStrong,
    '--primary': p.primary,
    '--primary-fg': p.primaryFg,
    '--primary-soft': p.primarySoft,
    '--accent': p.accent,
    '--ring': p.primary,
    '--grad-btn': p.gradBtn,
    // Shell (sol sidebar — koyu imza kabuk)
    '--shell': p.shell,
    '--shell-fg': p.shellFg,
    '--shell-muted': p.shellMuted,
    '--shell-hover': p.shellHover,
    '--shell-active': p.shellActive,
    '--shell-border': p.shellBorder,
    // Pano-özel token'lar
    '--dash-accent': p.accent,
    '--dash-primary': p.primary,
    '--dash-primary-fg': p.primaryFg,
    '--dash-primary-soft': p.primarySoft,
    '--dash-brand': p.brand, // amber — yalnız per-sektör brand kullanımı
    '--dash-font': font,
    '--dash-radius': radius,
    '--dash-section-gap': spacing,
  };
}
