// Adola Gaming Platform Promotional Banner Component
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

interface AdolaPromoBannerProps {
  onDepositPress?: () => void;
  onReferralPress?: () => void;
  onSignupPress?: () => void;
}

export default function AdolaPromoBanner({ 
  onDepositPress, 
  onReferralPress, 
  onSignupPress 
}: AdolaPromoBannerProps) {
  const router = useRouter();

  const handleDepositPress = () => {
    if (onDepositPress) {
      onDepositPress();
    } else {
      router.push('/wallet');
    }
  };

  const handleReferralPress = () => {
    if (onReferralPress) {
      onReferralPress();
    } else {
      router.push('/referral');
    }
  };

  const handleSignupPress = () => {
    if (onSignupPress) {
      onSignupPress();
    } else {
      router.push('/auth/signup');
    }
  };

  return (
    <View style={styles.container}>
      {/* Main Promotional Banner */}
      <View style={styles.mainBanner}>
        <View style={styles.bannerContent}>
          <View style={styles.bannerLeft}>
            <Text style={styles.bannerIcon}>🎁</Text>
            <View>
              <Text style={styles.bannerTitle}>WELCOME BONUS</Text>
              <Text style={styles.bannerAmount}>PKR 50 FREE</Text>
              <Text style={styles.bannerSubtext}>Plus 5% on every deposit</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.bannerButton}
            onPress={handleSignupPress}
            activeOpacity={0.8}
          >
            <Text style={styles.bannerButtonText}>Claim Now</Text>
            <Ionicons name="arrow-forward" size={16} color={Colors.primary.background} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Promotional Cards Grid */}
      <View style={styles.promoGrid}>
        {/* Deposit Bonus Card */}
        <View style={[styles.promoCard, { borderColor: Colors.primary.neonCyan }]}>
          <View style={styles.promoHeader}>
            <Text style={styles.promoIcon}>💰</Text>
            <Text style={[styles.promoTitle, { color: Colors.primary.neonCyan }]}>
              5% Deposit Bonus
            </Text>
          </View>
          <Text style={styles.promoDescription}>
            Get automatic 5% bonus on every deposit you make. No minimum amount required.
          </Text>
          <TouchableOpacity 
            style={[styles.promoButton, { backgroundColor: Colors.primary.neonCyan }]}
            onPress={handleDepositPress}
            activeOpacity={0.8}
          >
            <Text style={styles.promoButtonText}>Deposit Now</Text>
          </TouchableOpacity>
        </View>

        {/* Referral Bonus Card */}
        <View style={[styles.promoCard, { borderColor: Colors.primary.hotPink }]}>
          <View style={styles.promoHeader}>
            <Text style={styles.promoIcon}>👥</Text>
            <Text style={[styles.promoTitle, { color: Colors.primary.hotPink }]}>
              Referral Bonuses
            </Text>
          </View>
          <Text style={styles.promoDescription}>
            Earn money by referring friends! Get bonuses when your friends sign up and play.
          </Text>
          <TouchableOpacity 
            style={[styles.promoButton, { backgroundColor: Colors.primary.hotPink }]}
            onPress={handleReferralPress}
            activeOpacity={0.8}
          >
            <Text style={styles.promoButtonText}>Refer Friends</Text>
          </TouchableOpacity>
        </View>

        {/* Secure Gaming Card */}
        <View style={[styles.promoCard, { borderColor: Colors.primary.gold }]}>
          <View style={styles.promoHeader}>
            <Text style={styles.promoIcon}>🛡️</Text>
            <Text style={[styles.promoTitle, { color: Colors.primary.gold }]}>
              Secure Gaming
            </Text>
          </View>
          <Text style={styles.promoDescription}>
            24/7 secure gaming with admin-approved deposits and fast withdrawals.
          </Text>
          <TouchableOpacity 
            style={[styles.promoButton, { backgroundColor: Colors.primary.gold }]}
            onPress={() => router.push('/games')}
            activeOpacity={0.8}
          >
            <Text style={styles.promoButtonText}>Play Now</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Payment Methods Section */}
      <View style={styles.paymentSection}>
        <Text style={styles.paymentTitle}>Payment Methods</Text>
        <Text style={styles.paymentSubtitle}>Bank Transfer via UBL (United Bank Limited)</Text>
        
        <View style={styles.bankAccounts}>
          <View style={styles.bankAccount}>
            <View style={styles.bankHeader}>
              <Ionicons name="person" size={20} color={Colors.primary.hotPink} />
              <Text style={styles.bankName}>Account 2</Text>
            </View>
            <Text style={styles.bankDetails}>IBAN: PK38UNIL0109000320036376</Text>
            <Text style={styles.bankDetails}>Account: 0109000320036376</Text>
          </View>
        </View>

        <View style={styles.paymentFeatures}>
          <View style={styles.paymentFeature}>
            <Ionicons name="flash" size={16} color={Colors.primary.neonCyan} />
            <Text style={styles.paymentFeatureText}>Instant Processing</Text>
          </View>
          <View style={styles.paymentFeature}>
            <Ionicons name="shield-checkmark" size={16} color={Colors.primary.hotPink} />
            <Text style={styles.paymentFeatureText}>Admin Approved</Text>
          </View>
          <View style={styles.paymentFeature}>
            <Ionicons name="time" size={16} color={Colors.primary.gold} />
            <Text style={styles.paymentFeatureText}>24/7 Support</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.primary.background,
    paddingVertical: 24,
    paddingHorizontal: 24,
  },
  mainBanner: {
    backgroundColor: `${Colors.primary.neonCyan}15`,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.primary.neonCyan,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bannerIcon: {
    fontSize: 40,
    marginRight: 16,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 4,
  },
  bannerAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary.neonCyan,
    marginBottom: 2,
  },
  bannerSubtext: {
    fontSize: 12,
    color: Colors.primary.textSecondary,
  },
  bannerButton: {
    backgroundColor: Colors.primary.neonCyan,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bannerButtonText: {
    color: Colors.primary.background,
    fontSize: 14,
    fontWeight: 'bold',
  },
  promoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 32,
  },
  promoCard: {
    backgroundColor: Colors.primary.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    flex: 1,
    minWidth: 250,
  },
  promoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  promoIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  promoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  promoDescription: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  promoButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  promoButtonText: {
    color: Colors.primary.background,
    fontSize: 14,
    fontWeight: 'bold',
  },
  paymentSection: {
    backgroundColor: Colors.primary.surface,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  paymentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 4,
  },
  paymentSubtitle: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
    marginBottom: 16,
  },
  bankAccounts: {
    gap: 16,
    marginBottom: 16,
  },
  bankAccount: {
    backgroundColor: Colors.primary.background,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  bankHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  bankName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginLeft: 8,
  },
  bankDetails: {
    fontSize: 12,
    color: Colors.primary.textSecondary,
    marginBottom: 2,
  },
  paymentFeatures: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.primary.border,
  },
  paymentFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  paymentFeatureText: {
    fontSize: 12,
    color: Colors.primary.textSecondary,
  },
});
