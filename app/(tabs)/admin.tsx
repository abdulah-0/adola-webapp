import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp } from '../../contexts/AppContext';
import { AdminService } from '../../services/adminService';
import AdminDashboard from '../../components/admin/AdminDashboard';
import PendingDeposits from '../../components/admin/PendingDeposits';
import PendingWithdrawals from '../../components/admin/PendingWithdrawals';
import NotificationManager from '../../components/admin/NotificationManager';
import GameStatistics from '../../components/admin/GameStatistics';

type AdminScreen = 'dashboard' | 'deposits' | 'withdrawals' | 'users' | 'games' | 'statistics' | 'notifications';

export default function AdminScreen() {
  const { user, logout } = useApp();
  const router = useRouter();
  const [currentScreen, setCurrentScreen] = useState<AdminScreen>('dashboard');

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of the admin panel?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              router.replace('/auth/login');
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Check if user is admin
  const isAdmin = user && (user.isSuperAdmin || user.isAdmin || AdminService.isAdmin(user.email));

  if (!isAdmin) {
    return (
      <View style={styles.accessDeniedContainer}>
        <Ionicons name="shield-outline" size={80} color="#ff6666" />
        <Text style={styles.accessDeniedTitle}>Access Denied</Text>
        <Text style={styles.accessDeniedText}>
          You don't have permission to access the admin panel.
        </Text>
        <Text style={styles.accessDeniedSubtext}>
          Only authorized administrators can view this section.
        </Text>
      </View>
    );
  }

  const renderHeader = () => (
    <View style={styles.header}>
      {currentScreen !== 'dashboard' && (
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setCurrentScreen('dashboard')}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
          <Text style={styles.backText}>Dashboard</Text>
        </TouchableOpacity>
      )}
      
      <View style={styles.headerRight}>
        <Text style={styles.adminBadge}>ADMIN</Text>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={20} color="#007AFF" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderContent = () => {
    switch (currentScreen) {
      case 'dashboard':
        return <AdminDashboard onNavigate={(screen: string) => setCurrentScreen(screen as AdminScreen)} />;
      case 'deposits':
        return <PendingDeposits />;
      case 'withdrawals':
        return <PendingWithdrawals />;
      case 'users':
        return (
          <View style={styles.comingSoonContainer}>
            <Ionicons name="people" size={64} color="#666" />
            <Text style={styles.comingSoonTitle}>User Management</Text>
            <Text style={styles.comingSoonText}>Coming Soon</Text>
          </View>
        );
      case 'games':
        return (
          <View style={styles.comingSoonContainer}>
            <Ionicons name="game-controller" size={64} color="#666" />
            <Text style={styles.comingSoonTitle}>Game Management</Text>
            <Text style={styles.comingSoonText}>Coming Soon</Text>
          </View>
        );
      case 'statistics':
        return <GameStatistics />;
      case 'notifications':
        return <NotificationManager />;
      default:
        return <AdminDashboard onNavigate={(screen: string) => setCurrentScreen(screen as AdminScreen)} />;
    }
  };

  return (
    <View style={styles.container}>
      {renderHeader()}
      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
    padding: 40,
  },
  accessDeniedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ff6666',
    marginTop: 20,
    marginBottom: 16,
  },
  accessDeniedText: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  accessDeniedSubtext: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backText: {
    fontSize: 16,
    color: '#007AFF',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  adminBadge: {
    backgroundColor: '#ff6666',
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  signOutButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  comingSoonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  comingSoonTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  comingSoonText: {
    fontSize: 16,
    color: '#666',
  },
});
