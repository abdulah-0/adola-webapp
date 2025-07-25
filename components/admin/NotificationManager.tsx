// Notification Manager - Admin component to manage app notifications
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { NotificationService, APP_NOTIFICATIONS } from '../../services/notificationService';

export default function NotificationManager() {
  const [notificationStatus, setNotificationStatus] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const notificationService = NotificationService.getInstance();

  useEffect(() => {
    loadNotificationStatus();
  }, []);

  const loadNotificationStatus = async () => {
    try {
      setLoading(true);
      const status = await notificationService.getAllNotificationStatus();
      setNotificationStatus(status);
    } catch (error) {
      console.error('Error loading notification status:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleNotification = async (notificationId: string) => {
    try {
      setLoading(true);
      const currentStatus = notificationStatus[notificationId] || false;
      
      if (currentStatus) {
        // Reset notification
        await notificationService.resetNotification(notificationId);
      } else {
        // Dismiss notification
        await notificationService.dismissNotification(notificationId);
      }
      
      await loadNotificationStatus();
    } catch (error) {
      console.error('Error toggling notification:', error);
      Alert.alert('Error', 'Failed to update notification status');
    } finally {
      setLoading(false);
    }
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
          Manage popup notifications that appear when users open the app
        </Text>
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

        {Object.entries(APP_NOTIFICATIONS).map(([key, notification]) => (
          <View key={key} style={styles.notificationCard}>
            <View style={styles.notificationHeader}>
              <View style={styles.notificationInfo}>
                <Text style={styles.notificationTitle}>{notification.title}</Text>
                <Text style={styles.notificationMessage}>{notification.message}</Text>
              </View>
              <View style={styles.notificationControls}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(notificationStatus[key] || false) }]}>
                  <Text style={styles.statusText}>{getStatusText(notificationStatus[key] || false)}</Text>
                </View>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => toggleNotification(key)}
                  disabled={loading}
                >
                  <Text style={styles.actionButtonText}>
                    {notificationStatus[key] ? 'Reset' : 'Dismiss'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Info Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ℹ️ How Notifications Work</Text>
        <Text style={styles.infoText}>
          • Notifications appear as popups when users open the app{'\n'}
          • One-time notifications show only once per user{'\n'}
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  resetAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff4444',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  resetAllButtonText: {
    color: Colors.primary.background,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
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
    alignItems: 'flex-start',
  },
  notificationInfo: {
    flex: 1,
    marginRight: 12,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary.text,
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
    lineHeight: 20,
  },
  notificationControls: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary.background,
  },
  actionButton: {
    backgroundColor: '#ffaa00',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionButtonText: {
    color: Colors.primary.background,
    fontSize: 12,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 14,
    color: Colors.primary.textSecondary,
    lineHeight: 20,
  },
});
