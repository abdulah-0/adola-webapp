// GameCard Component for Adola App - Simple Game Display
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/Colors';
import Card from './ui/Card';
import { rf, rs } from '../utils/responsive';
import { isWeb, webDimensions, webStyleModifiers } from '../utils/webStyles';

interface GameCardProps {
  title: string;
  icon: string;
  description?: string;
  onPress?: () => void;
  color?: string;
}

export default function GameCard({
  title,
  icon,
  description,
  onPress,
  color = Colors.primary.neonCyan
}: GameCardProps) {
  return (
    <Card
      style={[styles.container, { borderColor: color }]}
      variant="outlined"
      onPress={onPress}
    >
      <View style={styles.content}>
        <Text style={styles.gameIcon}>{icon}</Text>
        <Text style={[styles.gameTitle, { color }]}>{title}</Text>
        {description && (
          <Text style={styles.gameDescription}>{description}</Text>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 2,
    borderRadius: isWeb ? webDimensions.spacing.sm : rs(12),
    backgroundColor: Colors.primary.surface,
    height: isWeb ? webDimensions.gameCard.height : rs(140),
    width: isWeb ? webDimensions.gameCard.width : undefined,
    flex: isWeb ? 0 : 1, // Fixed width on web, flexible on mobile
    marginHorizontal: isWeb ? webDimensions.spacing.xs : 0,
  },
  content: {
    alignItems: 'center',
    padding: isWeb ? webDimensions.spacing.sm : rs(12),
    justifyContent: 'space-between',
    flex: 1,
  },
  gameIcon: {
    fontSize: isWeb ? webDimensions.fontSize.title : rf(24),
    marginBottom: isWeb ? webDimensions.spacing.xs : rs(6),
  },
  gameTitle: {
    fontSize: isWeb ? webDimensions.fontSize.small : rf(13),
    fontWeight: 'bold',
    marginBottom: isWeb ? webDimensions.spacing.xs : rs(4),
    textAlign: 'center',
    numberOfLines: 1,
  },
  gameDescription: {
    fontSize: isWeb ? webDimensions.fontSize.small - 1 : rf(10),
    color: Colors.primary.textSecondary,
    textAlign: 'center',
    lineHeight: isWeb ? webDimensions.fontSize.small + 1 : rf(12),
    numberOfLines: 2,
  },
});
