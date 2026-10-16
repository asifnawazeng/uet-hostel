import { useEffect, useState } from 'react';

import { ManagementError } from '@/features/hostels/components/ManagementError';
import { getHostel } from '@/features/hostels/services/hostelService';
import type { Hostel } from '@/features/hostels/types/hostel';
import { listRooms } from '@/features/rooms/services/roomService';
import type { Room } from '@/features/rooms/types/room';
import { formatManagementDate, managementErrorMessage, managementPrimaryButton, managementSecondaryButton } from '@/features/hostels/utils/managementUtils';

export function HostelDetailsPage({ hostelId, onNavigate }: { hostelId: string; onNavigate: (path: string) => void }) {
  const [hostel, setHostel] = useState<Hostel | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice] = useState(() => sessionStorage.getItem('hostels.notice'));

  useEffect(() => {
    let active = true;
    getHostel(hostelId)
      .then(async (record) => {
        if (!active) return;
        if (!record) return;
        const hostelRooms = await listRooms(hostelId);
        if (active) { setHostel(record); setRooms(hostelRooms); }
      })
      .catch((loadError: unknown) => { if (active) setError(managementErrorMessage(loadError)); })
      .finally(() => { if (active) setIsLoading(false); });
    sessionStorage.removeItem('hostels.notice');
    return () => { active = false; };
  }, [hostelId]);

  if (isLoading) return <PageMessage message="Loading hostel..." />;
  if (error) return <main className="min-h-screen bg-slate-100 px-4 py-8"><div className="mx-auto max-w-4xl"><ManagementError message={error} /><BackLink onNavigate={onNavigate} /></div></main>;
  if (!hostel) return <PageMessage message="Hostel not found." onNavigate={() => onNavigate('/admin/hostels')} />;

  const availableCount = rooms.filter((room) => room.status === 'available').length;
  const fullCount = rooms.filter((room) => room.status === 'full').length;
  const inactiveCount = rooms.filter((room) => room.status === 'inactive').length;

  return <main className="min-h-screen bg-slate-100"><header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6"><div><button className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50" onClick={() => onNavigate('/admin/hostels')} type="button">← Back to hostels</button><h1 className="mt-1 text-2xl font-bold text-slate-950">{hostel.name}</h1></div><div className="flex flex-wrap gap-2"><button className={managementSecondaryButton} onClick={() => onNavigate(`/admin/hostels/${hostel.id}/edit`)} type="button">Edit hostel</button><button className={managementPrimaryButton} onClick={() => onNavigate(`/admin/hostels/${hostel.id}/rooms`)} type="button">Manage rooms</button></div></div></header>
    <section className="mx-auto max-w-4xl space-y-4 px-4 py-6 sm:px-6">{notice ? <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">{notice}</p> : null}
      <section className="rounded-md border border-slate-200 bg-white p-5 sm:p-6"><h2 className="mb-4 font-semibold text-slate-900">Hostel information</h2><dl className="grid gap-4 sm:grid-cols-2"><Detail label="Name" value={hostel.name} /><Detail label="Gender" value={hostel.gender} /><Detail label="Description" value={hostel.description || 'Not provided'} /><Detail label="Total rooms" value={String(hostel.totalRooms)} /><Detail label="Status" value={hostel.status} /><Detail label="Created" value={formatManagementDate(hostel.createdAt)} /><Detail label="Updated" value={formatManagementDate(hostel.updatedAt)} /></dl></section>
      <section className="rounded-md border border-slate-200 bg-white p-5 sm:p-6"><h2 className="mb-4 font-semibold text-slate-900">Room summary</h2><dl className="grid grid-cols-2 gap-4 sm:grid-cols-4"><Detail label="Total rooms" value={String(rooms.length)} /><Detail label="Available" value={String(availableCount)} /><Detail label="Full" value={String(fullCount)} /><Detail label="Inactive" value={String(inactiveCount)} /></dl></section>
    </section>
  </main>;
}

function Detail({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs font-medium uppercase text-slate-500">{label}</dt><dd className="mt-1 break-words text-sm text-slate-900">{value}</dd></div>; }
function BackLink({ onNavigate }: { onNavigate: (path: string) => void }) { return <button className="mt-4 text-sm font-medium text-slate-900 underline" onClick={() => onNavigate('/admin/hostels')} type="button">Return to hostels</button>; }
function PageMessage({ message, onNavigate }: { message: string; onNavigate?: () => void }) { return <main className="min-h-screen bg-slate-100 p-8 text-center"><p className="text-slate-700">{message}</p>{onNavigate ? <button className="mt-4 underline" onClick={onNavigate} type="button">Return to hostels</button> : null}</main>; }