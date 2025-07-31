import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useApp } from '../../contexts/AppContext';
import { useWallet } from '../../contexts/WalletContext';
import WalletCard from '../../components/WalletCard';
import GameCard from '../../components/GameCard';
import { rh, rf, rs } from '../../utils/responsive';
import { isWeb, webDimensions, webStyleModifiers, createWebResponsiveStyles } from '../../utils/webStyles';
import WebHomepage from '../../components/web/WebHomepage';

const getResponsivePadding = () => isWeb ? webDimensions.spacing.md : rs(20);

export default function HomeScreen() {
  const { user, logout } = useApp();
  const { balance } = useWallet();
  const router = useRouter();

  // No need for manual balance refresh - WalletContext handles real-time updates

  const handleSignOut = () => {
    console.log('🔄 handleSignOut called');

    // For web, skip the alert and logout directly for testing
    if (Platform.OS === 'web') {
      console.log('🌐 Web logout - bypassing alert');
      performLogout();
      return;
    }

    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: performLogout,
        },
      ]
    );
  };

  const performLogout = async () => {
    try {
      console.log('🔄 Starting logout process...');
      await logout();
      console.log('✅ Logout completed, redirecting...');
      router.replace('/auth/login');
    } catch (error) {
      console.error('❌ Logout error:', error);
      if (Platform.OS === 'web') {
        // On web, show a simple alert
        window.alert('Failed to sign out. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to sign out. Please try again.');
      }
    }
  };

  // Use web-specific layout if on web platform
  if (isWeb) {
    return <WebHomepage onSignOut={handleSignOut} />;
  }

  const featuredGames = [
    { name: 'Aviator', icon: '✈️', players: '1.2k', color: Colors.primary.neonCyan, route: '/game/aviator' },
    { name: 'Cricket Betting', icon: '🏏', players: '1.5k', color: Colors.primary.gold, route: '/game/cricket-betting' },
    { name: 'Dice', icon: '🎲', players: '856', color: Colors.primary.hotPink, route: '/game/dice' },
    { name: 'Slots', icon: '🎰', players: '2.1k', color: Colors.primary.gold, route: '/game/slots' },
    { name: 'Roulette', icon: '🎡', players: '743', color: Colors.primary.neonCyan, route: '/game/roulette' },
  ];

  const popularGames = [
    { name: 'Tower', icon: '🏗️', players: '2.5k', color: Colors.primary.neonCyan, route: '/game/tower' },
    { name: 'Mines', icon: '💣', players: '1.8k', color: Colors.primary.hotPink, route: '/game/mines' },
    { name: 'Aviator', icon: '✈️', players: '3.2k', color: Colors.primary.gold, route: '/game/aviator' },
  ];

  const lotteryGames = [
    { name: 'Mega Draw', icon: '🎫', players: '5.1k', color: Colors.primary.gold, route: '/game/megadraw' },
    { name: 'Lucky Numbers', icon: '🍀', players: '2.9k', color: Colors.primary.neonCyan, route: '/game/luckynumbers' },
    { name: 'Power Ball', icon: '⚡', players: '4.3k', color: Colors.primary.hotPink, route: '/game/powerball' },
  ];



  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.usernameText}>{user?.displayName || 'Player'}!</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {(user?.displayName || 'P').charAt(0).toUpperCase()}
            </Text>
          </View>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={24} color={Colors.primary.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Wallet Card */}
      <WalletCard
        balance={balance}
        onDepositPress={() => router.push('/wallet')}
        onWithdrawPress={() => router.push('/wallet')}
        onHistoryPress={() => router.push('/wallet')}
      />

      {/* Featured Games */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Featured Games</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.gamesContainer}>
            {featuredGames.map((game, index) => (
              <GameCard
                key={index}
                title={game.name}
                icon={game.icon}
                description={`${game.players} players`}
                color={game.color}
                onPress={() => router.push(game.route as any)}
              />
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Popular Games */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Popular</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.gamesContainer}>
            {popularGames.map((game, index) => (
              <GameCard
                key={index}
                title={game.name}
                icon={game.icon}
                description={`${game.players} players`}
                color={game.color}
                onPress={() => router.push(game.route as any)}
              />
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Lottery Games */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Lottery</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.gamesContainer}>
            {lotteryGames.map((game, index) => (
              <GameCard
                key={index}
                title={game.name}
                icon={game.icon}
                description={`${game.players} players`}
                color={game.color}
                onPress={() => router.push(game.route as any)}
              />
            ))}
          </View>
        </ScrollView>
      </View>



    </ScrollView>
  );
}

const styles = createWebResponsiveStyles(StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary.background,
    ...webStyleModifiers.webContainer,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: getResponsivePadding(),
    paddingTop: isWeb ? webDimensions.spacing.lg : rh(7),
    ...webStyleModifiers.compactLayout,
  },
  headerContent: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isWeb ? webDimensions.spacing.sm : rs(12),
  },
  welcomeText: {
    fontSize: isWeb ? webDimensions.fontSize.medium : rf(16),
    color: Colors.primary.textSecondary,
  },
  usernameText: {
    fontSize: isWeb ? webDimensions.fontSize.title : rf(24),
    fontWeight: 'bold',
    color: Colors.primary.neonCyan,
    marginTop: isWeb ? webDimensions.spacing.xs : rs(4),
  },
  avatarContainer: {
    width: isWeb ? webDimensions.icon.large + 8 : rs(50),
    height: isWeb ? webDimensions.icon.large + 8 : rs(50),
    borderRadius: isWeb ? (webDimensions.icon.large + 8) / 2 : rs(25),
    backgroundColor: Colors.primary.hotPink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: isWeb ? webDimensions.fontSize.medium : rf(20),
    fontWeight: 'bold',
    color: Colors.primary.background,
  },
  signOutButton: {
    width: isWeb ? webDimensions.icon.large + 4 : rs(44),
    height: isWeb ? webDimensions.icon.large + 4 : rs(44),
    borderRadius: isWeb ? (webDimensions.icon.large + 4) / 2 : rs(22),
    backgroundColor: Colors.primary.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  section: {
    padding: getResponsivePadding(),
    paddingTop: 0,
    marginBottom: isWeb ? webDimensions.spacing.sm : 0,
  },
  sectionTitle: {
    fontSize: isWeb ? webDimensions.fontSize.large : rf(20),
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: isWeb ? webDimensions.spacing.sm : rs(15),
  },
  gamesContainer: {
    flexDirection: 'row',
    paddingRight: getResponsivePadding(),
    gap: isWeb ? webDimensions.spacing.xs : 0,
  },
}));


