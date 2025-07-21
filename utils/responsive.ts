// Responsive utilities for Adola App
import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base dimensions (iPhone 14 Pro)
const BASE_WIDTH = 393;
const BASE_HEIGHT = 852;

// Responsive width percentage
export const wp = (percentage: number): number => {
  const value = (percentage * SCREEN_WIDTH) / 100;
  return Math.round(PixelRatio.roundToNearestPixel(value));
};

// Responsive height percentage
export const hp = (percentage: number): number => {
  const value = (percentage * SCREEN_HEIGHT) / 100;
  return Math.round(PixelRatio.roundToNearestPixel(value));
};

// Responsive font scaling
export const rf = (size: number): number => {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  const newSize = size * scale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

// Responsive size scaling
export const rs = (size: number): number => {
  const scale = Math.min(SCREEN_WIDTH / BASE_WIDTH, SCREEN_HEIGHT / BASE_HEIGHT);
  const newSize = size * scale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

// Responsive width scaling
export const rw = (percentage: number): number => {
  return (percentage * SCREEN_WIDTH) / 100;
};

// Responsive height scaling
export const rh = (percentage: number): number => {
  return (percentage * SCREEN_HEIGHT) / 100;
};

// Screen dimensions
export const screenData = {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
  isSmallDevice: SCREEN_WIDTH < 375,
  isLargeDevice: SCREEN_WIDTH > 414,
  isTablet: SCREEN_WIDTH > 768,
};

// Device type detection
export const deviceType = {
  isSmall: SCREEN_WIDTH < 375,
  isMedium: SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 414,
  isLarge: SCREEN_WIDTH >= 414,
  isTablet: SCREEN_WIDTH > 768,
};

// Responsive spacing system
export const spacing = {
  xs: rs(4),
  sm: rs(8),
  md: rs(16),
  lg: rs(24),
  xl: rs(32),
  xxl: rs(48),
};

// Responsive border radius
export const borderRadius = {
  xs: rs(4),
  sm: rs(8),
  md: rs(12),
  lg: rs(16),
  xl: rs(20),
  xxl: rs(24),
  round: rs(50),
};

// Typography scale
export const typography = {
  h1: rf(32),
  h2: rf(28),
  h3: rf(24),
  h4: rf(20),
  h5: rf(18),
  h6: rf(16),
  body: rf(14),
  caption: rf(12),
  small: rf(10),
};

// Icon sizes
export const iconSizes = {
  xs: rs(12),
  sm: rs(16),
  md: rs(20),
  lg: rs(24),
  xl: rs(32),
  xxl: rs(48),
};

// Button heights
export const buttonHeights = {
  sm: rs(32),
  md: rs(44),
  lg: rs(56),
  xl: rs(64),
};

// Card dimensions
export const cardDimensions = {
  gameCard: {
    width: rw(42),
    height: rs(120),
  },
  featureCard: {
    width: rw(90),
    height: rs(200),
  },
  statsCard: {
    width: rw(45),
    height: rs(80),
  },
};
