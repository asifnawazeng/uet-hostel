import { Router, type Request, type Response } from 'express';
import { z } from 'zod';

import { requireAdmin } from '@/middleware/admin-auth.middleware';
import {
  assignStudentToRoom,
  moveStudentToRoom,
  removeStudentFromRoom,
  deleteRoomSafely,
  RoomAssignmentError,
} from '@/services/room-assignment.service';

export const roomAssignmentRouter = Router();

const assignmentSchema = z.object({
  studentId: z.string().min(1),
  hostelId: z.string().min(1),
  roomId: z.string().min(1),
});

const studentSchema = z.object({
  studentId: z.string().min(1),
});

const roomSchema = z.object({
  roomId: z.string().min(1),
});

roomAssignmentRouter.post(
  '/room-assignments/assign',
  requireAdmin,
  async (req: Request, res: Response) => {
    const parsed = assignmentSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        message: 'Provide a student, hostel, and room.',
      });
      return;
    }

    await handleAssignment(
      res,
      () =>
        assignStudentToRoom(
          parsed.data.studentId,
          parsed.data.hostelId,
          parsed.data.roomId
        ),
      'Student assigned to the room.'
    );
  }
);

roomAssignmentRouter.post(
  '/room-assignments/move',
  requireAdmin,
  async (req: Request, res: Response) => {
    const parsed = assignmentSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        message: 'Provide a student, hostel, and destination room.',
      });
      return;
    }

    await handleAssignment(
      res,
      () =>
        moveStudentToRoom(
          parsed.data.studentId,
          parsed.data.hostelId,
          parsed.data.roomId
        ),
      'Student moved to the new room.'
    );
  }
);

roomAssignmentRouter.post(
  '/room-assignments/remove',
  requireAdmin,
  async (req: Request, res: Response) => {
    const parsed = studentSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        message: 'Provide a student to remove from the room.',
      });
      return;
    }

    await handleAssignment(
      res,
      () => removeStudentFromRoom(parsed.data.studentId),
      'Student removed from the room.'
    );
  }
);

roomAssignmentRouter.delete(
  '/rooms/:roomId',
  requireAdmin,
  async (req: Request, res: Response) => {
    const parsed = roomSchema.safeParse({
      roomId: req.params.roomId,
    });

    if (!parsed.success) {
      res.status(400).json({
        message: 'Provide a valid room ID.',
      });
      return;
    }

    await handleAssignment(
      res,
      () => deleteRoomSafely(parsed.data.roomId),
      'Room deleted successfully.'
    );
  }
);

async function handleAssignment(
  res: Response,
  operation: () => Promise<void>,
  successMessage: string
): Promise<void> {
  try {
    await operation();

    res.status(200).json({
      message: successMessage,
    });
  } catch (error: unknown) {
    if (error instanceof RoomAssignmentError) {
      res.status(error.statusCode).json({
        message: error.message,
      });
      return;
    }

    console.error('[room-assignment]', error);

    res.status(500).json({
      message: 'Unable to update the room assignment. Please try again.',
    });
  }
}

