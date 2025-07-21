// User Management Component for Admin Panel
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  Switch,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { getAllUsers, grantAdminAccess, revokeAdminAccess } from '../../services/userManagement';

// User interface following requirements document
export interface AdolaUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  walletBalance: number;
  joinedDate: Date;
  isOnline: boolean;
  emailVerified: boolean;
  level: number;
  xp: number;
  gamesPlayed: number;
  totalWins: number;
  totalLosses: number;
  status: 'online' | 'offline' | 'away';
  referralCode?: string;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  adminPermissions?: {
    manageUsers: boolean;
    manageTransactions: boolean;
    manageGames: boolean;
    viewAnalytics: boolean;
    systemSettings: boolean;
    grantAdminAccess: boolean;
  };
  lastLoginDate?: Date;
  registrationBonus?: boolean;
}

export default function UserManagement() {
  const [users, setUsers] = useState<AdolaUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdolaUser | null>(null);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPermissions, setAdminPermissions] = useState({
    manageUsers: false,
    manageTransactions: false,
    manageGames: false,
    viewAnalytics: false,
    systemSettings: false,
    grantAdminAccess: false,
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const allUsers = await getAllUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleGrantAdmin = async () => {
    if (!selectedUser) return;

    try {
      const success = await grantAdminAccess(
        selectedUser.id,
        adminPermissions
      );

      if (success) {
        Alert.alert('Success', `Admin access granted to ${selectedUser.username}`);
        setShowAdminModal(false);
        setSelectedUser(null);
        loadUsers(); // Refresh the list
      } else {
        Alert.alert('Error', 'Failed to grant admin access');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to grant admin access');
    }
  };

  const handleRevokeAdmin = async (user: AdolaUser) => {
    Alert.alert(
      'Revoke Admin Access',
      `Are you sure you want to revoke admin access for ${user.username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await revokeAdminAccess(user.id);
              if (success) {
                Alert.alert('Success', `Admin access revoked for ${user.username}`);
                loadUsers();
              } else {
                Alert.alert('Error', 'Failed to revoke admin access');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to revoke admin access');
            }
          }
        }
      ]
    );
  };

  const openAdminModal = (user: AdolaUser) => {
    setSelectedUser(user);
    setAdminPermissions({
      manageUsers: false,
      manageTransactions: false,
      manageGames: false,
      viewAnalytics: false,
      systemSettings: false,
      grantAdminAccess: false,
    });
    setShowAdminModal(true);
  };

  const renderUserCard = (user: AdolaUser) => (
    <View key={user.id} style={styles.userCard}>
      <View style={styles.userInfo}>
        <Text style={styles.username}>{user.username}</Text>
        <Text style={styles.email}>{user.email}</Text>
        <Text style={styles.userDetails}>
          Balance: Rs {(user.walletBalance || 0).toLocaleString()} |
          Level: {user.level || 1} |
          Games: {user.gamesPlayed || 0}
        </Text>
        <Text style={styles.joinDate}>
          Joined: {user.joinedDate.toLocaleDateString()}
        </Text>
        {user.isAdmin && (
          <Text style={styles.adminBadge}>
            {user.isSuperAdmin ? '👑 Super Admin' : '🛡️ Admin'}
          </Text>
        )}
      </View>
      
      <View style={styles.userActions}>
        {user.isAdmin && !user.isSuperAdmin ? (
          <TouchableOpacity
            style={[styles.actionButton, styles.revokeButton]}
            onPress={() => handleRevokeAdmin(user)}
          >
            <Text style={styles.actionButtonText}>Revoke Admin</Text>
          </TouchableOpacity>
        ) : !user.isSuperAdmin ? (
          <TouchableOpacity
            style={[styles.actionButton, styles.grantButton]}
            onPress={() => openAdminModal(user)}
          >
            <Text style={styles.actionButtonText}>Grant Admin</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>👥 User Management</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={loadUsers}>
          <Text style={styles.refreshButtonText}>🔄 Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search users by username or email..."
          placeholderTextColor={Colors.primary.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{users.length}</Text>
          <Text style={styles.statLabel}>Total Users</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {users.filter(u => u.isAdmin && !u.isSuperAdmin).length}
          </Text>
          <Text style={styles.statLabel}>Admins</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {users.filter(u => u.registrationBonus).length}
          </Text>
          <Text style={styles.statLabel}>New Users</Text>
        </View>
      </View>

      {/* Users List */}
      <ScrollView style={styles.usersList} showsVerticalScrollIndicator={false}>
        {filteredUsers.map(renderUserCard)}
      </ScrollView>

      {/* Admin Permissions Modal */}
      <Modal
        visible={showAdminModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAdminModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Grant Admin Access to {selectedUser?.username}
            </Text>
            
            <Text style={styles.modalSubtitle}>Select Permissions:</Text>
            
            {Object.entries(adminPermissions).map(([key, value]) => (
              <View key={key} style={styles.permissionRow}>
                <Text style={styles.permissionLabel}>
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </Text>
                <Switch
                  value={value}
                  onValueChange={(newValue) =>
                    setAdminPermissions(prev => ({ ...prev, [key]: newValue }))
                  }
                  trackColor={{ false: Colors.primary.border, true: Colors.primary.neonCyan }}
                  thumbColor={value ? Colors.primary.background : Colors.primary.textSecondary}
                />
              </View>
            ))}
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowAdminModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleGrantAdmin}
              >
                <Text style={styles.modalButtonText}>Grant Access</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  },
  loadingText: {
    fontSize: 16,
    color: Colors.primary.text,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary.text,
  },
  refreshButton: {
    backgroundColor: Colors.primary.neonCyan,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  refreshButtonText: {
    color: Colors.primary.background,
    fontSize: 12,
    fontWeight: 'bold',
  },
  searchContainer: {
    padding: 20,
    paddingBottom: 10,
  },
  searchInput: {
    backgroundColor: Colors.primary.surface,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.primary.text,
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.primary.surface,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.primary.textSecondary,
    marginTop: 4,
  },
  usersList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  userCard: {
    backgroundColor: Colors.primary.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.primary.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
    marginBottom: 4,
  },
  userDetails: {
    fontSize: 12,
    color: Colors.primary.textSecondary,
    marginBottom: 4,
  },
  joinDate: {
    fontSize: 12,
    color: Colors.primary.textSecondary,
  },
  adminBadge: {
    fontSize: 12,
    color: Colors.primary.gold,
    fontWeight: 'bold',
    marginTop: 4,
  },
  userActions: {
    marginLeft: 12,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  grantButton: {
    backgroundColor: Colors.primary.neonCyan,
  },
  revokeButton: {
    backgroundColor: Colors.primary.hotPink,
  },
  actionButtonText: {
    color: Colors.primary.background,
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.primary.surface,
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    color: Colors.primary.text,
    marginBottom: 12,
  },
  permissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary.border,
  },
  permissionLabel: {
    fontSize: 14,
    color: Colors.primary.text,
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.primary.border,
  },
  confirmButton: {
    backgroundColor: Colors.primary.neonCyan,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary.background,
  },
});
