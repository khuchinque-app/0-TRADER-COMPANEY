# Design System Reference — Port 2217 (chinque-cripto)

Extracted: 2026-10-04
Source: http://localhost:2217/

## Color Tokens

Backgrounds:
  --stx-bg: #090909           Main page background
  --stx-sidebar: #0B0B0C      Sidebar background  
  --stx-surface: #101113      Card surface
  --stx-surface-2: #141518    Secondary surface

Status:
  --stx-profit: #22C55E       Green / positive
  --stx-loss: #EF4444         Red / negative
  --color-gold: #F59E0B       Gold accent

Borders:
  --color-brand-border: rgba(255,255,255,0.05)
  --color-brand-border-subtle: rgba(255,255,255,0.03)

Text:
  --color-brand-text: #F4F4F5              Primary text
  --color-brand-text-secondary: rgba(255,255,255,0.62)
  --color-brand-text-muted: rgba(255,255,255,0.38)

## Typography
- Font: Inter (Google Fonts)
- Weights: 400, 500, 600
- Body: 13px-15px, Small: 11px-12px

## Component Patterns

Card:
  - Background: --stx-surface (#101113)
  - Border: 1px solid rgba(255,255,255,0.05)
  - Radius: 16px mobile / 20px desktop
  - Padding: 16px mobile / 18px desktop
  - Shadow: inset 0 1px 0 rgba(255,255,255,0.02), 0 8px 32px rgba(0,0,0,0.55)

Topbar:
  - Height: 56px
  - Border-bottom: 1px solid --color-brand-border
  - Search: h-[40px], rounded-xl, bg-[#121316]
  - Ticker pill: h-[28px], rounded-full, bg-[#151618]

Sidebar:
  - Width: 248px
  - Background: --stx-sidebar
  - Nav item: h-9, rounded-lg
  - Active: bg-brand-border-subtle with border
  - Hover: bg-brand-surface-hover

Input:
  - Height: h-[40px] or py-2.5
  - Background: bg-[#121316]
  - Border: border-brand-border-subtle
  - Focus: focus:border-brand-border
  - Radius: rounded-md or rounded-xl

## Layout
- Sidebar: 248px left, hidden < lg breakpoint
- Topbar: 56px fixed height
- Main: flex-1, overflow-y-auto

## UI Details
- Scrollbar: 6px width, rgba(255,255,255,0.1) thumb
- Transitions: duration-200 ease-out
- Active: active:scale-[0.95]
