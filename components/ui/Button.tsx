// Premium Button Component for Adola App
import React, { useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/Colors';
import { rf, rs } from '../../utils/responsive';

interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'gradient';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
  fullWidth = false,
}: ButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: rs(12),
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    };

    // Size styles
    switch (size) {
      case 'small':
        baseStyle.paddingHorizontal = rs(16);
        baseStyle.paddingVertical = rs(8);
        baseStyle.minHeight = rs(36);
        break;
      case 'large':
        baseStyle.paddingHorizontal = rs(32);
        baseStyle.paddingVertical = rs(16);
        baseStyle.minHeight = rs(56);
        break;
      default: // medium
        baseStyle.paddingHorizontal = rs(24);
        baseStyle.paddingVertical = rs(12);
        baseStyle.minHeight = rs(44);
    }

    // Variant styles
    switch (variant) {
      case 'primary':
        baseStyle.backgroundColor = Colors.ui.button.primary;
        Object.assign(baseStyle, Colors.shadows.neonGlow);
        break;
      case 'secondary':
        baseStyle.backgroundColor = Colors.ui.button.secondary;
        Object.assign(baseStyle, Colors.shadows.pinkGlow);
        break;
      case 'outline':
        baseStyle.backgroundColor = 'transparent';
        baseStyle.borderWidth = 2;
        baseStyle.borderColor = Colors.primary.neonCyan;
        break;
      case 'ghost':
        baseStyle.backgroundColor = 'transparent';
        break;
      case 'gradient':
        baseStyle.backgroundColor = 'transparent';
        break;
    }

    // Full width
    if (fullWidth) {
      baseStyle.width = '100%';
    }

    // Disabled state
    if (disabled || loading) {
      baseStyle.opacity = 0.5;
    }

    return baseStyle;
  };

  const getTextStyle = (): TextStyle => {
    const baseTextStyle: TextStyle = {
      fontWeight: 'bold',
      textAlign: 'center',
    };

    // Size styles
    switch (size) {
      case 'small':
        baseTextStyle.fontSize = rf(14);
        break;
      case 'large':
        baseTextStyle.fontSize = rf(18);
        break;
      default: // medium
        baseTextStyle.fontSize = rf(16);
    }

    // Variant styles
    switch (variant) {
      case 'primary':
      case 'secondary':
      case 'gradient':
        baseTextStyle.color = Colors.primary.background;
        break;
      case 'outline':
      case 'ghost':
        baseTextStyle.color = Colors.primary.neonCyan;
        break;
    }

    return baseTextStyle;
  };

  const buttonStyle = [getButtonStyle(), style];
  const finalTextStyle = [getTextStyle(), textStyle];

  if (variant === 'gradient') {
    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled || loading}
          activeOpacity={0.8}
          style={buttonStyle}
        >
          <LinearGradient
            colors={Colors.gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[StyleSheet.absoluteFill, { borderRadius: rs(12) }]}
          />
          {icon && <Text style={[finalTextStyle, { marginRight: rs(8) }]}>{icon}</Text>}
          <Text style={finalTextStyle}>
            {loading ? 'Loading...' : title}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={buttonStyle}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={0.8}
      >
        {icon && <Text style={[finalTextStyle, { marginRight: rs(8) }]}>{icon}</Text>}
        <Text style={finalTextStyle}>
          {loading ? 'Loading...' : title}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}
