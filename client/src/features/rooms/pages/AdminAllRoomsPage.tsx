
import { useEffect, useState } from 'react';

import { ManagementError } from '@/features/hostels/components/ManagementError';
import { managementInputClass } from '@/features/hostels/utils/managementUtils';
import { deleteRoom, listAllRooms } from '@/features/rooms/services/roomService';
import type { Room } from '@/features/rooms/types/room';

interface AdminAllRoomsPageProps {
  onNavigate: (path: string) => void;
}

export function AdminAllRoomsPage({
  onNavigate,
}: AdminAllRoomsPageProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    listAllRooms()
      .then((records) => {
        if (active) setRooms(records);
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Unable to load rooms.'
          );
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleDelete(room: Room) {
    if (room.occupied > 0) {
      setError(
        `Room ${room.roomNumber} cannot be deleted because students are assigned to it.`
      );
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete room ${room.roomNumber}? This action cannot be undone.`
    );

    if (!confirmed) return;

    setError(null);
    setDeletingRoomId(room.id);

    try {
      await deleteRoom(room.id);
      setRooms((current) =>
        current.filter((item) => item.id !== room.id)
      );
    } catch (deleteError: unknown) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Unable to delete this room.'
      );
    } finally {
      setDeletingRoomId(null);
    }
  }

  const searchText = search.trim().toLowerCase();

  const visibleRooms = rooms.filter(
    (room) =>
      room.roomNumber.toLowerCase().includes(searchText) ||
      room.hostelId.toLowerCase().includes(searchText)
  );

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-6 sm:px-6">
          <div>
            <button
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              onClick={() => onNavigate('/admin')}
              type="button"
            >
              ← Back to dashboard
            </button>
            <p className="mt-3 text-sm font-medium text-slate-500">
              Administration / Management
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-950">
              All Rooms
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              View and manage rooms across all hostels.
            </p>
          </div>

          <button
            className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            onClick={() => onNavigate('/admin/hostels')}
            type="button"
          >
            Manage Hostels
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-5 grid gap-4 sm:grid-cols-3">
          <SummaryCard label="Total Rooms" value={rooms.length} />
          <SummaryCard
            label="Available Rooms"
            value={rooms.filter((room) => room.status === 'available').length}
          />
          <SummaryCard
            label="Full Rooms"
            value={rooms.filter((room) => room.status === 'full').length}
          />
        </div>

        {error && <ManagementError message={error} />}

        <label className="mb-5 mt-4 block max-w-lg">
          <span className="sr-only">Search rooms</span>
          <input
            className={managementInputClass}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by room number or hostel ID"
            type="search"
            value={search}
          />
        </label>

        {isLoading && (
          <p className="py-12 text-center text-sm text-slate-600">
            Loading rooms...
          </p>
        )}

        {!isLoading && !error && visibleRooms.length === 0 && (
          <p className="rounded-xl border border-slate-200 bg-white px-5 py-12 text-center text-sm text-slate-600">
            {rooms.length === 0
              ? 'No rooms have been added yet.'
              : 'No rooms match your search.'}
          </p>
        )}

        {!isLoading && visibleRooms.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[850px] border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  {[
                    'Room',
                    'Hostel',
                    'Floor',
                    'Capacity',
                    'Occupied',
                    'Available',
                    'Status',
                    'Actions',
                  ].map((heading) => (
                    <th className="px-4 py-3 font-semibold" key={heading}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {visibleRooms.map((room) => (
                  <tr className="hover:bg-slate-50" key={room.id}>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {room.roomNumber}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {room.hostelId}
                    </td>
                    <td className="px-4 py-3">{room.floor}</td>
                    <td className="px-4 py-3">{room.capacity}</td>
                    <td className="px-4 py-3">{room.occupied}</td>
                    <td className="px-4 py-3">
                      {Math.max(room.capacity - room.occupied, 0)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          room.status === 'available'
                            ? 'bg-emerald-50 text-emerald-700'
                            : room.status === 'full'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {room.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 whitespace-nowrap">
                        <button
                          className="font-medium text-slate-700 hover:underline"
                          onClick={() =>
                            onNavigate(
                              `/admin/hostels/${room.hostelId}/rooms/${room.id}`
                            )
                          }
                          type="button"
                        >
                          View
                        </button>

                        <button
                          className="font-medium text-red-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={deletingRoomId === room.id}
                          onClick={() => void handleDelete(room)}
                          type="button"
                        >
                          {deletingRoomId === room.id
                            ? 'Deleting...'
                            : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
    </div>
  );
}