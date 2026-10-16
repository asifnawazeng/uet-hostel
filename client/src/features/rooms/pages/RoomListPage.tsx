import { useEffect, useState } from 'react';

import { ManagementError } from '@/features/hostels/components/ManagementError';
import { getHostel } from '@/features/hostels/services/hostelService';
import type { Hostel } from '@/features/hostels/types/hostel';
import { deleteRoom, listRooms } from '@/features/rooms/services/roomService';
import type { Room } from '@/features/rooms/types/room';
import { managementErrorMessage, managementInputClass, managementPrimaryButton } from '@/features/hostels/utils/managementUtils';

export function RoomListPage({ hostelId, onNavigate }: { hostelId: string; onNavigate: (path: string) => void }) {
  const [hostel, setHostel] = useState<Hostel | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [notice] = useState(() => sessionStorage.getItem('rooms.notice'));

  useEffect(() => {
    let active = true;
    Promise.all([getHostel(hostelId), listRooms(hostelId)])
      .then(([hostelRecord, roomRecords]) => {
        if (active) { setHostel(hostelRecord); setRooms(roomRecords); }
      })
      .catch((loadError: unknown) => { if (active) setError(managementErrorMessage(loadError)); })
      .finally(() => { if (active) setIsLoading(false); });
    sessionStorage.removeItem('rooms.notice');
    return () => { active = false; };
  }, [hostelId]);

  async function handleDelete(room: Room) {
    if (room.occupied > 0) {
      setError('This room cannot be deleted because students are currently assigned to it.');
      return;
    }
    if (!window.confirm(`Delete room ${room.roomNumber}?`)) return;
    setError(null);
    try {
      await deleteRoom(room.id);
      setRooms((current) => current.filter((item) => item.id !== room.id));
    } catch (deleteError: unknown) {
      setError(managementErrorMessage(deleteError));
    }
  }

  const visibleRooms = rooms.filter((room) => room.roomNumber.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const basePath = `/admin/hostels/${hostelId}/rooms`;

  if (!isLoading && !hostel) return <PageMessage message="Hostel not found." onNavigate={() => onNavigate('/admin/hostels')} />;

  return <main className="min-h-screen bg-slate-100"><header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6"><div><button className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50" onClick={() => onNavigate(`/admin/hostels/${hostelId}`)} type="button">← Back to hostel</button><h1 className="mt-1 text-2xl font-bold text-slate-950">Rooms</h1></div><button className={managementPrimaryButton} onClick={() => onNavigate(`${basePath}/add`)} type="button">Add room</button></div></header>
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{notice ? <p className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">{notice}</p> : null}{error ? <ManagementError message={error} /> : null}
      <label className="mb-5 block max-w-lg"><span className="sr-only">Search rooms</span><input className={managementInputClass} onChange={(event) => setSearch(event.target.value)} placeholder="Search room number" type="search" value={search} /></label>
      {isLoading ? <p className="py-12 text-center text-sm text-slate-600">Loading rooms...</p> : null}
      {!isLoading && !error && rooms.length === 0 ? <p className="rounded-md border border-slate-200 bg-white px-5 py-12 text-center text-sm text-slate-700">No rooms found.</p> : null}
      {!isLoading && rooms.length > 0 && visibleRooms.length === 0 ? <p className="rounded-md border border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-600">No rooms match your search.</p> : null}
      {!isLoading && visibleRooms.length > 0 ? <div className="overflow-x-auto rounded-md border border-slate-200 bg-white"><table className="w-full min-w-[800px] border-collapse text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{['Room number', 'Floor', 'Capacity', 'Occupied', 'Available', 'Status', 'Actions'].map((heading) => <th className="px-4 py-3 font-semibold" key={heading}>{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{visibleRooms.map((room) => <tr key={room.id}><td className="px-4 py-3 font-medium text-slate-900">{room.roomNumber}</td><td className="px-4 py-3">{room.floor}</td><td className="px-4 py-3">{room.capacity}</td><td className="px-4 py-3">{room.occupied}</td><td className="px-4 py-3">{room.capacity - room.occupied}</td><td className="px-4 py-3"><RoomStatusBadge status={room.status} /></td><td className="px-4 py-3"><div className="flex gap-3 whitespace-nowrap"><RowAction label="View" onClick={() => onNavigate(`${basePath}/${room.id}`)} /><RowAction label="Edit" onClick={() => onNavigate(`${basePath}/${room.id}/edit`)} /><RowAction label="Assign student" onClick={() => onNavigate(`${basePath}/${room.id}`)} /><button className="text-sm font-medium text-red-700 hover:underline" onClick={() => void handleDelete(room)} type="button">Delete</button></div></td></tr>)}</tbody></table></div> : null}
    </section>
  </main>;
}

function RoomStatusBadge({ status }: { status: Room['status'] }) { return <span className={`rounded-full px-2 py-1 text-xs font-medium ${status === 'available' ? 'bg-emerald-50 text-emerald-800' : status === 'full' ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>{status}</span>; }
function RowAction({ label, onClick }: { label: string; onClick: () => void }) { return <button className="text-sm font-medium text-slate-700 hover:underline" onClick={onClick} type="button">{label}</button>; }
function PageMessage({ message, onNavigate }: { message: string; onNavigate: () => void }) { return <main className="min-h-screen bg-slate-100 p-8 text-center"><p className="text-slate-700">{message}</p><button className="mt-4 underline" onClick={onNavigate} type="button">Return to hostels</button></main>; }