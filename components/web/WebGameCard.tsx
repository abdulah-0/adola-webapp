// Web-specific Game Card Component
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';

interface WebGameCardProps {
  title: string;
  icon: string;
  description?: string;
  onPress?: () => void;
  color?: string;
  players?: string;
  status?: 'available' | 'offline';
  featured?: boolean;
}

export default function WebGameCard({
  title,
  icon,
  description,
  onPress,
  color = Colors.primary.neonCyan,
  players,
  status = 'available',
  featured = false
}: WebGameCardProps) {
  return (
    <TouchableOpacity
      style={[
        styles.container,
        { borderColor: color },
        featured && styles.featuredContainer
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: color }]}>
        <Text style={styles.gameIcon}>{icon}</Text>
        <View style={styles.statusContainer}>
          <View style={[
            styles.statusDot,
            { backgroundColor: status === 'available' ? '#4CAF50' : '#F44336' }
          ]} />
        </View>
      </View>

      {/* Body */}
      <View style={styles.body}>
        <Text style={[styles.title, { color }]} numberOfLines={1}>
          {title}
        </Text>
        {description && (
          <Text style={styles.description} numberOfLines={2}>
            {description}
          </Text>
        )}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.playersInfo}>
          <Ionicons name="people" size={14} color={Colors.primary.textSecondary} />
          <Text style={styles.playersText}>
            {players || '0'}
          </Text>
        </View>
        
        <View style={[styles.playButton, { backgroundColor: color }]}>
          <Ionicons name="play" size={16} color={Colors.primary.background} />
        </View>
      </View>

      {/* Featured Badge */}
      {featured && (
        <View style={[styles.featuredBadge, { backgroundColor: color }]}>
          <Text style={styles.featuredText}>HOT</Text>
        </View>
      )}

      {/* Hover Effect Overlay */}
      <View style={styles.hoverOverlay} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.primary.surface,
    borderRadius: 16,
    borderWidth: 2,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 200,
    // Web-specific hover effects
    ...(typeof window !== 'undefined' && {
      cursor: 'pointer',
      transition: 'all 0.2s ease-in-out',
      ':hover': {
        transform: 'translateY(-4px)',
        boxShadow: '0 8px 25px rgba(0, 255, 255, 0.3)',
      },
    }),
  },
  featuredContainer: {
    borderWidth: 3,
    shadowColor: Colors.primary.neonCyan,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 2,
    backgroundColor: Colors.primary.card,
  },
  gameIcon: {
    fontSize: 36,
  },
  statusContainer: {
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  body: {
    padding: 16,
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 13,
    color: Colors.primary.textSecondary,
    lineHeight: 18,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: Colors.primary.card,
    borderTopWidth: 1,
    borderTopColor: Colors.primary.border,
  },
  playersInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  playersText: {
    fontSize: 12,
    color: Colors.primary.textSecondary,
    fontWeight: '600',
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  featuredBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  featuredText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.primary.background,
  },
  hoverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    // Web-specific hover overlay
    ...(typeof window !== 'undefined' && {
      ':hover': {
        backgroundColor: 'rgba(0, 255, 255, 0.05)',
      },
    }),
  },
});
