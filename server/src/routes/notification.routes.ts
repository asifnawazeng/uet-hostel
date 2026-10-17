import { createHash, randomUUID } from 'node:crypto';

import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';

import { adminDb } from '@server/config/firebase';
import { requireFirebaseAuth } from '@server/middleware/firebase-auth.middleware';
import {
  createAndSendNotification,
  createAndSendNotifications,
  type NotificationContent,
  type NotificationType,
} from '@server/services/notification.service';

export const notificationRouter = Router();

const tokenSchema = z.object({
  token: z.string().trim().min(1).max(4096),
});

const idSchema = z.object({
  id: z.string().trim().min(1).max(200),
});

const directNotificationSchema = z.object({
  userId: z.string().trim().min(1).max(200),
  title: z.string().trim().min(1).max(150),
  message: z.string().trim().min(1).max(1500),
  type: z.enum(['notice', 'complaint', 'system']),
});

notificationRouter.use(requireFirebaseAuth);

notificationRouter.post(
  '/notifications/token',
  async (req: Request, res: Response): Promise<void> => {
    const parsed = tokenSchema.safeParse(req.body);

    if (!parsed.success || !adminDb) {
      res.status(parsed.success ? 503 : 400).json({
        message: parsed.success
          ? 'Firebase Admin is not configured.'
          : 'A valid notification token is required.',
      });
      return;
    }

    const uid = res.locals.uid as string;
    const token = parsed.data.token;
    const tokenId = createHash('sha256').update(token).digest('hex');

    try {
      const existingTokens = await adminDb
        .collectionGroup('fcmTokens')
        .where('token', '==', token)
        .get();

      const staleTokenRefs = existingTokens.docs
        .filter(
          (tokenDocument) =>
            tokenDocument.ref.path !==
            `users/${uid}/fcmTokens/${tokenId}`
        )
        .map((tokenDocument) => tokenDocument.ref);

      for (let start = 0; start < staleTokenRefs.length; start += 500) {
        const batch = adminDb.batch();
        staleTokenRefs.slice(start, start + 500).forEach((ref) => {
          batch.delete(ref);
        });
        await batch.commit();
      }

      await adminDb
        .collection('users')
        .doc(uid)
        .collection('fcmTokens')
        .doc(tokenId)
        .set({
          token,
          updatedAt: FieldValue.serverTimestamp(),
          platform: 'web',
        });

      res.status(200).json({
        message: 'Notification token registered successfully.',
      });
    } catch (error) {
      console.error('[notifications] Unable to register an FCM token:', error);
      res.status(500).json({
        message: 'Unable to register the notification token.',
      });
    }
  }
);

notificationRouter.get(
  '/notifications',
  async (_req: Request, res: Response): Promise<void> => {
    if (!adminDb) {
      res.status(503).json({
        message: 'Firebase Admin is not configured.',
      });
      return;
    }

    try {
      const snapshot = await adminDb
        .collection('notifications')
        .where('userId', '==', res.locals.uid)
        .orderBy('createdAt', 'desc')
        .limit(500)
        .get();

      const notifications = snapshot.docs.map((notificationDocument) => {
        const data = notificationDocument.data();
        const createdAt = data.createdAt;

        if (!(createdAt instanceof Timestamp)) {
          throw new Error(
            `Notification ${notificationDocument.id} has an invalid creation timestamp.`
          );
        }

        return {
          ...data,
          id: notificationDocument.id,
          createdAt: createdAt.toDate().toISOString(),
        };
      });

      res.status(200).json({ notifications });
    } catch (error) {
      console.error('[notifications] Unable to list notifications:', error);
      res.status(500).json({
        message: 'Unable to load notifications.',
      });
    }
  }
);

notificationRouter.patch(
  '/notifications/:id/read',
  async (req: Request, res: Response): Promise<void> => {
    const parsed = idSchema.safeParse(req.params);

    if (!parsed.success || !adminDb) {
      res.status(parsed.success ? 503 : 400).json({
        message: parsed.success
          ? 'Firebase Admin is not configured.'
          : 'A valid notification ID is required.',
      });
      return;
    }

    try {
      const notificationRef = adminDb
        .collection('notifications')
        .doc(parsed.data.id);
      const notification = await notificationRef.get();

      if (
        !notification.exists ||
        notification.get('userId') !== res.locals.uid
      ) {
        res.status(404).json({ message: 'Notification not found.' });
        return;
      }

      await notificationRef.update({ isRead: true });
      res.status(200).json({ message: 'Notification marked as read.' });
    } catch (error) {
      console.error('[notifications] Unable to mark as read:', error);
      res.status(500).json({
        message: 'Unable to update the notification.',
      });
    }
  }
);

notificationRouter.post(
  '/notifications/events/leave-decision',
  async (req: Request, res: Response): Promise<void> => {
    if (res.locals.userRole !== 'admin') {
      res.status(403).json({ message: 'Administrator access is required.' });
      return;
    }

    const parsed = idSchema.safeParse(req.body);

    if (!parsed.success || !adminDb) {
      res.status(parsed.success ? 503 : 400).json({
        message: parsed.success
          ? 'Firebase Admin is not configured.'
          : 'A valid leave request ID is required.',
      });
      return;
    }

    try {
      const leaveRequest = await adminDb
        .collection('leaveRequests')
        .doc(parsed.data.id)
        .get();

      if (!leaveRequest.exists) {
        res.status(404).json({ message: 'Leave request not found.' });
        return;
      }

      const leave = leaveRequest.data();
      const studentId = leave?.studentId;
      const status = leave?.status;
      const leaveType = leave?.leaveType;
      const fromDate = leave?.fromDate;
      const toDate = leave?.toDate;
      const updatedAt = leave?.updatedAt;

      if (
        typeof studentId !== 'string' ||
        !studentId ||
        (status !== 'approved' && status !== 'rejected') ||
        typeof leaveType !== 'string' ||
        typeof fromDate !== 'string' ||
        typeof toDate !== 'string' ||
        !(updatedAt instanceof Timestamp)
      ) {
        res.status(409).json({
          message: 'The leave request is missing valid decision details.',
        });
        return;
      }

      const student = await adminDb.collection('users').doc(studentId).get();
      if (!student.exists || student.get('role') !== 'student') {
        res.status(409).json({
          message: 'The leave request owner is not a valid student.',
        });
        return;
      }

      const remarks =
        typeof leave.adminRemarks === 'string' ? leave.adminRemarks.trim() : '';
      const decision = status === 'approved' ? 'approved' : 'rejected';
      const remarksMessage =
        decision === 'rejected' && remarks
          ? ` Admin remarks: ${remarks}`
          : '';

      const result = await createAndSendNotification(
        studentId,
        `leave-decision:${parsed.data.id}:${decision}:${updatedAt.toMillis()}`,
        {
          title: `Leave Request ${decision === 'approved' ? 'Approved' : 'Rejected'}`,
          message: `Your ${leaveType} leave request from ${fromDate} to ${toDate} has been ${decision}.${remarksMessage}`,
          type: 'system',
          url: '/student/leave',
        }
      );

      res.status(200).json({
        message: 'Leave decision notification created.',
        ...result,
      });
    } catch (error) {
      console.error(
        '[notifications] Unable to notify the leave request owner:',
        error
      );
      res.status(500).json({
        message: 'Unable to create the leave decision notification.',
      });
    }
  }
);

notificationRouter.post(
  '/notifications',
  async (req: Request, res: Response): Promise<void> => {
    if (res.locals.userRole !== 'admin') {
      res.status(403).json({ message: 'Administrator access is required.' });
      return;
    }

    const parsed = directNotificationSchema.safeParse(req.body);

    if (!parsed.success || !adminDb) {
      res.status(parsed.success ? 503 : 400).json({
        message: parsed.success
          ? 'Firebase Admin is not configured.'
          : 'Provide a recipient, title, message, and valid notification type.',
      });
      return;
    }

    try {
      const recipient = await adminDb
        .collection('users')
        .doc(parsed.data.userId)
        .get();

      if (!recipient.exists || recipient.get('role') !== 'student') {
        res.status(404).json({ message: 'Student recipient not found.' });
        return;
      }

      const content: NotificationContent = {
        title: parsed.data.title,
        message: parsed.data.message,
        type: parsed.data.type,
        url: '/student/notifications',
      };
      const result = await createAndSendNotification(
        parsed.data.userId,
        `manual:${randomUUID()}`,
        content
      );

      res.status(200).json({
        message: 'Notification created.',
        ...result,
      });
    } catch (error) {
      console.error('[notifications] Unable to send an admin notification:', error);
      res.status(500).json({
        message: 'Unable to send the notification.',
      });
    }
  }
);

notificationRouter.post(
  '/notifications/events/complaint-created',
  async (req: Request, res: Response): Promise<void> => {
    if (res.locals.userRole !== 'student') {
      res.status(403).json({ message: 'Student access is required.' });
      return;
    }

    const parsed = idSchema.safeParse(req.body);

    if (!parsed.success || !adminDb) {
      res.status(parsed.success ? 503 : 400).json({
        message: parsed.success
          ? 'Firebase Admin is not configured.'
          : 'A valid complaint ID is required.',
      });
      return;
    }

    try {
      const complaint = await adminDb
        .collection('complaints')
        .doc(parsed.data.id)
        .get();

      if (
        !complaint.exists ||
        complaint.get('studentId') !== res.locals.uid
      ) {
        res.status(404).json({ message: 'Complaint not found.' });
        return;
      }

      const administrators = await adminDb
        .collection('users')
        .where('role', '==', 'admin')
        .get();
      const complaintSubject = complaint.get('subject');

      const result = await createAndSendNotifications(
        administrators.docs.map((administrator) => administrator.id),
        `complaint-created:${parsed.data.id}`,
        {
          title: 'New Hostel Complaint',
          message:
            typeof complaintSubject === 'string'
              ? `A student submitted: ${complaintSubject}`
              : 'A student submitted a new hostel complaint.',
          type: 'complaint',
          url: '/admin/complaints',
        }
      );

      res.status(200).json({ message: 'Complaint notification created.', ...result });
    } catch (error) {
      console.error('[notifications] Unable to notify complaint recipients:', error);
      res.status(500).json({
        message: 'Unable to notify administrators about the complaint.',
      });
    }
  }
);

notificationRouter.post(
  '/notifications/events/complaint-updated',
  async (req: Request, res: Response): Promise<void> => {
    if (res.locals.userRole !== 'admin') {
      res.status(403).json({ message: 'Administrator access is required.' });
      return;
    }

    const parsed = idSchema.safeParse(req.body);

    if (!parsed.success || !adminDb) {
      res.status(parsed.success ? 503 : 400).json({
        message: parsed.success
          ? 'Firebase Admin is not configured.'
          : 'A valid complaint ID is required.',
      });
      return;
    }

    try {
      const complaint = await adminDb
        .collection('complaints')
        .doc(parsed.data.id)
        .get();

      if (!complaint.exists) {
        res.status(404).json({ message: 'Complaint not found.' });
        return;
      }

      const studentId = complaint.get('studentId');
      const status = complaint.get('status');
      const subject = complaint.get('subject');
      const adminResponse = complaint.get('adminResponse');

      if (
        typeof studentId !== 'string' ||
        typeof status !== 'string' ||
        typeof subject !== 'string'
      ) {
        res.status(500).json({
          message: 'The complaint record is incomplete.',
        });
        return;
      }

      const responseText =
        typeof adminResponse === 'string' && adminResponse.trim()
          ? ` Admin response: ${adminResponse.trim()}`
          : '';
      const content: NotificationContent = {
        title: 'Complaint Updated',
        message: `Your complaint "${subject}" has been marked as ${status}.${responseText}`,
        type: 'complaint',
        url: '/student/notifications',
      };
      const result = await createAndSendNotification(
        studentId,
        `complaint-updated:${parsed.data.id}:${status}:${complaint.get('updatedAt')?.toString() ?? ''}`,
        content
      );

      res.status(200).json({ message: 'Complaint notification created.', ...result });
    } catch (error) {
      console.error('[notifications] Unable to notify the complaint owner:', error);
      res.status(500).json({
        message: 'Unable to notify the student about the complaint update.',
      });
    }
  }
);

notificationRouter.post(
  '/notifications/events/notice-created',
  async (req: Request, res: Response): Promise<void> => {
    if (res.locals.userRole !== 'admin') {
      res.status(403).json({ message: 'Administrator access is required.' });
      return;
    }

    const parsed = idSchema.safeParse(req.body);

    if (!parsed.success || !adminDb) {
      res.status(parsed.success ? 503 : 400).json({
        message: parsed.success
          ? 'Firebase Admin is not configured.'
          : 'A valid notice ID is required.',
      });
      return;
    }

    try {
      const notice = await adminDb
        .collection('notices')
        .doc(parsed.data.id)
        .get();

      if (
        !notice.exists ||
        notice.get('createdBy') !== res.locals.uid
      ) {
        res.status(404).json({ message: 'Notice not found.' });
        return;
      }

      const students = await adminDb
        .collection('users')
        .where('role', '==', 'student')
        .get();
      const title = notice.get('title');

      const result = await createAndSendNotifications(
        students.docs.map((student) => student.id),
        `notice-created:${parsed.data.id}`,
        {
          title: 'New Hostel Notice',
          message:
            typeof title === 'string'
              ? title
              : 'A new hostel notice has been published.',
          type: 'notice' satisfies NotificationType,
          url: '/student/notices',
        }
      );

      res.status(200).json({ message: 'Notice notifications created.', ...result });
    } catch (error) {
      console.error('[notifications] Unable to notify students about a notice:', error);
      res.status(500).json({
        message: 'Unable to notify students about the new notice.',
      });
    }
  }
);
