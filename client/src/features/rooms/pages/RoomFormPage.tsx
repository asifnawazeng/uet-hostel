import { useEffect, useState, type FormEvent } from 'react';

import { ManagementError } from '@/features/hostels/components/ManagementError';
import { getHostel } from '@/features/hostels/services/hostelService';
import type { Hostel } from '@/features/hostels/types/hostel';
import { getRoom, createRoom, updateRoom } from '@/features/rooms/services/roomService';
import type { RoomInput, RoomStatus } from '@/features/rooms/types/room';
import { managementErrorMessage, managementInputClass, managementPrimaryButton, managementSecondaryButton } from '@/features/hostels/utils/managementUtils';

interface RoomFormValues { roomNumber: string; floor: number; capacity: number; status: RoomStatus }
const initialValues: RoomFormValues = { roomNumber: '', floor: 0, capacity: 1, status: 'available' };

export function RoomFormPage({ hostelId, roomId, onNavigate }: { hostelId: string; roomId?: string; onNavigate: (path: string) => void }) {
  const [hostel, setHostel] = useState<Hostel | null>(null);
  const [values, setValues] = useState<RoomFormValues>(initialValues);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const basePath = `/admin/hostels/${hostelId}/rooms`;

  useEffect(() => {
    let active = true;
    Promise.all([getHostel(hostelId), roomId ? getRoom(roomId) : Promise.resolve(null)])
      .then(([hostelRecord, room]) => {
        if (!active) return;
        if (!hostelRecord || (roomId && (!room || room.hostelId !== hostelId))) { setNotFound(true); return; }
        setHostel(hostelRecord);
        if (room) setValues({ roomNumber: room.roomNumber, floor: room.floor, capacity: room.capacity, status: room.status === 'inactive' ? 'inactive' : 'available' });
      })
      .catch((loadError: unknown) => { if (active) setError(managementErrorMessage(loadError)); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [hostelId, roomId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const roomNumber = values.roomNumber.trim();
    if (!roomNumber) { setError('Enter a room number.'); return; }
    if (!Number.isInteger(values.floor) || values.floor < 0) { setError('Floor must be a whole number greater than or equal to zero.'); return; }
    if (!Number.isInteger(values.capacity) || values.capacity <= 0) { setError('Capacity must be a whole number greater than zero.'); return; }
    if (values.status !== 'available' && values.status !== 'inactive' && values.status !== 'full') { setError('Select a valid room status.'); return; }
    const input: RoomInput = { hostelId, roomNumber, floor: values.floor, capacity: values.capacity, status: values.status };

    setIsSaving(true);
    try {
      if (roomId) {
        await updateRoom(roomId, input);
        sessionStorage.setItem('rooms.notice', 'Room updated.');
        onNavigate(`${basePath}/${roomId}`);
      } else {
        await createRoom(input);
        sessionStorage.setItem('rooms.notice', 'Room created.');
        onNavigate(basePath);
      }
    } catch (saveError: unknown) {
      setError(managementErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) return <PageMessage message="Loading room..." />;
  if (notFound) return <PageMessage message="Hostel or room not found." onNavigate={() => onNavigate(`/admin/hostels/${hostelId}/rooms`)} />;

  return <main className="min-h-screen bg-slate-100"><header className="border-b border-slate-200 bg-white"><div className="mx-auto max-w-3xl px-4 py-4 sm:px-6"><button className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50" onClick={() => onNavigate(roomId ? `${basePath}/${roomId}` : basePath)} type="button">{roomId ? '← Back to room' : `← Back to ${hostel?.name ?? 'hostel'} rooms`}</button><h1 className="mt-1 text-2xl font-bold text-slate-950">{roomId ? 'Edit room' : 'Add room'}</h1></div></header>
    <section className="mx-auto max-w-3xl px-4 py-6 sm:px-6">{error ? <ManagementError message={error} /> : null}<form className="space-y-5 rounded-md border border-slate-200 bg-white p-5 sm:p-7" onSubmit={(event) => void handleSubmit(event)}>
      <Field label="Room number" required><input className={managementInputClass} onChange={(event) => setValues((current) => ({ ...current, roomNumber: event.target.value }))} required value={values.roomNumber} /></Field>
      <Field label="Floor" required><input className={managementInputClass} min="0" onChange={(event) => setValues((current) => ({ ...current, floor: Number(event.target.value) }))} required type="number" value={values.floor} /></Field>
      <Field label="Capacity" required><input className={managementInputClass} min="1" onChange={(event) => setValues((current) => ({ ...current, capacity: Number(event.target.value) }))} required type="number" value={values.capacity} /></Field>
      <Field label="Status" required><select className={managementInputClass} onChange={(event) => setValues((current) => ({ ...current, status: event.target.value as RoomStatus }))} required value={values.status}><option value="available">Available</option><option value="inactive">Inactive</option></select></Field>
      <p className="text-xs text-slate-500">Occupancy is calculated from student assignments and cannot be edited here. A room at capacity is automatically marked full.</p>
      <div className="flex gap-3"><button className={managementPrimaryButton} disabled={isSaving} type="submit">{isSaving ? 'Saving...' : roomId ? 'Save changes' : 'Create room'}</button><button className={managementSecondaryButton} onClick={() => onNavigate(roomId ? `${basePath}/${roomId}` : basePath)} type="button">Cancel</button></div>
    </form></section>
  </main>;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) { return <label className="block space-y-1.5 text-sm font-medium text-slate-700">{label}{required ? ' *' : ''}{children}</label>; }
function PageMessage({ message, onNavigate }: { message: string; onNavigate?: () => void }) { return <main className="min-h-screen bg-slate-100 p-8 text-center"><p className="text-slate-700">{message}</p>{onNavigate ? <button className="mt-4 underline" onClick={onNavigate} type="button">Return to rooms</button> : null}</main>; }