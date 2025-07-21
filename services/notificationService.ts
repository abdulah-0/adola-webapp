// Notification Service - Manages app notifications and user preferences
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  icon: string;
  color: string;
  storageKey: string;
  priority: number; // Lower number = higher priority
  showOnce?: boolean; // If true, show only once per app install
  showDaily?: boolean; // If true, show once per day
  conditions?: () => boolean; // Custom conditions to show notification
}

export const APP_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'deposit_bonus',
    title: '🎁 5% Deposit Bonus!',
    message: 'Get an automatic 5% bonus on every deposit you make! No minimum amount required. The bonus is instantly added to your balance when your deposit is approved.',
    icon: 'gift',
    color: '#FFD700', // Gold
    storageKey: 'notification_deposit_bonus_dismissed',
    priority: 1,
    showOnce: true,
  },
  {
    id: 'referral_bonus',
    title: '💰 Referral Bonuses!',
    message: 'Earn money by referring friends! Share your referral code and get bonuses when your friends sign up and play. The more friends you refer, the more you earn!',
    icon: 'people',
    color: '#00FFFF', // Cyan
    storageKey: 'notification_referral_bonus_dismissed',
    priority: 2,
    showOnce: true,
  }
];

export class NotificationService {
  private static instance: NotificationService;
  
  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Get the next notification that should be shown
   */
  async getNextNotification(): Promise<AppNotification | null> {
    try {
      // Sort notifications by priority
      const sortedNotifications = [...APP_NOTIFICATIONS].sort((a, b) => a.priority - b.priority);
      
      for (const notification of sortedNotifications) {
        const shouldShow = await this.shouldShowNotification(notification);
        if (shouldShow) {
          return notification;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error getting next notification:', error);
      return null;
    }
  }

  /**
   * Check if a notification should be shown
   */
  private async shouldShowNotification(notification: AppNotification): Promise<boolean> {
    try {
      // Check custom conditions first
      if (notification.conditions && !notification.conditions()) {
        return false;
      }

      // Check if notification was dismissed
      const dismissed = await AsyncStorage.getItem(notification.storageKey);
      
      if (notification.showOnce) {
        // Show only once per app install
        return !dismissed;
      }
      
      if (notification.showDaily) {
        // Show once per day
        if (!dismissed) return true;
        
        const lastShown = parseInt(dismissed);
        const now = Date.now();
        const oneDayMs = 24 * 60 * 60 * 1000;
        
        return (now - lastShown) >= oneDayMs;
      }
      
      // Default: show only if not dismissed
      return !dismissed;
    } catch (error) {
      console.error('Error checking notification conditions:', error);
      return false;
    }
  }

  /**
   * Mark a notification as dismissed
   */
  async dismissNotification(notification: AppNotification): Promise<void> {
    try {
      if (notification.showDaily) {
        // Store timestamp for daily notifications
        await AsyncStorage.setItem(notification.storageKey, Date.now().toString());
      } else {
        // Store simple flag for one-time notifications
        await AsyncStorage.setItem(notification.storageKey, 'true');
      }
      
      console.log(`✅ Notification dismissed: ${notification.id}`);
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  }

  /**
   * Reset all notifications (for testing or admin purposes)
   */
  async resetAllNotifications(): Promise<void> {
    try {
      for (const notification of APP_NOTIFICATIONS) {
        await AsyncStorage.removeItem(notification.storageKey);
      }
      console.log('✅ All notifications reset');
    } catch (error) {
      console.error('Error resetting notifications:', error);
    }
  }

  /**
   * Reset a specific notification
   */
  async resetNotification(notificationId: string): Promise<void> {
    try {
      const notification = APP_NOTIFICATIONS.find(n => n.id === notificationId);
      if (notification) {
        await AsyncStorage.removeItem(notification.storageKey);
        console.log(`✅ Notification reset: ${notificationId}`);
      }
    } catch (error) {
      console.error('Error resetting notification:', error);
    }
  }

  /**
   * Get notification status for all notifications
   */
  async getNotificationStatus(): Promise<Record<string, boolean>> {
    const status: Record<string, boolean> = {};
    
    try {
      for (const notification of APP_NOTIFICATIONS) {
        const dismissed = await AsyncStorage.getItem(notification.storageKey);
        status[notification.id] = !!dismissed;
      }
    } catch (error) {
      console.error('Error getting notification status:', error);
    }
    
    return status;
  }

  /**
   * Add a new notification dynamically
   */
  addNotification(notification: AppNotification): void {
    const existingIndex = APP_NOTIFICATIONS.findIndex(n => n.id === notification.id);
    if (existingIndex >= 0) {
      APP_NOTIFICATIONS[existingIndex] = notification;
    } else {
      APP_NOTIFICATIONS.push(notification);
    }
  }

  /**
   * Remove a notification
   */
  removeNotification(notificationId: string): void {
    const index = APP_NOTIFICATIONS.findIndex(n => n.id === notificationId);
    if (index >= 0) {
      APP_NOTIFICATIONS.splice(index, 1);
    }
  }
}

export default NotificationService;
