// Web-specific Games Tab Layout
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import WebGameCard from './WebGameCard';

const { width } = Dimensions.get('window');

interface WebGamesTabProps {
  games: any[];
  onGamePress: (gameId: string) => void;
}

export default function WebGamesTab({ games, onGamePress }: WebGamesTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const router = useRouter();

  const categories = [
    { id: 'all', name: 'All Games', icon: '🎮', count: games.length },
    { id: 'casino', name: 'Casino', icon: '🎰', count: games.filter(g => g.category === 'casino').length },
    { id: 'card', name: 'Card Games', icon: '🃏', count: games.filter(g => g.category === 'card').length },
  ];

  const filteredGames = games.filter(game => {
    const matchesSearch = game.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         game.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || game.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getGridColumns = () => {
    if (width >= 1200) return 4; // Desktop: 4 columns
    if (width >= 768) return 3;  // Tablet: 3 columns
    return 2; // Mobile: 2 columns
  };

  const columns = getGridColumns();
  const cardWidth = (width - 48 - (columns - 1) * 16) / columns;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>🎮 Game Library</Text>
          <Text style={styles.subtitle}>{filteredGames.length} games available</Text>
        </View>
        
        <View style={styles.headerRight}>
          <View style={styles.searchContainer}>
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
      </View>

      {/* Categories */}
      <View style={styles.categoriesSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryCard,
                selectedCategory === category.id && styles.categoryCardActive
              ]}
              onPress={() => setSelectedCategory(category.id)}
            >
              <Text style={styles.categoryIcon}>{category.icon}</Text>
              <View style={styles.categoryInfo}>
                <Text style={[
                  styles.categoryName,
                  selectedCategory === category.id && styles.categoryNameActive
                ]}>
                  {category.name}
                </Text>
                <Text style={[
                  styles.categoryCount,
                  selectedCategory === category.id && styles.categoryCountActive
                ]}>
                  {category.count} games
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Games Grid */}
      <ScrollView style={styles.gamesContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.gamesGrid}>
          {filteredGames.map((game, index) => (
            <View key={game.id} style={[styles.gameCardWrapper, { width: cardWidth }]}>
              <WebGameCard
                title={game.name}
                icon={game.icon}
                description={game.description}
                color={game.color}
                players={game.players.current.toLocaleString()}
                status={game.status}
                featured={index < 3} // Mark first 3 games as featured
                onPress={() => onGamePress(game.id)}
              />
            </View>
          ))}
        </View>
        
        {/* Empty State */}
        {filteredGames.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyTitle}>No games found</Text>
            <Text style={styles.emptyText}>
              Try adjusting your search or category filter
            </Text>
          </View>
        )}
        
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
    paddingVertical: 20,
    backgroundColor: Colors.primary.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary.border,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
    marginTop: 4,
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.primary.border,
    minWidth: 300,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.primary.text,
    marginLeft: 12,
    outline: 'none', // Remove web outline
  },
  categoriesSection: {
    paddingVertical: 20,
    backgroundColor: Colors.primary.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary.border,
  },
  categoriesScroll: {
    paddingHorizontal: 24,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary.card,
    borderRadius: 12,
    padding: 16,
    marginRight: 16,
    borderWidth: 1,
    borderColor: Colors.primary.border,
    minWidth: 160,
  },
  categoryCardActive: {
    backgroundColor: Colors.primary.neonCyan + '20',
    borderColor: Colors.primary.neonCyan,
  },
  categoryIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary.text,
  },
  categoryNameActive: {
    color: Colors.primary.neonCyan,
  },
  categoryCount: {
    fontSize: 12,
    color: Colors.primary.textSecondary,
    marginTop: 2,
  },
  categoryCountActive: {
    color: Colors.primary.neonCyan,
  },
  gamesContainer: {
    flex: 1,
  },
  gamesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 24,
    gap: 16,
  },
  gameCardWrapper: {
    // Individual game card wrapper for consistent sizing
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
    textAlign: 'center',
  },
  bottomPadding: {
    height: 24,
  },
});
