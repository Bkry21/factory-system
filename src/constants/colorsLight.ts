const ColorsLight = {
  // ── Backgrounds ──────────────────────────────────────────────────────────
  bg:           '#FAF7F2',
  background:   '#FAF7F2',
  bgDeep:       '#F2EDE4',
  surface:      '#FFFCF8',
  surfaceLight: '#FFFFFF',
  surfaceAlt:   '#',

  bgDark:          '#E8E0D5',
  surfaceDark:     '#F2EDE4',
  surfaceDarkHigh: '#E8E0D5',

  // ── Shadows ───────────────────────────────────────────────────────────────
  shadowLight:    'rgba(0, 0, 0, 0.05)',
  shadowDark:     'rgba(0, 0, 0, 0.15)',
  shadowDarkSoft: 'rgba(0, 0, 0, 0.08)',

  // ── Primary & Accents ─────────────────────────────────────────────────────
  primary:    '#1E6FD9',
  primaryDim: 'rgba(30, 111, 217, 0.12)',
  primaryDark:'#1558B0',
  primaryGlow:'rgba(30, 111, 217, 0.22)',

  accent:    '#6D28D9',
  accentDim: 'rgba(109, 40, 217, 0.12)',

  // ── Glow ─────────────────────────────────────────────────────────────────
  successGlow: 'rgba(4, 120, 87, 0.2)',
  warningGlow: 'rgba(180, 83, 9, 0.2)',
  dangerGlow:  'rgba(185, 28, 28, 0.2)',
  pendingGlow: 'rgba(185, 28, 28, 0.2)',

  successLight: 'rgba(4, 120, 87, 0.1)',
  warningLight: 'rgba(180, 83, 9, 0.1)',
  dangerLight:  'rgba(185, 28, 28, 0.1)',

  // ── Pastels ───────────────────────────────────────────────────────────────
  folderYellow: '#B45309',
  folderOrange: '#C2410C',
  pastelCyan:   '#0E7490',
  pastelPink:   '#BE185D',
  pastelPurple: '#6D28D9',
  pastelGreen:  '#047857',

  // ── Status ────────────────────────────────────────────────────────────────
  success:    '#047857',
  successDim: 'rgba(4, 120, 87, 0.12)',
  warning:    '#B45309',
  warningDim: 'rgba(180, 83, 9, 0.12)',
  danger:     '#B91C1C',
  dangerDim:  'rgba(185, 28, 28, 0.12)',
  info:       '#0369A1',
  infoDim:    'rgba(3, 105, 161, 0.12)',

  // ── Machine Status ────────────────────────────────────────────────────────
  running:     '#047857',
  stopped:     '#78716C',
  maintenance: '#B45309',
  pending:     '#B91C1C',
  pendingDim:  'rgba(185, 28, 28, 0.12)',

  // ── Text ──────────────────────────────────────────────────────────────────
  textPrimary:   '#1C1917',
  textSecondary: '#44403C',
  textSub:       '#57534E',
  textMuted:     '#78716C',
  textLight:     '#FFFFFF',
  textLightMuted:'#D6D3D1',

  white: '#FFFFFF',
  black: '#000000',

  // ── Borders ───────────────────────────────────────────────────────────────
  border:          'rgba(28, 25, 23, 0.10)',
  borderLight:     'rgba(28, 25, 23, 0.07)',
  borderDark:      'rgba(28, 25, 23, 0.16)',
  glassBorderHigh: 'rgba(28, 25, 23, 0.20)',

  // ── Gradients ─────────────────────────────────────────────────────────────
  gradientDark:    ['#F2EDE4', '#E8E0D5'] as [string, string],
  gradientPrimary: ['#1E6FD9', '#1558B0'] as [string, string],
  gradientViolet:  ['#6D28D9', '#5B21B6'] as [string, string],
  gradientDanger:  ['#B91C1C', '#991B1B'] as [string, string],
  gradientSuccess: ['#047857', '#065F46'] as [string, string],
  gradientGlass:   ['rgba(255,252,248,0.95)', 'rgba(255,252,248,0.7)'] as [string, string],

  transparent: 'transparent',
  overlay:     'rgba(28, 25, 23, 0.55)',
};

export default ColorsLight;