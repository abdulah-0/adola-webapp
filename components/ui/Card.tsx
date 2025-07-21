// Premium Card Component for Adola App
import React, { useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/Colors';
import { rs } from '../../utils/responsive';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'outlined' | 'neon' | 'gradient' | 'glass' | 'premium';
  padding?: 'none' | 'small' | 'medium' | 'large' | 'xl';
  onPress?: () => void;
  disabled?: boolean;
  glow?: boolean;
  animated?: boolean;
  borderRadius?: number;
}

export default function Card({
  children,
  style,
  variant = 'default',
  padding = 'medium',
  onPress,
  disabled = false,
  glow = false,
  animated = false,
  borderRadius = 20,
}: CardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Glow animation
  useEffect(() => {
    if (glow && !disabled) {
      const glowAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: false,
          }),
        ])
      );
      glowAnimation.start();
      return () => glowAnimation.stop();
    }
  }, [glow, disabled]);

  const handlePressIn = () => {
    if (animated && onPress) {
      Animated.spring(scaleAnim, {
        toValue: 0.98,
        useNativeDriver: true,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (animated && onPress) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    }
  };
  const getCardStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: rs(borderRadius),
      backgroundColor: Colors.primary.card,
      overflow: 'hidden',
    };

    // Padding styles
    switch (padding) {
      case 'none':
        break;
      case 'small':
        baseStyle.padding = rs(12);
        break;
      case 'large':
        baseStyle.padding = rs(24);
        break;
      case 'xl':
        baseStyle.padding = rs(32);
        break;
      default: // medium
        baseStyle.padding = rs(20);
    }

    // Variant styles
    switch (variant) {
      case 'elevated':
        Object.assign(baseStyle, Colors.shadows.large);
        baseStyle.backgroundColor = Colors.primary.surface;
        break;
      case 'outlined':
        baseStyle.borderWidth = 1;
        baseStyle.borderColor = Colors.primary.border;
        baseStyle.backgroundColor = Colors.primary.surface;
        break;
      case 'neon':
        baseStyle.borderWidth = 2;
        baseStyle.borderColor = Colors.primary.neonCyan;
        Object.assign(baseStyle, Colors.shadows.neonGlow);
        break;
      case 'glass':
        baseStyle.backgroundColor = Colors.primary.surface + '80';
        baseStyle.borderWidth = 1;
        baseStyle.borderColor = Colors.primary.border + '40';
        Object.assign(baseStyle, Colors.shadows.medium);
        break;
      case 'premium':
        baseStyle.backgroundColor = Colors.primary.surface;
        baseStyle.borderWidth = 1;
        baseStyle.borderColor = Colors.primary.gold + '40';
        Object.assign(baseStyle, Colors.shadows.goldGlow);
        break;
      case 'gradient':
        baseStyle.backgroundColor = 'transparent';
        break;
      default: // default
        baseStyle.borderWidth = 1;
        baseStyle.borderColor = Colors.primary.border;
        Object.assign(baseStyle, Colors.shadows.small);
    }

    // Glow effect - remove animated value from style to avoid type error
    if (glow) {
      baseStyle.shadowOpacity = 0.6; // Use static value instead of animated
    }

    // Disabled state
    if (disabled) {
      baseStyle.opacity = 0.5;
    }

    return baseStyle;
  };

  const CardComponent = onPress ? TouchableOpacity : View;
  const cardStyle = [getCardStyle(), style];
  const animatedStyle = animated ? {
    transform: [{ scale: scaleAnim }]
  } : {};

  if (variant === 'gradient') {
    return (
      <Animated.View style={[animatedStyle]}>
        <CardComponent
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled}
          activeOpacity={onPress ? 0.9 : 1}
          style={cardStyle}
        >
          <LinearGradient
            colors={Colors.gradients.card}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius }]}
          />
          <View style={styles.gradientContent}>
            {children}
          </View>
        </CardComponent>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[animatedStyle]}>
      <CardComponent
        style={cardStyle}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={onPress ? 0.9 : 1}
      >
        {children}
      </CardComponent>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  gradientContent: {
    flex: 1,
  },
});
