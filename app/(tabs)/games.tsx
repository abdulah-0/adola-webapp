// Games Tab Screen for Adola App
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useApp } from '../../contexts/AppContext';
import GameCard from '../../components/GameCard';
import DarkGradientBackground from '../../components/common/DarkGradientBackground';
import { rw, rh, rf, rs, wp, hp } from '../../utils/responsive';
import { isWeb, webDimensions, webStyleModifiers, createWebResponsiveStyles, getDeviceType } from '../../utils/webStyles';
import WebGamesTab from '../../components/web/WebGamesTab';

export default function GamesScreen() {
  const { user } = useApp();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Responsive helper functions from original
  const getResponsivePadding = () => {
    if (wp(100) < 768) return rs(15);
    if (wp(100) < 1024) return rs(20);
    return rs(25);
  };

  const getGridColumns = (minItemWidth: number) => {
    const screenWidth = wp(100);
    const padding = getResponsivePadding() * 2;
    const gap = rs(15);
    const availableWidth = screenWidth - padding;

    let columns = Math.floor((availableWidth + gap) / (minItemWidth + gap));
    return Math.max(2, Math.min(columns, 4)); // Between 2-4 columns
  };

  const getGridItemWidth = (columns: number, padding: number, gap: number) => {
    const screenWidth = wp(100);
    const totalPadding = padding * 2;
    const totalGaps = gap * (columns - 1);
    const availableWidth = screenWidth - totalPadding - totalGaps;
    return availableWidth / columns;
  };

  const categories = [
    { id: 'all', name: 'All Games', icon: '🎮' },
    { id: 'casino', name: 'Casino', icon: '🎰' },
    { id: 'card', name: 'Card Games', icon: '🃏' },
    { id: 'sports', name: 'Sports', icon: '⚽' },
  ];

  const games = [

    {
      id: 'crash',
      name: 'Crash',
      description: 'Classic crash game with rocket and multipliers',
      category: 'casino',
      icon: '🚀',
      color: Colors.primary.neonCyan,
      players: { current: 2678, max: 5000 },
      status: 'available',
    },
    {
      id: 'rollmaster',
      name: 'Roll Master',
      description: 'Bomb crash game with multiplier betting',
      category: 'casino',
      icon: '💣',
      color: Colors.primary.neonCyan,
      players: { current: 567, max: 1000 },
      status: 'available',
    },
    {
      id: 'mines',
      name: 'Mines',
      description: 'Classic minesweeper with betting',
      category: 'casino',
      icon: '💣',
      color: Colors.primary.hotPink,
      players: { current: 1834, max: 3000 },
      status: 'available',
    },
    {
      id: 'dice',
      name: 'Dice',
      description: 'Classic dice game with betting options',
      category: 'casino',
      icon: '🎲',
      color: Colors.primary.gold,
      players: { current: 856, max: 2000 },
      status: 'available',
    },
    {
      id: 'slots',
      name: 'Slots',
      description: 'Classic slot machine with jackpot',
      category: 'casino',
      icon: '🎰',
      color: Colors.primary.neonCyan,
      players: { current: 2156, max: 5000 },
      status: 'available',
    },
    {
      id: 'diamondslots',
      name: 'Diamond Slots',
      description: 'Luxury diamond slot machine with premium jackpot',
      category: 'casino',
      icon: '💎',
      color: Colors.primary.gold,
      players: { current: 1923, max: 3000 },
      status: 'available',
    },
    {
      id: 'fruitmachine',
      name: 'Fruit Machine',
      description: 'Classic fruit slot machine with traditional symbols',
      category: 'casino',
      icon: '🍒',
      color: Colors.primary.hotPink,
      players: { current: 743, max: 1500 },
      status: 'available',
    },
    {
      id: 'blackjack',
      name: 'Blackjack',
      description: 'Classic 21 card game with dealer',
      category: 'card',
      icon: '♠️',
      color: Colors.primary.gold,
      players: { current: 1567, max: 3000 },
      status: 'available',
    },
    {
      id: 'poker',
      name: 'Poker',
      description: '5-card draw poker vs dealer',
      category: 'card',
      icon: '♠️',
      color: Colors.primary.neonCyan,
      players: { current: 2834, max: 5000 },
      status: 'available',
    },
    {
      id: 'baccarat',
      name: 'Baccarat',
      description: 'Classic Player vs Banker card game',
      category: 'card',
      icon: '🎴',
      color: Colors.primary.gold,
      players: { current: 1245, max: 2000 },
      status: 'available',
    },
    {
      id: 'roulette',
      name: 'Roulette',
      description: 'American roulette with all bet types',
      category: 'casino',
      icon: '🎡',
      color: Colors.primary.hotPink,
      players: { current: 1678, max: 3000 },
      status: 'available',
    },
    {
      id: 'dragonTiger',
      name: 'Dragon vs Tiger',
      description: 'Classic Asian card game with betting',
      category: 'card',
      icon: '🐉',
      color: Colors.primary.gold,
      players: { current: 1234, max: 2000 },
      status: 'available',
    },
    {
      id: 'tower',
      name: 'Tower Challenge',
      description: 'Climb the tower, avoid bombs, win big!',
      category: 'casino',
      icon: '🏗️',
      color: Colors.primary.neonCyan,
      players: { current: 2567, max: 4000 },
      status: 'available',
    },
    {
      id: 'megadraw',
      name: 'Mega Draw',
      description: 'Pick 6 numbers and win the jackpot!',
      category: 'casino',
      icon: '🎫',
      color: Colors.primary.gold,
      players: { current: 5123, max: 10000 },
      status: 'available',
    },
    {
      id: 'luckynumbers',
      name: 'Lucky Numbers',
      description: 'Pick 5 numbers and get lucky!',
      category: 'casino',
      icon: '🍀',
      color: Colors.primary.neonCyan,
      players: { current: 2934, max: 5000 },
      status: 'available',
    },
    {
      id: 'powerball',
      name: 'Power Ball',
      description: 'Pick 5 main numbers + 1 Power Ball for the jackpot!',
      category: 'casino',
      icon: '⚡',
      color: Colors.primary.hotPink,
      players: { current: 4321, max: 8000 },
      status: 'available',
    },
    {
      id: 'limbo',
      name: 'Limbo',
      description: 'Go under the target multiplier to win',
      category: 'casino',
      icon: '🎲',
      color: Colors.primary.hotPink,
      players: { current: 1456, max: 3000 },
      status: 'available',
    },
    {
      id: 'aviator',
      name: 'Aviator',
      description: 'Crash-style multiplier betting game',
      category: 'casino',
      icon: '✈️',
      color: Colors.primary.hotPink,
      players: { current: 3421, max: 10000 },
      status: 'available',
    },
    {
      id: 'cricket-betting',
      name: 'Cricket Betting',
      description: 'Live cricket betting with real-time odds',
      category: 'sports',
      icon: '🏏',
      color: Colors.primary.gold,
      players: { current: 1567, max: 5000 },
      status: 'available',
    },
    {
      id: 'football-betting',
      name: 'Football Betting',
      description: 'Live football betting and predictions',
      category: 'sports',
      icon: '⚽',
      color: Colors.primary.neonCyan,
      players: { current: 2341, max: 8000 },
      status: 'available',
    },
    {
      id: 'basketball-betting',
      name: 'Basketball Betting',
      description: 'NBA and international basketball betting',
      category: 'sports',
      icon: '🏀',
      color: Colors.primary.hotPink,
      players: { current: 1876, max: 6000 },
      status: 'available',
    },
    {
      id: 'tennis-betting',
      name: 'Tennis Betting',
      description: 'Live tennis matches and tournaments',
      category: 'sports',
      icon: '🎾',
      color: Colors.primary.gold,
      players: { current: 1234, max: 4000 },
      status: 'available',
    },
  ];

  // Debug logging
  console.log('📋 Categories available:', categories.map(c => c.name));
  console.log('🎮 Total games:', games.length);
  console.log('🏏 Sports games:', games.filter(g => g.category === 'sports').map(g => g.name));

  const filteredGames = games.filter(game => {
    const matchesSearch = game.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         game.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || game.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Debug filtering
  console.log('🔍 Selected category:', selectedCategory);
  console.log('🎯 Filtered games count:', filteredGames.length);
  console.log('🎮 Filtered games:', filteredGames.map(g => `${g.name} (${g.category})`));

  const handleGamePress = (gameId: string) => {
    // Navigate to individual game
    router.push(`/game/${gameId}` as any);
  };

  // Use web-specific layout if on web platform
  if (isWeb) {
    return <WebGamesTab games={games} onGamePress={handleGamePress} />;
  }

  return (
    <View style={styles.container}>
      <DarkGradientBackground>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🎮 Games</Text>
          <Text style={styles.subtitle}>Choose your favorite game and start playing!</Text>
        </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={Colors.primary.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search games..."
            placeholderTextColor={Colors.primary.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Category Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryButton,
              selectedCategory === category.id && styles.categoryButtonActive
            ]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <Text style={styles.categoryIcon}>{category.icon}</Text>
            <Text style={[
              styles.categoryText,
              selectedCategory === category.id && styles.categoryTextActive
            ]}>
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Games List - Vertical Scrolling */}
      <ScrollView
        style={styles.gamesContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.gamesScrollContent,
          isWeb && styles.webGamesGrid
        ]}
      >
        {filteredGames.map((game) => (
          <TouchableOpacity
            key={game.id}
            style={[
              styles.gameCardContainer,
              isWeb && styles.webGameCardContainer
            ]}
            onPress={() => handleGamePress(game.id)}
          >
            <View style={[
              styles.gameCard,
              { borderColor: game.color },
              isWeb && styles.webGameCard
            ]}>
              <View style={styles.gameCardLeft}>
                <Text style={styles.gameIcon}>{game.icon}</Text>
                <View style={styles.gameInfo}>
                  <Text style={styles.gameName}>{game.name}</Text>
                  <Text style={styles.gameDescription} numberOfLines={2}>{game.description}</Text>
                </View>
              </View>

              <View style={styles.gameCardRight}>
                <Text style={styles.gameInfoText}>
                  👥 {game.players.current.toLocaleString()}
                </Text>
                <Text style={styles.gameStatus}>
                  {game.status === 'available' ? '🟢 Online' : '🔴 Offline'}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {/* Bottom padding for better scrolling */}
        <View style={styles.bottomPadding} />
      </ScrollView>
      </DarkGradientBackground>
    </View>
  );
}

const styles = createWebResponsiveStyles(StyleSheet.create({
  container: {
    flex: 1,
    ...webStyleModifiers.webContainer,
  },
  header: {
    padding: isWeb ? webDimensions.spacing.md : rs(20),
    paddingTop: isWeb ? webDimensions.spacing.lg : rh(7),
    alignItems: 'center',
    ...webStyleModifiers.compactLayout,
  },
  title: {
    fontSize: isWeb ? webDimensions.fontSize.title + 4 : rf(28),
    fontWeight: 'bold',
    color: Colors.primary.neonCyan,
    marginBottom: isWeb ? webDimensions.spacing.xs : rs(8),
  },
  subtitle: {
    fontSize: isWeb ? webDimensions.fontSize.medium : rf(16),
    color: Colors.primary.textSecondary,
    textAlign: 'center',
  },
  searchContainer: {
    paddingHorizontal: isWeb ? webDimensions.spacing.md : rs(20),
    marginBottom: isWeb ? webDimensions.spacing.md : rs(20),
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary.surface,
    borderRadius: isWeb ? webDimensions.spacing.sm : rs(12),
    paddingHorizontal: isWeb ? webDimensions.spacing.sm : rs(16),
    paddingVertical: isWeb ? webDimensions.spacing.sm : rs(12),
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  searchInput: {
    flex: 1,
    fontSize: isWeb ? webDimensions.fontSize.medium : rf(16),
    color: Colors.primary.text,
    marginLeft: isWeb ? webDimensions.spacing.sm : rs(12),
  },
  categoriesContainer: {
    paddingHorizontal: isWeb ? webDimensions.spacing.md : rs(20),
    marginBottom: isWeb ? webDimensions.spacing.sm : rs(15),
    maxHeight: isWeb ? webDimensions.spacing.xl : rs(40),
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary.surface,
    borderRadius: rs(12),
    paddingHorizontal: rs(12),
    paddingVertical: rs(6),
    marginRight: rs(8),
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  categoryButtonActive: {
    backgroundColor: Colors.primary.neonCyan,
    borderColor: Colors.primary.neonCyan,
  },
  categoryIcon: {
    fontSize: rf(12),
    marginRight: rs(6),
  },
  categoryText: {
    fontSize: rf(12),
    color: Colors.primary.textSecondary,
    fontWeight: '600',
  },
  categoryTextActive: {
    color: Colors.primary.background,
  },
  gamesContainer: {
    flex: 1,
    paddingHorizontal: rs(15),
  },
  gamesScrollContent: {
    paddingBottom: rs(20),
  },
  gameCardContainer: {
    marginBottom: rs(12),
  },
  gameCard: {
    backgroundColor: Colors.primary.surface,
    borderRadius: isWeb ? webDimensions.spacing.sm : rs(12),
    padding: isWeb ? webDimensions.spacing.sm : rs(16),
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: isWeb ? webDimensions.spacing.xl * 2.5 : rs(80),
  },
  gameCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  gameCardRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  gameIcon: {
    fontSize: isWeb ? webDimensions.fontSize.title : rf(28),
    marginRight: isWeb ? webDimensions.spacing.sm : rs(12),
  },
  gameInfo: {
    flex: 1,
  },
  gameName: {
    fontSize: isWeb ? webDimensions.fontSize.medium : rf(16),
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: isWeb ? webDimensions.spacing.xs : rs(4),
  },
  gameDescription: {
    fontSize: isWeb ? webDimensions.fontSize.small : rf(12),
    color: Colors.primary.textSecondary,
    lineHeight: isWeb ? webDimensions.fontSize.medium : rf(16),
  },
  gameInfoText: {
    fontSize: isWeb ? webDimensions.fontSize.small - 1 : rf(11),
    color: Colors.primary.textSecondary,
    marginBottom: isWeb ? webDimensions.spacing.xs : rs(4),
  },
  gameStatus: {
    fontSize: isWeb ? webDimensions.fontSize.small - 2 : rf(10),
    color: Colors.primary.textSecondary,
  },
  bottomPadding: {
    height: rs(20),
  },
  // Web-specific styles
  webGamesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: webDimensions.spacing.md,
  },
  webGameCardContainer: {
    width: isWeb ? (() => {
      const deviceType = getDeviceType();
      if (deviceType === 'desktop') return '32%';
      if (deviceType === 'tablet') return '48%';
      return '100%';
    })() : '100%',
    marginBottom: webDimensions.spacing.sm,
  },
  webGameCard: {
    minHeight: webDimensions.spacing.xl * 3,
    padding: webDimensions.spacing.sm,
  },
}));
