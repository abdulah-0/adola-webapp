// Web-specific style utilities
import { Platform, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Check if running on web
export const isWeb = Platform.OS === 'web';

// Get device type for responsive design
export const getDeviceType = () => {
  if (!isWeb) return 'mobile';
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
};

// Web-specific scaling factors
export const webScale = {
  // Reduce sizes for web to fit more content
  cardSize: isWeb ? 0.7 : 1,
  fontSize: isWeb ? 0.85 : 1,
  padding: isWeb ? 0.8 : 1,
  margin: isWeb ? 0.7 : 1,
  iconSize: isWeb ? 0.8 : 1,
  spacing: isWeb ? 0.75 : 1,
};

// Responsive breakpoints
export const breakpoints = {
  mobile: 768,
  tablet: 1024,
  desktop: 1200,
};

// Get responsive value based on screen size
export const getResponsiveValue = (mobile: number, tablet?: number, desktop?: number) => {
  if (!isWeb) return mobile;
  
  const deviceType = getDeviceType();
  switch (deviceType) {
    case 'desktop':
      return desktop || tablet || mobile;
    case 'tablet':
      return tablet || mobile;
    default:
      return mobile;
  }
};

// Web-specific style modifiers
export const webStyleModifiers = {
  // Scale down card dimensions for web
  scaleCard: (originalStyle: any) => {
    if (!isWeb) return originalStyle;
    
    return {
      ...originalStyle,
      width: originalStyle.width ? originalStyle.width * webScale.cardSize : undefined,
      height: originalStyle.height ? originalStyle.height * webScale.cardSize : undefined,
      minWidth: originalStyle.minWidth ? originalStyle.minWidth * webScale.cardSize : undefined,
      minHeight: originalStyle.minHeight ? originalStyle.minHeight * webScale.cardSize : undefined,
    };
  },

  // Scale down font sizes for web
  scaleFont: (originalStyle: any) => {
    if (!isWeb) return originalStyle;
    
    return {
      ...originalStyle,
      fontSize: originalStyle.fontSize ? originalStyle.fontSize * webScale.fontSize : undefined,
    };
  },

  // Scale down padding and margins for web
  scaleSpacing: (originalStyle: any) => {
    if (!isWeb) return originalStyle;
    
    return {
      ...originalStyle,
      padding: originalStyle.padding ? originalStyle.padding * webScale.padding : undefined,
      paddingHorizontal: originalStyle.paddingHorizontal ? originalStyle.paddingHorizontal * webScale.padding : undefined,
      paddingVertical: originalStyle.paddingVertical ? originalStyle.paddingVertical * webScale.padding : undefined,
      margin: originalStyle.margin ? originalStyle.margin * webScale.margin : undefined,
      marginHorizontal: originalStyle.marginHorizontal ? originalStyle.marginHorizontal * webScale.margin : undefined,
      marginVertical: originalStyle.marginVertical ? originalStyle.marginVertical * webScale.margin : undefined,
    };
  },

  // Create responsive grid layout for web
  createWebGrid: (itemsPerRow: { mobile: number; tablet: number; desktop: number }) => {
    if (!isWeb) return {};
    
    const deviceType = getDeviceType();
    const columns = itemsPerRow[deviceType as keyof typeof itemsPerRow] || itemsPerRow.mobile;
    
    return {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      justifyContent: 'space-between' as const,
      width: '100%',
      // Each item takes up 1/columns of the width minus some margin
      itemWidth: `${(100 / columns) - 2}%`,
    };
  },

  // Web-specific container styles
  webContainer: {
    maxWidth: isWeb ? 1200 : undefined,
    alignSelf: isWeb ? 'center' as const : undefined,
    width: isWeb ? '100%' : undefined,
  },

  // Compact layout for web
  compactLayout: isWeb ? {
    paddingHorizontal: 12,
    paddingVertical: 8,
  } : {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
};

// Web-specific responsive styles
export const createWebResponsiveStyles = (styles: any) => {
  if (!isWeb) return styles;
  
  const deviceType = getDeviceType();
  
  // Apply different styles based on device type
  const responsiveStyles = { ...styles };
  
  // Desktop optimizations
  if (deviceType === 'desktop') {
    responsiveStyles.container = {
      ...responsiveStyles.container,
      maxWidth: 1200,
      alignSelf: 'center',
      paddingHorizontal: 24,
    };
  }
  
  // Tablet optimizations
  if (deviceType === 'tablet') {
    responsiveStyles.container = {
      ...responsiveStyles.container,
      paddingHorizontal: 20,
    };
  }
  
  return responsiveStyles;
};

// Helper to create web-optimized dimensions
export const webDimensions = {
  // Game card dimensions for different screen sizes
  gameCard: {
    width: getResponsiveValue(160, 140, 120),
    height: getResponsiveValue(200, 180, 160),
  },
  
  // Icon sizes
  icon: {
    small: getResponsiveValue(20, 18, 16),
    medium: getResponsiveValue(24, 22, 20),
    large: getResponsiveValue(32, 28, 24),
  },
  
  // Font sizes
  fontSize: {
    small: getResponsiveValue(12, 11, 10),
    medium: getResponsiveValue(14, 13, 12),
    large: getResponsiveValue(16, 15, 14),
    title: getResponsiveValue(20, 18, 16),
  },
  
  // Spacing
  spacing: {
    xs: getResponsiveValue(4, 3, 2),
    sm: getResponsiveValue(8, 6, 4),
    md: getResponsiveValue(12, 10, 8),
    lg: getResponsiveValue(16, 14, 12),
    xl: getResponsiveValue(20, 18, 16),
  },
};

// Grid layout helper
export const createGridLayout = (itemsPerRow: number) => {
  if (!isWeb) return {};
  
  return {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    justifyContent: 'space-between' as const,
    gap: webDimensions.spacing.sm,
  };
};

// Web-specific game card styles
export const webGameCardStyles = {
  width: webDimensions.gameCard.width,
  height: webDimensions.gameCard.height,
  marginBottom: webDimensions.spacing.md,
  marginHorizontal: webDimensions.spacing.xs,
};
