# 🔍 CSS Analysis — Missing Custom Classes Found

**Date:** 2026-10-07 04:50 UTC  
**Status:** ⚠️ 3 Custom Classes Missing

---

## 📊 Analysis Results

### Total Classes: 354
- **Tailwind Utilities:** 294 ✅ (Valid, processed at build)
- **Custom CSS Classes:** 27
- **CSS Variables:** 33 ✅

---

## ❌ Missing Custom CSS Classes

The following custom classes are **USED** but **NOT DEFINED** in any CSS file:

| Class | Used In | Issue |
|-------|---------|-------|
| `.btn-vice-primary` | Trade page | ❌ Not defined |
| `.card-vice` | Market/Trade pages | ❌ Not defined |
| `.gradient-sunset` | Various components | ❌ Not defined |

---

## ✅ Defined Vice City Classes

These ARE properly defined in `vice-city-theme.css`:

```css
.neon-pink, .neon-cyan, .neon-purple, .neon-peach
.border-neon
.btn-neon-pink, .btn-neon-cyan
.theme-vice-city
.glow-pink, .glow-cyan, .glow-purple
```

---

## 🔧 Fix Required

Add missing classes to `vice-city-theme.css`:

```css
/* Add these missing classes */
.btn-vice-primary {
  background: var(--vice-cyan);
  color: var(--vice-ocean-night);
  font-weight: 600;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  transition: all 0.2s ease;
}

.btn-vice-primary:hover {
  background: var(--vice-sunset-pink);
  color: white;
  box-shadow: var(--glow-pink);
}

.card-vice {
  background: var(--vice-surface);
  border: 1px solid var(--vice-border);
  border-radius: 0.75rem;
  padding: 1rem;
  box-shadow: var(--glow-cyan);
}

.gradient-sunset {
  background: linear-gradient(135deg, var(--vice-sunset-pink) 0%, var(--vice-neon-purple) 100%);
}
```

---

## 📝 Next Steps

1. Add missing CSS classes to `vice-city-theme.css`
2. Rebuild frontend: `npm run build --workspace=apps/terminal`
3. Restart service: `pm2 restart terminal`
4. Test pages: http://187.127.178.20:22220/

---

**Report Generated:** 2026-10-07 04:50 UTC
