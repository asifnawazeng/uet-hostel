import { auth } from '@/config/firebase';
import { requestFirebaseMessagingToken } from '@/config/firebase-messaging';
import { apiRequest } from '@/services/api';

interface RegisterTokenResponse {
  message: string;
}

export async function registerPushNotifications(): Promise<boolean> {
  const user = auth?.currentUser;

  if (!user) {
    throw new Error('Please sign in before enabling notifications.');
  }

  const token = await requestFirebaseMessagingToken();

  if (!token) {
    return false;
  }

  const idToken = await user.getIdToken();

  await apiRequest<RegisterTokenResponse>('/notifications/token', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ token }),
  });

  return true;
}
