import { Router, type Request, type Response } from 'express';

import { adminDb } from '@server/config/firebase';
import { requireFirebaseAuth } from '@server/middleware/firebase-auth.middleware';

export const studentRoomRouter = Router();

studentRoomRouter.get(
  '/student/room',
  requireFirebaseAuth,
  async (_req: Request, res: Response): Promise<void> => {
    if (res.locals.userRole !== 'student') {
      res.status(403).json({ message: 'Student access is required.' });
      return;
    }

    if (!adminDb) {
      res.status(503).json({
        message: 'Firebase Admin is not configured.',
      });
      return;
    }

    try {
      const database = adminDb;
      let students = await database
        .collection('students')
        .where('uid', '==', res.locals.uid)
        .limit(2)
        .get();

      if (
        students.empty &&
        res.locals.emailVerified === true &&
        typeof res.locals.email === 'string'
      ) {
        students = await database
          .collection('students')
          .where('email', '==', res.locals.email)
          .limit(2)
          .get();
      }

      if (students.empty) {
        res.status(200).json({ student: null, room: null });
        return;
      }

      if (students.size > 1) {
        res.status(409).json({
          message:
            'More than one student record matches this account. Contact the hostel administrator.',
        });
        return;
      }

      const student = students.docs[0].data();
      const hostelName =
        typeof student.hostel === 'string' ? student.hostel.trim() : '';
      const roomNumber =
        typeof student.room === 'string' ? student.room.trim() : '';

      if (!hostelName || !roomNumber) {
        res.status(200).json({
          student: { hostel: hostelName, room: roomNumber },
          room: null,
        });
        return;
      }

      const hostels = await database
        .collection('hostels')
        .where('name', '==', hostelName)
        .limit(2)
        .get();

      if (hostels.size !== 1) {
        res.status(200).json({
          student: { hostel: hostelName, room: roomNumber },
          room: null,
        });
        return;
      }

      const hostelId = hostels.docs[0].id;
      const rooms = await database
        .collection('rooms')
        .where('hostelId', '==', hostelId)
        .where('roomNumber', '==', roomNumber)
        .limit(2)
        .get();
      const room = rooms.docs.find(
        (roomDocument) => roomDocument.get('status') !== 'inactive'
      );

      if (!room) {
        res.status(200).json({
          student: { hostel: hostelName, room: roomNumber },
          room: null,
        });
        return;
      }

      const roomData = room.data();
      res.status(200).json({
        student: { hostel: hostelName, room: roomNumber },
        room: {
          id: room.id,
          roomNumber,
          floor: roomData.floor,
          capacity: roomData.capacity,
          occupied: roomData.occupied,
          status: roomData.status,
        },
      });
    } catch (error: unknown) {
      console.error('[student-room] Unable to load room information:', error);
      res.status(500).json({
        message: 'Unable to load your room information. Please try again.',
      });
    }
  }
);
