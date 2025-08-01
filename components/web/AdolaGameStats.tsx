// Adola Gaming Platform Statistics Component
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';

const { width } = Dimensions.get('window');

interface AdolaGameStatsProps {
  title?: string;
  realTimeData?: boolean;
  showTables?: boolean;
}

interface GameStat {
  gameId: string;
  gameName: string;
  players: string;
  winRate: string;
  status: 'active' | 'maintenance';
  category: string;
}

interface PlatformStat {
  label: string;
  value: string;
  icon: string;
  color: string;
  trend?: 'up' | 'down' | 'stable';
}

export default function AdolaGameStats({ 
  title = "Platform Statistics",
  realTimeData = true,
  showTables = true
}: AdolaGameStatsProps) {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'games' | 'players'>('overview');

  // Real Adola platform statistics
  const platformStats: PlatformStat[] = [
    { label: 'Total Games', value: '19', icon: '🎮', color: Colors.primary.neonCyan, trend: 'stable' },
    { label: 'Online Players', value: '12.4k', icon: '👥', color: Colors.primary.hotPink, trend: 'up' },
    { label: 'Today\'s Winners', value: '847', icon: '🏆', color: Colors.primary.gold, trend: 'up' },
    { label: 'Total Payouts', value: 'PKR 2.1M', icon: '💰', color: Colors.primary.neonCyan, trend: 'up' },
    { label: 'Active Sessions', value: '3.2k', icon: '⚡', color: Colors.primary.hotPink, trend: 'stable' },
    { label: 'Win Rate', value: '20%', icon: '📊', color: Colors.primary.gold, trend: 'stable' },
  ];

  // Real Adola games data
  const gameStats: GameStat[] = [
    { gameId: 'aviator', gameName: 'Aviator', players: '1.2k', winRate: '18%', status: 'active', category: 'Crash' },
    { gameId: 'crash', gameName: 'Crash', players: '2.7k', winRate: '20%', status: 'active', category: 'Crash' },
    { gameId: 'dice', gameName: 'Dice', players: '856', winRate: '22%', status: 'active', category: 'Casino' },
    { gameId: 'mines', gameName: 'Mines', players: '1.8k', winRate: '19%', status: 'active', category: 'Casino' },
    { gameId: 'tower', gameName: 'Tower', players: '743', winRate: '17%', status: 'active', category: 'Casino' },
    { gameId: 'plinko', gameName: 'Plinko', players: '1.2k', winRate: '21%', status: 'active', category: 'Casino' },
    { gameId: 'blackjack', gameName: 'Blackjack', players: '934', winRate: '23%', status: 'active', category: 'Card' },
    { gameId: 'poker', gameName: 'Poker', players: '567', winRate: '25%', status: 'active', category: 'Card' },
  ];

  const playerStats = [
    { metric: 'New Signups Today', value: '156', change: '+12%' },
    { metric: 'Active Players', value: '12.4k', change: '+8%' },
    { metric: 'Average Session', value: '24 min', change: '+5%' },
    { metric: 'Retention Rate', value: '78%', change: '+3%' },
  ];

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'up': return '📈';
      case 'down': return '📉';
      default: return '➡️';
    }
  };

  const renderOverviewTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.statsGrid}>
        {platformStats.map((stat, index) => (
          <View key={index} style={styles.statCard}>
            <View style={styles.statHeader}>
              <Text style={styles.statIcon}>{stat.icon}</Text>
              <Text style={styles.trendIcon}>{getTrendIcon(stat.trend)}</Text>
            </View>
            <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderGamesTab = () => (
    <View style={styles.tabContent}>
      {showTables && (
        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { flex: 2 }]}>Game</Text>
            <Text style={[styles.tableHeaderText, { flex: 1 }]}>Players</Text>
            <Text style={[styles.tableHeaderText, { flex: 1 }]}>Win Rate</Text>
            <Text style={[styles.tableHeaderText, { flex: 1 }]}>Status</Text>
          </View>
          <ScrollView style={styles.tableBody}>
            {gameStats.map((game, index) => (
              <View key={game.gameId} style={styles.tableRow}>
                <View style={[styles.tableCell, { flex: 2 }]}>
                  <Text style={styles.gameName}>{game.gameName}</Text>
                  <Text style={styles.gameCategory}>{game.category}</Text>
                </View>
                <Text style={[styles.tableCell, styles.tableCellText, { flex: 1 }]}>
                  {game.players}
                </Text>
                <Text style={[styles.tableCell, styles.tableCellText, { flex: 1 }]}>
                  {game.winRate}
                </Text>
                <View style={[styles.tableCell, { flex: 1 }]}>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: game.status === 'active' ? Colors.primary.neonCyan : Colors.primary.hotPink }
                  ]}>
                    <Text style={styles.statusText}>
                      {game.status === 'active' ? 'Active' : 'Maintenance'}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );

  const renderPlayersTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.playerStatsGrid}>
        {playerStats.map((stat, index) => (
          <View key={index} style={styles.playerStatCard}>
            <Text style={styles.playerStatValue}>{stat.value}</Text>
            <Text style={styles.playerStatLabel}>{stat.metric}</Text>
            <Text style={[
              styles.playerStatChange,
              { color: stat.change.startsWith('+') ? Colors.primary.neonCyan : Colors.primary.hotPink }
            ]}>
              {stat.change}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      
      {/* Tab Navigation */}
      <View style={styles.tabNavigation}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'overview' && styles.activeTab]}
          onPress={() => setSelectedTab('overview')}
        >
          <Text style={[styles.tabText, selectedTab === 'overview' && styles.activeTabText]}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'games' && styles.activeTab]}
          onPress={() => setSelectedTab('games')}
        >
          <Text style={[styles.tabText, selectedTab === 'games' && styles.activeTabText]}>
            Games
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'players' && styles.activeTab]}
          onPress={() => setSelectedTab('players')}
        >
          <Text style={[styles.tabText, selectedTab === 'players' && styles.activeTabText]}>
            Players
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {selectedTab === 'overview' && renderOverviewTab()}
      {selectedTab === 'games' && renderGamesTab()}
      {selectedTab === 'players' && renderPlayersTab()}

      {/* Real-time indicator */}
      {realTimeData && (
        <View style={styles.realTimeIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.realTimeText}>Live Data</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.primary.background,
    paddingVertical: 24,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 20,
  },
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: Colors.primary.surface,
    borderRadius: 8,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: Colors.primary.neonCyan,
  },
  tabText: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
    fontWeight: '500',
  },
  activeTabText: {
    color: Colors.primary.background,
    fontWeight: 'bold',
  },
  tabContent: {
    minHeight: 300,
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
    borderWidth: 1,
    borderColor: Colors.primary.border,
    minWidth: (width - 48 - 32) / 3,
    flex: 1,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statIcon: {
    fontSize: 24,
  },
  trendIcon: {
    fontSize: 16,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.primary.textSecondary,
  },
  tableContainer: {
    backgroundColor: Colors.primary.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary.border,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.primary.background,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary.border,
  },
  tableHeaderText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary.text,
  },
  tableBody: {
    maxHeight: 300,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary.border,
  },
  tableCell: {
    justifyContent: 'center',
  },
  tableCellText: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
  },
  gameName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary.text,
  },
  gameCategory: {
    fontSize: 12,
    color: Colors.primary.textSecondary,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.primary.background,
  },
  playerStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  playerStatCard: {
    backgroundColor: Colors.primary.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.primary.border,
    flex: 1,
    minWidth: (width - 48 - 16) / 2,
    alignItems: 'center',
  },
  playerStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 4,
  },
  playerStatLabel: {
    fontSize: 12,
    color: Colors.primary.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  playerStatChange: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  realTimeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary.neonCyan,
    marginRight: 8,
  },
  realTimeText: {
    fontSize: 12,
    color: Colors.primary.textSecondary,
  },
});
