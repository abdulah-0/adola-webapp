// Custom Notification Display - Shows custom notifications to users
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { CustomNotificationService, CustomNotification } from '../../services/customNotificationService';
import { useApp } from '../../contexts/AppContext';

const { width: screenWidth } = Dimensions.get('window');

interface CustomNotificationDisplayProps {
  onNotificationShown?: (notification: CustomNotification) => void;
  onNotificationDismissed?: (notification: CustomNotification) => void;
}

export default function CustomNotificationDisplay({
  onNotificationShown,
  onNotificationDismissed,
}: CustomNotificationDisplayProps) {
  const [currentNotification, setCurrentNotification] = useState<CustomNotification | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-100));
  
  const { user } = useApp();
  const customNotificationService = CustomNotificationService.getInstance();

  useEffect(() => {
    if (user?.id) {
      checkForNotifications();
      
      // Check for new notifications every 30 seconds
      const interval = setInterval(checkForNotifications, 30000);
      
      return () => clearInterval(interval);
    }
  }, [user?.id]);

  const checkForNotifications = async () => {
    if (!user?.id || isVisible) return;

    try {
      const notification = await customNotificationService.getNextNotificationForUser(user.id);
      
      if (notification) {
        console.log('📱 Showing custom notification:', notification.title);
        setCurrentNotification(notification);
        showNotification();
        
        // Mark as shown
        await customNotificationService.markNotificationAsShown(user.id, notification.id);
        
        // Callback
        onNotificationShown?.(notification);
      }
    } catch (error) {
      console.error('Error checking for notifications:', error);
    }
  };

  const showNotification = () => {
    setIsVisible(true);
    
    // Slide in animation
    Animated.spring(slideAnim, {
      toValue: 20,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();

    // Auto-hide after 8 seconds if not dismissed
    setTimeout(() => {
      if (isVisible) {
        hideNotification();
      }
    }, 8000);
  };

  const hideNotification = () => {
    // Slide out animation
    Animated.spring(slideAnim, {
      toValue: -100,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start(() => {
      setIsVisible(false);
      setCurrentNotification(null);
    });
  };

  const dismissNotification = async () => {
    if (!currentNotification || !user?.id) return;

    try {
      await customNotificationService.dismissNotification(user.id, currentNotification.id);
      console.log('✅ Notification dismissed:', currentNotification.title);
      
      // Callback
      onNotificationDismissed?.(currentNotification);
      
      hideNotification();
    } catch (error) {
      console.error('Error dismissing notification:', error);
      hideNotification();
    }
  };

  if (!isVisible || !currentNotification) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.notificationContainer,
        {
          transform: [{ translateY: slideAnim }],
          backgroundColor: currentNotification.color + '20', // Add transparency
          borderColor: currentNotification.color,
        }
      ]}
    >
      <View style={styles.notificationContent}>
        <View style={styles.iconContainer}>
          <Ionicons 
            name={currentNotification.icon as any} 
            size={24} 
            color={currentNotification.color} 
          />
        </View>
        
        <View style={styles.textContainer}>
          <Text style={styles.notificationTitle} numberOfLines={1}>
            {currentNotification.title}
          </Text>
          <Text style={styles.notificationMessage} numberOfLines={2}>
            {currentNotification.message}
          </Text>
        </View>
        
        <TouchableOpacity
          style={styles.dismissButton}
          onPress={dismissNotification}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={20} color="#666" />
        </TouchableOpacity>
      </View>
      
      {/* Priority indicator */}
      {currentNotification.priority <= 2 && (
        <View style={styles.priorityIndicator}>
          <Text style={styles.priorityText}>HIGH PRIORITY</Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  notificationContainer: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    zIndex: 9999,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#cccccc',
    lineHeight: 18,
  },
  dismissButton: {
    padding: 8,
    marginLeft: 8,
  },
  priorityIndicator: {
    position: 'absolute',
    top: -8,
    right: 16,
    backgroundColor: '#ff4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
});
