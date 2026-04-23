// ─────────────────────────────────────────────────
// MeBot Design System — Tokens
// ─────────────────────────────────────────────────
import { Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

export const SCREEN = {
  width,
  height,
};

export const IS_SMALL_DEVICE = width < 375;

const getSafeArea = () => {
  try {
    return {
      top: Platform.OS === 'ios' ? 44 : 24,
      bottom: Platform.OS === 'ios' ? 34 : 0,
    };
  } catch (e) {
    return { top: 24, bottom: 0 };
  }
};

export const SAFE_AREA = getSafeArea();

export const LOGO = require('../../static/logo-branded.png');

export const BRAND = {
  // Core Colors
  primary:      '#155dfc',
  primaryDark:  '#1049c8',
  primaryLight: '#3b82f6',
  primaryGlow:  'rgba(21, 93, 252, 0.25)',

  // Semantic Colors
  success:      '#10b981',
  successGlow:  'rgba(16, 185, 129, 0.2)',
  danger:       '#ef4444',
  dangerGlow:   'rgba(239, 68, 68, 0.2)',
  warning:      '#f59e0b',
  warningGlow:  'rgba(245, 158, 11, 0.2)',
  info:         '#06b6d4',

  // Surfaces
  bg:           '#080f1e',
  surface:      '#0f172b',
  surfaceHigh:  '#1e293b',
  surfaceTop:   '#273548',
  card:         'rgba(30, 41, 59, 0.9)',
  cardBorder:   'rgba(255, 255, 255, 0.06)',

  // Text
  text:         '#f8fafc',
  textSub:      '#cbd5e1',
  muted:        '#64748b',
  placeholder:  '#4a5568',

  // Legacy (kept for backward compat)
  blue:         '#155dfc',
  blueLight:    '#3b82f6',
  yellow:       '#fac800',
  dark:         '#0f172b',
  darkCard:     '#1e293b',
};

export const RADIUS = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  24,
  full: 9999,
};

export const SPACING = {
  xs:   4,
  sm:   8,
  md:   16,
  lg:   24,
  xl:   32,
  xxl:  48,
};

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  primary: {
    shadowColor: '#155dfc',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
};
