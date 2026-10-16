import { useEffect, useState } from 'react';

import { ManagementError } from '@/features/hostels/components/ManagementError';
import { getHostel, listHostels } from '@/features/hostels/services/hostelService';
import type { Hostel } from '@/features/hostels/types/hostel';
import { assignStudent, calculateRoomStatus, getAssignableStudents, getRoom, getRoomStudents, listRooms, moveStudent, removeStudentFromRoom } from '@/features/rooms/services/roomService';
import type { Room } from '@/features/rooms/types/room';
import type { Student } from '@/features/students/types/student';
import { managementErrorMessage, managementInputClass, managementPrimaryButton, managementSecondaryButton } from '@/features/hostels/utils/managementUtils';

export function RoomDetailsPage({ hostelId, roomId, onNavigate }: { hostelId: string; roomId: string; onNavigate: (path: string) => void }) {
  const [hostel, setHostel] = useState<Hostel | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [targetHostelId, setTargetHostelId] = useState(hostelId);
  const [targetRooms, setTargetRooms] = useState<Room[]>([]);
  const [targetRoomId, setTargetRoomId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [movingStudent, setMovingStudent] = useState<Student | null>(null);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState(() => sessionStorage.getItem('rooms.notice'));
  const basePath = `/admin/hostels/${hostelId}/rooms`;

  useEffect(() => {
    let active = true;
    Promise.all([
      getHostel(hostelId),
      getRoom(roomId),
      listHostels(),
      getAssignableStudents(),
    ])
      .then(async ([hostelRecord, roomRecord, hostelRecords, assignable]) => {
        if (!active) return;
        if (!hostelRecord || !roomRecord || roomRecord.hostelId !== hostelId) {
          setHostel(null);
          setRoom(null);
          return;
        }
        const occupants = await getRoomStudents(hostelRecord, roomRecord.roomNumber);
        if (!active) return;
        setHostel(hostelRecord);
        setRoom({
          ...roomRecord,
          occupied: occupants.length,
          status: calculateRoomStatus(occupants.length, roomRecord.capacity, roomRecord.status),
        });
        setStudents(occupants);
        setHostels(hostelRecords);
        setAvailableStudents(assignable);
      })
      .catch((loadError: unknown) => { if (active) setError(managementErrorMessage(loadError)); })
      .finally(() => { if (active) setIsLoading(false); });
    sessionStorage.removeItem('rooms.notice');
    return () => { active = false; };
  }, [hostelId, reloadKey, roomId]);

  useEffect(() => {
    let active = true;
    if (!targetHostelId) return;
    listRooms(targetHostelId)
      .then((rooms) => { if (active) setTargetRooms(rooms); })
      .catch((loadError: unknown) => { if (active) setError(managementErrorMessage(loadError)); });
    return () => { active = false; };
  }, [targetHostelId]);

  async function handleAssign(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedStudentId) { setError('Select a student to assign.'); return; }
    setError(null);
    setIsSubmitting(true);
    try {
      await assignStudent(selectedStudentId, hostelId, roomId);
      setNotice('Student assigned to the room.');
      setShowAssignForm(false);
      setSelectedStudentId('');
      setReloadKey((current) => current + 1);
    } catch (assignmentError: unknown) {
      setError(managementErrorMessage(assignmentError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleMove(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!movingStudent || !targetRoomId) { setError('Select a destination room.'); return; }
    setError(null);
    setIsSubmitting(true);
    try {
      await moveStudent(movingStudent.id, targetHostelId, targetRoomId);
      setNotice(`${movingStudent.name} was moved successfully.`);
      setMovingStudent(null);
      setReloadKey((current) => current + 1);
    } catch (moveError: unknown) {
      setError(managementErrorMessage(moveError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemove(student: Student) {
    if (!window.confirm(`Remove ${student.name} from ${hostel?.name}, room ${room?.roomNumber}? The student record will remain.`)) return;
    setError(null);
    try {
      await removeStudentFromRoom(student.id);
      setNotice(`${student.name} was removed from the room.`);
      setReloadKey((current) => current + 1);
    } catch (removeError: unknown) {
      setError(managementErrorMessage(removeError));
    }
  }

  if (isLoading) return <PageMessage message="Loading room..." />;
  if (!hostel || !room) return <PageMessage message="Room not found." onNavigate={() => onNavigate(basePath)} />;

  const availableSpaces = Math.max(0, room.capacity - room.occupied);
  const displayStatus = room.status === 'inactive' ? 'inactive' : room.occupied >= room.capacity ? 'full' : 'available';

  return <main className="min-h-screen bg-slate-100"><header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6"><div><button className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50" onClick={() => onNavigate(basePath)} type="button">← Back to rooms</button><h1 className="mt-1 text-2xl font-bold text-slate-950">Room {room.roomNumber}</h1></div><button className={managementPrimaryButton} onClick={() => onNavigate(`${basePath}/${room.id}/edit`)} type="button">Edit room</button></div></header>
    <section className="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:px-6">
      {notice ? <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">{notice}</p> : null}
      {error ? <ManagementError message={error} /> : null}
      <section className="rounded-md border border-slate-200 bg-white p-5 sm:p-6"><h2 className="mb-4 font-semibold text-slate-900">Room information</h2><dl className="grid gap-4 sm:grid-cols-3"><Detail label="Hostel" value={hostel.name} /><Detail label="Room number" value={room.roomNumber} /><Detail label="Floor" value={String(room.floor)} /><Detail label="Capacity" value={String(room.capacity)} /><Detail label="Occupied" value={String(room.occupied)} /><Detail label="Available spaces" value={String(availableSpaces)} /><Detail label="Status" value={displayStatus} /></dl></section>

      <section className="rounded-md border border-slate-200 bg-white p-5 sm:p-6"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold text-slate-900">Assigned students ({students.length})</h2><button className={managementSecondaryButton} disabled={displayStatus !== 'available'} onClick={() => { setShowAssignForm((current) => !current); setMovingStudent(null); setError(null); }} type="button">Assign student</button></div>
        {showAssignForm ? <form className="mb-5 grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[1fr_auto]" onSubmit={(event) => void handleAssign(event)}><label className="text-sm font-medium text-slate-700">Student<select className={`${managementInputClass} mt-1.5`} onChange={(event) => setSelectedStudentId(event.target.value)} required value={selectedStudentId}><option value="">Select an unassigned student</option>{availableStudents.map((student) => <option key={student.id} value={student.id}>{student.studentId} · {student.name}</option>)}</select></label><button className={`${managementPrimaryButton} self-end`} disabled={isSubmitting || availableStudents.length === 0} type="submit">{isSubmitting ? 'Assigning...' : 'Confirm assignment'}</button>{availableStudents.length === 0 ? <p className="text-sm text-slate-600 sm:col-span-2">No unassigned students are available.</p> : null}</form> : null}
        {students.length === 0 ? <p className="py-6 text-center text-sm text-slate-600">No students are assigned to this room.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[720px] border-collapse text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase text-slate-500"><tr>{['Student ID', 'Name', 'Department', 'Semester', 'Status', 'Actions'].map((heading) => <th className="px-3 py-3 font-semibold" key={heading}>{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{students.map((student) => <tr key={student.id}><td className="px-3 py-3 font-medium text-slate-900">{student.studentId}</td><td className="px-3 py-3">{student.name}</td><td className="px-3 py-3">{student.department}</td><td className="px-3 py-3">{student.semester}</td><td className="px-3 py-3">{student.status}</td><td className="px-3 py-3"><div className="flex gap-3 whitespace-nowrap"><button className="text-sm font-medium text-slate-700 hover:underline" onClick={() => { setMovingStudent(student); setTargetHostelId(hostelId); setShowAssignForm(false); setError(null); }} type="button">Move</button><button className="text-sm font-medium text-red-700 hover:underline" onClick={() => void handleRemove(student)} type="button">Remove</button></div></td></tr>)}</tbody></table></div>}
        {movingStudent ? <form className="mt-5 grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3" onSubmit={(event) => void handleMove(event)}><p className="text-sm font-medium text-slate-900 sm:col-span-3">Move {movingStudent.name}</p><label className="text-sm font-medium text-slate-700">New hostel<select className={`${managementInputClass} mt-1.5`} onChange={(event) => { setTargetRoomId(''); setTargetHostelId(event.target.value); }} value={targetHostelId}>{hostels.filter((item) => item.status === 'active').map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="text-sm font-medium text-slate-700">New room<select className={`${managementInputClass} mt-1.5`} onChange={(event) => setTargetRoomId(event.target.value)} required value={targetRoomId}><option value="">Select available room</option>{targetRooms.filter((target) => target.status !== 'inactive' && target.occupied < target.capacity && target.id !== room.id).map((target) => <option key={target.id} value={target.id}>{target.roomNumber} · {target.occupied}/{target.capacity}</option>)}</select></label><div className="flex items-end gap-2"><button className={managementPrimaryButton} disabled={isSubmitting} type="submit">{isSubmitting ? 'Moving...' : 'Confirm move'}</button><button className={managementSecondaryButton} onClick={() => setMovingStudent(null)} type="button">Cancel</button></div></form> : null}
      </section>
    </section>
  </main>;
}

function Detail({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs font-medium uppercase text-slate-500">{label}</dt><dd className="mt-1 text-sm text-slate-900">{value}</dd></div>; }
function PageMessage({ message, onNavigate }: { message: string; onNavigate?: () => void }) { return <main className="min-h-screen bg-slate-100 p-8 text-center"><p className="text-slate-700">{message}</p>{onNavigate ? <button className="mt-4 underline" onClick={onNavigate} type="button">Return to rooms</button> : null}</main>; }