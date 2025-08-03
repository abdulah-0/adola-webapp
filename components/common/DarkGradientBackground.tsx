import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface DarkGradientBackgroundProps {
  children?: React.ReactNode;
  style?: ViewStyle;
}

/**
 * DarkGradientBackground - A reusable dark-themed gradient background component
 * 
 * Features:
 * - Deep dark color palette with smooth transitions
 * - Diagonal gradient from top-left to bottom-right
 * - Full screen coverage with absolute positioning
 * - Cross-platform compatibility (iOS, Android, Web)
 * - Accepts children to render content on top
 * 
 * @param children - Content to render on top of the gradient
 * @param style - Optional additional styles to apply
 */
const DarkGradientBackground: React.FC<DarkGradientBackgroundProps> = ({ 
  children, 
  style 
}) => {
  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f3460', '#0d1b2a']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.gradient, style]}
    >
      {children}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    flex: 1,
  },
});

export default DarkGradientBackground;
