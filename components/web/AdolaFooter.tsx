// Adola Gaming Platform Footer Component
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';

const { width } = Dimensions.get('window');

interface AdolaFooterProps {
  onContactPress?: () => void;
  onSupportPress?: () => void;
}

export default function AdolaFooter({ 
  onContactPress, 
  onSupportPress 
}: AdolaFooterProps) {
  const router = useRouter();

  const handleEmailPress = async () => {
    try {
      await Linking.openURL('mailto:support@adola.com');
    } catch (error) {
      console.log('Could not open email client');
    }
  };

  const handleContactPress = () => {
    if (onContactPress) {
      onContactPress();
    } else {
      router.push('/contact');
    }
  };

  const handleSupportPress = () => {
    if (onSupportPress) {
      onSupportPress();
    } else {
      router.push('/support');
    }
  };

  const footerSections = [
    {
      title: 'Support',
      items: [
        { label: '24/7 Support', action: handleSupportPress },
        { label: 'FAQ', action: () => router.push('/faq') },
        { label: 'Contact Us', action: handleContactPress },
        { label: 'Live Chat', action: handleSupportPress },
      ]
    },
    {
      title: 'Features',
      items: [
        { label: 'Referral System', action: () => router.push('/referral') },
        { label: '5% Deposit Bonus', action: () => router.push('/wallet') },
        { label: 'PKR 50 Welcome', action: () => router.push('/auth/signup') },
        { label: '19 Games', action: () => router.push('/games') },
      ]
    },
    {
      title: 'About',
      items: [
        { label: 'Terms & Conditions', action: () => router.push('/terms') },
        { label: 'Privacy Policy', action: () => router.push('/privacy') },
        { label: 'Responsible Gaming', action: () => router.push('/responsible-gaming') },
        { label: 'About Us', action: () => router.push('/about') },
      ]
    }
  ];

  return (
    <View style={styles.container}>
      {/* Main Footer Content */}
      <View style={styles.footerContent}>
        {/* Company Info */}
        <View style={styles.companySection}>
          <View style={styles.logoSection}>
            <Text style={styles.logo}>🎮 Adola Gaming</Text>
            <Text style={styles.tagline}>Premium Mobile Gaming Platform</Text>
          </View>
          <Text style={styles.description}>
            Experience the best mobile gaming with 19 exciting games, secure payments, 
            and instant bonuses. Join thousands of players winning real money every day.
          </Text>
          
          {/* Contact Info */}
          <View style={styles.contactInfo}>
            <TouchableOpacity style={styles.contactItem} onPress={handleEmailPress}>
              <Ionicons name="mail" size={16} color={Colors.primary.neonCyan} />
              <Text style={styles.contactText}>support@adola.com</Text>
            </TouchableOpacity>
            <View style={styles.contactItem}>
              <Ionicons name="time" size={16} color={Colors.primary.hotPink} />
              <Text style={styles.contactText}>24/7 Customer Support</Text>
            </View>
          </View>
        </View>

        {/* Footer Links */}
        <View style={styles.linksSection}>
          {footerSections.map((section, index) => (
            <View key={index} style={styles.linkColumn}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity 
                  key={itemIndex} 
                  style={styles.linkItem}
                  onPress={item.action}
                  activeOpacity={0.7}
                >
                  <Text style={styles.linkText}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      </View>

      {/* Payment Methods */}
      <View style={styles.paymentSection}>
        <Text style={styles.paymentTitle}>Payment Methods</Text>
        <Text style={styles.paymentSubtitle}>Bank Transfer via UBL (United Bank Limited)</Text>
        
        <View style={styles.bankAccounts}>
          <View style={styles.bankAccount}>
            <View style={styles.bankHeader}>
              <Ionicons name="person" size={18} color={Colors.primary.hotPink} />
              <Text style={styles.bankName}>Account 2</Text>
            </View>
            <Text style={styles.bankDetails}>IBAN: PK38UNIL01090003200363376</Text>
          </View>
        </View>

        <View style={styles.paymentFeatures}>
          <View style={styles.paymentFeature}>
            <Ionicons name="shield-checkmark" size={16} color={Colors.primary.neonCyan} />
            <Text style={styles.paymentFeatureText}>Secure Transactions</Text>
          </View>
          <View style={styles.paymentFeature}>
            <Ionicons name="flash" size={16} color={Colors.primary.hotPink} />
            <Text style={styles.paymentFeatureText}>Instant Processing</Text>
          </View>
          <View style={styles.paymentFeature}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.primary.gold} />
            <Text style={styles.paymentFeatureText}>Admin Approved</Text>
          </View>
        </View>
      </View>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <Text style={styles.copyright}>
          © 2024 Adola Gaming Platform. All rights reserved.
        </Text>
        <View style={styles.bottomLinks}>
          <TouchableOpacity onPress={() => router.push('/terms')}>
            <Text style={styles.bottomLinkText}>Terms</Text>
          </TouchableOpacity>
          <Text style={styles.separator}>•</Text>
          <TouchableOpacity onPress={() => router.push('/privacy')}>
            <Text style={styles.bottomLinkText}>Privacy</Text>
          </TouchableOpacity>
          <Text style={styles.separator}>•</Text>
          <TouchableOpacity onPress={handleContactPress}>
            <Text style={styles.bottomLinkText}>Contact</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.primary.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.primary.border,
  },
  footerContent: {
    flexDirection: width > 768 ? 'row' : 'column',
    paddingVertical: 32,
    paddingHorizontal: 24,
    gap: 32,
  },
  companySection: {
    flex: width > 768 ? 2 : 1,
  },
  logoSection: {
    marginBottom: 16,
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 14,
    color: Colors.primary.neonCyan,
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  contactInfo: {
    gap: 8,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactText: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
  },
  linksSection: {
    flex: width > 768 ? 3 : 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 32,
  },
  linkColumn: {
    flex: 1,
    minWidth: 150,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 12,
  },
  linkItem: {
    marginBottom: 8,
  },
  linkText: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
  },
  paymentSection: {
    backgroundColor: Colors.primary.background,
    paddingVertical: 24,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.primary.border,
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
    flexDirection: width > 600 ? 'row' : 'column',
    gap: 16,
    marginBottom: 16,
  },
  bankAccount: {
    backgroundColor: Colors.primary.surface,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.primary.border,
    flex: 1,
  },
  bankHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
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
  bottomBar: {
    flexDirection: width > 600 ? 'row' : 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.primary.border,
    gap: 8,
  },
  copyright: {
    fontSize: 12,
    color: Colors.primary.textMuted,
  },
  bottomLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bottomLinkText: {
    fontSize: 12,
    color: Colors.primary.textSecondary,
  },
  separator: {
    fontSize: 12,
    color: Colors.primary.textMuted,
  },
});
