// Adola Gaming Platform Hero Section Component
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';

const { width } = Dimensions.get('window');

interface AdolaHeroSectionProps {
  onCreateAccount?: () => void;
  onLearnMore?: () => void;
}

export default function AdolaHeroSection({ 
  onCreateAccount, 
  onLearnMore 
}: AdolaHeroSectionProps) {
  const router = useRouter();

  const handleCreateAccount = () => {
    if (onCreateAccount) {
      onCreateAccount();
    } else {
      router.push('/auth/signup');
    }
  };

  const handleLearnMore = () => {
    if (onLearnMore) {
      onLearnMore();
    } else {
      router.push('/games');
    }
  };

  return (
    <View style={styles.container}>
      {/* Main Hero Content */}
      <View style={styles.heroContent}>
        <View style={styles.titleSection}>
          <Text style={styles.gameIcon}>🎮</Text>
          <Text style={styles.title}>Adola Gaming Platform</Text>
          <Text style={styles.tagline}>Premium Mobile Gaming Experience</Text>
        </View>

        <View style={styles.promoSection}>
          <Text style={styles.promoTitle}>5% Deposit Bonus</Text>
          <Text style={styles.promoSubtitle}>Get automatic 5% bonus on every deposit</Text>
          <Text style={styles.promoDetails}>Plus PKR 50 welcome bonus for new users</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.button, styles.primaryButton]}
            onPress={handleCreateAccount}
            activeOpacity={0.8}
          >
            <Ionicons name="person-add" size={20} color={Colors.primary.background} />
            <Text style={styles.primaryButtonText}>Create Account</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.secondaryButton]}
            onPress={handleLearnMore}
            activeOpacity={0.8}
          >
            <Ionicons name="game-controller" size={20} color={Colors.primary.neonCyan} />
            <Text style={styles.secondaryButtonText}>Browse Games</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Stats */}
        <View style={styles.quickStats}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>19</Text>
            <Text style={styles.statLabel}>Games</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>12.4k</Text>
            <Text style={styles.statLabel}>Players</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>PKR 2.1M</Text>
            <Text style={styles.statLabel}>Payouts</Text>
          </View>
        </View>
      </View>

      {/* Features Highlight */}
      <View style={styles.featuresSection}>
        <View style={styles.feature}>
          <Ionicons name="shield-checkmark" size={24} color={Colors.primary.neonCyan} />
          <Text style={styles.featureText}>Secure Gaming</Text>
        </View>
        <View style={styles.feature}>
          <Ionicons name="flash" size={24} color={Colors.primary.hotPink} />
          <Text style={styles.featureText}>Instant Deposits</Text>
        </View>
        <View style={styles.feature}>
          <Ionicons name="people" size={24} color={Colors.primary.gold} />
          <Text style={styles.featureText}>Referral Bonuses</Text>
        </View>
        <View style={styles.feature}>
          <Ionicons name="cash" size={24} color={Colors.primary.neonCyan} />
          <Text style={styles.featureText}>Fast Withdrawals</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.primary.background,
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  heroContent: {
    alignItems: 'center',
    maxWidth: Math.min(width * 0.9, 600),
    width: '100%',
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  gameIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.primary.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 18,
    color: Colors.primary.textSecondary,
    textAlign: 'center',
  },
  promoSection: {
    alignItems: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: `${Colors.primary.neonCyan}10`,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.primary.neonCyan,
    width: '100%',
  },
  promoTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary.neonCyan,
    marginBottom: 8,
  },
  promoSubtitle: {
    fontSize: 16,
    color: Colors.primary.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  promoDetails: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
    width: '100%',
    justifyContent: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    minWidth: 140,
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: Colors.primary.neonCyan,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.primary.neonCyan,
  },
  primaryButtonText: {
    color: Colors.primary.background,
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButtonText: {
    color: Colors.primary.neonCyan,
    fontSize: 16,
    fontWeight: 'bold',
  },
  quickStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary.surface,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    width: '100%',
    marginBottom: 32,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.primary.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.primary.border,
    marginHorizontal: 16,
  },
  featuresSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 24,
    maxWidth: Math.min(width * 0.9, 600),
    width: '100%',
  },
  feature: {
    alignItems: 'center',
    minWidth: 120,
  },
  featureText: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
});
