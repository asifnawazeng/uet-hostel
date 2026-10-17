import { createHash } from 'node:crypto';

import { FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

import { adminApp, adminDb } from '@server/config/firebase';

export type NotificationType = 'notice' | 'complaint' | 'system';

export interface NotificationContent {
  title: string;
  message: string;
  type: NotificationType;
  url: string;
}

export interface NotificationDeliveryResult {
  notificationsCreated: number;
  pushDelivered: number;
  pushFailed: number;
}

interface TokenDocument {
  ref: FirebaseFirestore.DocumentReference;
  token: string;
}

function getDatabase() {
  if (!adminDb || !adminApp) {
    throw new Error('Firebase Admin is not configured.');
  }

  return adminDb;
}

function notificationId(eventKey: string, userId: string): string {
  return createHash('sha256')
    .update(`${eventKey}:${userId}`)
    .digest('hex');
}

async function createNotificationRecord(
  userId: string,
  eventKey: string,
  content: NotificationContent
): Promise<boolean> {
  const database = getDatabase();
  const ref = database
    .collection('notifications')
    .doc(notificationId(eventKey, userId));

  return database.runTransaction(async (transaction) => {
    const existing = await transaction.get(ref);

    if (existing.exists) {
      return false;
    }

    transaction.create(ref, {
      userId,
      title: content.title,
      message: content.message,
      type: content.type,
      isRead: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    return true;
  });
}

async function sendPushToUsers(
  userIds: string[],
  content: NotificationContent
): Promise<Pick<NotificationDeliveryResult, 'pushDelivered' | 'pushFailed'>> {
  const database = getDatabase();
  const tokenSnapshots = await Promise.all(
    userIds.map((userId) =>
      database
        .collection('users')
        .doc(userId)
        .collection('fcmTokens')
        .get()
    )
  );

  const tokenDocuments: TokenDocument[] = tokenSnapshots.flatMap((snapshot) =>
    snapshot.docs.flatMap((tokenDocument) => {
      const token = tokenDocument.get('token');
      return typeof token === 'string' && token.length > 0
        ? [{ ref: tokenDocument.ref, token }]
        : [];
    })
  );

  let pushDelivered = 0;
  let pushFailed = 0;

  for (let start = 0; start < tokenDocuments.length; start += 500) {
    const batch = tokenDocuments.slice(start, start + 500);

    try {
      const result = await getMessaging(adminApp!).sendEachForMulticast({
        tokens: batch.map(({ token }) => token),
        data: {
          title: content.title,
          body: content.message.slice(0, 1500),
          type: content.type,
          url: content.url,
        },
      });

      pushDelivered += result.successCount;
      pushFailed += result.failureCount;

      const invalidTokenDeletes = result.responses.flatMap(
        (response, index) => {
          const errorCode = response.error?.code;
          if (
            errorCode === 'messaging/registration-token-not-registered' ||
            errorCode === 'messaging/invalid-registration-token'
          ) {
            return [batch[index].ref.delete()];
          }

          return [];
        }
      );

      const deleteResults = await Promise.allSettled(invalidTokenDeletes);
      for (const deleteResult of deleteResults) {
        if (deleteResult.status === 'rejected') {
          console.error(
            '[notifications] Unable to remove an invalid FCM token:',
            deleteResult.reason
          );
        }
      }
    } catch (error) {
      pushFailed += batch.length;
      console.error('[notifications] FCM batch delivery failed:', error);
    }
  }

  if (pushFailed > 0) {
    console.error(
      `[notifications] FCM delivery failed for ${pushFailed} device token(s).`
    );
  }

  return { pushDelivered, pushFailed };
}

export async function createAndSendNotifications(
  userIds: string[],
  eventKey: string,
  content: NotificationContent
): Promise<NotificationDeliveryResult> {
  const uniqueUserIds = [...new Set(userIds)];
  const createdUserIds: string[] = [];

  for (let start = 0; start < uniqueUserIds.length; start += 100) {
    const batchUserIds = uniqueUserIds.slice(start, start + 100);
    const created = await Promise.all(
      batchUserIds.map(async (userId) => ({
        userId,
        created: await createNotificationRecord(userId, eventKey, content),
      }))
    );

    createdUserIds.push(
      ...created
        .filter((record) => record.created)
        .map((record) => record.userId)
    );
  }

  const delivery = await sendPushToUsers(createdUserIds, content);

  return {
    notificationsCreated: createdUserIds.length,
    ...delivery,
  };
}

export async function createAndSendNotification(
  userId: string,
  eventKey: string,
  content: NotificationContent
): Promise<NotificationDeliveryResult> {
  return createAndSendNotifications([userId], eventKey, content);
}
