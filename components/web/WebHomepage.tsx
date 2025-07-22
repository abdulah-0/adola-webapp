// Web-specific Homepage Layout
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useApp } from '../../contexts/AppContext';
import { useWallet } from '../../contexts/WalletContext';
import WebGameCard from './WebGameCard';

const { width } = Dimensions.get('window');

interface WebHomepageProps {
  onSignOut: () => void;
}

export default function WebHomepage({ onSignOut }: WebHomepageProps) {
  const { user } = useApp();
  const { balance } = useWallet();
  const router = useRouter();

  const handleSignOutClick = () => {
    console.log('🔄 WebHomepage logout button clicked');
    console.log('📋 onSignOut function:', typeof onSignOut);
    if (onSignOut) {
      onSignOut();
    } else {
      console.error('❌ onSignOut function not provided');
    }
  };

  // Direct logout test function
  const testDirectLogout = async () => {
    console.log('🧪 Testing direct web logout...');
    try {
      const { webLogout } = await import('../../utils/webLogout');
      await webLogout();
    } catch (error) {
      console.error('❌ Direct logout failed:', error);
      // Fallback: force redirect
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }
    }
  };

  const featuredGames = [
    { name: 'Aviator', icon: '✈️', players: '1.2k', color: Colors.primary.neonCyan, route: '/game/aviator' },
    { name: 'Crash', icon: '🚀', players: '2.7k', color: Colors.primary.hotPink, route: '/game/crash' },
    { name: 'Dice', icon: '🎲', players: '856', color: Colors.primary.gold, route: '/game/dice' },
    { name: 'Mines', icon: '💣', players: '1.8k', color: Colors.primary.neonCyan, route: '/game/mines' },
    { name: 'Slots', icon: '🎰', players: '2.1k', color: Colors.primary.hotPink, route: '/game/slots' },
    { name: 'Roulette', icon: '🎡', players: '743', color: Colors.primary.gold, route: '/game/roulette' },
  ];

  const quickStats = [
    { label: 'Total Games', value: '19', icon: '🎮' },
    { label: 'Online Players', value: '12.4k', icon: '👥' },
    { label: 'Today\'s Winners', value: '847', icon: '🏆' },
    { label: 'Total Payouts', value: 'Rs 2.1M', icon: '💰' },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.logo}>🎮 Adola Gaming</Text>
          <Text style={styles.tagline}>Premium Gaming Platform</Text>
        </View>
        
        <View style={styles.headerCenter}>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Your Balance</Text>
            <Text style={styles.balanceAmount}>Rs {(balance || 0).toLocaleString()}</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <View style={styles.userInfo}>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.username}>{user?.email?.split('@')[0] || 'Player'}</Text>
          </View>
          <TouchableOpacity style={styles.avatarButton}>
            <Text style={styles.avatarText}>
              {(user?.email?.charAt(0) || 'P').toUpperCase()}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOutClick}>
            <Ionicons name="log-out-outline" size={20} color={Colors.primary.text} />
          </TouchableOpacity>
          {/* Debug button - remove after testing */}
          <TouchableOpacity
            style={[styles.signOutButton, { backgroundColor: '#ff4444', marginLeft: 8 }]}
            onPress={testDirectLogout}
          >
            <Text style={{ color: 'white', fontSize: 12 }}>TEST</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Quick Stats */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Platform Statistics</Text>
          <View style={styles.statsGrid}>
            {quickStats.map((stat, index) => (
              <View key={index} style={styles.statCard}>
                <Text style={styles.statIcon}>{stat.icon}</Text>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={[styles.actionCard, { backgroundColor: Colors.primary.neonCyan + '20' }]}
              onPress={() => router.push('/wallet')}
            >
              <Ionicons name="wallet-outline" size={32} color={Colors.primary.neonCyan} />
              <Text style={styles.actionTitle}>Deposit</Text>
              <Text style={styles.actionSubtitle}>Add funds to play</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionCard, { backgroundColor: Colors.primary.hotPink + '20' }]}
              onPress={() => router.push('/wallet')}
            >
              <Ionicons name="cash-outline" size={32} color={Colors.primary.hotPink} />
              <Text style={styles.actionTitle}>Withdraw</Text>
              <Text style={styles.actionSubtitle}>Cash out winnings</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionCard, { backgroundColor: Colors.primary.gold + '20' }]}
              onPress={() => router.push('/games')}
            >
              <Ionicons name="game-controller-outline" size={32} color={Colors.primary.gold} />
              <Text style={styles.actionTitle}>All Games</Text>
              <Text style={styles.actionSubtitle}>Browse 19 games</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionCard, { backgroundColor: Colors.primary.neonCyan + '20' }]}
              onPress={() => router.push('/wallet')}
            >
              <Ionicons name="time-outline" size={32} color={Colors.primary.neonCyan} />
              <Text style={styles.actionTitle}>History</Text>
              <Text style={styles.actionSubtitle}>View transactions</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Featured Games Grid */}
        <View style={styles.gamesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Games</Text>
            <TouchableOpacity onPress={() => router.push('/games')}>
              <Text style={styles.viewAllButton}>View All →</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.gamesGrid}>
            {featuredGames.map((game, index) => (
              <View key={index} style={styles.gameCardWrapper}>
                <WebGameCard
                  title={game.name}
                  icon={game.icon}
                  description={`${game.players} players`}
                  color={game.color}
                  players={game.players}
                  featured={index < 2} // Mark first 2 as featured
                  onPress={() => router.push(game.route as any)}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Promotional Banner */}
        <View style={styles.promoSection}>
          <View style={styles.promoBanner}>
            <View style={styles.promoContent}>
              <Text style={styles.promoTitle}>🎉 Welcome Bonus!</Text>
              <Text style={styles.promoText}>Get 5% bonus on every deposit</Text>
              <Text style={styles.promoSubtext}>Plus referral bonuses and daily rewards</Text>
            </View>
            <TouchableOpacity 
              style={styles.promoButton}
              onPress={() => router.push('/wallet')}
            >
              <Text style={styles.promoButtonText}>Claim Now</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Padding */}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: Colors.primary.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary.border,
  },
  headerLeft: {
    flex: 1,
  },
  logo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary.neonCyan,
  },
  tagline: {
    fontSize: 12,
    color: Colors.primary.textSecondary,
    marginTop: 2,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  balanceCard: {
    backgroundColor: Colors.primary.card,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary.gold,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 12,
    color: Colors.primary.textSecondary,
  },
  balanceAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary.gold,
    marginTop: 2,
  },
  headerRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
  },
  userInfo: {
    alignItems: 'flex-end',
  },
  welcomeText: {
    fontSize: 12,
    color: Colors.primary.textSecondary,
  },
  username: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary.text,
  },
  avatarButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary.hotPink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary.background,
  },
  signOutButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  content: {
    flex: 1,
  },
  statsSection: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.primary.surface,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary.neonCyan,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.primary.textSecondary,
    textAlign: 'center',
  },
  actionsSection: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  actionCard: {
    flex: 1,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginTop: 8,
  },
  actionSubtitle: {
    fontSize: 12,
    color: Colors.primary.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  gamesSection: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllButton: {
    fontSize: 14,
    color: Colors.primary.neonCyan,
    fontWeight: '600',
  },
  gamesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  gameCardWrapper: {
    width: (width - 48 - 32) / 3, // 3 columns with gaps
  },
  promoSection: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  promoBanner: {
    backgroundColor: `${Colors.primary.neonCyan}15`,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary.neonCyan,
  },
  promoContent: {
    flex: 1,
  },
  promoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 4,
  },
  promoText: {
    fontSize: 14,
    color: Colors.primary.neonCyan,
    marginBottom: 2,
  },
  promoSubtext: {
    fontSize: 12,
    color: Colors.primary.textSecondary,
  },
  promoButton: {
    backgroundColor: Colors.primary.neonCyan,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  promoButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary.background,
  },
  bottomPadding: {
    height: 24,
  },
});
