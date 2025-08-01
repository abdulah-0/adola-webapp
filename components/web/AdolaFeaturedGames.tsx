// Adola Gaming Platform Featured Games Component
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
import WebGameCard from './WebGameCard';

const { width } = Dimensions.get('window');

interface AdolaFeaturedGamesProps {
  onGamePress?: (gameId: string) => void;
  showAllGames?: boolean;
}

export default function AdolaFeaturedGames({ 
  onGamePress, 
  showAllGames = false 
}: AdolaFeaturedGamesProps) {
  const router = useRouter();

  // Real Adola games data based on your app
  const gameCategories = [
    { id: 'casino', name: 'Casino Games', icon: '🎰', count: 8 },
    { id: 'card', name: 'Card Games', icon: '🃏', count: 4 },
    { id: 'crash', name: 'Crash Games', icon: '🚀', count: 3 },
    { id: 'lottery', name: 'Lottery Games', icon: '🎯', count: 4 },
  ];

  // Featured games from your actual app data
  const featuredGames = [
    { 
      id: 'aviator', 
      name: 'Aviator', 
      icon: '✈️', 
      players: '1.2k', 
      color: Colors.primary.neonCyan, 
      route: '/game/aviator',
      category: 'crash',
      description: 'Fly high and cash out before crash'
    },
    { 
      id: 'crash', 
      name: 'Crash', 
      icon: '🚀', 
      players: '2.7k', 
      color: Colors.primary.hotPink, 
      route: '/game/crash',
      category: 'crash',
      description: 'Classic crash game with multipliers'
    },
    { 
      id: 'dice', 
      name: 'Dice', 
      icon: '🎲', 
      players: '856', 
      color: Colors.primary.gold, 
      route: '/game/dice',
      category: 'casino',
      description: 'Predict dice outcomes and win'
    },
    { 
      id: 'mines', 
      name: 'Mines', 
      icon: '💣', 
      players: '1.8k', 
      color: Colors.primary.neonCyan, 
      route: '/game/mines',
      category: 'casino',
      description: 'Avoid mines and collect rewards'
    },
    { 
      id: 'tower', 
      name: 'Tower', 
      icon: '🏗️', 
      players: '743', 
      color: Colors.primary.hotPink, 
      route: '/game/tower',
      category: 'casino',
      description: 'Climb the tower for bigger wins'
    },
    { 
      id: 'plinko', 
      name: 'Plinko', 
      icon: '🎯', 
      players: '1.2k', 
      color: Colors.primary.gold, 
      route: '/game/plinko',
      category: 'casino',
      description: 'Drop balls and hit multipliers'
    },
    { 
      id: 'blackjack', 
      name: 'Blackjack', 
      icon: '🃏', 
      players: '934', 
      color: Colors.primary.neonCyan, 
      route: '/game/blackjack',
      category: 'card',
      description: 'Beat the dealer to 21'
    },
    { 
      id: 'poker', 
      name: 'Poker', 
      icon: '♠️', 
      players: '567', 
      color: Colors.primary.hotPink, 
      route: '/game/poker',
      category: 'card',
      description: 'Texas Hold\'em poker game'
    },
  ];

  const handleGamePress = (gameId: string) => {
    if (onGamePress) {
      onGamePress(gameId);
    } else {
      const game = featuredGames.find(g => g.id === gameId);
      if (game) {
        router.push(game.route as any);
      }
    }
  };

  const handleViewAllGames = () => {
    router.push('/games');
  };

  const displayGames = showAllGames ? featuredGames : featuredGames.slice(0, 6);

  return (
    <View style={styles.container}>
      {/* Game Categories */}
      <View style={styles.categoriesSection}>
        <Text style={styles.sectionTitle}>Game Categories</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        >
          {gameCategories.map((category) => (
            <TouchableOpacity 
              key={category.id} 
              style={styles.categoryCard}
              onPress={() => router.push(`/games?category=${category.id}`)}
              activeOpacity={0.8}
            >
              <Text style={styles.categoryIcon}>{category.icon}</Text>
              <Text style={styles.categoryName}>{category.name}</Text>
              <Text style={styles.categoryCount}>{category.count} games</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Featured Games */}
      <View style={styles.gamesSection}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Featured Games</Text>
            <Text style={styles.sectionSubtitle}>19 total games available</Text>
          </View>
          {!showAllGames && (
            <TouchableOpacity onPress={handleViewAllGames}>
              <Text style={styles.viewAllButton}>View All →</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.gamesGrid}>
          {displayGames.map((game, index) => (
            <View key={game.id} style={styles.gameCardWrapper}>
              <WebGameCard
                title={game.name}
                icon={game.icon}
                description={game.description}
                color={game.color}
                players={game.players}
                status="available"
                featured={index < 3} // Mark first 3 as featured
                onPress={() => handleGamePress(game.id)}
              />
            </View>
          ))}
        </View>
      </View>

      {/* Game Statistics */}
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Platform Statistics</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>🎮</Text>
            <Text style={styles.statValue}>19</Text>
            <Text style={styles.statLabel}>Total Games</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>👥</Text>
            <Text style={styles.statValue}>12.4k</Text>
            <Text style={styles.statLabel}>Online Players</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>🏆</Text>
            <Text style={styles.statValue}>847</Text>
            <Text style={styles.statLabel}>Today's Winners</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>💰</Text>
            <Text style={styles.statValue}>PKR 2.1M</Text>
            <Text style={styles.statLabel}>Total Payouts</Text>
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
  },
  categoriesSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 8,
    paddingHorizontal: 24,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
    paddingHorizontal: 24,
  },
  categoriesContainer: {
    paddingHorizontal: 24,
    gap: 16,
  },
  categoryCard: {
    backgroundColor: Colors.primary.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    minWidth: 120,
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  categoryIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  categoryCount: {
    fontSize: 12,
    color: Colors.primary.textSecondary,
  },
  gamesSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
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
    minWidth: 150,
  },
  statsSection: {
    paddingHorizontal: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statCard: {
    backgroundColor: Colors.primary.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    minWidth: 120,
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.primary.textSecondary,
    textAlign: 'center',
  },
});
