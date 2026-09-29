// Spec B/C navigation data — single source of truth (sitemenu-complete):
// 11 left-nav items in order, 9 profile-popup entries in order.
//
// A5 localization (founder decision 2026-09-27): labels are Indonesian
// (tokocrypto/indodax register). `href` values, item ORDER and icon glyphs
// are acceptance-checked against the spec diagram — do NOT reorder or
// rename routes. `id` is the stable machine key: components branch on it,
// never on the (localizable) label.

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: string; // inline glyph, no icon dep
  badge?: string; // optional right-aligned pill (marketing hook)
}

// LEFT NAV (11) — order is acceptance-checked against the spec diagram.
// Hrefs stay inside the /dashboard shell so every section renders the top
// bar + left nav; marketplace is the dashboard root itself.
// Item 11 keeps the literal "Invest in AI" vault hook (A5 marketing hook).
export const LEFT_NAV: NavItem[] = [
  { id: 'marketplace', label: 'Pasar', href: '/dashboard', icon: '▤' },
  { id: 'wallet', label: 'Dompet', href: '/dashboard/wallet', icon: '◈' },
  { id: 'quick', label: 'Beli/Jual Cepat', href: '/dashboard/quick', icon: '⇄' },
  { id: 'recurring', label: 'Investasi Berkala', href: '/dashboard/recurring', icon: '↻' },
  { id: 'staking', label: 'Staking', href: '/dashboard/staking', icon: '❖' },
  { id: 'authenticator', label: 'Authenticator', href: '/dashboard/authenticator', icon: '🛡' },
  { id: 'support', label: 'Bantuan / Dukungan', href: '/dashboard/support', icon: '?' },
  { id: 'learn', label: 'Belajar / Blog', href: '/dashboard/learn', icon: '✎' },
  { id: 'mobile-app', label: 'Aplikasi Seluler', href: '/dashboard/mobile-app', icon: '▢' },
  { id: 'education', label: 'Edukasi', href: '/dashboard/education', icon: '✦' },
  { id: 'invest-in-ai', label: 'Invest in AI', href: '/dashboard/ai', icon: '◆', badge: 'Vault' },
];

// PROFILE POPUP (9) — Manajemen Alamat is the default-focused entry
// (spec: "selected/default focus"; Address Management → id `addresses`).
export const PROFILE_ITEMS: NavItem[] = [
  { id: 'profile', label: 'Profil & Pengaturan', href: '/dashboard/profile', icon: '◉' },
  { id: 'security', label: 'Keamanan', href: '/dashboard/security', icon: '⚿' },
  { id: 'addresses', label: 'Manajemen Alamat', href: '/dashboard/addresses', icon: '⌖' },
  { id: 'mobile-app', label: 'Aplikasi Seluler', href: '/dashboard/mobile-app', icon: '▢' },
  { id: 'trade-api', label: 'API Trading', href: '/dashboard/trade-api', icon: '⚙' },
  { id: 'history', label: 'Riwayat', href: '/dashboard/history', icon: '≡' },
  { id: 'referral', label: 'Referral INDODAX', href: '/dashboard/referral', icon: '➤' },
  { id: 'dark-mode', label: 'Mode Gelap', href: '', icon: '☾' }, // action, not a link
  { id: 'logout', label: 'Keluar', href: '', icon: '⏻' },         // action, not a link
];
