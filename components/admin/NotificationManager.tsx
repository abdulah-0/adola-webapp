// Enhanced Notification Manager - Admin component to manage custom app notifications
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  Modal,
  Switch,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { NotificationService, APP_NOTIFICATIONS } from '../../services/notificationService';
import { CustomNotificationService, CustomNotification } from '../../services/customNotificationService';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../contexts/AppContext';

export default function NotificationManager() {
  const [notificationStatus, setNotificationStatus] = useState<Record<string, boolean>>({});
  const [customNotifications, setCustomNotifications] = useState<CustomNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Debug modal state changes
  useEffect(() => {
    console.log('📱 Modal state changed:', showCreateModal);
  }, [showCreateModal]);
  const [activeTab, setActiveTab] = useState<'default' | 'custom'>('custom');

  const notificationService = NotificationService.getInstance();
  const customNotificationService = CustomNotificationService.getInstance();
  const { user } = useApp();

  // Form state for creating new notifications
  const [newNotification, setNewNotification] = useState({
    title: '',
    message: '',
    icon: 'notifications',
    color: '#007AFF',
    priority: 5,
    frequency_type: 'once' as 'once' | 'daily' | 'weekly' | 'monthly' | 'custom',
    frequency_hours: 24,
    show_during_games: false,
    target_audience: 'all' as 'all' | 'new_users' | 'active_users' | 'vip_users',
    enabled: true,
  });

  useEffect(() => {
    loadNotificationStatus();
    loadCustomNotifications();
  }, []);

  const loadCustomNotifications = async () => {
    try {
      const { data: notifications, error } = await supabase
        .from('custom_notifications')
        .select('*')
        .order('priority', { ascending: true });

      if (error) {
        console.error('Error loading custom notifications:', error);
        return;
      }

      setCustomNotifications(notifications || []);
    } catch (error) {
      console.error('Error loading custom notifications:', error);
    }
  };

  const loadNotificationStatus = async () => {
    try {
      const status = await notificationService.getNotificationStatus();
      setNotificationStatus(status);
    } catch (error) {
      console.error('Error loading notification status:', error);
    }
  };

  const resetNotification = async (notificationId: string) => {
    try {
      setLoading(true);
      await notificationService.resetNotification(notificationId);
      await loadNotificationStatus();
      Alert.alert('Success', `Notification "${notificationId}" has been reset. Users will see it again on next app launch.`);
    } catch (error) {
      console.error('Error resetting notification:', error);
      Alert.alert('Error', 'Failed to reset notification');
    } finally {
      setLoading(false);
    }
  };

  const createCustomNotification = async () => {
    console.log('🔧 Creating notification...', { user, newNotification });

    if (!newNotification.title.trim() || !newNotification.message.trim()) {
      Alert.alert('Error', 'Please fill in title and message');
      return;
    }

    // Check for user ID
    const userId = user?.id;
    if (!userId) {
      console.error('❌ User ID not found:', user);
      Alert.alert('Error', 'User not found. Please try logging in again.');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('custom_notifications')
        .insert({
          ...newNotification,
          created_by: userId,
          starts_at: new Date().toISOString(),
        });

      if (error) {
        console.error('❌ Error creating notification:', error);
        Alert.alert(
          'Database Error',
          `Failed to create notification: ${error.message}\n\nMake sure the database tables are set up correctly.`
        );
        return;
      }

      Alert.alert('Success', 'Notification created successfully!');
      setShowCreateModal(false);
      setNewNotification({
        title: '',
        message: '',
        icon: 'notifications',
        color: '#007AFF',
        priority: 5,
        frequency_type: 'once',
        frequency_hours: 24,
        show_during_games: false,
        target_audience: 'all',
        enabled: true,
      });
      await loadCustomNotifications();
    } catch (error) {
      console.error('Error creating notification:', error);
      Alert.alert('Error', 'Failed to create notification');
    } finally {
      setLoading(false);
    }
  };

  const toggleNotificationEnabled = async (notificationId: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('custom_notifications')
        .update({ enabled })
        .eq('id', notificationId);

      if (error) {
        console.error('Error updating notification:', error);
        Alert.alert('Error', 'Failed to update notification');
        return;
      }

      await loadCustomNotifications();
    } catch (error) {
      console.error('Error updating notification:', error);
    }
  };

  const deleteCustomNotification = async (notificationId: string) => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('custom_notifications')
                .delete()
                .eq('id', notificationId);

              if (error) {
                console.error('Error deleting notification:', error);
                Alert.alert('Error', 'Failed to delete notification');
                return;
              }

              Alert.alert('Success', 'Notification deleted successfully!');
              await loadCustomNotifications();
            } catch (error) {
              console.error('Error deleting notification:', error);
            }
          }
        }
      ]
    );
  };

  const resetAllNotifications = async () => {
    Alert.alert(
      'Reset All Notifications',
      'Are you sure you want to reset all notifications? Users will see all notifications again on next app launch.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset All',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await notificationService.resetAllNotifications();
              await loadNotificationStatus();
              Alert.alert('Success', 'All notifications have been reset.');
            } catch (error) {
              console.error('Error resetting all notifications:', error);
              Alert.alert('Error', 'Failed to reset notifications');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const getStatusIcon = (dismissed: boolean) => {
    return dismissed ? 'checkmark-circle' : 'alert-circle';
  };

  const getStatusColor = (dismissed: boolean) => {
    return dismissed ? '#00ff88' : '#ffaa00';
  };

  const getStatusText = (dismissed: boolean) => {
    return dismissed ? 'Dismissed' : 'Active';
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📱 App Notifications Manager</Text>
        <Text style={styles.subtitle}>
          Create and manage custom notifications with frequency settings and game session awareness
        </Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'custom' && styles.activeTab]}
          onPress={() => setActiveTab('custom')}
        >
          <Text style={[styles.tabText, activeTab === 'custom' && styles.activeTabText]}>
            Custom Notifications
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'default' && styles.activeTab]}
          onPress={() => setActiveTab('default')}
        >
          <Text style={[styles.tabText, activeTab === 'default' && styles.activeTabText]}>
            Default Notifications
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content based on active tab */}
      {activeTab === 'custom' ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Custom Notifications</Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => {
                console.log('📱 Create button pressed');
                setShowCreateModal(true);
              }}
            >
              <Ionicons name="add" size={20} color="white" />
              <Text style={styles.createButtonText}>Create New</Text>
            </TouchableOpacity>
          </View>

          {/* Custom Notifications List */}
          {customNotifications.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="notifications-off" size={48} color="#666" />
              <Text style={styles.emptyStateText}>No custom notifications yet</Text>
              <Text style={styles.emptyStateSubtext}>Create your first notification to get started</Text>
            </View>
          ) : (
            customNotifications.map((notification) => (
              <View key={notification.id} style={styles.customNotificationCard}>
                <View style={styles.notificationHeader}>
                  <View style={styles.notificationIcon}>
                    <Ionicons name={notification.icon as any} size={24} color={notification.color} />
                  </View>
                  <View style={styles.notificationContent}>
                    <Text style={styles.notificationTitle}>{notification.title}</Text>
                    <Text style={styles.notificationMessage}>{notification.message}</Text>
                    <View style={styles.notificationMeta}>
                      <Text style={styles.metaText}>
                        {notification.frequency_type} • {notification.target_audience} • Priority {notification.priority}
                      </Text>
                      <Text style={styles.metaText}>
                        👁️ {notification.total_views} views • ❌ {notification.total_dismissals} dismissals
                      </Text>
                    </View>
                  </View>
                  <View style={styles.notificationControls}>
                    <Switch
                      value={notification.enabled}
                      onValueChange={(enabled) => toggleNotificationEnabled(notification.id, enabled)}
                      trackColor={{ false: '#666', true: notification.color }}
                    />
                    <TouchableOpacity
                      style={[styles.deleteButton, { opacity: loading ? 0.5 : 1 }]}
                      onPress={() => deleteCustomNotification(notification.id)}
                      disabled={loading}
                    >
                      <Ionicons name="trash" size={18} color="#ff4444" />
                    </TouchableOpacity>
                  </View>
                </View>
                {!notification.show_during_games && (
                  <View style={styles.gameWarning}>
                    <Ionicons name="game-controller" size={16} color="#ffaa00" />
                    <Text style={styles.gameWarningText}>Won't show during games</Text>
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      ) : (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Default App Notifications</Text>
            <TouchableOpacity
              style={styles.resetAllButton}
              onPress={resetAllNotifications}
              disabled={loading}
            >
              <Ionicons name="refresh" size={16} color={Colors.primary.background} />
              <Text style={styles.resetAllButtonText}>Reset All</Text>
            </TouchableOpacity>
          </View>

        {APP_NOTIFICATIONS.map((notification) => {
          const isDismissed = notificationStatus[notification.id] || false;
          
          return (
            <View key={notification.id} style={styles.notificationCard}>
              <View style={styles.notificationHeader}>
                <View style={styles.notificationInfo}>
                  <Ionicons 
                    name={notification.icon as any} 
                    size={20} 
                    color={notification.color} 
                    style={styles.notificationIcon}
                  />
                  <Text style={styles.notificationTitle}>{notification.title}</Text>
                </View>
                <View style={styles.statusContainer}>
                  <Ionicons 
                    name={getStatusIcon(isDismissed)} 
                    size={16} 
                    color={getStatusColor(isDismissed)} 
                  />
                  <Text style={[styles.statusText, { color: getStatusColor(isDismissed) }]}>
                    {getStatusText(isDismissed)}
                  </Text>
                </View>
              </View>

              <Text style={styles.notificationMessage}>{notification.message}</Text>

              <View style={styles.notificationActions}>
                <View style={styles.notificationMeta}>
                  <Text style={styles.metaText}>Priority: {notification.priority}</Text>
                  <Text style={styles.metaText}>
                    Type: {notification.showOnce ? 'One-time' : notification.showDaily ? 'Daily' : 'Default'}
                  </Text>
                </View>
                
                {isDismissed && (
                  <TouchableOpacity
                    style={styles.resetButton}
                    onPress={() => resetNotification(notification.id)}
                    disabled={loading}
                  >
                    <Ionicons name="refresh" size={14} color={Colors.primary.background} />
                    <Text style={styles.resetButtonText}>Reset</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
        </View>
      )}

      {/* Create Notification Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        transparent={false}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Custom Notification</Text>
            <TouchableOpacity
              onPress={() => {
                console.log('📱 Closing modal');
                setShowCreateModal(false);
              }}
              style={{ padding: 8 }}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Title Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Title *</Text>
              <TextInput
                style={styles.textInput}
                value={newNotification.title}
                onChangeText={(text) => setNewNotification(prev => ({ ...prev, title: text }))}
                placeholder="Enter notification title"
                placeholderTextColor="#666"
              />
            </View>

            {/* Message Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Message *</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={newNotification.message}
                onChangeText={(text) => setNewNotification(prev => ({ ...prev, message: text }))}
                placeholder="Enter notification message"
                placeholderTextColor="#666"
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Frequency Type */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Frequency</Text>
              <View style={styles.frequencyButtons}>
                {['once', 'daily', 'weekly', 'monthly', 'custom'].map((freq) => (
                  <TouchableOpacity
                    key={freq}
                    style={[
                      styles.frequencyButton,
                      newNotification.frequency_type === freq && styles.frequencyButtonActive
                    ]}
                    onPress={() => setNewNotification(prev => ({ ...prev, frequency_type: freq as any }))}
                  >
                    <Text style={[
                      styles.frequencyButtonText,
                      newNotification.frequency_type === freq && styles.frequencyButtonTextActive
                    ]}>
                      {freq.charAt(0).toUpperCase() + freq.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Target Audience */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Target Audience</Text>
              <View style={styles.frequencyButtons}>
                {[
                  { key: 'all', label: 'All Users' },
                  { key: 'new_users', label: 'New Users' },
                  { key: 'active_users', label: 'Active Users' },
                  { key: 'vip_users', label: 'VIP Users' }
                ].map((audience) => (
                  <TouchableOpacity
                    key={audience.key}
                    style={[
                      styles.frequencyButton,
                      newNotification.target_audience === audience.key && styles.frequencyButtonActive
                    ]}
                    onPress={() => setNewNotification(prev => ({ ...prev, target_audience: audience.key as any }))}
                  >
                    <Text style={[
                      styles.frequencyButtonText,
                      newNotification.target_audience === audience.key && styles.frequencyButtonTextActive
                    ]}>
                      {audience.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Show During Games Toggle */}
            <View style={styles.inputGroup}>
              <View style={styles.switchRow}>
                <Text style={styles.inputLabel}>Show During Games</Text>
                <Switch
                  value={newNotification.show_during_games}
                  onValueChange={(value) => setNewNotification(prev => ({ ...prev, show_during_games: value }))}
                  trackColor={{ false: '#666', true: '#007AFF' }}
                />
              </View>
              <Text style={styles.inputHint}>
                If disabled, notifications won't appear while users are playing games
              </Text>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowCreateModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, { opacity: loading ? 0.5 : 1 }]}
              onPress={createCustomNotification}
              disabled={loading}
            >
              <Text style={styles.saveButtonText}>
                {loading ? 'Creating...' : 'Create Notification'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>ℹ️ How It Works</Text>
        <Text style={styles.infoText}>
          • Notifications appear as popups when users open the app{'\n'}
          • Each notification has a priority (lower number = higher priority){'\n'}
          • One-time notifications show only once per app install{'\n'}
          • Daily notifications show once per day{'\n'}
          • Users can dismiss notifications with the X button{'\n'}
          • Reset notifications to make them appear again for all users
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary.background,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.primary.textSecondary,
    lineHeight: 22,
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary.text,
  },
  resetAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  resetAllButtonText: {
    color: Colors.primary.background,
    fontSize: 14,
    fontWeight: '600',
  },
  notificationCard: {
    backgroundColor: Colors.primary.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  notificationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  notificationIcon: {
    marginRight: 8,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary.text,
    flex: 1,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  notificationMessage: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  notificationActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationMeta: {
    flex: 1,
  },
  metaText: {
    fontSize: 12,
    color: Colors.primary.textSecondary,
    marginBottom: 2,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffaa00',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  resetButtonText: {
    color: Colors.primary.background,
    fontSize: 12,
    fontWeight: '600',
  },
  infoSection: {
    margin: 20,
    padding: 16,
    backgroundColor: Colors.primary.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary.border,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary.text,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
    lineHeight: 20,
  },
  // New styles for enhanced UI
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 10,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: 'white',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    fontWeight: '600',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  customNotificationCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  notificationContent: {
    flex: 1,
    marginLeft: 12,
  },
  notificationControls: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  gameWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  gameWarningText: {
    fontSize: 12,
    color: '#ffaa00',
    marginLeft: 4,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.primary.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary.text,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary.text,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.primary.text,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  frequencyButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  frequencyButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
  },
  frequencyButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  frequencyButtonText: {
    fontSize: 14,
    color: '#666',
  },
  frequencyButtonTextActive: {
    color: 'white',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputHint: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#333',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
