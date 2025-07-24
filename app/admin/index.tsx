// Admin Panel for Adola App - Super Admin Dashboard
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { useApp } from '../../contexts/AppContext';
import UserManagement from '../../components/admin/UserManagement';
import TransactionManagement from '../../components/admin/TransactionManagement';
import GameManagement from '../../components/admin/GameManagement';
import GameStatistics from '../../components/admin/GameStatistics';
import { getRealTimeAdminStats, getUserActivityStats } from '../../services/realTimeStatsService.js';
import { getAllTransactionRequests, testTransactionStorage } from '../../services/transactionService.js';

export default function AdminPanel() {
  const router = useRouter();
  const { user, logout } = useApp();
  const [currentSection, setCurrentSection] = useState('overview');
  const [realTimeStats, setRealTimeStats] = useState<any>(null);
  const [activityStats, setActivityStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  // Load real-time statistics
  const loadRealTimeStats = async () => {
    try {
      console.log('📊 Loading real-time admin statistics...');
      setLoading(true);

      const [stats, activity] = await Promise.all([
        getRealTimeAdminStats(),
        getUserActivityStats()
      ]);

      setRealTimeStats(stats);
      setActivityStats(activity);
      setLastUpdated(new Date());

      console.log('✅ Real-time stats loaded:', {
        users: stats.users.total,
        revenue: stats.financial.netRevenue,
        transactions: stats.transactions.totalRequests,
        pendingDeposits: stats.financial.pendingDepositAmount,
        pendingWithdrawals: stats.financial.pendingWithdrawalAmount
      });

      console.log('📊 Full stats object:', stats);
    } catch (error) {
      console.error('❌ Error loading real-time stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Test function to verify transaction data access
  const testTransactionAccess = async () => {
    try {
      console.log('🧪 Testing transaction data access from admin panel...');
      const transactions = await getAllTransactionRequests();
      console.log('🧪 Admin panel can access transactions:', transactions.length, transactions);

      const testResult = await testTransactionStorage();
      console.log('🧪 Transaction storage test result:', testResult);

      Alert.alert(
        'Transaction Test Result',
        `Found ${transactions.length} transactions\nTest ${testResult.success ? 'passed' : 'failed'}`
      );
    } catch (error) {
      console.error('🧪 Transaction test error:', error);
      Alert.alert('Test Error', String(error));
    }
  };

  // Auto-refresh stats every 30 seconds
  useEffect(() => {
    loadRealTimeStats();

    const interval = setInterval(() => {
      if (currentSection === 'overview') {
        loadRealTimeStats();
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [currentSection]);

  // Check if user is super admin
  useEffect(() => {
    if (!user?.isSuperAdmin) {
      Alert.alert('Access Denied', 'You do not have permission to access the admin panel.');
      router.replace('/(tabs)');
    }
  }, [user]);

  if (!user?.isSuperAdmin) {
    return null;
  }

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout from admin panel?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: logout, style: 'destructive' },
      ]
    );
  };

  const renderContent = () => {
    switch (currentSection) {
      case 'users':
        return <UserManagement />;
      case 'transactions':
        return <TransactionManagement />;
      case 'games':
        return <GameManagement />;
      case 'statistics':
        return <GameStatistics />;
      case 'overview':
      default:
        return renderOverview();
    }
  };

  const renderOverview = () => {
    if (loading || !realTimeStats) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>📊 Loading real-time statistics...</Text>
        </View>
      );
    }

    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Real-time Status Indicator */}
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>
            🔴 LIVE - Last updated: {lastUpdated.toLocaleTimeString()}
          </Text>
          <TouchableOpacity style={styles.refreshButton} onPress={loadRealTimeStats}>
            <Text style={styles.refreshButtonText}>🔄 Refresh</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.refreshButton} onPress={testTransactionAccess}>
            <Text style={styles.refreshButtonText}>🧪 Test Data</Text>
          </TouchableOpacity>
        </View>

        {/* Real-time Admin Stats */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>📊 Real-Time System Overview</Text>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{realTimeStats.users.total.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Total Users</Text>
              <Text style={styles.statSubtext}>
                {realTimeStats.users.online} online • {realTimeStats.users.recentSignups} new today
              </Text>
            </View>

            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: Colors.primary.neonCyan }]}>
                Rs {realTimeStats.financial.approvedDeposits.toLocaleString()}
              </Text>
              <Text style={styles.statLabel}>Total Deposits</Text>
              <Text style={styles.statSubtext}>
                {realTimeStats.transactions.totalRequests} total transactions
              </Text>
            </View>

            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: Colors.primary.hotPink }]}>
                Rs {realTimeStats.financial.approvedWithdrawals.toLocaleString()}
              </Text>
              <Text style={styles.statLabel}>Total Withdrawals</Text>
              <Text style={styles.statSubtext}>
                {realTimeStats.transactions.approvalRate.toFixed(1)}% approval rate
              </Text>
            </View>

            <View style={styles.statCard}>
              <Text style={[styles.statValue, {
                color: realTimeStats.financial.netRevenue >= 0 ? Colors.primary.neonCyan : Colors.primary.hotPink
              }]}>
                Rs {realTimeStats.financial.netRevenue.toLocaleString()}
              </Text>
              <Text style={styles.statLabel}>Net Revenue</Text>
              <Text style={styles.statSubtext}>
                {realTimeStats.financial.revenueGrowth >= 0 ? '📈' : '📉'} {Math.abs(realTimeStats.financial.revenueGrowth).toFixed(1)}%
              </Text>
            </View>
          </View>
        </View>

        {/* Real-time Pending Transactions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⏳ Real-Time Pending Transactions</Text>

          <View style={styles.pendingContainer}>
            <View style={styles.pendingCard}>
              <Text style={styles.pendingValue}>
                Rs {realTimeStats.financial.pendingDepositAmount.toLocaleString()}
              </Text>
              <Text style={styles.pendingLabel}>Pending Deposits</Text>
              <Text style={styles.pendingCount}>
                {realTimeStats.transactions.pendingRequests} requests
              </Text>
              <TouchableOpacity
                style={styles.manageButton}
                onPress={() => setCurrentSection('transactions')}
              >
                <Text style={styles.manageButtonText}>Manage</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.pendingCard}>
              <Text style={styles.pendingValue}>
                Rs {realTimeStats.financial.pendingWithdrawalAmount.toLocaleString()}
              </Text>
              <Text style={styles.pendingLabel}>Pending Withdrawals</Text>
              <TouchableOpacity style={styles.manageButton}>
                <Text style={styles.manageButtonText}>Manage</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Admin Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🛠️ Admin Actions</Text>
          
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setCurrentSection('users')}
            >
              <Text style={styles.actionIcon}>👥</Text>
              <Text style={styles.actionText}>Manage Users</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setCurrentSection('transactions')}
            >
              <Text style={styles.actionIcon}>💰</Text>
              <Text style={styles.actionText}>Manage Transactions</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setCurrentSection('games')}
            >
              <Text style={styles.actionIcon}>🎮</Text>
              <Text style={styles.actionText}>Game Management</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setCurrentSection('statistics')}
            >
              <Text style={styles.actionIcon}>📊</Text>
              <Text style={styles.actionText}>Game Statistics</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionIcon}>📈</Text>
              <Text style={styles.actionText}>Analytics</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionIcon}>⚙️</Text>
              <Text style={styles.actionText}>System Settings</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionIcon}>🔐</Text>
              <Text style={styles.actionText}>Grant Admin Access</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Game Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Game Statistics</Text>
          
          <View style={styles.gameStatsContainer}>
            <View style={styles.gameStatRow}>
              <Text style={styles.gameStatLabel}>Total Games Played:</Text>
              <Text style={styles.gameStatValue}>
                {realTimeStats.gaming.totalGamesPlayed.toLocaleString()}
              </Text>
            </View>
            
            <View style={styles.gameStatRow}>
              <Text style={styles.gameStatLabel}>Total Winnings Paid:</Text>
              <Text style={[styles.gameStatValue, { color: Colors.primary.neonCyan }]}>
                Rs {realTimeStats.gaming.totalWins.toLocaleString()}
              </Text>
            </View>
            
            <View style={styles.gameStatRow}>
              <Text style={styles.gameStatLabel}>House Edge:</Text>
              <Text style={[styles.gameStatValue, { color: Colors.primary.gold }]}>80%</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
          
          <TouchableOpacity style={styles.quickActionButton}>
            <Text style={styles.quickActionText}>🚨 Emergency Stop All Games</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickActionButton}>
            <Text style={styles.quickActionText}>📢 Send System Announcement</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickActionButton}>
            <Text style={styles.quickActionText}>🔄 Refresh System Cache</Text>
          </TouchableOpacity>
        </View>

        {/* Admin Info */}
        <View style={styles.adminInfo}>
          <Text style={styles.adminInfoTitle}>👑 Super Admin Access</Text>
          <Text style={styles.adminInfoText}>
            You have full administrative privileges including user management,
            transaction oversight, game configuration, and system settings.
          </Text>
          <Text style={styles.adminInfoNote}>
            Use these powers responsibly to maintain the platform's integrity.
          </Text>
        </View>

      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Admin Panel</Text>
          <Text style={styles.subtitle}>Welcome, {user?.displayName || 'Admin'}</Text>
        </View>
        <View style={styles.headerActions}>
          {currentSection !== 'overview' && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setCurrentSection('overview')}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      {renderContent()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary.border,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    backgroundColor: Colors.primary.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  backButtonText: {
    color: Colors.primary.text,
    fontSize: 12,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary.text,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.primary.textSecondary,
    marginTop: 4,
  },
  logoutButton: {
    backgroundColor: Colors.primary.hotPink,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutButtonText: {
    color: Colors.primary.background,
    fontSize: 14,
    fontWeight: 'bold',
  },
  statsContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    backgroundColor: Colors.primary.surface,
    borderRadius: 12,
    padding: 16,
    width: '48%',
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
  },
  section: {
    padding: 20,
    paddingTop: 0,
  },
  pendingContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  pendingCard: {
    backgroundColor: Colors.primary.surface,
    borderRadius: 12,
    padding: 16,
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  pendingValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary.gold,
    marginBottom: 4,
  },
  pendingLabel: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
    marginBottom: 12,
  },
  manageButton: {
    backgroundColor: Colors.primary.neonCyan,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  manageButtonText: {
    color: Colors.primary.background,
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    backgroundColor: Colors.primary.surface,
    borderRadius: 12,
    padding: 16,
    width: '48%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    color: Colors.primary.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  gameStatsContainer: {
    backgroundColor: Colors.primary.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  gameStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary.border,
  },
  gameStatLabel: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
  },
  gameStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary.text,
  },
  quickActionButton: {
    backgroundColor: Colors.primary.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.primary.border,
    alignItems: 'center',
  },
  quickActionText: {
    fontSize: 16,
    color: Colors.primary.text,
    fontWeight: '600',
  },
  adminInfo: {
    margin: 20,
    padding: 20,
    backgroundColor: Colors.primary.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary.gold,
  },
  adminInfoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary.gold,
    marginBottom: 12,
    textAlign: 'center',
  },
  adminInfoText: {
    fontSize: 14,
    color: Colors.primary.text,
    lineHeight: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  adminInfoNote: {
    fontSize: 12,
    color: Colors.primary.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.primary.text,
    textAlign: 'center',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primary.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.primary.neonCyan,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff0000',
    marginRight: 8,
  },
  liveText: {
    flex: 1,
    fontSize: 12,
    color: Colors.primary.text,
    fontWeight: 'bold',
  },
  refreshButton: {
    backgroundColor: Colors.primary.neonCyan,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  refreshButtonText: {
    fontSize: 12,
    color: Colors.primary.background,
    fontWeight: 'bold',
  },
  statSubtext: {
    fontSize: 10,
    color: Colors.primary.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  pendingCount: {
    fontSize: 12,
    color: Colors.primary.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
});
