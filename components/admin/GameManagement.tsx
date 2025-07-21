// Game Management Component for Admin Panel
// Implements house edge configuration and game analytics based on requirements document

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AdvancedGameLogicService, GameConfig, EngagementFeatures } from '../../services/advancedGameLogicService';
import { supabase } from '../../lib/supabase';

interface GameAnalytics {
  gameType: string;
  gameName: string;
  totalBets: number;
  totalWagered: number;
  totalWon: number;
  houseProfit: number;
  actualHouseEdge: number;
  averageBet: number;
  uniquePlayers: number;
  popularityRank: number;
}

export default function GameManagement() {
  const [activeTab, setActiveTab] = useState<'configs' | 'analytics' | 'engagement'>('configs');
  const [gameConfigs, setGameConfigs] = useState<{ [key: string]: GameConfig }>({});
  const [engagementFeatures, setEngagementFeatures] = useState<EngagementFeatures | null>(null);
  const [gameAnalytics, setGameAnalytics] = useState<GameAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingConfig, setEditingConfig] = useState<string | null>(null);
  const [tempConfig, setTempConfig] = useState<Partial<GameConfig>>({});

  const gameLogicService = AdvancedGameLogicService.getInstance();

  useEffect(() => {
    loadGameData();
  }, []);

  const loadGameData = async () => {
    try {
      setLoading(true);
      
      // Load game configurations
      const configs = gameLogicService.getAllGameConfigs();
      setGameConfigs(configs);

      // Load engagement features
      const features = gameLogicService.getEngagementFeatures();
      setEngagementFeatures(features);

      // Load game analytics
      await loadGameAnalytics();

    } catch (error) {
      console.error('Error loading game data:', error);
      Alert.alert('Error', 'Failed to load game data');
    } finally {
      setLoading(false);
    }
  };

  const loadGameAnalytics = async () => {
    try {
      const { data: sessions, error } = await supabase
        .from('game_sessions')
        .select('game_id, game_name, bet_amount, win_amount, is_win, user_id')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading game analytics:', error);
        return;
      }

      // Process analytics data
      const analyticsMap: { [key: string]: GameAnalytics } = {};

      sessions?.forEach(session => {
        const gameType = session.game_id;
        if (!analyticsMap[gameType]) {
          analyticsMap[gameType] = {
            gameType,
            gameName: session.game_name,
            totalBets: 0,
            totalWagered: 0,
            totalWon: 0,
            houseProfit: 0,
            actualHouseEdge: 0,
            averageBet: 0,
            uniquePlayers: 0,
            popularityRank: 0,
          };
        }

        const analytics = analyticsMap[gameType];
        analytics.totalBets++;
        analytics.totalWagered += session.bet_amount;
        analytics.totalWon += session.win_amount || 0;
      });

      // Calculate derived metrics
      Object.values(analyticsMap).forEach(analytics => {
        analytics.houseProfit = analytics.totalWagered - analytics.totalWon;
        analytics.actualHouseEdge = analytics.totalWagered > 0 
          ? analytics.houseProfit / analytics.totalWagered 
          : 0;
        analytics.averageBet = analytics.totalBets > 0 
          ? analytics.totalWagered / analytics.totalBets 
          : 0;
      });

      // Sort by popularity (total bets)
      const sortedAnalytics = Object.values(analyticsMap)
        .sort((a, b) => b.totalBets - a.totalBets)
        .map((analytics, index) => ({ ...analytics, popularityRank: index + 1 }));

      setGameAnalytics(sortedAnalytics);
    } catch (error) {
      console.error('Error processing game analytics:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGameData();
    setRefreshing(false);
  };

  const handleEditConfig = (gameType: string) => {
    setEditingConfig(gameType);
    setTempConfig({ ...gameConfigs[gameType] });
  };

  const handleSaveConfig = async () => {
    if (!editingConfig || !tempConfig) return;

    try {
      const success = await gameLogicService.updateGameConfig(editingConfig, tempConfig);
      
      if (success) {
        setGameConfigs(prev => ({
          ...prev,
          [editingConfig]: { ...prev[editingConfig], ...tempConfig }
        }));
        setEditingConfig(null);
        setTempConfig({});
        Alert.alert('Success', 'Game configuration updated successfully');
      } else {
        Alert.alert('Error', 'Failed to update game configuration');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      Alert.alert('Error', 'Failed to save configuration');
    }
  };

  const handleCancelEdit = () => {
    setEditingConfig(null);
    setTempConfig({});
  };

  const handleUpdateEngagementFeature = (feature: keyof EngagementFeatures, value: boolean | number) => {
    if (!engagementFeatures) return;

    const updatedFeatures = { ...engagementFeatures, [feature]: value };
    gameLogicService.updateEngagementFeatures({ [feature]: value });
    setEngagementFeatures(updatedFeatures);
  };

  const renderGameConfigs = () => (
    <ScrollView 
      style={styles.tabContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.sectionTitle}>🎮 Game Configuration</Text>
      <Text style={styles.sectionSubtitle}>
        Configure house edge and win probabilities for each game
      </Text>

      {Object.entries(gameConfigs).map(([gameType, config]) => (
        <View key={gameType} style={styles.configCard}>
          <View style={styles.configHeader}>
            <Text style={styles.configTitle}>{config.name}</Text>
            <View style={styles.configActions}>
              <Switch
                value={config.enabled}
                onValueChange={(value) => {
                  if (editingConfig === gameType) {
                    setTempConfig(prev => ({ ...prev, enabled: value }));
                  } else {
                    gameLogicService.updateGameConfig(gameType, { enabled: value });
                    setGameConfigs(prev => ({
                      ...prev,
                      [gameType]: { ...prev[gameType], enabled: value }
                    }));
                  }
                }}
                trackColor={{ false: '#767577', true: '#007AFF' }}
              />
              {editingConfig === gameType ? (
                <View style={styles.editActions}>
                  <TouchableOpacity style={styles.saveButton} onPress={handleSaveConfig}>
                    <Ionicons name="checkmark" size={20} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelButton} onPress={handleCancelEdit}>
                    <Ionicons name="close" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => handleEditConfig(gameType)}
                >
                  <Ionicons name="pencil" size={20} color="#007AFF" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.configDetails}>
            <View style={styles.configRow}>
              <Text style={styles.configLabel}>House Edge:</Text>
              {editingConfig === gameType ? (
                <TextInput
                  style={styles.configInput}
                  value={(tempConfig.houseEdge || 0).toString()}
                  onChangeText={(text) => setTempConfig(prev => ({ 
                    ...prev, 
                    houseEdge: parseFloat(text) || 0 
                  }))}
                  keyboardType="numeric"
                  placeholder="0.05"
                />
              ) : (
                <Text style={styles.configValue}>
                  {(config.houseEdge * 100).toFixed(2)}%
                </Text>
              )}
            </View>

            <View style={styles.configRow}>
              <Text style={styles.configLabel}>Base Win Probability:</Text>
              {editingConfig === gameType ? (
                <TextInput
                  style={styles.configInput}
                  value={(tempConfig.baseWinProbability || 0).toString()}
                  onChangeText={(text) => setTempConfig(prev => ({ 
                    ...prev, 
                    baseWinProbability: parseFloat(text) || 0 
                  }))}
                  keyboardType="numeric"
                  placeholder="0.45"
                />
              ) : (
                <Text style={styles.configValue}>
                  {(config.baseWinProbability * 100).toFixed(1)}%
                </Text>
              )}
            </View>

            <View style={styles.configRow}>
              <Text style={styles.configLabel}>Bet Range:</Text>
              <Text style={styles.configValue}>
                PKR {config.minBet.toLocaleString()} - {config.maxBet.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );

  const renderAnalytics = () => (
    <ScrollView 
      style={styles.tabContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.sectionTitle}>📊 Game Analytics</Text>
      <Text style={styles.sectionSubtitle}>
        Performance metrics and profitability analysis
      </Text>

      {gameAnalytics.map((analytics) => (
        <View key={analytics.gameType} style={styles.analyticsCard}>
          <View style={styles.analyticsHeader}>
            <Text style={styles.analyticsTitle}>
              #{analytics.popularityRank} {analytics.gameName}
            </Text>
            <Text style={styles.analyticsProfit}>
              PKR {analytics.houseProfit.toLocaleString()}
            </Text>
          </View>

          <View style={styles.analyticsGrid}>
            <View style={styles.analyticsItem}>
              <Text style={styles.analyticsLabel}>Total Bets</Text>
              <Text style={styles.analyticsValue}>{analytics.totalBets.toLocaleString()}</Text>
            </View>
            <View style={styles.analyticsItem}>
              <Text style={styles.analyticsLabel}>Total Wagered</Text>
              <Text style={styles.analyticsValue}>PKR {analytics.totalWagered.toLocaleString()}</Text>
            </View>
            <View style={styles.analyticsItem}>
              <Text style={styles.analyticsLabel}>Total Won</Text>
              <Text style={styles.analyticsValue}>PKR {analytics.totalWon.toLocaleString()}</Text>
            </View>
            <View style={styles.analyticsItem}>
              <Text style={styles.analyticsLabel}>Actual House Edge</Text>
              <Text style={[
                styles.analyticsValue,
                { color: analytics.actualHouseEdge > 0 ? '#00ff00' : '#ff6666' }
              ]}>
                {(analytics.actualHouseEdge * 100).toFixed(2)}%
              </Text>
            </View>
            <View style={styles.analyticsItem}>
              <Text style={styles.analyticsLabel}>Average Bet</Text>
              <Text style={styles.analyticsValue}>PKR {analytics.averageBet.toFixed(0)}</Text>
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );

  const renderEngagementFeatures = () => (
    <ScrollView
      style={styles.tabContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.sectionTitle}>🎯 Engagement Features</Text>
      <Text style={styles.sectionSubtitle}>
        Configure player engagement and retention features
      </Text>

      {engagementFeatures && (
        <View style={styles.engagementCard}>
          <View style={styles.engagementItem}>
            <View style={styles.engagementHeader}>
              <Text style={styles.engagementTitle}>Loss Recovery Mode</Text>
              <Switch
                value={engagementFeatures.lossRecoveryMode}
                onValueChange={(value) => handleUpdateEngagementFeature('lossRecoveryMode', value)}
                trackColor={{ false: '#767577', true: '#007AFF' }}
              />
            </View>
            <Text style={styles.engagementDescription}>
              Temporarily increase win probability for players on losing streaks
            </Text>
            <View style={styles.engagementConfig}>
              <Text style={styles.configLabel}>Max Recovery Bonus:</Text>
              <Text style={styles.configValue}>
                {(engagementFeatures.maxRecoveryBonus * 100).toFixed(1)}%
              </Text>
            </View>
          </View>

          <View style={styles.engagementItem}>
            <View style={styles.engagementHeader}>
              <Text style={styles.engagementTitle}>Win Streak Balance</Text>
              <Switch
                value={engagementFeatures.winStreakBoost}
                onValueChange={(value) => handleUpdateEngagementFeature('winStreakBoost', value)}
                trackColor={{ false: '#767577', true: '#007AFF' }}
              />
            </View>
            <Text style={styles.engagementDescription}>
              Reduce win probability after consecutive wins to maintain balance
            </Text>
            <View style={styles.engagementConfig}>
              <Text style={styles.configLabel}>Max Streak Reduction:</Text>
              <Text style={styles.configValue}>
                {(engagementFeatures.maxStreakReduction * 100).toFixed(1)}%
              </Text>
            </View>
          </View>

          <View style={styles.engagementItem}>
            <View style={styles.engagementHeader}>
              <Text style={styles.engagementTitle}>Near-Miss Effects</Text>
              <Switch
                value={engagementFeatures.nearMissEnabled}
                onValueChange={(value) => handleUpdateEngagementFeature('nearMissEnabled', value)}
                trackColor={{ false: '#767577', true: '#007AFF' }}
              />
            </View>
            <Text style={styles.engagementDescription}>
              Show near-miss animations and visual psychology triggers
            </Text>
          </View>

          <View style={styles.engagementItem}>
            <View style={styles.engagementHeader}>
              <Text style={styles.engagementTitle}>Daily Bonuses</Text>
              <Switch
                value={engagementFeatures.dailyBonusEnabled}
                onValueChange={(value) => handleUpdateEngagementFeature('dailyBonusEnabled', value)}
                trackColor={{ false: '#767577', true: '#007AFF' }}
              />
            </View>
            <Text style={styles.engagementDescription}>
              Enable daily rewards and time-based engagement features
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading game management...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'configs' && styles.activeTab]}
          onPress={() => setActiveTab('configs')}
        >
          <Ionicons
            name="settings"
            size={20}
            color={activeTab === 'configs' ? '#fff' : '#007AFF'}
          />
          <Text style={[styles.tabText, activeTab === 'configs' && styles.activeTabText]}>
            Configs
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'analytics' && styles.activeTab]}
          onPress={() => setActiveTab('analytics')}
        >
          <Ionicons
            name="analytics"
            size={20}
            color={activeTab === 'analytics' ? '#fff' : '#007AFF'}
          />
          <Text style={[styles.tabText, activeTab === 'analytics' && styles.activeTabText]}>
            Analytics
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'engagement' && styles.activeTab]}
          onPress={() => setActiveTab('engagement')}
        >
          <Ionicons
            name="heart"
            size={20}
            color={activeTab === 'engagement' ? '#fff' : '#007AFF'}
          />
          <Text style={[styles.tabText, activeTab === 'engagement' && styles.activeTabText]}>
            Engagement
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'configs' && renderGameConfigs()}
      {activeTab === 'analytics' && renderAnalytics()}
      {activeTab === 'engagement' && renderEngagementFeatures()}
    </View>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  } as const,
  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  } as const,
  tabContainer: {
    flexDirection: 'row' as const,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 15,
    paddingHorizontal: 10,
  },
  activeTab: {
    backgroundColor: '#007AFF',
  } as const,
  tabText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#007AFF',
  },
  activeTabText: {
    color: '#fff',
  } as const,
  tabContent: {
    flex: 1,
    padding: 16,
  } as const,
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#333',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  } as const,
  configCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  } as const,
  configHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  configTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#333',
  } as const,
  configActions: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  editButton: {
    marginLeft: 12,
    padding: 8,
  } as const,
  editActions: {
    flexDirection: 'row' as const,
    marginLeft: 12,
  },
  saveButton: {
    backgroundColor: '#00ff00',
    borderRadius: 6,
    padding: 8,
    marginRight: 8,
  } as const,
  cancelButton: {
    backgroundColor: '#ff6666',
    borderRadius: 6,
    padding: 8,
  } as const,
  configDetails: {
    gap: 8,
  } as const,
  configRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  configLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500' as const,
  } as const,
  configValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600' as const,
  } as const,
  configInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 8,
    minWidth: 80,
    textAlign: 'center' as const,
    fontSize: 14,
  } as const,
  analyticsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  } as const,
  analyticsHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 16,
  },
  analyticsTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#333',
  } as const,
  analyticsProfit: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: '#00ff00',
  } as const,
  analyticsGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 12,
  },
  analyticsItem: {
    flex: 1,
    minWidth: '45%',
  } as const,
  analyticsLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  } as const,
  analyticsValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#333',
  } as const,
  engagementCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  } as const,
  engagementItem: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  } as const,
  engagementHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 8,
  },
  engagementTitle: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: '#333',
  } as const,
  engagementDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  } as const,
  engagementConfig: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
};
