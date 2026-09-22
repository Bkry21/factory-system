/**
 * Palette — Liquid Dark Glassmorphic Theme
 * Base: Deep rich obsidian blacks & night navies with luminous glass borders and neon accents
 */

const Colors = {
  // ── Backgrounds (Liquid Dark) ───────────────────────────────────────────
  bg: '#0A0C14', // الخلفية الأساسية العميقة للشاشة
  background: '#0A0C14',
  bgDeep: '#05060A', // خلفية الطبقات السفلى الأغمق
  surface: '#131625', // خلفية الكروت والطبقات الزجاجية الأساسية
  surfaceLight: '#1C2035', // كروت أفتح بارزة
  surfaceAlt: '#171A2B', // كارد بديل بتباين هادئ

  // ── Dark Accent (Header / Night Cards) ───────────────────────────────────
  bgDark: '#131625',
  surfaceDark: '#1C2035',
  surfaceDarkHigh: '#262B47',

  // ── Glassmorphic Shadow & Glow Colors ────────────────────────────────────
  shadowLight: 'rgba(255, 255, 255, 0.05)',
  shadowDark: '#000000',
  shadowDarkSoft: 'rgba(0, 0, 0, 0.6)',

  // ── Primary & Accents (Neon Cyber / Liquid Glow) ─────────────────────────
  primary: '#3B82F6', // أزرق سيبراني ناصع
  primaryDim: 'rgba(59, 130, 246, 0.15)',
  primaryDark: '#1D4ED8',
  primaryGlow: 'rgba(59, 130, 246, 0.4)',

  accent: '#8B5CF6', // بنفسجي نيون مائع
  accentDim: 'rgba(139, 92, 246, 0.15)',

  // ── Glow & Light Variants ────────────────────────────────────────────────
  successGlow: 'rgba(16, 185, 129, 0.4)',
  warningGlow: 'rgba(245, 158, 11, 0.4)',
  dangerGlow: 'rgba(239, 68, 68, 0.4)',
  pendingGlow: 'rgba(239, 68, 68, 0.4)',

  successLight: 'rgba(16, 185, 129, 0.15)',
  warningLight: 'rgba(245, 158, 11, 0.15)',
  dangerLight: 'rgba(239, 68, 68, 0.15)',

  // ── Pastels & Folder Colors ──────────────────────────────────────────────
  folderYellow: '#FBBF24',
  folderOrange: '#FB923C',
  pastelCyan: '#22D3EE',
  pastelPink: '#F43F5E',
  pastelPurple: '#C084FC',
  pastelGreen: '#34D399',

  // ── Status ───────────────────────────────────────────────────────────────
  success: '#10B981',
  successDim: 'rgba(16, 185, 129, 0.15)',

  warning: '#F59E0B',
  warningDim: 'rgba(245, 158, 11, 0.15)',

  danger: '#EF4444',
  dangerDim: 'rgba(239, 68, 68, 0.15)',

  info: '#38BDF8',
  infoDim: 'rgba(56, 189, 248, 0.15)',

  // ── Machine Status ───────────────────────────────────────────────────────
  running: '#10B981',
  stopped: '#94A3B8',
  maintenance: '#F59E0B',
  pending: '#EF4444',
  pendingDim: 'rgba(239, 68, 68, 0.15)',

  // ── Text ─────────────────────────────────────────────────────────────────
  textPrimary: '#F8FAFC', // نص أساسي ناصع للثيم الداكن
  textSecondary: '#94A3B8', // نص ثانوي
  textSub: '#94A3B8',
  textMuted: '#64748B', // نص باهت

  textLight: '#FFFFFF', // نص أبيض ناصع
  textLightMuted: '#CBD5E1',

  white: '#FFFFFF',
  black: '#000000',

  // ── Borders & Glassmorphic Highlights ────────────────────────────────────
  border: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.12)',
  borderDark: 'rgba(255, 255, 255, 0.05)',
  glassBorderHigh: 'rgba(255, 255, 255, 0.22)', // لمعان الحواف الزجاجية العليا

  // ── Gradients (Liquid Neon & Dark) ───────────────────────────────────────
  gradientDark: ['#131625', '#0D0F1B'] as [string, string],
  gradientPrimary: ['#3B82F6', '#1D4ED8'] as [string, string],
  gradientViolet: ['#8B5CF6', '#6D28D9'] as [string, string],
  gradientDanger: ['#EF4444', '#B91C1C'] as [string, string],
  gradientSuccess: ['#10B981', '#047857'] as [string, string],
  gradientGlass: ['rgba(255, 255, 255, 0.07)', 'rgba(255, 255, 255, 0.02)'] as [string, string],

  transparent: 'transparent',
  overlay: 'rgba(5, 6, 10, 0.75)',
};

export default Colors;