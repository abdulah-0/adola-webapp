/**
 * Adola App Color Scheme - Premium Dark + Neon Theme
 * Enhanced with gradients, shadows, and premium effects
 */

// Core neon color palette
const neonCyan = '#00FFC6';
const neonCyanDark = '#00CC9F';
const neonCyanLight = '#33FFD1';

const hotPink = '#FF5C8A';
const hotPinkDark = '#E5396B';
const hotPinkLight = '#FF7FA3';

const gold = '#FFDD00';
const goldDark = '#E6C700';
const goldLight = '#FFE533';

// Enhanced background system
const darkBackground = '#0A0A0A';
const darkSurface = '#151515';
const darkCard = '#1A1A1A';
const darkBorder = '#2A2A2A';

export const Colors = {
  // Enhanced primary theme colors
  primary: {
    background: darkBackground,
    surface: darkSurface,
    card: darkCard,
    border: darkBorder,

    // Neon colors with variants
    neonCyan: neonCyan,
    neonCyanDark: neonCyanDark,
    neonCyanLight: neonCyanLight,

    hotPink: hotPink,
    hotPinkDark: hotPinkDark,
    hotPinkLight: hotPinkLight,

    gold: gold,
    goldDark: goldDark,
    goldLight: goldLight,

    // Text hierarchy
    text: '#FFFFFF',
    textSecondary: '#E0E0E0',
    textMuted: '#A0A0A0',
    textDisabled: '#666666',
  },

  // Legacy support for existing components
  light: {
    text: '#FFFFFF',
    background: darkBackground,
    tint: neonCyan,
    icon: '#CCCCCC',
    tabIconDefault: '#888888',
    tabIconSelected: neonCyan,
  },
  dark: {
    text: '#FFFFFF',
    background: darkBackground,
    tint: neonCyan,
    icon: '#CCCCCC',
    tabIconDefault: '#888888',
    tabIconSelected: neonCyan,
  },

  // Game-specific colors
  game: {
    success: neonCyan,
    warning: gold,
    danger: hotPink,
    info: '#00D4FF',
  },

  // Enhanced UI component colors
  ui: {
    card: darkCard,
    surface: darkSurface,
    border: darkBorder,
    shadow: '#000000',
    overlay: 'rgba(0, 0, 0, 0.85)',
    modalOverlay: 'rgba(0, 0, 0, 0.9)',

    // Button system
    button: {
      primary: neonCyan,
      primaryHover: neonCyanDark,
      secondary: hotPink,
      secondaryHover: hotPinkDark,
      accent: gold,
      accentHover: goldDark,
      disabled: '#444444',
      ghost: 'transparent',
    },

    // Input system
    input: {
      background: darkSurface,
      border: darkBorder,
      borderFocus: neonCyan,
      borderError: hotPink,
      placeholder: '#666666',
    },

    // Status colors
    status: {
      success: neonCyan,
      warning: gold,
      error: hotPink,
      info: '#00D4FF',
      neutral: '#888888',
    },
  },

  // Gradient definitions
  gradients: {
    primary: [neonCyan, hotPink],
    secondary: [hotPink, gold],
    accent: [gold, neonCyan],
    dark: [darkBackground, darkSurface],
    card: [darkCard, darkSurface],

    // Game-specific gradients
    win: [neonCyan, neonCyanLight],
    loss: [hotPink, hotPinkDark],
    jackpot: [gold, goldLight],

    // Directional gradients
    vertical: {
      primary: [neonCyan, hotPink],
      secondary: [hotPink, gold],
      dark: [darkBackground, darkCard],
    },

    radial: {
      glow: [neonCyan + '40', neonCyan + '00'],
      spotlight: [gold + '30', gold + '00'],
      danger: [hotPink + '40', hotPink + '00'],
    },
  },

  // Shadow definitions
  shadows: {
    small: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 2,
    },
    medium: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    large: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius: 16,
      elevation: 8,
    },

    // Neon glow effects
    neonGlow: {
      shadowColor: neonCyan,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 12,
      elevation: 12,
    },

    goldGlow: {
      shadowColor: gold,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: 10,
      elevation: 10,
    },

    pinkGlow: {
      shadowColor: hotPink,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.7,
      shadowRadius: 8,
      elevation: 8,
    },
  },

  // Animation colors
  animations: {
    pulse: [neonCyan + '80', neonCyan + '20'],
    shimmer: [gold + '00', gold + '80', gold + '00'],
    loading: [darkBorder, '#444444', darkBorder],
  },
};
