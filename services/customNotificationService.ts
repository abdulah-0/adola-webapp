// Custom Notification Service - Enhanced notification system with admin controls
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

export interface CustomNotification {
  id: string;
  title: string;
  message: string;
  icon: string;
  color: string;
  priority: number;
  frequency_type: 'once' | 'daily' | 'weekly' | 'monthly' | 'custom';
  frequency_hours?: number;
  enabled: boolean;
  show_during_games: boolean;
  target_audience: 'all' | 'new_users' | 'active_users' | 'vip_users';
  conditions: any;
  created_by: string;
  created_at: string;
  updated_at: string;
  starts_at: string;
  ends_at?: string;
  total_views: number;
  total_dismissals: number;
}

export interface NotificationUserStatus {
  notification_id: string;
  user_id: string;
  last_shown_at?: string;
  times_shown: number;
  dismissed: boolean;
  dismissed_at?: string;
}

export interface GameSessionStatus {
  user_id: string;
  game_type: string;
  is_active: boolean;
  last_activity: string;
}

export class CustomNotificationService {
  private static instance: CustomNotificationService;

  private constructor() {}

  public static getInstance(): CustomNotificationService {
    if (!CustomNotificationService.instance) {
      CustomNotificationService.instance = new CustomNotificationService();
    }
    return CustomNotificationService.instance;
  }

  /**
   * Get the next notification that should be shown to a user
   */
  async getNextNotificationForUser(userId: string): Promise<CustomNotification | null> {
    try {
      // First check if user is currently in a game session
      const isInGame = await this.isUserInGameSession(userId);
      
      // Get all active notifications
      const { data: notifications, error } = await supabase
        .from('custom_notifications')
        .select('*')
        .eq('enabled', true)
        .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`)
        .lte('starts_at', new Date().toISOString())
        .order('priority', { ascending: true });

      if (error) {
        console.error('Error fetching notifications:', error);
        return null;
      }

      if (!notifications || notifications.length === 0) {
        return null;
      }

      // Filter notifications based on game session status and user eligibility
      for (const notification of notifications) {
        // Skip if user is in game and notification doesn't allow showing during games
        if (isInGame && !notification.show_during_games) {
          continue;
        }

        // Check if user is eligible for this notification
        const isEligible = await this.isUserEligibleForNotification(userId, notification);
        if (!isEligible) {
          continue;
        }

        // Check if notification should be shown based on frequency
        const shouldShow = await this.shouldShowNotificationToUser(userId, notification);
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
   * Check if user is currently in a game session
   */
  async isUserInGameSession(userId: string): Promise<boolean> {
    try {
      const { data: sessions, error } = await supabase
        .from('active_game_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) {
        console.error('Error checking game sessions:', error);
        return false;
      }

      // Check if any session is still active (within last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const activeSessions = sessions?.filter(session => 
        new Date(session.last_activity) > fiveMinutesAgo
      ) || [];

      return activeSessions.length > 0;
    } catch (error) {
      console.error('Error checking game session status:', error);
      return false;
    }
  }

  /**
   * Start a game session for a user
   */
  async startGameSession(userId: string, gameType: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('active_game_sessions')
        .upsert({
          user_id: userId,
          game_type: gameType,
          session_start: new Date().toISOString(),
          last_activity: new Date().toISOString(),
          is_active: true
        }, {
          onConflict: 'user_id,game_type'
        });

      if (error) {
        console.error('Error starting game session:', error);
      } else {
        console.log(`🎮 Game session started: ${gameType} for user ${userId}`);
      }
    } catch (error) {
      console.error('Error starting game session:', error);
    }
  }

  /**
   * Update game session activity
   */
  async updateGameSessionActivity(userId: string, gameType: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('active_game_sessions')
        .update({
          last_activity: new Date().toISOString(),
          is_active: true
        })
        .eq('user_id', userId)
        .eq('game_type', gameType);

      if (error) {
        console.error('Error updating game session:', error);
      }
    } catch (error) {
      console.error('Error updating game session:', error);
    }
  }

  /**
   * End a game session for a user
   */
  async endGameSession(userId: string, gameType: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('active_game_sessions')
        .update({
          is_active: false,
          last_activity: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('game_type', gameType);

      if (error) {
        console.error('Error ending game session:', error);
      } else {
        console.log(`🎮 Game session ended: ${gameType} for user ${userId}`);
      }
    } catch (error) {
      console.error('Error ending game session:', error);
    }
  }

  /**
   * Check if user is eligible for a notification based on target audience
   */
  async isUserEligibleForNotification(userId: string, notification: CustomNotification): Promise<boolean> {
    try {
      if (notification.target_audience === 'all') {
        return true;
      }

      // Get user data
      const { data: user, error } = await supabase
        .from('users')
        .select('created_at, games_played, wallet_balance')
        .eq('id', userId)
        .single();

      if (error || !user) {
        return false;
      }

      const userCreatedAt = new Date(user.created_at);
      const daysSinceJoined = (Date.now() - userCreatedAt.getTime()) / (1000 * 60 * 60 * 24);

      switch (notification.target_audience) {
        case 'new_users':
          return daysSinceJoined <= 7; // New users = joined within 7 days
        case 'active_users':
          return user.games_played >= 10; // Active users = played 10+ games
        case 'vip_users':
          return user.wallet_balance >= 1000; // VIP users = balance >= 1000 PKR
        default:
          return true;
      }
    } catch (error) {
      console.error('Error checking user eligibility:', error);
      return false;
    }
  }

  /**
   * Check if notification should be shown to user based on frequency
   */
  async shouldShowNotificationToUser(userId: string, notification: CustomNotification): Promise<boolean> {
    try {
      // Get user's status for this notification
      const { data: status, error } = await supabase
        .from('notification_user_status')
        .select('*')
        .eq('notification_id', notification.id)
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error checking notification status:', error);
        return false;
      }

      // If no status record exists, user hasn't seen this notification
      if (!status) {
        return true;
      }

      // If user dismissed it and it's a one-time notification, don't show
      if (status.dismissed && notification.frequency_type === 'once') {
        return false;
      }

      // If user dismissed it, check if enough time has passed based on frequency
      if (status.dismissed && status.dismissed_at) {
        const dismissedAt = new Date(status.dismissed_at);
        const now = new Date();
        const timeDiff = now.getTime() - dismissedAt.getTime();

        switch (notification.frequency_type) {
          case 'daily':
            return timeDiff >= 24 * 60 * 60 * 1000; // 24 hours
          case 'weekly':
            return timeDiff >= 7 * 24 * 60 * 60 * 1000; // 7 days
          case 'monthly':
            return timeDiff >= 30 * 24 * 60 * 60 * 1000; // 30 days
          case 'custom':
            const customHours = notification.frequency_hours || 24;
            return timeDiff >= customHours * 60 * 60 * 1000;
          default:
            return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error checking notification frequency:', error);
      return false;
    }
  }

  /**
   * Mark notification as shown to user
   */
  async markNotificationAsShown(userId: string, notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notification_user_status')
        .upsert({
          notification_id: notificationId,
          user_id: userId,
          last_shown_at: new Date().toISOString(),
          times_shown: 1,
          dismissed: false
        }, {
          onConflict: 'notification_id,user_id'
        });

      if (error) {
        console.error('Error marking notification as shown:', error);
      }

      // Update total views count
      await supabase
        .from('custom_notifications')
        .update({ total_views: supabase.sql`total_views + 1` })
        .eq('id', notificationId);

    } catch (error) {
      console.error('Error marking notification as shown:', error);
    }
  }

  /**
   * Mark notification as dismissed by user
   */
  async dismissNotification(userId: string, notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notification_user_status')
        .upsert({
          notification_id: notificationId,
          user_id: userId,
          dismissed: true,
          dismissed_at: new Date().toISOString()
        }, {
          onConflict: 'notification_id,user_id'
        });

      if (error) {
        console.error('Error dismissing notification:', error);
      }

      // Update total dismissals count
      await supabase
        .from('custom_notifications')
        .update({ total_dismissals: supabase.sql`total_dismissals + 1` })
        .eq('id', notificationId);

      console.log(`✅ Notification dismissed: ${notificationId} by user ${userId}`);
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  }
}
