import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/context/useAuth';
import {
  getMyRoomInformation,
  type StudentRoomResponse,
} from '@/features/rooms/services/studentRoomService';

export function StudentRoomPage({
  onNavigate,
}: {
  onNavigate: (path: string) => void;
}) {
  const { currentUser } = useAuth();

  const [student, setStudent] = useState<StudentRoomResponse['student']>(null);
  const [room, setRoom] = useState<StudentRoomResponse['room']>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRoomInformation = useCallback(async () => {
    if (!currentUser) {
      setError('You must be logged in to view your room.');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const roomInformation = await getMyRoomInformation();
      setStudent(roomInformation.student);
      setRoom(roomInformation.room);

      if (!roomInformation.student) {
        setError(
          'Your student record could not be found. Please contact the hostel administrator.'
        );
      }
    } catch (loadError: unknown) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load your room information.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    void loadRoomInformation();
  }, [loadRoomInformation]);

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <button
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              onClick={() => onNavigate('/student')}
              type="button"
            >
              ← Back to dashboard
            </button>

          <h1 className="mt-1 text-2xl font-bold text-slate-950">
            My Room
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            View your hostel and room assignment.
          </p>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-8">
        {error ? (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            Loading your room information...
          </div>
        ) : !student ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
            <p className="font-medium text-slate-700">
              Student record not found.
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Please contact the hostel administrator.
            </p>
          </div>
        ) : !student.hostel || !student.room ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl">
              🏠
            </div>

            <h2 className="mt-4 text-lg font-semibold text-slate-900">
              No Room Assigned
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              You do not have a hostel room assigned yet. Please contact the
              hostel administrator for your room assignment.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Assigned Hostel
                  </p>

                  <h2 className="mt-1 text-2xl font-bold text-slate-950">
                    {student.hostel}
                  </h2>
                </div>

                <div className="rounded-xl bg-slate-900 px-6 py-4 text-center text-white">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-300">
                    Room
                  </p>

                  <p className="mt-1 text-3xl font-bold">
                    {student.room}
                  </p>
                </div>
              </div>
            </section>

            {room ? (
              <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">Room Number</p>

                  <p className="mt-2 text-xl font-bold text-slate-950">
                    {room.roomNumber}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">Floor</p>

                  <p className="mt-2 text-xl font-bold text-slate-950">
                    {room.floor}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">Capacity</p>

                  <p className="mt-2 text-xl font-bold text-slate-950">
                    {room.capacity}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">Occupied</p>

                  <p className="mt-2 text-xl font-bold text-slate-950">
                    {room.occupied}
                  </p>
                </div>
              </section>
            ) : (
              <section className="rounded-xl border border-yellow-200 bg-yellow-50 p-5">
                <p className="text-sm font-medium text-yellow-800">
                  Your hostel and room assignment is recorded, but detailed
                  room information could not be found.
                </p>
              </section>
            )}

            {room ? (
              <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-950">
                  Room Status
                </h2>

                <div className="mt-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-500">
                      Current room status
                    </p>

                    <p className="mt-1 font-medium capitalize text-slate-900">
                      {room.status}
                    </p>
                  </div>

                  <span
                    className={
                      room.status === 'available'
                        ? 'rounded-full bg-green-100 px-3 py-1.5 text-sm font-medium text-green-700'
                        : room.status === 'full'
                          ? 'rounded-full bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700'
                          : 'rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600'
                    }
                  >
                    {room.status === 'available'
                      ? 'Available'
                      : room.status === 'full'
                        ? 'Full'
                        : 'Inactive'}
                  </span>
                </div>
              </section>
            ) : null}
          </div>
        )}
      </section>
    </main>
  );
}