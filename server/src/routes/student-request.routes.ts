import { FieldValue } from 'firebase-admin/firestore';
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';

import { adminDb } from '@server/config/firebase';
import { requireFirebaseAuth } from '@server/middleware/firebase-auth.middleware';
import { createAndSendNotifications } from '@server/services/notification.service';

export const studentRequestRouter = Router();

const requestParamsSchema = z.object({
  id: z.string().trim().min(1).max(200),
});

studentRequestRouter.use(requireFirebaseAuth);

studentRequestRouter.post(
  '/student-requests/complaints/:id/withdraw',
  async (req: Request, res: Response): Promise<void> => {
    await finishStudentRequestAction(req, res, {
      collection: 'complaints',
      status: 'withdrawn',
      label: 'Complaint',
      notificationType: 'complaint',
      notificationUrl: '/admin/complaints',
      describe: (record) =>
        typeof record.subject === 'string'
          ? `A student withdrew the complaint "${record.subject}".`
          : 'A student withdrew a hostel complaint.',
    });
  }
);

studentRequestRouter.post(
  '/student-requests/leave-requests/:id/cancel',
  async (req: Request, res: Response): Promise<void> => {
    await finishStudentRequestAction(req, res, {
      collection: 'leaveRequests',
      status: 'cancelled',
      label: 'Leave request',
      notificationType: 'system',
      notificationUrl: '/admin/leave',
      describe: (record) =>
        typeof record.leaveType === 'string'
          ? `A student cancelled their pending ${record.leaveType} leave request.`
          : 'A student cancelled a pending leave request.',
    });
  }
);

interface RequestActionOptions {
  collection: 'complaints' | 'leaveRequests';
  status: 'withdrawn' | 'cancelled';
  label: string;
  notificationType: 'complaint' | 'system';
  notificationUrl: string;
  describe: (record: FirebaseFirestore.DocumentData) => string;
}

class RequestActionError extends Error {
  constructor(
    message: string,
    readonly statusCode: number
  ) {
    super(message);
  }
}

async function finishStudentRequestAction(
  req: Request,
  res: Response,
  options: RequestActionOptions
): Promise<void> {
  if (res.locals.userRole !== 'student') {
    res.status(403).json({ message: 'Student access is required.' });
    return;
  }

  const parsed = requestParamsSchema.safeParse(req.params);
  if (!parsed.success || !adminDb) {
    res.status(parsed.success ? 503 : 400).json({
      message: parsed.success
        ? 'Firebase Admin is not configured.'
        : 'A valid request ID is required.',
    });
    return;
  }

  const database = adminDb;
  const requestRef = database
    .collection(options.collection)
    .doc(parsed.data.id);

  try {
    const record = await database.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(requestRef);

      if (
        !snapshot.exists ||
        snapshot.get('studentId') !== res.locals.uid
      ) {
        throw new RequestActionError('Request not found.', 404);
      }

      if (snapshot.get('status') !== 'pending') {
        throw new RequestActionError(
          'Only pending requests can be withdrawn or cancelled.',
          409
        );
      }

      transaction.update(requestRef, {
        status: options.status,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return snapshot.data() ?? {};
    });

    let notificationWarning: string | null = null;
    try {
      const administrators = await database
        .collection('users')
        .where('role', '==', 'admin')
        .get();

      const notificationResult = await createAndSendNotifications(
        administrators.docs.map((administrator) => administrator.id),
        `student-request-${options.status}:${parsed.data.id}`,
        {
          title: `${options.label} ${options.status}`,
          message: options.describe(record),
          type: options.notificationType,
          url: options.notificationUrl,
        }
      );
      if (notificationResult.pushFailed > 0) {
        notificationWarning =
          `The request was updated, but push delivery failed for ${notificationResult.pushFailed} administrator device(s).`;
      }
    } catch (notificationError: unknown) {
      console.error(
        `[student-requests] Unable to notify administrators about ${options.status}:`,
        notificationError
      );
      notificationWarning =
        'The request was updated, but administrator notification delivery could not be confirmed.';
    }

    res.status(200).json({
      message: `${options.label} ${options.status}.`,
      notificationWarning,
    });
  } catch (error: unknown) {
    if (error instanceof RequestActionError) {
      res.status(error.statusCode).json({ message: error.message });
      return;
    }

    console.error(
      `[student-requests] Unable to ${options.status} request:`,
      error
    );
    res.status(500).json({
      message: `Unable to ${options.status} the request. Please try again.`,
    });
  }
}