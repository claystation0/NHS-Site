import { supabase } from './supabaseClient';

export const isPushNotificationSupported = () => {
  return 'serviceWorker' in navigator && 'PushManager' in window;
};

export const requestNotificationPermission = async () => {
  if (!isPushNotificationSupported()) {
    console.warn('Push notifications not supported');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

export const getNotificationPermission = () => {
  if (!isPushNotificationSupported()) {
    return 'unsupported';
  }
  return Notification.permission;
};

const getVapidPublicKey = async () => {
  try {
    console.log('Calling get-vapid-key Edge Function...');
    
    const { data, error } = await supabase.functions.invoke('get-vapid-key');
    
    console.log('Edge Function response:', { data, error });
    
    if (error) {
      console.error('Edge Function error details:', {
        message: error.message,
        status: error.status,
        statusText: error.statusText,
        context: error.context
      });
      throw new Error(`Edge Function error: ${error.message}`);
    }
    
    if (!data || !data.publicKey) {
      console.error('Invalid response:', data);
      throw new Error('Invalid response from VAPID key endpoint');
    }
    
    console.log('✓ Successfully got VAPID public key');
    return data.publicKey;
  } catch (error) {
    console.error('Full error object:', error);
    throw error;
  }
};

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

/**
 * Register service worker and get push subscription
 */
export const registerServiceWorkerAndSubscribe = async () => {
  if (!isPushNotificationSupported()) {
    throw new Error('Push notifications not supported');
  }

  try {
    // Register service worker
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/'
    });

    console.log('Service Worker registered:', registration);

    // Wait for service worker to be ready
    await navigator.serviceWorker.ready;

    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Get VAPID public key
      const vapidPublicKey = await getVapidPublicKey();
      
      // Subscribe to push notifications
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      console.log('Push subscription created:', subscription);
    }

    return subscription;
  } catch (error) {
    console.error('Error in service worker registration:', error);
    throw error;
  }
};

/**
 * Save push subscription to database
 */
export const savePushSubscription = async (userId, subscription) => {
  try {
    const subscriptionJSON = subscription.toJSON();
    
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        subscription: subscriptionJSON,
        endpoint: subscription.endpoint,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (error) throw error;
    
    console.log('Push subscription saved to database');
    return true;
  } catch (error) {
    console.error('Error saving push subscription:', error);
    return false;
  }
};

/**
 * Unsubscribe from push notifications
 */
export const unsubscribeFromPush = async (userId) => {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
      console.log('Unsubscribed from push notifications');
    }

    // Remove from database
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error unsubscribing from push:', error);
    return false;
  }
};

export const sendTestPushNotification = async () => {
  try {
    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error('Session error:', sessionError);
      throw new Error('User not authenticated');
    }

    console.log('Session exists:', !!session);
    console.log('Access token exists:', !!session.access_token);
    console.log('User ID:', session.user.id);

    // Use plain fetch instead of supabase.functions.invoke
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const response = await fetch(
      `${supabaseUrl}/functions/v1/send-push-notifications`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
        },
        body: JSON.stringify({
          targets: [{
            userId: session.user.id,
            title: 'Test Notification',
            body: 'This is a test push notification!',
            data: {
              url: '/notifications',
              type: 'test'
            }
          }]
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Edge Function error:', errorData);
      throw new Error(`Failed to send: ${errorData.error || response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Test notification response:', data);
    return true;
  } catch (error) {
    console.error('Error sending test notification:', error);
    return false;
  }
};

export const hasActivePushSubscription = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .single();

    return !error && data !== null;
  } catch (error) {
    return false;
  }
};