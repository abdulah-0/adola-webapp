# DarkGradientBackground Component

A reusable dark-themed gradient background component for Expo React Native applications.

## Features

- ✅ Deep dark color palette with smooth transitions
- ✅ Diagonal gradient from top-left to bottom-right  
- ✅ Full screen coverage with absolute positioning
- ✅ Cross-platform compatibility (iOS, Android, Web)
- ✅ TypeScript support with proper type definitions
- ✅ Accepts children to render content on top
- ✅ Customizable with additional styles

## Installation

The component uses `expo-linear-gradient` which is already installed in your project.

## Usage

### Basic Usage

```tsx
import React from 'react';
import { View, Text } from 'react-native';
import DarkGradientBackground from '../components/common/DarkGradientBackground';

const MyScreen = () => {
  return (
    <View style={{ flex: 1 }}>
      <DarkGradientBackground>
        <Text style={{ color: 'white', fontSize: 24 }}>
          Your content here
        </Text>
      </DarkGradientBackground>
    </View>
  );
};
```

### With Custom Styles

```tsx
import DarkGradientBackground from '../components/common/DarkGradientBackground';

const MyScreen = () => {
  return (
    <DarkGradientBackground style={{ opacity: 0.9 }}>
      {/* Your content */}
    </DarkGradientBackground>
  );
};
```

### In a Screen Component

```tsx
import React from 'react';
import { ScrollView, Text, StyleSheet } from 'react-native';
import DarkGradientBackground from '../components/common/DarkGradientBackground';

const HomeScreen = () => {
  return (
    <DarkGradientBackground>
      <ScrollView style={styles.content}>
        <Text style={styles.title}>Welcome</Text>
        {/* More content */}
      </ScrollView>
    </DarkGradientBackground>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: 20,
    paddingTop: 60, // Account for status bar
  },
  title: {
    fontSize: 32,
    color: 'white',
    fontWeight: 'bold',
  },
});
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `children` | `React.ReactNode` | No | Content to render on top of the gradient |
| `style` | `ViewStyle` | No | Additional styles to apply to the gradient |

## Gradient Configuration

- **Colors**: `['#2e1a1a', '#3e1616', '#600f0f', '#2a0d0d']`
- **Direction**: Top-left (0,0) to bottom-right (1,1)
- **Positioning**: Absolute with full screen coverage
- **Color Stops**: 4 smooth transitions for depth

## Color Palette

| Color | Hex Code | Description |
|-------|----------|-------------|
| Deep Crimson | `#2e1a1a` | Primary dark red base |
| Dark Red | `#3e1616` | Secondary transition |
| Blood Red | `#600f0f` | Tertiary depth |
| Dark Maroon | `#2a0d0d` | Final dark tone |

## Best Practices

1. **Status Bar**: Add top padding to account for status bar on mobile
2. **Content Contrast**: Use light colors for text and UI elements
3. **Performance**: The component uses absolute positioning for optimal performance
4. **Accessibility**: Ensure sufficient contrast ratios for text content

## Example Implementation

See `components/examples/DarkGradientExample.tsx` for a complete implementation example.

## Platform Support

- ✅ iOS
- ✅ Android  
- ✅ Web (Expo Web)

## Dependencies

- `expo-linear-gradient`: ^14.1.5
- `react-native`: Compatible with current version
