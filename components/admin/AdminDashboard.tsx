import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AdminService } from '../../services/adminService';
import { AdminDashboardStats } from '../../types/adminTypes';

interface AdminDashboardProps {
  onNavigate: (screen: string) => void;
}

export default function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const dashboardStats = await AdminService.getDashboardStats();
      setStats(dashboardStats);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  if (loading || !stats) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Admin Dashboard</Text>
      
      {/* Quick Stats */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Ionicons name="people" size={24} color="#007AFF" />
          <Text style={styles.statValue}>{stats.totalUsers.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Total Users</Text>
          <Text style={styles.statSubtext}>{stats.activeUsers} active</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="trending-up" size={24} color="#00ff00" />
          <Text style={styles.statValue}>Rs {stats.totalDeposits.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Total Deposits</Text>
          <Text style={styles.statSubtext}>Rs {stats.pendingDeposits} pending</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="trending-down" size={24} color="#ff6666" />
          <Text style={styles.statValue}>Rs {stats.totalWithdrawals.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Total Withdrawals</Text>
          <Text style={styles.statSubtext}>Rs {stats.pendingWithdrawals} pending</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="game-controller" size={24} color="#ffaa00" />
          <Text style={styles.statValue}>Rs {stats.totalGameRevenue.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Game Revenue</Text>
          <Text style={styles.statSubtext}>House edge</Text>
        </View>
      </View>

      {/* Today's Stats */}
      <View style={styles.todaySection}>
        <Text style={styles.sectionTitle}>Today's Activity</Text>
        <View style={styles.todayGrid}>
          <View style={styles.todayCard}>
            <Text style={styles.todayValue}>{stats.todayStats.newUsers}</Text>
            <Text style={styles.todayLabel}>New Users</Text>
          </View>
          <View style={styles.todayCard}>
            <Text style={styles.todayValue}>Rs {stats.todayStats.deposits}</Text>
            <Text style={styles.todayLabel}>Deposits</Text>
          </View>
          <View style={styles.todayCard}>
            <Text style={styles.todayValue}>Rs {stats.todayStats.withdrawals}</Text>
            <Text style={styles.todayLabel}>Withdrawals</Text>
          </View>
          <View style={styles.todayCard}>
            <Text style={styles.todayValue}>Rs {stats.todayStats.gameRevenue}</Text>
            <Text style={styles.todayLabel}>Game Revenue</Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsSection}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => onNavigate('deposits')}
        >
          <Ionicons name="add-circle" size={24} color="#00ff00" />
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Pending Deposits</Text>
            <Text style={styles.actionSubtitle}>Review and approve deposit requests</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => onNavigate('withdrawals')}
        >
          <Ionicons name="remove-circle" size={24} color="#ff6666" />
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Pending Withdrawals</Text>
            <Text style={styles.actionSubtitle}>Process withdrawal requests</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => onNavigate('users')}
        >
          <Ionicons name="people" size={24} color="#007AFF" />
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>User Management</Text>
            <Text style={styles.actionSubtitle}>Manage user accounts and permissions</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onNavigate('statistics')}
        >
          <Ionicons name="stats-chart" size={24} color="#00ff88" />
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Game Statistics</Text>
            <Text style={styles.actionSubtitle}>View player activities and game performance</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onNavigate('games')}
        >
          <Ionicons name="game-controller" size={24} color="#ffaa00" />
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Game Management</Text>
            <Text style={styles.actionSubtitle}>Manage games and configurations</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onNavigate('notifications')}
        >
          <Ionicons name="notifications" size={24} color="#9b59b6" />
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>App Notifications</Text>
            <Text style={styles.actionSubtitle}>Manage popup notifications and announcements</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>
      </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#cccccc',
    textAlign: 'center',
  },
  statSubtext: {
    fontSize: 12,
    color: '#999999',
    marginTop: 4,
  },
  todaySection: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  todayGrid: {
    flexDirection: 'row',
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  todayCard: {
    flex: 1,
    alignItems: 'center',
  },
  todayValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00ff00',
    marginBottom: 4,
  },
  todayLabel: {
    fontSize: 12,
    color: '#cccccc',
    textAlign: 'center',
  },
  actionsSection: {
    margin: 16,
    marginBottom: 32,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  actionContent: {
    flex: 1,
    marginLeft: 16,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#cccccc',
  },
});
