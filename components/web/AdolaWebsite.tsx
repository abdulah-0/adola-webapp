// Adola Gaming Platform Complete Website Component
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { isWeb, createWebResponsiveStyles } from '../../utils/webStyles';
import AdolaHeroSection from './AdolaHeroSection';
import AdolaFeaturedGames from './AdolaFeaturedGames';
import AdolaPromoBanner from './AdolaPromoBanner';
import AdolaGameStats from './AdolaGameStats';
import AdolaFooter from './AdolaFooter';

interface AdolaWebsiteProps {
  onSignOut?: () => void;
  onGamePress?: (gameId: string) => void;
  onCreateAccount?: () => void;
  onContactPress?: () => void;
}

export default function AdolaWebsite({
  onSignOut,
  onGamePress,
  onCreateAccount,
  onContactPress
}: AdolaWebsiteProps) {

  const handleGamePress = (gameId: string) => {
    if (onGamePress) {
      onGamePress(gameId);
    }
    // Default navigation is handled within the component
  };

  const handleCreateAccount = () => {
    if (onCreateAccount) {
      onCreateAccount();
    }
    // Default navigation is handled within the component
  };

  const handleContactPress = () => {
    if (onContactPress) {
      onContactPress();
    }
    // Default navigation is handled within the component
  };

  // For web, use native HTML scrolling instead of React Native ScrollView
  if (isWeb) {
    return (
      <div style={{
        backgroundColor: Colors.primary.background,
        minHeight: '100vh',
        overflow: 'auto',
        width: '100%'
      }}>
        {/* VERIFICATION: This should show the new Adola website */}
        <div style={{
          backgroundColor: Colors.primary.neonCyan,
          padding: '12px',
          textAlign: 'center',
          color: Colors.primary.background,
          fontSize: '16px',
          fontWeight: 'bold'
        }}>
          🎮 NEW ADOLA WEBSITE LOADED! 🎮
        </div>

        <div style={{ paddingBottom: '100px' }}>
        {/* Simple test content to verify changes are working */}
        <View style={styles.testSection}>
          <Text style={styles.testTitle}>🎮 Adola Gaming Platform</Text>
          <Text style={styles.testSubtitle}>Premium Mobile Gaming Experience</Text>
          <Text style={styles.testDescription}>
            Experience the best mobile gaming with 19 exciting games, PKR 50 welcome bonus,
            5% deposit bonus, and secure UBL bank transfers.
          </Text>
        </View>

        {/* Hero Section */}
        <AdolaHeroSection
          onCreateAccount={handleCreateAccount}
        />

        {/* Promotional Banner */}
        <AdolaPromoBanner
          onSignupPress={handleCreateAccount}
        />

        {/* Featured Games */}
        <AdolaFeaturedGames
          onGamePress={handleGamePress}
          showAllGames={false}
        />

        {/* Platform Statistics */}
        <AdolaGameStats
          title="Platform Statistics"
          realTimeData={true}
          showTables={true}
        />

        {/* Footer */}
        <AdolaFooter
          onContactPress={handleContactPress}
        />
        </div>
      </div>
    );
  }

  // Fallback for non-web platforms
  return (
    <View style={styles.container}>
      <View style={styles.verificationBanner}>
        <Text style={styles.verificationText}>
          🎮 NEW ADOLA WEBSITE LOADED! 🎮
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={true}
        contentContainerStyle={styles.scrollContent}
        nestedScrollEnabled={true}
      >
        {/* Simple test content to verify changes are working */}
        <View style={styles.testSection}>
          <Text style={styles.testTitle}>🎮 Adola Gaming Platform</Text>
          <Text style={styles.testSubtitle}>Premium Mobile Gaming Experience</Text>
          <Text style={styles.testDescription}>
            Experience the best mobile gaming with 19 exciting games, PKR 50 welcome bonus,
            5% deposit bonus, and secure UBL bank transfers.
          </Text>
        </View>

        {/* Hero Section */}
        <AdolaHeroSection
          onCreateAccount={handleCreateAccount}
        />

        {/* Promotional Banner */}
        <AdolaPromoBanner
          onSignupPress={handleCreateAccount}
        />

        {/* Featured Games */}
        <AdolaFeaturedGames
          onGamePress={handleGamePress}
          showAllGames={false}
        />

        {/* Platform Statistics */}
        <AdolaGameStats
          title="Platform Statistics"
          realTimeData={true}
          showTables={true}
        />

        {/* Footer */}
        <AdolaFooter
          onContactPress={handleContactPress}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary.background,
    minHeight: '100vh', // Minimum viewport height, allows expansion
  },
  verificationBanner: {
    backgroundColor: Colors.primary.neonCyan,
    paddingVertical: 10,
    alignItems: 'center',
    zIndex: 1000,
    position: 'relative',
  },
  verificationText: {
    color: Colors.primary.background,
    fontSize: 16,
    fontWeight: 'bold',
  },
  testSection: {
    backgroundColor: Colors.primary.surface,
    padding: 24,
    margin: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary.neonCyan,
  },
  testTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  testSubtitle: {
    fontSize: 18,
    color: Colors.primary.neonCyan,
    textAlign: 'center',
    marginBottom: 16,
  },
  testDescription: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100, // Add more bottom padding for better scrolling
  },
  ...createWebResponsiveStyles({
    container: {
      maxWidth: 1200,
      alignSelf: 'center',
      width: '100%',
    },
    scrollContent: {
      paddingBottom: 0,
    },
  }),
});
