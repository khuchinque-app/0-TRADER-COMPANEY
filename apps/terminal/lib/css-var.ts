// css-var.ts — resolve CSS design tokens to concrete color strings.
//
// Canvas-backed APIs (lightweight-charts option objects, 2d context fills)
// cannot parse `var(--token)` — they need a literal color. These helpers read
// the token from `:root` at call time so chart colors stay in sync with the
// adopted palette in app/globals.css.

/**
 * Read a CSS custom property from `:root`.
 * Returns `fallback` on the server or when the token is missing/empty.
 */
export function cssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || fallback;
}

/**
 * Same as `cssVar`, but re-applies an alpha channel to the resolved color
 * (supports #rgb / #rrggbb and rgb()/rgba() token values).
 */
export function cssVarAlpha(name: string, fallback: string, alpha: number): string {
  return withAlpha(cssVar(name, fallback), alpha);
}

function withAlpha(color: string, alpha: number): string {
  const value = color.trim();

  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value);
  if (hex) {
    const h = hex[1].length === 3
      ? hex[1].split('').map((c) => c + c).join('')
      : hex[1];
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(value);
  if (rgb) return `rgba(${rgb[1]}, ${rgb[2]}, ${rgb[3]}, ${alpha})`;

  return value;
}
