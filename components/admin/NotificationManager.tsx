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
    if (!newNotification.title.trim() || !newNotification.message.trim()) {
      Alert.alert('Error', 'Please fill in title and message');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'User not found');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('custom_notifications')
        .insert({
          ...newNotification,
          created_by: user.id,
          starts_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error creating notification:', error);
        Alert.alert('Error', 'Failed to create notification');
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

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Current Notifications</Text>
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
    backgroundColor: Colors.primary.danger,
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
    backgroundColor: Colors.primary.cardBackground,
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
    backgroundColor: Colors.primary.warning,
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
    backgroundColor: Colors.primary.cardBackground,
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
});
