// Game Statistics Component for Admin Panel
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Dimensions,
  TextInput,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

const { width } = Dimensions.get('window');

interface PlayerGameActivity {
  userId: string;
  username: string;
  email: string;
  currentGame: string | null;
  lastGameTime: string;
  totalGamesPlayed: number;
  totalWagered: number;
  totalWon: number;
  netProfit: number;
  winRate: number;
  averageBet: number;
  isOnline: boolean;
  favoriteGame: string;
  currentBalance: number;
  // Enhanced daily tracking
  todayGamesPlayed: number;
  todayWagered: number;
  todayWon: number;
  todayNetProfit: number;
  last7DaysGames: number;
  last7DaysWagered: number;
  gamesPerDay: { [date: string]: { games: number; wagered: number; won: number } };
}

interface GamePerformance {
  gameId: string;
  gameName: string;
  totalBets: number;
  totalWagered: number;
  totalWon: number;
  houseProfit: number;
  houseEdge: number;
  uniquePlayers: number;
  averageBet: number;
  winRate: number;
  popularityRank: number;
  last24hBets: number;
  last24hProfit: number;
}

interface LiveGameSession {
  sessionId: string;
  userId: string;
  username: string;
  gameId: string;
  gameName: string;
  betAmount: number;
  currentMultiplier?: number;
  sessionStart: string;
  isActive: boolean;
  totalBetsInSession: number;
  sessionProfit: number;
}

export default function GameStatistics() {
  console.log('📊 GameStatistics component loaded');

  const [activeTab, setActiveTab] = useState<'players' | 'games' | 'live'>('players');
  const [playerActivities, setPlayerActivities] = useState<PlayerGameActivity[]>([]);
  const [gamePerformances, setGamePerformances] = useState<GamePerformance[]>([]);
  const [liveSessions, setLiveSessions] = useState<LiveGameSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Search functionality
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPlayerActivities, setFilteredPlayerActivities] = useState<PlayerGameActivity[]>([]);

  useEffect(() => {
    loadGameStatistics();
    // Set up auto-refresh every 30 seconds for live data
    const interval = setInterval(loadGameStatistics, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadGameStatistics = async () => {
    try {
      console.log('📊 Loading game statistics...');
      setLoading(true);

      await Promise.all([
        loadPlayerActivities(),
        loadGamePerformances(),
        loadLiveSessions()
      ]);

      setLastUpdated(new Date());
    } catch (error) {
      console.error('❌ Error loading game statistics:', error);
      Alert.alert('Error', 'Failed to load game statistics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadPlayerActivities = async () => {
    try {
      // First, let's check what tables exist and their structure
      console.log('📊 Checking game sessions table...');

      // Try to get a small sample first to check structure
      const { data: sampleData, error: sampleError } = await supabase
        .from('game_sessions')
        .select('*')
        .limit(1);

      if (sampleError) {
        console.error('❌ Error accessing game_sessions table:', sampleError);
        // Maybe the table has a different name? Let's try alternatives
        console.log('📊 Trying alternative table names...');
      } else {
        console.log('📊 Sample game session structure:', sampleData?.[0]);
      }

      // Get user game statistics with recent activity (focus on today + recent history)
      const { data: gameStats, error: gameError } = await supabase
        .from('game_sessions')
        .select(`
          user_id,
          game_id,
          game_name,
          bet_amount,
          win_amount,
          is_win,
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(10000); // Much higher limit to get all historical data

      if (gameError) {
        console.error('❌ Error fetching game sessions:', gameError);
        throw gameError;
      }

      // Get user details
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('id, username, email, auth_user_id, created_at');

      if (userError) {
        console.error('❌ Error fetching users:', userError);
        throw userError;
      }

      console.log('📊 Player activities user data:', users?.slice(0, 3));
      console.log(`📊 Total users found: ${users?.length || 0}`);
      console.log(`📊 Total game sessions found: ${gameStats?.length || 0}`);
      console.log('📊 Sample game sessions:', gameStats?.slice(0, 5).map(gs => ({
        user_id: gs.user_id,
        game_name: gs.game_name,
        bet_amount: gs.bet_amount,
        win_amount: gs.win_amount,
        is_win: gs.is_win,
        created_at: gs.created_at
      })));

      // Get wallet balances
      const { data: wallets, error: walletError } = await supabase
        .from('wallets')
        .select('user_id, balance');

      if (walletError) throw walletError;

      // Process player activities
      const playerMap: { [key: string]: PlayerGameActivity } = {};

      users?.forEach(user => {
        // Priority: username > full email > full auth_user_id > user ID
        let displayName;

        if (user.username && user.username.trim()) {
          displayName = user.username.trim(); // Show complete username
        } else if (user.email && user.email.trim()) {
          displayName = user.email.trim(); // Show complete email
        } else if (user.auth_user_id && user.auth_user_id.trim()) {
          displayName = user.auth_user_id.trim(); // Show complete auth_user_id
        } else {
          displayName = `UserID-${user.id}`; // Show complete user ID with prefix
        }

        playerMap[user.id] = {
          userId: user.id,
          username: displayName,
          email: user.email || 'No email',
          currentGame: null,
          lastGameTime: 'Never',
          totalGamesPlayed: 0,
          totalWagered: 0,
          totalWon: 0,
          netProfit: 0,
          winRate: 0,
          averageBet: 0,
          isOnline: false,
          favoriteGame: 'None',
          currentBalance: 0,
          // Enhanced daily tracking
          todayGamesPlayed: 0,
          todayWagered: 0,
          todayWon: 0,
          todayNetProfit: 0,
          last7DaysGames: 0,
          last7DaysWagered: 0,
          gamesPerDay: {},
        };
      });

      // Add wallet balances
      wallets?.forEach(wallet => {
        if (playerMap[wallet.user_id]) {
          playerMap[wallet.user_id].currentBalance = wallet.balance || 0;
        }
      });

      // Process game sessions with enhanced daily tracking
      const gameCountMap: { [key: string]: { [game: string]: number } } = {};
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      console.log('📊 Processing game sessions...');
      let processedSessions = 0;
      let skippedSessions = 0;

      gameStats?.forEach(session => {
        const player = playerMap[session.user_id];
        if (!player) {
          skippedSessions++;
          return;
        }
        processedSessions++;

        const sessionTime = new Date(session.created_at);
        const sessionDate = new Date(sessionTime);
        sessionDate.setHours(0, 0, 0, 0);
        const dateKey = sessionDate.toISOString().split('T')[0];

        // Total stats
        player.totalGamesPlayed++;
        player.totalWagered += session.bet_amount || 0;
        player.totalWon += session.win_amount || 0;
        player.netProfit = player.totalWon - player.totalWagered;
        player.winRate = player.totalGamesPlayed > 0 ? (player.totalWon / player.totalWagered) * 100 : 0;
        player.averageBet = player.totalGamesPlayed > 0 ? player.totalWagered / player.totalGamesPlayed : 0;

        // Daily tracking
        if (sessionTime >= todayDate) {
          player.todayGamesPlayed++;
          player.todayWagered += session.bet_amount || 0;
          player.todayWon += session.win_amount || 0;
          player.todayNetProfit = player.todayWon - player.todayWagered;
        }

        // Last 7 days tracking
        if (sessionTime >= sevenDaysAgo) {
          player.last7DaysGames++;
          player.last7DaysWagered += session.bet_amount || 0;
        }

        // Games per day tracking
        if (!player.gamesPerDay[dateKey]) {
          player.gamesPerDay[dateKey] = { games: 0, wagered: 0, won: 0 };
        }
        player.gamesPerDay[dateKey].games++;
        player.gamesPerDay[dateKey].wagered += session.bet_amount || 0;
        player.gamesPerDay[dateKey].won += session.win_amount || 0;

        // Track last game time
        if (!player.lastGameTime || player.lastGameTime === 'Never') {
          player.lastGameTime = new Date(session.created_at).toLocaleString();
          player.currentGame = session.game_name;
        }

        // Track favorite game
        if (!gameCountMap[session.user_id]) {
          gameCountMap[session.user_id] = {};
        }
        gameCountMap[session.user_id][session.game_id] = (gameCountMap[session.user_id][session.game_id] || 0) + 1;

        // Check if online (played in last 10 minutes)
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        if (sessionTime > tenMinutesAgo) {
          player.isOnline = true;
        }
      });

      // Determine favorite games
      Object.keys(gameCountMap).forEach(userId => {
        const games = gameCountMap[userId];
        const favoriteGame = Object.keys(games).reduce((a, b) => games[a] > games[b] ? a : b);
        if (playerMap[userId]) {
          playerMap[userId].favoriteGame = favoriteGame || 'None';
        }
      });

      console.log(`📊 Session processing complete: ${processedSessions} processed, ${skippedSessions} skipped`);
      console.log('📊 Sample processed player:', Object.values(playerMap).find(p => p.totalGamesPlayed > 0));

      // Show ALL users - those who have played games and those who haven't
      const activities = Object.values(playerMap)
        .sort((a, b) => {
          // Sort by total wagered first, then by total games played, then by creation date
          if (b.totalWagered !== a.totalWagered) {
            return b.totalWagered - a.totalWagered;
          }
          if (b.totalGamesPlayed !== a.totalGamesPlayed) {
            return b.totalGamesPlayed - a.totalGamesPlayed;
          }
          return 0;
        });

      setPlayerActivities(activities);
      setFilteredPlayerActivities(activities); // Initialize filtered list
      console.log(`📊 Loaded ${activities.length} player activities (${activities.filter(p => p.totalGamesPlayed > 0).length} have played games)`);
      console.log('📊 Sample activities:', activities.slice(0, 3).map(p => ({
        username: p.username,
        totalGames: p.totalGamesPlayed,
        totalWagered: p.totalWagered
      })));
    } catch (error) {
      console.error('❌ Error loading player activities:', error);
    }
  };

  const loadGamePerformances = async () => {
    try {
      // Get all game sessions
      const { data: sessions, error } = await supabase
        .from('game_sessions')
        .select('game_id, game_name, bet_amount, win_amount, is_win, created_at, user_id')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Process game performance data
      const gameMap: { [key: string]: GamePerformance } = {};
      const userGameMap: { [key: string]: Set<string> } = {}; // Track unique players per game
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

      sessions?.forEach(session => {
        const gameId = session.game_id;
        
        if (!gameMap[gameId]) {
          gameMap[gameId] = {
            gameId,
            gameName: session.game_name || gameId,
            totalBets: 0,
            totalWagered: 0,
            totalWon: 0,
            houseProfit: 0,
            houseEdge: 0,
            uniquePlayers: 0,
            averageBet: 0,
            winRate: 0,
            popularityRank: 0,
            last24hBets: 0,
            last24hProfit: 0,
          };
          userGameMap[gameId] = new Set();
        }

        const game = gameMap[gameId];
        game.totalBets++;
        game.totalWagered += session.bet_amount || 0;
        game.totalWon += session.win_amount || 0;
        userGameMap[gameId].add(session.user_id);

        // Last 24h stats
        const sessionTime = new Date(session.created_at);
        if (sessionTime > last24h) {
          game.last24hBets++;
          game.last24hProfit += (session.bet_amount || 0) - (session.win_amount || 0);
        }
      });

      // Calculate derived metrics
      Object.keys(gameMap).forEach(gameId => {
        const game = gameMap[gameId];
        game.houseProfit = game.totalWagered - game.totalWon;
        game.houseEdge = game.totalWagered > 0 ? (game.houseProfit / game.totalWagered) * 100 : 0;
        game.uniquePlayers = userGameMap[gameId].size;
        game.averageBet = game.totalBets > 0 ? game.totalWagered / game.totalBets : 0;
        game.winRate = game.totalBets > 0 ? (game.totalWon / game.totalWagered) * 100 : 0;
      });

      // Sort by total wagered and assign popularity ranks
      const performances = Object.values(gameMap)
        .sort((a, b) => b.totalWagered - a.totalWagered)
        .map((game, index) => ({ ...game, popularityRank: index + 1 }));

      setGamePerformances(performances);
      console.log(`📊 Loaded ${performances.length} game performances`);
    } catch (error) {
      console.error('❌ Error loading game performances:', error);
    }
  };

  const loadLiveSessions = async () => {
    try {
      // Get recent sessions (last 30 minutes) to simulate live sessions
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      
      const { data: sessions, error } = await supabase
        .from('game_sessions')
        .select(`
          id,
          user_id,
          game_id,
          game_name,
          bet_amount,
          win_amount,
          created_at
        `)
        .gte('created_at', thirtyMinutesAgo.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get user details for live sessions
      const userIds = [...new Set(sessions?.map(s => s.user_id) || [])];

      if (userIds.length === 0) {
        setLiveSessions([]);
        console.log('📊 No live sessions found');
        return;
      }

      const { data: users, error: userError } = await supabase
        .from('users')
        .select('id, username, email, auth_user_id')
        .in('id', userIds);

      if (userError) {
        console.error('❌ Error fetching users for live sessions:', userError);
        // Continue with unknown usernames rather than failing completely
      }

      console.log('📊 Live sessions user data:', { userIds, users });
      console.log('📊 Sample user data:', users?.slice(0, 2).map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        auth_user_id: u.auth_user_id
      })));

      const userMap = users?.reduce((acc, user) => {
        // Priority: username > full email > full auth_user_id > user ID
        let displayName;

        if (user.username && user.username.trim()) {
          displayName = user.username.trim(); // Show complete username
        } else if (user.email && user.email.trim()) {
          displayName = user.email.trim(); // Show complete email
        } else if (user.auth_user_id && user.auth_user_id.trim()) {
          displayName = user.auth_user_id.trim(); // Show complete auth_user_id
        } else {
          displayName = `UserID-${user.id}`; // Show complete user ID with prefix
        }

        acc[user.id] = displayName;
        return acc;
      }, {} as { [key: string]: string }) || {};

      // Add fallback for any missing users
      userIds.forEach(userId => {
        if (!userMap[userId]) {
          userMap[userId] = `UserID-${userId}`; // Show complete user ID
        }
      });

      // Process live sessions
      const sessionMap: { [key: string]: LiveGameSession } = {};

      sessions?.forEach(session => {
        const key = `${session.user_id}-${session.game_id}`;
        
        if (!sessionMap[key]) {
          sessionMap[key] = {
            sessionId: session.id,
            userId: session.user_id,
            username: userMap[session.user_id] || 'Unknown',
            gameId: session.game_id,
            gameName: session.game_name || session.game_id,
            betAmount: session.bet_amount || 0,
            sessionStart: new Date(session.created_at).toLocaleString(),
            isActive: true,
            totalBetsInSession: 0,
            sessionProfit: 0,
          };
        }

        const liveSession = sessionMap[key];
        liveSession.totalBetsInSession++;
        liveSession.sessionProfit += (session.win_amount || 0) - (session.bet_amount || 0);
        liveSession.betAmount = session.bet_amount || 0; // Latest bet amount
      });

      const liveSessions = Object.values(sessionMap)
        .sort((a, b) => new Date(b.sessionStart).getTime() - new Date(a.sessionStart).getTime());

      setLiveSessions(liveSessions);
      console.log(`📊 Loaded ${liveSessions.length} live sessions`);
      console.log('📊 Live sessions sample:', liveSessions.slice(0, 2));
    } catch (error) {
      console.error('❌ Error loading live sessions:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadGameStatistics();
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert('Copied!', `${label} copied to clipboard`);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      Alert.alert('Error', 'Failed to copy to clipboard');
    }
  };

  // Search functionality
  const handleSearch = (query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setFilteredPlayerActivities(playerActivities);
      return;
    }

    const filtered = playerActivities.filter(player => {
      const searchTerm = query.toLowerCase().trim();

      // Search in username
      const usernameMatch = player.username.toLowerCase().includes(searchTerm);

      // Search in email
      const emailMatch = player.email.toLowerCase().includes(searchTerm);

      // Search in user ID (last 8 characters for easier searching)
      const userIdMatch = player.userId.toLowerCase().includes(searchTerm);

      return usernameMatch || emailMatch || userIdMatch;
    });

    setFilteredPlayerActivities(filtered);
    console.log(`🔍 Search "${query}" found ${filtered.length} players`);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setFilteredPlayerActivities(playerActivities);
  };

  const renderTabButton = (tab: 'players' | 'games' | 'live', title: string, icon: string) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
      onPress={() => setActiveTab(tab)}
    >
      <Text style={[styles.tabIcon, activeTab === tab && styles.activeTabIcon]}>{icon}</Text>
      <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{title}</Text>
    </TouchableOpacity>
  );

  const renderPlayerActivities = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>👥 All Platform Players</Text>
        <Text style={styles.sectionSubtitle}>
          {playerActivities.length} total players • {playerActivities.filter(p => p.totalGamesPlayed > 0).length} have played games • {playerActivities.filter(p => p.isOnline).length} online now
        </Text>
        <Text style={styles.sectionSubtitle}>
          Today: {playerActivities.reduce((sum, p) => sum + p.todayGamesPlayed, 0)} games • PKR {playerActivities.reduce((sum, p) => sum + p.todayWagered, 0).toLocaleString()} wagered
        </Text>
        <Text style={styles.sectionSubtitle}>
          All-time: PKR {playerActivities.reduce((sum, p) => sum + p.totalWagered, 0).toLocaleString()} total wagered
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color={Colors.primary.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by username, email, or user ID..."
            placeholderTextColor={Colors.primary.textSecondary}
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearSearchButton}>
              <Ionicons name="close-circle" size={20} color={Colors.primary.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        {searchQuery.length > 0 && (
          <Text style={styles.searchResults}>
            {filteredPlayerActivities.length} of {playerActivities.length} players found
          </Text>
        )}
      </View>

      {filteredPlayerActivities.map((player, index) => (
        <View key={player.userId} style={styles.playerCard}>
          <View style={styles.playerHeader}>
            <View style={styles.playerInfo}>
              <View style={styles.playerNameRow}>
                <Text style={styles.playerName}>{player.username}</Text>
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={() => copyToClipboard(player.username, 'Username')}
                >
                  <Ionicons name="copy" size={14} color={Colors.primary.textSecondary} />
                </TouchableOpacity>
                {player.isOnline && <View style={styles.onlineIndicator} />}
              </View>
              <View style={styles.emailRow}>
                <Text style={styles.playerEmail}>{player.email}</Text>
                {player.email !== 'No email' && (
                  <TouchableOpacity
                    style={styles.copyButton}
                    onPress={() => copyToClipboard(player.email, 'Email')}
                  >
                    <Ionicons name="copy" size={12} color={Colors.primary.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.userIdRow}>
                <Text style={styles.playerUserId}>ID: {player.userId}</Text>
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={() => copyToClipboard(player.userId, 'User ID')}
                >
                  <Ionicons name="copy" size={12} color={Colors.primary.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.playerStats}>
              <Text style={styles.playerBalance}>PKR {player.currentBalance.toLocaleString()}</Text>
              <Text style={styles.playerProfit}>
                Net: {player.netProfit >= 0 ? '+' : ''}PKR {player.netProfit.toLocaleString()}
              </Text>
            </View>
          </View>

          <View style={styles.playerDetails}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Current Game:</Text>
              <Text style={styles.statValue}>{player.currentGame || 'None'}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Favorite Game:</Text>
              <Text style={styles.statValue}>{player.favoriteGame}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Last Played:</Text>
              <Text style={styles.statValue}>{player.lastGameTime}</Text>
            </View>
            {player.totalGamesPlayed > 0 ? (
              <>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Today's Games:</Text>
                  <Text style={styles.statValue}>{player.todayGamesPlayed} games • PKR {player.todayWagered.toLocaleString()}</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Today's P&L:</Text>
                  <Text style={[styles.statValue, { color: player.todayNetProfit >= 0 ? Colors.primary.neonCyan : Colors.primary.hotPink }]}>
                    {player.todayNetProfit >= 0 ? '+' : ''}PKR {player.todayNetProfit.toLocaleString()}
                  </Text>
                </View>
              </>
            ) : (
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Status:</Text>
                <Text style={[styles.statValue, { color: Colors.primary.textSecondary }]}>No games played yet</Text>
              </View>
            )}
          </View>

          <View style={styles.playerMetrics}>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{player.totalGamesPlayed}</Text>
              <Text style={styles.metricLabel}>Total Games</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{player.todayGamesPlayed}</Text>
              <Text style={styles.metricLabel}>Today</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>PKR {player.totalWagered.toLocaleString()}</Text>
              <Text style={styles.metricLabel}>Total Wagered</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{player.winRate.toFixed(1)}%</Text>
              <Text style={styles.metricLabel}>Win Rate</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{player.last7DaysGames}</Text>
              <Text style={styles.metricLabel}>7-Day Games</Text>
            </View>
          </View>
        </View>
      ))}

      {/* Empty Search Results */}
      {searchQuery.length > 0 && filteredPlayerActivities.length === 0 && (
        <View style={styles.emptySearchState}>
          <Ionicons name="search" size={48} color={Colors.primary.textSecondary} />
          <Text style={styles.emptySearchTitle}>No players found</Text>
          <Text style={styles.emptySearchText}>
            No players match "{searchQuery}". Try searching by username, email, or user ID.
          </Text>
          <TouchableOpacity style={styles.clearSearchButtonLarge} onPress={clearSearch}>
            <Text style={styles.clearSearchButtonText}>Clear Search</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );

  const renderGamePerformances = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>🎮 Game Performance Analytics</Text>
        <Text style={styles.sectionSubtitle}>
          {gamePerformances.length} games • House profit: PKR {gamePerformances.reduce((sum, g) => sum + g.houseProfit, 0).toLocaleString()}
        </Text>
      </View>

      {gamePerformances.map((game, index) => (
        <View key={game.gameId} style={styles.gameCard}>
          <View style={styles.gameHeader}>
            <View style={styles.gameInfo}>
              <Text style={styles.gameName}>{game.gameName}</Text>
              <Text style={styles.gameRank}>#{game.popularityRank} Most Popular</Text>
            </View>
            <View style={styles.gameProfit}>
              <Text style={[styles.profitAmount, { color: game.houseProfit >= 0 ? Colors.primary.neonCyan : Colors.primary.hotPink }]}>
                PKR {game.houseProfit.toLocaleString()}
              </Text>
              <Text style={styles.profitLabel}>House Profit</Text>
            </View>
          </View>

          <View style={styles.gameMetrics}>
            <View style={styles.gameMetric}>
              <Text style={styles.gameMetricValue}>{game.totalBets.toLocaleString()}</Text>
              <Text style={styles.gameMetricLabel}>Total Bets</Text>
            </View>
            <View style={styles.gameMetric}>
              <Text style={styles.gameMetricValue}>PKR {game.totalWagered.toLocaleString()}</Text>
              <Text style={styles.gameMetricLabel}>Wagered</Text>
            </View>
            <View style={styles.gameMetric}>
              <Text style={styles.gameMetricValue}>{game.uniquePlayers}</Text>
              <Text style={styles.gameMetricLabel}>Players</Text>
            </View>
            <View style={styles.gameMetric}>
              <Text style={styles.gameMetricValue}>{game.houseEdge.toFixed(1)}%</Text>
              <Text style={styles.gameMetricLabel}>House Edge</Text>
            </View>
          </View>

          <View style={styles.gameDetails}>
            <View style={styles.gameDetailRow}>
              <Text style={styles.gameDetailLabel}>Average Bet:</Text>
              <Text style={styles.gameDetailValue}>PKR {game.averageBet.toFixed(0)}</Text>
            </View>
            <View style={styles.gameDetailRow}>
              <Text style={styles.gameDetailLabel}>Player Win Rate:</Text>
              <Text style={styles.gameDetailValue}>{game.winRate.toFixed(1)}%</Text>
            </View>
            <View style={styles.gameDetailRow}>
              <Text style={styles.gameDetailLabel}>Last 24h Bets:</Text>
              <Text style={styles.gameDetailValue}>{game.last24hBets}</Text>
            </View>
            <View style={styles.gameDetailRow}>
              <Text style={styles.gameDetailLabel}>Last 24h Profit:</Text>
              <Text style={[styles.gameDetailValue, { color: game.last24hProfit >= 0 ? Colors.primary.neonCyan : Colors.primary.hotPink }]}>
                PKR {game.last24hProfit.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );

  const renderLiveSessions = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>🔴 Live Game Sessions</Text>
        <Text style={styles.sectionSubtitle}>
          {liveSessions.length} active sessions • Last updated: {lastUpdated.toLocaleTimeString()}
        </Text>
      </View>

      {liveSessions.map((session, index) => (
        <View key={`${session.userId}-${session.gameId}`} style={styles.sessionCard}>
          <View style={styles.sessionHeader}>
            <View style={styles.sessionInfo}>
              <View style={styles.sessionNameRow}>
                <Text style={styles.sessionUsername}>{session.username}</Text>
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={() => copyToClipboard(session.username, 'Username')}
                >
                  <Ionicons name="copy" size={14} color={Colors.primary.textSecondary} />
                </TouchableOpacity>
                <View style={styles.liveIndicator} />
              </View>
              <Text style={styles.sessionGame}>{session.gameName}</Text>
              <View style={styles.userIdRow}>
                <Text style={styles.sessionUserId}>User ID: {session.userId}</Text>
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={() => copyToClipboard(session.userId, 'User ID')}
                >
                  <Ionicons name="copy" size={12} color={Colors.primary.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.sessionStats}>
              <Text style={styles.sessionBet}>PKR {session.betAmount.toLocaleString()}</Text>
              <Text style={styles.sessionLabel}>Latest Bet</Text>
            </View>
          </View>

          <View style={styles.sessionDetails}>
            <View style={styles.sessionDetailRow}>
              <Text style={styles.sessionDetailLabel}>Session Started:</Text>
              <Text style={styles.sessionDetailValue}>{session.sessionStart}</Text>
            </View>
            <View style={styles.sessionDetailRow}>
              <Text style={styles.sessionDetailLabel}>Total Bets in Session:</Text>
              <Text style={styles.sessionDetailValue}>{session.totalBetsInSession}</Text>
            </View>
            <View style={styles.sessionDetailRow}>
              <Text style={styles.sessionDetailLabel}>Session Wagered:</Text>
              <Text style={styles.sessionDetailValue}>PKR {(session.betAmount * session.totalBetsInSession).toLocaleString()}</Text>
            </View>
            <View style={styles.sessionDetailRow}>
              <Text style={styles.sessionDetailLabel}>Session P&L:</Text>
              <Text style={[styles.sessionDetailValue, { color: session.sessionProfit >= 0 ? Colors.primary.neonCyan : Colors.primary.hotPink }]}>
                {session.sessionProfit >= 0 ? '+' : ''}PKR {session.sessionProfit.toLocaleString()}
              </Text>
            </View>
            <View style={styles.sessionDetailRow}>
              <Text style={styles.sessionDetailLabel}>House Profit from Session:</Text>
              <Text style={[styles.sessionDetailValue, { color: Colors.primary.gold }]}>
                PKR {(-session.sessionProfit).toLocaleString()}
              </Text>
            </View>

            {/* Copy All Session Data Button */}
            <TouchableOpacity
              style={styles.copyAllButton}
              onPress={() => {
                const sessionData = `Player: ${session.username}\nGame: ${session.gameName}\nUser ID: ${session.userId}\nBet Amount: PKR ${session.betAmount}\nSession P&L: PKR ${session.sessionProfit}\nTotal Bets: ${session.totalBetsInSession}`;
                copyToClipboard(sessionData, 'Session Data');
              }}
            >
              <Ionicons name="copy" size={16} color={Colors.primary.text} />
              <Text style={styles.copyAllButtonText}>Copy Session Data</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {liveSessions.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>🎮</Text>
          <Text style={styles.emptyStateTitle}>No Live Sessions</Text>
          <Text style={styles.emptyStateText}>No players are currently active in games</Text>
        </View>
      )}
    </ScrollView>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>📊 Loading game statistics...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Game Statistics</Text>
        <View style={styles.headerInfo}>
          <Text style={styles.lastUpdated}>Last updated: {lastUpdated.toLocaleTimeString()}</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
            <Text style={styles.refreshButtonText}>🔄 Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {renderTabButton('players', 'Players', '👥')}
        {renderTabButton('games', 'Games', '🎮')}
        {renderTabButton('live', 'Live', '🔴')}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'players' && renderPlayerActivities()}
          {activeTab === 'games' && renderGamePerformances()}
          {activeTab === 'live' && renderLiveSessions()}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primary.background,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.primary.text,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary.text,
  },
  headerInfo: {
    alignItems: 'flex-end',
  },
  lastUpdated: {
    fontSize: 12,
    color: Colors.primary.textSecondary,
    marginBottom: 5,
  },
  refreshButton: {
    backgroundColor: Colors.primary.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  refreshButtonText: {
    fontSize: 12,
    color: Colors.primary.text,
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.primary.surface,
    marginHorizontal: 20,
    marginVertical: 10,
    borderRadius: 12,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  activeTabButton: {
    backgroundColor: Colors.primary.gold,
  },
  tabIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  activeTabIcon: {
    color: Colors.primary.background,
  },
  tabText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary.textSecondary,
  },
  activeTabText: {
    color: Colors.primary.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
  },
  // Search Styles
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.primary.text,
    paddingVertical: 4,
  },
  clearSearchButton: {
    padding: 4,
  },
  searchResults: {
    fontSize: 12,
    color: Colors.primary.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  emptySearchState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptySearchTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySearchText: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  clearSearchButtonLarge: {
    backgroundColor: Colors.primary.gold,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  clearSearchButtonText: {
    color: Colors.primary.background,
    fontSize: 14,
    fontWeight: '600',
  },
  // Player Activity Styles
  playerCard: {
    backgroundColor: Colors.primary.surface,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  playerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  playerInfo: {
    flex: 1,
  },
  playerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  playerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginRight: 8,
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary.neonCyan,
  },
  playerEmail: {
    fontSize: 12,
    color: Colors.primary.textSecondary,
    flex: 1,
  },
  playerUserId: {
    fontSize: 10,
    color: Colors.primary.textSecondary,
    fontFamily: 'monospace',
    flex: 1,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  userIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  copyButton: {
    padding: 4,
    marginLeft: 6,
    borderRadius: 4,
    backgroundColor: Colors.primary.background,
  },
  playerStats: {
    alignItems: 'flex-end',
  },
  playerBalance: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary.gold,
    marginBottom: 2,
  },
  playerProfit: {
    fontSize: 12,
    color: Colors.primary.textSecondary,
  },
  playerDetails: {
    marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.primary.textSecondary,
  },
  statValue: {
    fontSize: 12,
    color: Colors.primary.text,
    fontWeight: '500',
  },
  playerMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.primary.border,
  },
  metric: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 10,
    color: Colors.primary.textSecondary,
  },
  // Game Performance Styles
  gameCard: {
    backgroundColor: Colors.primary.surface,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  gameInfo: {
    flex: 1,
  },
  gameName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 4,
  },
  gameRank: {
    fontSize: 12,
    color: Colors.primary.textSecondary,
  },
  gameProfit: {
    alignItems: 'flex-end',
  },
  profitAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  profitLabel: {
    fontSize: 10,
    color: Colors.primary.textSecondary,
  },
  gameMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
    paddingVertical: 8,
    backgroundColor: Colors.primary.background,
    borderRadius: 8,
  },
  gameMetric: {
    alignItems: 'center',
  },
  gameMetricValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 2,
  },
  gameMetricLabel: {
    fontSize: 9,
    color: Colors.primary.textSecondary,
  },
  gameDetails: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.primary.border,
  },
  gameDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  gameDetailLabel: {
    fontSize: 12,
    color: Colors.primary.textSecondary,
  },
  gameDetailValue: {
    fontSize: 12,
    color: Colors.primary.text,
    fontWeight: '500',
  },
  // Live Session Styles
  sessionCard: {
    backgroundColor: Colors.primary.surface,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: Colors.primary.border,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary.neonCyan,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sessionUsername: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginRight: 8,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff4444',
  },
  sessionGame: {
    fontSize: 12,
    color: Colors.primary.textSecondary,
  },
  sessionUserId: {
    fontSize: 10,
    color: Colors.primary.textSecondary,
    fontFamily: 'monospace',
    flex: 1,
  },
  sessionStats: {
    alignItems: 'flex-end',
  },
  sessionBet: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary.gold,
    marginBottom: 2,
  },
  sessionLabel: {
    fontSize: 10,
    color: Colors.primary.textSecondary,
  },
  sessionDetails: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.primary.border,
  },
  sessionDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sessionDetailLabel: {
    fontSize: 12,
    color: Colors.primary.textSecondary,
  },
  sessionDetailValue: {
    fontSize: 12,
    color: Colors.primary.text,
    fontWeight: '500',
  },
  copyAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary.surface,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  copyAllButtonText: {
    fontSize: 12,
    color: Colors.primary.text,
    marginLeft: 6,
    fontWeight: '500',
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
    textAlign: 'center',
  },
});
