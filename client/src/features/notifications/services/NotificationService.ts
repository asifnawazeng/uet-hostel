import { auth } from '@/config/firebase';
import { apiRequest } from '@/services/api';
import type {
  Notification,
  NotificationInput,
} from '@/features/notifications/types/notification';

interface NotificationListResponse {
  notifications: Notification[];
}

export interface NotificationDeliveryResult {
  notificationsCreated: number;
  pushDelivered: number;
  pushFailed: number;
}

export async function runPostWriteNotification(
  action: string,
  sendNotification: () => Promise<NotificationDeliveryResult>
): Promise<string | null> {
  try {
    const result = await sendNotification();
    if (result.pushFailed > 0) {
      return `The ${action} was saved, but push delivery failed for ${result.pushFailed} device(s). The in-app notification is still available.`;
    }
    return null;
  } catch (error: unknown) {
    console.error(
      `[notifications] The ${action} was saved, but notification delivery could not be confirmed:`,
      error
    );
    return `The ${action} was saved, but notification delivery could not be confirmed.`;
  }
}

async function authenticatedRequest<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const user = auth?.currentUser;

  if (!user) {
    throw new Error('Please sign in to manage notifications.');
  }

  const idToken = await user.getIdToken();

  return apiRequest<T>(path, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${idToken}`,
    },
  });
}

export async function createNotification(
  input: NotificationInput
): Promise<NotificationDeliveryResult> {
  return authenticatedRequest<NotificationDeliveryResult>('/notifications', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function notifyComplaintCreated(
  complaintId: string
): Promise<NotificationDeliveryResult> {
  return authenticatedRequest<NotificationDeliveryResult>('/notifications/events/complaint-created', {
    method: 'POST',
    body: JSON.stringify({ id: complaintId }),
  });
}

export async function notifyComplaintUpdated(
  complaintId: string
): Promise<NotificationDeliveryResult> {
  return authenticatedRequest<NotificationDeliveryResult>('/notifications/events/complaint-updated', {
    method: 'POST',
    body: JSON.stringify({ id: complaintId }),
  });
}

export async function notifyNoticeCreated(
  noticeId: string
): Promise<NotificationDeliveryResult> {
  return authenticatedRequest<NotificationDeliveryResult>('/notifications/events/notice-created', {
    method: 'POST',
    body: JSON.stringify({ id: noticeId }),
  });
}

export async function listUserNotifications(
  userId: string
): Promise<Notification[]> {
  if (auth?.currentUser?.uid !== userId) {
    throw new Error('You can only view your own notifications.');
  }

  const response =
    await authenticatedRequest<NotificationListResponse>('/notifications');

  return response.notifications;
}

export async function markNotificationAsRead(
  id: string
): Promise<void> {
  await authenticatedRequest(
    `/notifications/${encodeURIComponent(id)}/read`,
    { method: 'PATCH' }
  );
}
