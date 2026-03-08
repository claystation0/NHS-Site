import { supabase } from './supabaseClient';

/**
 * Create notifications for users based on their preferences
 * @param {string} type - Type of notification: 'event' or 'post'
 * @param {object} data - Data about the event or post
 * @param {string} creatorId - ID of the user who created the item
 */
export const createNotification = async (type, data, creatorId) => {
  try {
    // Fetch all users with their notification preferences
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, notification_preferences');

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return;
    }

    const notifications = [];
    const pushTargets = [];
    const now = new Date().toISOString();

    for (const profile of profiles) {
      // Skip the creator of the content
      if (profile.id === creatorId) {
        continue;
      }

      const prefs = profile.notification_preferences || {
        events_mandatory: true,
        events_in_school: true,
        events_out_of_school: true,
        events_red_hook: true,
        events_other: true,
        posts: true
      };

      let shouldNotify = false;
      let message = '';
      let notificationType = '';
      let pushTitle = '';
      let pushBody = '';

      if (type === 'event') {
        // Check if user wants notifications for this event category
        const categoryKey = `events_${data.category.replace('-', '_')}`;
        shouldNotify = prefs[categoryKey] !== false;

        if (shouldNotify) {
          const categoryLabels = {
            'mandatory': 'Mandatory Event',
            'in-school': 'In-School Volunteer',
            'out-of-school': 'Out-of-School Volunteer',
            'red-hook': 'Red Hook Event',
            'other': 'Event'
          };
          const categoryLabel = categoryLabels[data.category] || 'Event';
          message = `New ${categoryLabel}: ${data.title}`;
          notificationType = `event_${data.category}`;
          pushTitle = categoryLabel;
          pushBody = data.title;
        }
      } else if (type === 'post') {
        // Check if user wants post notifications
        shouldNotify = prefs.posts !== false;

        if (shouldNotify) {
          message = `New post: ${data.title}`;
          notificationType = 'post';
          pushTitle = 'New Post';
          pushBody = data.title;
        }
      }

      if (shouldNotify) {
        notifications.push({
          user_id: profile.id,
          type: notificationType,
          message: message,
          reference_id: data.id,
          reference_type: type,
          created_at: now,
          is_read: false
        });

        // Add to push notification targets
        pushTargets.push({
          userId: profile.id,
          title: pushTitle,
          body: pushBody,
          data: {
            type: type,
            id: data.id,
            url: type === 'event' ? '/calendar' : '/posts'
          }
        });
      }
    }

    // Insert all notifications in batch
    if (notifications.length > 0) {
      const { error: insertError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (insertError) {
        console.error('Error creating notifications:', insertError);
      } else {
        console.log(`Created ${notifications.length} in-app notifications`);
      }
    }

    // Send push notifications
    if (pushTargets.length > 0) {
      await sendPushNotifications(pushTargets);
    }
  } catch (error) {
    console.error('Error in createNotification:', error);
  }
};

/**
 * Send push notifications to multiple users
 * @param {Array} targets - Array of {userId, title, body, data}
 */
const sendPushNotifications = async (targets) => {
  try {
    // Call Supabase Edge Function to send push notifications
    const { data, error } = await supabase.functions.invoke('send-push-notifications', {
      body: { targets }
    });

    if (error) {
      console.error('Error sending push notifications:', error);
    } else {
      console.log(`Sent ${targets.length} push notifications`);
    }
  } catch (error) {
    console.error('Error in sendPushNotifications:', error);
  }
};

/**
 * Mark a notification as read
 * @param {string} notificationId - ID of the notification to mark as read
 */
export const markNotificationAsRead = async (notificationId) => {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);

  if (error) {
    console.error('Error marking notification as read:', error);
  }
};

/**
 * Mark all notifications as read for a user
 * @param {string} userId - ID of the user
 */
export const markAllNotificationsAsRead = async (userId) => {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) {
    console.error('Error marking all notifications as read:', error);
  }
};

/**
 * Delete a notification
 * @param {string} notificationId - ID of the notification to delete
 */
export const deleteNotification = async (notificationId) => {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId);

  if (error) {
    console.error('Error deleting notification:', error);
  }
};

/**
 * Get unread notification count for a user
 * @param {string} userId - ID of the user
 * @returns {number} Count of unread notifications
 */
export const getUnreadCount = async (userId) => {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }

  return count || 0;
};