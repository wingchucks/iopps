import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { doc, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../config/firebase';
import { notificationLogger } from '../lib/logger';

// Types
export interface NotificationData {
  jobId?: string;
  employerId?: string;
  applicationId?: string;
  type?: 'job_posted' | 'application_status' | 'message' | 'job_alert' | 'subscription_expiring' | 'general';
  title?: string;
  body?: string;
  [key: string]: any;
}

export interface PushNotificationToken {
  token: string;
  platform: 'ios' | 'android';
  deviceId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationPermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  ios?: {
    status: Notifications.IosAuthorizationStatus;
  };
}

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class PushNotificationService {
  private static instance: PushNotificationService;
  private userId: string | null = null;
  private notificationListener: Notifications.Subscription | null = null;
  private responseListener: Notifications.Subscription | null = null;
  private foregroundListener: (() => void) | null = null;
  private backgroundListener: (() => void) | null = null;

  private constructor() {}

  public static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  /**
   * Initialize the push notification service
   * @param userId - The current user's ID
   */
  public async initialize(userId: string): Promise<void> {
    this.userId = userId;

    // Request permissions
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      notificationLogger.warn('Push notification permissions not granted');
      return;
    }

    // Get and store FCM token
    await this.registerForPushNotifications();

    // Set up notification handlers
    this.setupNotificationHandlers();

    // Handle background notifications
    this.setupBackgroundHandler();
  }

  /**
   * Request notification permissions from the user
   */
  public async requestPermissions(): Promise<boolean> {
    try {
      if (!Device.isDevice) {
        notificationLogger.warn('Push notifications only work on physical devices');
        return false;
      }

      // Request permissions using expo-notifications
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        notificationLogger.warn('Failed to get push notification permissions');
        return false;
      }

      // For Android, create a notification channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });

        await Notifications.setNotificationChannelAsync('job_alerts', {
          name: 'Job Alerts',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#4CAF50',
          description: 'Notifications for new job postings matching your preferences',
        });

        await Notifications.setNotificationChannelAsync('applications', {
          name: 'Application Updates',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#2196F3',
          description: 'Updates about your job applications',
        });

        await Notifications.setNotificationChannelAsync('messages', {
          name: 'Messages',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF9800',
          description: 'Messages from employers',
        });
      }

      // Request Firebase Cloud Messaging permissions (iOS)
      if (Platform.OS === 'ios') {
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (!enabled) {
          notificationLogger.warn('Firebase messaging permissions not granted');
          return false;
        }
      }

      return true;
    } catch (error) {
      notificationLogger.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  /**
   * Get the current notification permission status
   */
  public async getPermissionStatus(): Promise<NotificationPermissionStatus> {
    const { status, canAskAgain, ios } = await Notifications.getPermissionsAsync();
    return {
      granted: status === 'granted',
      canAskAgain,
      ios,
    };
  }

  /**
   * Register for push notifications and get FCM token
   */
  public async registerForPushNotifications(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        notificationLogger.warn('Push notifications only work on physical devices');
        return null;
      }

      // Get FCM token
      const token = await messaging().getToken();

      if (!token) {
        notificationLogger.error('Failed to get FCM token');
        return null;
      }

      notificationLogger.log('FCM Token:', token);

      // Store token in Firestore
      if (this.userId) {
        await this.storeFCMToken(token);
      }

      // Listen for token refresh
      messaging().onTokenRefresh(async (newToken) => {
        notificationLogger.log('FCM Token refreshed:', newToken);
        if (this.userId) {
          await this.storeFCMToken(newToken);
        }
      });

      return token;
    } catch (error) {
      notificationLogger.error('Error registering for push notifications:', error);
      return null;
    }
  }

  /**
   * Store FCM token in Firestore
   */
  private async storeFCMToken(token: string): Promise<void> {
    if (!this.userId) {
      notificationLogger.warn('No user ID available to store FCM token');
      return;
    }

    try {
      const userRef = doc(db, 'users', this.userId);
      const tokenData: PushNotificationToken = {
        token,
        platform: Platform.OS as 'ios' | 'android',
        deviceId: Device.modelName || undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await updateDoc(userRef, {
        fcmToken: token,
        fcmTokenData: tokenData,
        'settings.notifications.enabled': true,
        updatedAt: new Date(),
      });

      notificationLogger.log('FCM token stored successfully');
    } catch (error) {
      notificationLogger.error('Error storing FCM token:', error);
    }
  }

  /**
   * Set up handlers for foreground notifications
   */
  private setupNotificationHandlers(): void {
    // Handle notifications received while app is in foreground
    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        notificationLogger.log('Notification received in foreground:', notification);
        this.handleForegroundNotification(notification);
      }
    );

    // Handle notification taps/opens
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        notificationLogger.log('Notification tapped:', response);
        this.handleNotificationResponse(response);
      }
    );

    // Firebase foreground handler
    this.foregroundListener = messaging().onMessage(async (remoteMessage) => {
      notificationLogger.log('FCM message received in foreground:', remoteMessage);
      await this.displayLocalNotification(remoteMessage);
    });
  }

  /**
   * Set up background notification handler
   */
  private setupBackgroundHandler(): void {
    // Handle notifications when app is in background or quit state
    this.backgroundListener = messaging().setBackgroundMessageHandler(
      async (remoteMessage) => {
        notificationLogger.log('Message handled in background:', remoteMessage);
        await this.handleBackgroundNotification(remoteMessage);
      }
    );
  }

  /**
   * Handle foreground notifications
   */
  private handleForegroundNotification(notification: Notifications.Notification): void {
    const data = notification.request.content.data as NotificationData;
    notificationLogger.log('Foreground notification data:', data);

    // You can add custom logic here based on notification type
    // For example, update UI, refresh data, etc.
  }

  /**
   * Handle background notifications
   */
  private async handleBackgroundNotification(
    remoteMessage: FirebaseMessagingTypes.RemoteMessage
  ): Promise<void> {
    notificationLogger.log('Background notification:', remoteMessage);

    // You can add custom logic here
    // For example, update local database, sync data, etc.
  }

  /**
   * Handle notification taps/opens
   */
  private handleNotificationResponse(response: Notifications.NotificationResponse): void {
    const data = response.notification.request.content.data as NotificationData;
    notificationLogger.log('Notification response data:', data);

    // Navigate based on notification type
    if (data.type === 'job_posted' && data.jobId) {
      // Navigate to job details
      notificationLogger.log('Navigate to job:', data.jobId);
    } else if (data.type === 'application_status' && data.applicationId) {
      // Navigate to application details
      notificationLogger.log('Navigate to application:', data.applicationId);
    } else if (data.type === 'message' && data.employerId) {
      // Navigate to messages
      notificationLogger.log('Navigate to messages with employer:', data.employerId);
    }

    // You should integrate with your navigation system here
    // For example: navigationRef.current?.navigate('JobDetails', { jobId: data.jobId });
  }

  /**
   * Display a local notification from FCM data
   */
  private async displayLocalNotification(
    remoteMessage: FirebaseMessagingTypes.RemoteMessage
  ): Promise<void> {
    const { notification, data } = remoteMessage;

    if (!notification) return;

    const channelId = this.getChannelId(data?.type as string);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: notification.title || 'New Notification',
        body: notification.body || '',
        data: data || {},
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null, // Show immediately
    });
  }

  /**
   * Get notification channel ID based on type
   */
  private getChannelId(type?: string): string {
    switch (type) {
      case 'job_alert':
      case 'job_posted':
        return 'job_alerts';
      case 'application_status':
        return 'applications';
      case 'message':
        return 'messages';
      default:
        return 'default';
    }
  }

  /**
   * Subscribe to a topic (e.g., job category)
   */
  public async subscribeToTopic(topic: string): Promise<void> {
    try {
      await messaging().subscribeToTopic(topic);
      notificationLogger.log(`Subscribed to topic: ${topic}`);

      // Store subscription in Firestore
      if (this.userId) {
        const userRef = doc(db, 'users', this.userId);
        await updateDoc(userRef, {
          subscribedTopics: arrayUnion(topic),
          updatedAt: new Date(),
        });
      }
    } catch (error) {
      notificationLogger.error(`Error subscribing to topic ${topic}:`, error);
      throw error;
    }
  }

  /**
   * Unsubscribe from a topic
   */
  public async unsubscribeFromTopic(topic: string): Promise<void> {
    try {
      await messaging().unsubscribeFromTopic(topic);
      notificationLogger.log(`Unsubscribed from topic: ${topic}`);

      // Remove subscription from Firestore
      if (this.userId) {
        const userRef = doc(db, 'users', this.userId);
        await updateDoc(userRef, {
          subscribedTopics: arrayRemove(topic),
          updatedAt: new Date(),
        });
      }
    } catch (error) {
      notificationLogger.error(`Error unsubscribing from topic ${topic}:`, error);
      throw error;
    }
  }

  /**
   * Subscribe to job alerts by category
   */
  public async subscribeToJobCategory(category: string): Promise<void> {
    const topic = `job_category_${category.toLowerCase().replace(/\s+/g, '_')}`;
    await this.subscribeToTopic(topic);
  }

  /**
   * Unsubscribe from job alerts by category
   */
  public async unsubscribeFromJobCategory(category: string): Promise<void> {
    const topic = `job_category_${category.toLowerCase().replace(/\s+/g, '_')}`;
    await this.unsubscribeFromTopic(topic);
  }

  /**
   * Subscribe to job alerts by location
   */
  public async subscribeToJobLocation(location: string): Promise<void> {
    const topic = `job_location_${location.toLowerCase().replace(/\s+/g, '_')}`;
    await this.subscribeToTopic(topic);
  }

  /**
   * Unsubscribe from job alerts by location
   */
  public async unsubscribeFromJobLocation(location: string): Promise<void> {
    const topic = `job_location_${location.toLowerCase().replace(/\s+/g, '_')}`;
    await this.unsubscribeFromTopic(topic);
  }

  /**
   * Get the initial notification (if app was opened from a notification)
   */
  public async getInitialNotification(): Promise<NotificationData | null> {
    try {
      // Check for Expo notification
      const response = await Notifications.getLastNotificationResponseAsync();
      if (response) {
        return response.notification.request.content.data as NotificationData;
      }

      // Check for FCM notification
      const remoteMessage = await messaging().getInitialNotification();
      if (remoteMessage) {
        return remoteMessage.data as NotificationData;
      }

      return null;
    } catch (error) {
      notificationLogger.error('Error getting initial notification:', error);
      return null;
    }
  }

  /**
   * Clear all notifications
   */
  public async clearAllNotifications(): Promise<void> {
    try {
      await Notifications.dismissAllNotificationsAsync();
      notificationLogger.log('All notifications cleared');
    } catch (error) {
      notificationLogger.error('Error clearing notifications:', error);
    }
  }

  /**
   * Get badge count
   */
  public async getBadgeCount(): Promise<number> {
    try {
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      notificationLogger.error('Error getting badge count:', error);
      return 0;
    }
  }

  /**
   * Set badge count
   */
  public async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      notificationLogger.error('Error setting badge count:', error);
    }
  }

  /**
   * Send a local notification (for testing)
   */
  public async sendLocalNotification(
    title: string,
    body: string,
    data?: NotificationData
  ): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
          sound: true,
        },
        trigger: null, // Show immediately
      });
    } catch (error) {
      notificationLogger.error('Error sending local notification:', error);
    }
  }

  /**
   * Schedule a local notification
   */
  public async scheduleLocalNotification(
    title: string,
    body: string,
    triggerDate: Date,
    data?: NotificationData
  ): Promise<string | null> {
    try {
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
          sound: true,
        },
        trigger: {
          date: triggerDate,
        },
      });
      return identifier;
    } catch (error) {
      notificationLogger.error('Error scheduling notification:', error);
      return null;
    }
  }

  /**
   * Cancel a scheduled notification
   */
  public async cancelScheduledNotification(identifier: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    } catch (error) {
      notificationLogger.error('Error canceling scheduled notification:', error);
    }
  }

  /**
   * Get all scheduled notifications
   */
  public async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      notificationLogger.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  /**
   * Clean up listeners when user logs out
   */
  public cleanup(): void {
    if (this.notificationListener) {
      this.notificationListener.remove();
      this.notificationListener = null;
    }

    if (this.responseListener) {
      this.responseListener.remove();
      this.responseListener = null;
    }

    this.userId = null;
    notificationLogger.log('Push notification service cleaned up');
  }

  /**
   * Update user ID (when user logs in/out)
   */
  public setUserId(userId: string | null): void {
    this.userId = userId;
  }
}

// Export singleton instance
export const pushNotificationService = PushNotificationService.getInstance();

// Helper function to initialize push notifications
export async function initializePushNotifications(userId: string): Promise<void> {
  await pushNotificationService.initialize(userId);
}

// Helper function to handle notification navigation
export function handleNotificationNavigation(
  data: NotificationData,
  navigation: any
): void {
  if (!navigation) return;

  switch (data.type) {
    case 'job_posted':
    case 'job_alert':
      if (data.jobId) {
        navigation.navigate('JobDetails', { jobId: data.jobId });
      }
      break;

    case 'application_status':
      if (data.applicationId) {
        navigation.navigate('ApplicationDetails', {
          applicationId: data.applicationId
        });
      } else {
        navigation.navigate('Applications');
      }
      break;

    case 'message':
      if (data.employerId) {
        navigation.navigate('Messages', { employerId: data.employerId });
      } else {
        navigation.navigate('Messages');
      }
      break;

    case 'subscription_expiring':
      if (data.employerId) {
        navigation.navigate('EmployerSubscription');
      }
      break;

    default:
      // Navigate to home or notifications screen
      navigation.navigate('Home');
      break;
  }
}

export default pushNotificationService;
