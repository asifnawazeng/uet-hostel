import { useEffect, useState } from 'react';

import { listHostels } from '@/features/hostels/services/hostelService';
import type { Hostel } from '@/features/hostels/types/hostel';
import { listRooms, moveStudent } from '@/features/rooms/services/roomService';
import type { Room } from '@/features/rooms/types/room';
import { getStudent } from '@/features/students/services/studentService';
import type { Student } from '@/features/students/types/student';

export function StudentRoomChangePage({
  studentId,
  onNavigate,
}: {
  studentId: string;
  onNavigate: (path: string) => void;
}) {
  const [student, setStudent] = useState<Student | null>(null);
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);

  const [selectedHostelId, setSelectedHostelId] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        setIsLoading(true);
        setError(null);

        const [studentRecord, hostelRecords] = await Promise.all([
          getStudent(studentId),
          listHostels(),
        ]);

        if (!active) return;

        if (!studentRecord) {
          setError('Student record not found.');
          return;
        }

        setStudent(studentRecord);
        setHostels(hostelRecords);

        const currentHostel = hostelRecords.find(
          (hostel) => hostel.name === studentRecord.hostel
        );

        if (currentHostel) {
          setSelectedHostelId(currentHostel.id);
        }
      } catch (loadError: unknown) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Failed to load room change page.'
          );
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      active = false;
    };
  }, [studentId]);

  useEffect(() => {
    let active = true;

    async function loadRooms() {
      if (!selectedHostelId) {
        setRooms([]);
        setSelectedRoomId('');
        return;
      }

      try {
        setIsLoadingRooms(true);
        setError(null);

        const roomRecords = await listRooms(selectedHostelId);

        if (!active) return;

        setRooms(roomRecords);

        const currentRoom = roomRecords.find(
          (room) => room.roomNumber === student?.room
        );

        if (currentRoom) {
          setSelectedRoomId(currentRoom.id);
        } else {
          setSelectedRoomId('');
        }
      } catch (loadError: unknown) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Failed to load rooms.'
          );
        }
      } finally {
        if (active) {
          setIsLoadingRooms(false);
        }
      }
    }

    void loadRooms();

    return () => {
      active = false;
    };
  }, [selectedHostelId, student?.room]);

  async function handleChangeRoom() {
    if (!student) return;

    if (!selectedHostelId) {
      setError('Please select a hostel.');
      return;
    }

    if (!selectedRoomId) {
      setError('Please select a room.');
      return;
    }

    const selectedRoom = rooms.find((room) => room.id === selectedRoomId);

    if (!selectedRoom) {
      setError('Selected room could not be found.');
      return;
    }

    const selectedHostel = hostels.find(
      (hostel) => hostel.id === selectedHostelId
    );

    if (!selectedHostel) {
      setError('Selected hostel could not be found.');
      return;
    }

    if (
      selectedHostel.name === student.hostel &&
      selectedRoom.roomNumber === student.room
    ) {
      setError('This student is already assigned to this room.');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);

      await moveStudent(student.id, selectedHostelId, selectedRoomId);

      setSuccess(
        `Room changed successfully to ${selectedHostel.name}, Room ${selectedRoom.roomNumber}.`
      );

      setStudent({
        ...student,
        hostel: selectedHostel.name,
        room: selectedRoom.roomNumber,
      });
    } catch (saveError: unknown) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Failed to change the student room.'
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-100 p-8 text-center text-sm text-slate-600">
        Loading room change page...
      </main>
    );
  }

  if (!student) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <p className="text-sm text-red-600">
            {error ?? 'Student record not found.'}
          </p>

          <button
            className="mt-4 text-sm font-medium text-slate-900 underline"
            onClick={() => onNavigate('/admin/students')}
            type="button"
          >
            Return to students
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <button
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              onClick={() =>
                onNavigate(`/admin/students/${student.id}`)
              }
              type="button"
            >
              ← Back to student
            </button>

            <h1 className="mt-1 text-2xl font-bold text-slate-950">
              Change Room
            </h1>

            <p className="mt-1 text-sm text-slate-600">
              Change room assignment for {student.name}
            </p>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:px-6">
        {error ? (
          <div
            className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        {success ? (
          <div
            className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
            role="status"
          >
            {success}
          </div>
        ) : null}

        <section className="rounded-md border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-base font-semibold text-slate-900">
            Student
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Info label="Name" value={student.name} />
            <Info label="Student ID" value={student.studentId} />
            <Info label="Current Hostel" value={student.hostel} />
            <Info label="Current Room" value={student.room} />
          </div>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-base font-semibold text-slate-900">
            New Room Assignment
          </h2>

          <div className="mt-5 space-y-5">
            <div>
              <label
                className="mb-1 block text-sm font-medium text-slate-700"
                htmlFor="hostel"
              >
                Hostel
              </label>

              <select
                id="hostel"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                value={selectedHostelId}
                onChange={(event) => {
                  setSelectedHostelId(event.target.value);
                  setSuccess(null);
                }}
                disabled={isSaving}
              >
                <option value="">Select hostel</option>

                {hostels.map((hostel) => (
                  <option key={hostel.id} value={hostel.id}>
                    {hostel.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                className="mb-1 block text-sm font-medium text-slate-700"
                htmlFor="room"
              >
                Room
              </label>

              <select
                id="room"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 disabled:bg-slate-100"
                value={selectedRoomId}
                onChange={(event) => {
                  setSelectedRoomId(event.target.value);
                  setSuccess(null);
                }}
                disabled={!selectedHostelId || isLoadingRooms || isSaving}
              >
                <option value="">
                  {isLoadingRooms ? 'Loading rooms...' : 'Select room'}
                </option>

                {rooms.map((room) => {
                  const isFull =
                    room.status === 'full' ||
                    room.occupied >= room.capacity;

                  const isInactive = room.status === 'inactive';

                  const isCurrentRoom =
                    student.hostel ===
                      hostels.find(
                        (hostel) => hostel.id === selectedHostelId
                      )?.name &&
                    student.room === room.roomNumber;

                  return (
                    <option
                      key={room.id}
                      value={room.id}
                      disabled={
                        (isFull || isInactive) && !isCurrentRoom
                      }
                    >
                      Room {room.roomNumber} — {room.occupied}/
                      {room.capacity}
                      {isInactive
                        ? ' — Inactive'
                        : isFull
                          ? ' — Full'
                          : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            {selectedRoomId ? (
              <RoomPreview
                room={rooms.find((room) => room.id === selectedRoomId)}
              />
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() =>
                  onNavigate(`/admin/students/${student.id}`)
                }
                type="button"
                disabled={isSaving}
              >
                Cancel
              </button>

              <button
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => void handleChangeRoom()}
                type="button"
                disabled={
                  isSaving ||
                  !selectedHostelId ||
                  !selectedRoomId
                }
              >
                {isSaving ? 'Changing Room...' : 'Change Room'}
              </button>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm text-slate-900">
        {value || 'Not assigned'}
      </p>
    </div>
  );
}

function RoomPreview({ room }: { room?: Room }) {
  if (!room) return null;

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-sm font-semibold text-slate-900">
        Selected Room
      </h3>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Info label="Room" value={room.roomNumber} />
        <Info
          label="Occupancy"
          value={`${room.occupied}/${room.capacity}`}
        />
        <Info
          label="Status"
          value={
            room.status === 'inactive'
              ? 'Inactive'
              : room.status === 'full'
                ? 'Full'
                : 'Available'
          }
        />
      </div>
    </div>
  );
}