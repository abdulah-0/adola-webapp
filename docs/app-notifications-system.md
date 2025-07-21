# App Notifications System

## Overview
The app notifications system displays popup notifications to users when they open the app. These notifications inform users about important features like deposit bonuses and referral programs.

## Current Notifications

### 1. 5% Deposit Bonus Notification
- **Title:** 🎁 5% Deposit Bonus!
- **Message:** Get an automatic 5% bonus on every deposit you make! No minimum amount required. The bonus is instantly added to your balance when your deposit is approved.
- **Icon:** Gift icon
- **Color:** Gold (#FFD700)
- **Type:** One-time notification
- **Priority:** 1 (highest)

### 2. Referral Bonus Notification
- **Title:** 💰 Referral Bonuses!
- **Message:** Earn money by referring friends! Share your referral code and get bonuses when your friends sign up and play. The more friends you refer, the more you earn!
- **Icon:** People icon
- **Color:** Cyan (#00FFFF)
- **Type:** One-time notification
- **Priority:** 2

## Features

### User Experience
- **Popup Display:** Notifications appear as modal popups over the app content
- **Smooth Animations:** Fade in/out and scale animations for professional appearance
- **Cross Button:** Users can dismiss notifications with an X button in the top-right corner
- **Sequential Display:** Only one notification shows at a time, in priority order
- **Persistent Dismissal:** Once dismissed, notifications don't appear again (for one-time notifications)

### Admin Management
- **Admin Panel:** Dedicated notification manager in admin dashboard
- **Status Tracking:** View which notifications are active or dismissed
- **Reset Functionality:** Reset individual or all notifications to show them again
- **Real-time Updates:** Changes take effect immediately

## Technical Implementation

### Components
1. **AppNotifications.tsx** - Main notification display component
2. **NotificationManager.tsx** - Admin management interface
3. **notificationService.ts** - Service for managing notification state

### Service Features
- **Priority System:** Lower numbers = higher priority
- **Storage Management:** Uses AsyncStorage to track dismissed notifications
- **Flexible Types:** Support for one-time, daily, or custom notifications
- **Condition Support:** Custom logic for when to show notifications

### Integration
- **Root Level:** Integrated at app root level for global display
- **Context Aware:** Works with existing app authentication and routing
- **Performance Optimized:** Minimal impact on app startup time

## Notification Types

### One-time Notifications
- Show only once per app installation
- Perfect for feature announcements
- Stored as simple boolean flag

### Daily Notifications
- Show once per day
- Good for reminders or promotions
- Stored with timestamp for tracking

### Custom Notifications
- Support for custom conditions
- Can be programmatically controlled
- Flexible display logic

## Configuration

### Adding New Notifications
```typescript
const newNotification: AppNotification = {
  id: 'unique_id',
  title: '🎉 New Feature!',
  message: 'Description of the new feature...',
  icon: 'star',
  color: '#FF6B6B',
  storageKey: 'notification_new_feature_dismissed',
  priority: 3,
  showOnce: true,
};
```

### Notification Properties
- **id:** Unique identifier
- **title:** Display title with emoji
- **message:** Detailed description
- **icon:** Ionicons icon name
- **color:** Hex color code
- **storageKey:** AsyncStorage key for tracking
- **priority:** Display order (1 = highest)
- **showOnce:** Boolean for one-time display
- **showDaily:** Boolean for daily display
- **conditions:** Optional function for custom logic

## Admin Controls

### Notification Manager Features
- **Status Overview:** See all notifications and their states
- **Individual Reset:** Reset specific notifications
- **Bulk Reset:** Reset all notifications at once
- **Metadata Display:** View priority, type, and status
- **Real-time Updates:** Immediate effect on user experience

### Admin Actions
1. **View Status:** Check which notifications are active/dismissed
2. **Reset Notification:** Make a specific notification appear again
3. **Reset All:** Make all notifications appear again for all users
4. **Monitor Usage:** Track notification effectiveness

## Storage Keys
- `notification_deposit_bonus_dismissed` - 5% deposit bonus
- `notification_referral_bonus_dismissed` - Referral bonuses

## Files Structure
```
components/
├── notifications/
│   └── AppNotifications.tsx          # Main notification component
└── admin/
    └── NotificationManager.tsx       # Admin management interface

services/
└── notificationService.ts            # Notification management service

docs/
└── app-notifications-system.md      # This documentation
```

## Usage Examples

### For Users
1. Open the app
2. See notification popup (if any are pending)
3. Read the information
4. Click X button to dismiss
5. Continue using the app

### For Admins
1. Go to Admin Dashboard
2. Click "App Notifications"
3. View notification status
4. Reset notifications as needed
5. Monitor user engagement

## Benefits

### For Users
- **Informed:** Learn about important features
- **Non-intrusive:** Easy to dismiss
- **Relevant:** Only see each notification once
- **Professional:** Smooth animations and design

### For Business
- **Feature Awareness:** Ensure users know about bonuses
- **User Engagement:** Increase feature adoption
- **Flexible:** Easy to add new notifications
- **Trackable:** Monitor notification effectiveness

### For Admins
- **Control:** Manage what users see
- **Testing:** Reset notifications for testing
- **Monitoring:** Track notification status
- **Maintenance:** Easy to update or remove notifications

## Future Enhancements

### Potential Features
- **User Preferences:** Let users control notification types
- **Scheduling:** Time-based notification display
- **Targeting:** Show notifications to specific user groups
- **Analytics:** Track notification click-through rates
- **Rich Content:** Support for images and buttons
- **Push Integration:** Connect with push notification system

### Advanced Options
- **A/B Testing:** Test different notification messages
- **Localization:** Multi-language support
- **Personalization:** User-specific notifications
- **Frequency Capping:** Limit notification frequency
- **Conversion Tracking:** Measure notification effectiveness
