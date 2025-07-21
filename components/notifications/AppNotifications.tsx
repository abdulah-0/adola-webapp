// App Notifications Component - Popup notifications for app features
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { NotificationService, AppNotification } from '../../services/notificationService';

const { width, height } = Dimensions.get('window');

export default function AppNotifications() {
  const [currentNotification, setCurrentNotification] = useState<AppNotification | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));
  const notificationService = NotificationService.getInstance();

  useEffect(() => {
    checkAndShowNotifications();
  }, []);

  const checkAndShowNotifications = async () => {
    try {
      const nextNotification = await notificationService.getNextNotification();
      if (nextNotification) {
        showNotification(nextNotification);
      }
    } catch (error) {
      console.error('Error checking notifications:', error);
    }
  };

  const showNotification = (notification: AppNotification) => {
    setCurrentNotification(notification);
    setIsVisible(true);

    // Animate in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const dismissNotification = async () => {
    if (!currentNotification) return;

    try {
      // Mark this notification as dismissed using the service
      await notificationService.dismissNotification(currentNotification);

      // Animate out
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsVisible(false);
        setCurrentNotification(null);

        // Reset animations for next notification
        fadeAnim.setValue(0);
        scaleAnim.setValue(0.8);

        // Check if there are more notifications to show
        setTimeout(() => {
          checkAndShowNotifications();
        }, 500);
      });
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  };

  if (!isVisible || !currentNotification) {
    return null;
  }

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="none"
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.notificationContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Header with icon and close button */}
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Ionicons 
                name={currentNotification.icon as any} 
                size={24} 
                color={currentNotification.color} 
                style={styles.icon}
              />
              <Text style={styles.title}>{currentNotification.title}</Text>
            </View>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={dismissNotification}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color={Colors.primary.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Message content */}
          <Text style={styles.message}>{currentNotification.message}</Text>

          {/* Action button */}
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: currentNotification.color }]}
            onPress={dismissNotification}
          >
            <Text style={styles.actionButtonText}>Got it!</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  notificationContainer: {
    backgroundColor: Colors.primary.background,
    borderRadius: 16,
    padding: 24,
    width: Math.min(width - 40, 350),
    maxHeight: height * 0.8,
    borderWidth: 1,
    borderColor: Colors.primary.border,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary.text,
    flex: 1,
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.primary.textSecondary,
    marginBottom: 24,
    textAlign: 'left',
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    alignSelf: 'center',
    minWidth: 100,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary.background,
  },
});
