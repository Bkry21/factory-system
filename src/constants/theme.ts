import Colors from './colors';

const Theme = {
  colors: Colors,

  // ── Typography ────────────────────────────────────────────────────────────
  fonts: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },

  fontSize: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    hero: 42,
  },

  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semiBold: '600' as const,
    bold: '700' as const,
    black: '900' as const,
  },

  // ── Spacing ───────────────────────────────────────────────────────────────
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },

  // ── Border Radius ─────────────────────────────────────────────────────────
  radius: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 22,
    xl: 30,
    xxl: 40,
    full: 999,
  },
  borderRadius: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 22,
    xl: 30,
    xxl: 40,
    full: 999,
  },

  // ── Component Sizes ───────────────────────────────────────────────────────
  sizes: {
    buttonHeight: 52,
    inputHeight: 52,
    iconSm: 18,
    iconMd: 22,
    iconLg: 28,
    headerHeight: 64,
    tabBarHeight: 64,
  },

  // ── Glassmorphic Shadows & Glows ──────────────────────────────────────────
  shadow: {
    sm: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 3,
    },
    md: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 14,
      elevation: 6,
    },
    lg: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.5,
      shadowRadius: 22,
      elevation: 10,
    },
    softDark: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.5,
      shadowRadius: 12,
      elevation: 5,
    },
    softLight: {
      shadowColor: '#FFFFFF',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 0,
    },
    darkCard: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.6,
      shadowRadius: 24,
      elevation: 12,
    },
    glowCyan: {
      shadowColor: Colors.pastelCyan,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 16,
      elevation: 8,
    },
  },

  shadows: {
    sm: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 3,
    },
    md: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 14,
      elevation: 6,
    },
    lg: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.5,
      shadowRadius: 22,
      elevation: 10,
    },
    softDark: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.5,
      shadowRadius: 12,
      elevation: 5,
    },
    softLight: {
      shadowColor: '#FFFFFF',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 0,
    },
    darkCard: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.6,
      shadowRadius: 24,
      elevation: 12,
    },
    glowCyan: {
      shadowColor: Colors.pastelCyan,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 16,
      elevation: 8,
    },
  },

  // ── Liquid Glassmorphic Presets ───────────────────────────────────────────
  neumorphic: {
    card: {
      backgroundColor: Colors.surface,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: Colors.borderLight,
    },
    darkCard: {
      backgroundColor: Colors.surfaceDark,
      borderRadius: 28,
      borderWidth: 1.2,
      borderColor: Colors.glassBorderHigh,
    },
    insetInput: {
      backgroundColor: Colors.bgDeep,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: Colors.border,
    },
  },

  // ── Navigation ────────────────────────────────────────────────────────────
  navigation: {
    headerStyle: {
      backgroundColor: Colors.bg,
    },
    headerTintColor: Colors.textPrimary,
    headerTitleStyle: {
      fontWeight: '600' as const,
      fontSize: 17,
      color: Colors.textPrimary,
    },
  },
};

// تصدير قيم فردية لتسريع الاستيراد (Named Exports)
export const shadows = Theme.shadows;
export const spacing = Theme.spacing;
export const fontSize = Theme.fontSize;
export const radius = Theme.radius;
export const borderRadius = Theme.borderRadius;

export default Theme;