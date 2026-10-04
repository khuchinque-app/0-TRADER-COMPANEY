# Design System Reference — Port 2217 (chinque-cripto)

**Extracted:** 2026-10-04
**Source:** http://localhost:2217/

---

## Color Tokens

### Backgrounds
| Token | Value | Usage |
|-------|-------|-------|
| `--stx-bg` | `#090909` | Main page background |
| `--stx-sidebar` | `#0B0B0C` | Sidebar background |
| `--stx-surface` | `#101113` | Card/panel surface |
| `--stx-surface-2` | `#141518` | Secondary surface (headers, inputs) |
| `--bg-unified` | `#090909` | Unified alias for --stx-bg |
| `--surface-unified` | `#101113` | Unified alias for --stx-surface |
| `--surface-2-unified` | `#141518` | Unified alias for --stx-surface-2 |
| `--border-unified` | `rgba(255,255,255,0.05)` | Unified border |

### Text
| Token | Value | Usage |
|-------|-------|-------|
| `--color-brand-text` | `#F4F4F5` | Primary text |
| `--color-brand-text-secondary` | `rgba(255,255,255,0.62)` | Secondary text |
| `--color-brand-text-muted` | `rgba(255,255,255,0.38)` | Muted text |
| `--text-primary-unified` | `#F4F4F5` | Unified primary |
| `--text-secondary-unified` | `rgba(255,255,255,0.62)` | Unified secondary |
| `--text-muted-unified` | `rgba(255,255,255,0.38)` | Unified muted |

### Accent / Brand
| Token | Value | Usage |
|-------|-------|-------|
| `--color-gold` | `#F59E0B` | Gold accent (active states, dots) |
| `--color-brand-border` | `rgba(255,255,255,0.05)` | Border default |
| `--color-brand-border-subtle` | `rgba(255,255,255,0.03)` | Subtle border |

### Market Colors
| Token | Value | Usage |
|-------|-------|-------|
| `--stx-profit` | `#22C55E` | Green / profit / buy |
| `--stx-loss` | `#EF4444` | Red / loss / sell |
| `--gain` | `#00bb7f` | Alternative green |
| `--loss` | `#fb2c36` | Alternative red |
| `--accent` | `#3080ff` | Cyan/blue accent |

### Legacy / Market-monitor (preserved)
| Token | Value |
|-------|-------|
| `--bg-primary` | `#000000` |
| `--bg-secondary` | `#0d0d0d` |
| `--bg-panel` | `#0d0d0d` |
| `--bg-hover` | `#161616` |
| `--text-primary` | `#ffffff` |
| `--text-secondary` | `#a8a8a8` |
| `--text-muted` | `#8f8f8f` |
| `--border` | `#2e2e2e` |
| `--border-light` | `#565656` |
| `--grid-line` | `rgba(48,128,255,0.08)` |
| `--raised` | `#161616` |
| `--ink` | `#ffffff` |
| `--faint` | `#565656` |
| `--line-soft` | `#1c1c1c` |
| `--accent-ink` | `#04122b` |
| `--accent-soft` | `#0d1f3d` |
| `--pos` | `#00bb7f` |
| `--neg` | `#fb2c36` |
| `--warn` | `#e5a83a` |

### Light Theme Overrides (data-theme='light')
| Token | Light Value |
|-------|-------------|
| `--stx-bg` | `#fbfbfa` |
| `--stx-sidebar` | `#ffffff` |
| `--stx-surface` | `#ffffff` |
| `--stx-surface-2` | `#f4f4f2` |
| `--stx-profit` | `#0f7b4f` |
| `--stx-loss` | `#c2352b` |
| `--color-gold` | `#b4690e` |
| `--color-brand-border` | `rgba(0,0,0,0.08)` |
| `--color-brand-border-subtle` | `rgba(0,0,0,0.05)` |
| `--color-brand-text` | `#14140f` |
| `--text-primary-unified` | `#14140f` |

---

## Typography

| Token | Value |
|-------|-------|
| Primary font | `'Inter', -apple-system, BlinkMacSystemFont, sans-serif` |
| Mono font | `'JetBrains Mono', 'Fira Code', 'Consolas', monospace` |
| Base size | `13px` |
| Base line-height | `1.5` |
| Panel title | `11px, weight 600, uppercase, letter-spacing 0.08em` |
| OHLC label | `9px, weight 600, uppercase, letter-spacing 0.05em` |

## Component Patterns

### Card (`.card-2217`)
| Property | Value |
|----------|-------|
| Background | `var(--stx-surface)` |
| Border | `1px solid var(--color-brand-border)` |
| Radius | `16px` |
| Padding | `16px` |
| Shadow | `inset 0 1px 0 rgba(255,255,255,0.02), 0 8px 32px rgba(0,0,0,0.55)` |

### Button (`.btn-2217`)
| Property | Value |
|----------|-------|
| Padding | `8px 16px` |
| Radius | `8px` |
| Font | `13px, weight 500` |
| Border | `1px solid var(--color-brand-border)` |
| BG | `var(--stx-surface-2)` |
| Color | `var(--text-primary-unified)` |
| Hover | bg → `var(--stx-surface)`, border → `rgba(255,255,255,0.1)` |
| Active | `transform: scale(0.95)` |

### Input (`.input-2217`)
| Property | Value |
|----------|-------|
| Height | `40px` |
| Padding | `0 12px` |
| BG | `#121316` |
| Border | `1px solid var(--color-brand-border-subtle)` |
| Radius | `8px` |
| Focus | border → `var(--color-brand-border)` |

### Badge (`.badge-2217`)
| Property | Value |
|----------|-------|
| Radius | `20px` (pill) |
| Padding | `4px 10px` |
| Font | `11px, weight 500` |
| BG | `var(--stx-surface-2)` |
| Border | `1px solid var(--color-brand-border-subtle)` |

### Navigation (`.nav-item-2217`)
| Property | Value |
|----------|-------|
| Padding | `8px 12px` |
| Radius | `8px` |
| Active | left border `2px solid #F59E0B`, bg `rgba(255,255,255,0.05)` |
| Hover | bg `rgba(255,255,255,0.03)` |

### Table (`.table-2217`)
| Property | Value |
|----------|-------|
| Cell padding | `10px 12px` |
| Header | `11px, weight 600, uppercase, letter-spacing 0.05em` |
| Row hover | `rgba(255,255,255,0.02)` |

### Modal (`.modal-2217`)
| Property | Value |
|----------|-------|
| Radius | `20px` |
| Max-width | `440px` |
| Padding | `24px` |
| Overlay | `rgba(0,0,0,0.6)` + `backdrop-filter: blur(4px)` |

### Panel (`.panel`, `.panel-header`)
| Property | Value |
|----------|-------|
| Panel BG | `var(--surface-unified)` |
| Header BG | `var(--stx-surface-2)` |
| Header height | `36px min` |
| Header padding | `8px 12px` |
| Title | `11px, weight 600, uppercase, letter-spacing 0.08em` |
| Title dot | `6px, #F59E0B, box-shadow glow` |

### Order Form
| Element | Style |
|---------|-------|
| Buy tab | `background: var(--stx-profit)`, color `#000`, glow `rgba(34,197,94,0.4)` |
| Sell tab | `background: var(--stx-loss)`, color `#fff`, glow `rgba(239,68,68,0.4)` |
| Submit buy | `background: var(--stx-profit)`, shadow `0 0 12px rgba(34,197,94,0.3)` |
| Submit sell | `background: var(--stx-loss)`, shadow `0 0 12px rgba(239,68,68,0.3)` |
| Input focus | border → `#F59E0B` |
| Position sizer active | color `#F59E0B`, border `#F59E0B`, bg `var(--cyan-dim)` |

### Ticker / Timeframe
| Element | Style |
|---------|-------|
| Timeframe active | `background: #F59E0B`, color `#000`, glow `rgba(50,197,233,0.4)` |
| Ticker item active | border-bottom `2px solid #F59E0B` |
| Ticker change up | color `var(--stx-profit)`, bg `rgba(34,197,94,0.1)` |
| Ticker change down | color `var(--stx-loss)`, bg `rgba(239,68,68,0.1)` |

### Status Bar
| Property | Value |
|----------|-------|
| Height | `28px` |
| Font | `10px` |
| Connected dot | `background: var(--stx-profit)`, glow `0 0 6px` |
| Disconnected dot | `background: var(--stx-loss)`, glow `0 0 6px` |

## Layout
| Property | Value |
|----------|-------|
| Container grid | `grid-template-columns: 1fr 280px`, `grid-template-rows: 56px 1fr auto` |
| Gap | `1px` (border-color gap pattern) |
| Header height | `56px` |
| Main grid | `grid-template-rows: auto 1fr` |
| Status bar | `28px` height, full width |
| Sidebar | `280px` right panel |

## Transitions
| Token | Value |
|-------|-------|
| `--ease` | `cubic-bezier(.22, .7, .2, 1)` |
| `--fast` | `.16s var(--ease)` |
| `--slow` | `.34s var(--ease)` |

## Animations
| Name | Duration | Usage |
|------|----------|-------|
| `pulse-glow` | 2s ease-in-out infinite | Gold dot active state |
| `tape-scroll` | 40s linear infinite | Ticker marquee |
| `flash-up` | 0.6s ease-out | Price tick green flash |
| `flash-down` | 0.6s ease-out | Price tick red flash |

## Scrollbar
| Property | Value |
|----------|-------|
| Width/height | `6px` |
| Track | `var(--stx-surface)` |
| Thumb | `rgba(255,255,255,0.1)`, radius `3px` |
| Hover thumb | `rgba(255,255,255,0.2)` |

## Source
- CSS source: `apps/terminal/app/globals.css`
- Compiled: `apps/terminal/.next/static/css/f0c05ebbd4b0fd10.css`
- Server: port 2217 (node, PID 1481435)
