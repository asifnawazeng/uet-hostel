import { useEffect, useState } from 'react';

import { ManagementError } from '@/features/hostels/components/ManagementError';
import { deleteHostel, listHostels } from '@/features/hostels/services/hostelService';
import type { Hostel } from '@/features/hostels/types/hostel';
import { managementErrorMessage, managementInputClass, managementPrimaryButton } from '@/features/hostels/utils/managementUtils';

export function HostelListPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState(() => sessionStorage.getItem('hostels.notice'));

  useEffect(() => {
    let active = true;
    listHostels()
      .then((records) => { if (active) setHostels(records); })
      .catch((loadError: unknown) => { if (active) setError(managementErrorMessage(loadError)); })
      .finally(() => { if (active) setIsLoading(false); });
    sessionStorage.removeItem('hostels.notice');
    return () => { active = false; };
  }, []);

  async function handleDelete(hostel: Hostel) {
    if (!window.confirm(`Delete ${hostel.name}? Hostels containing rooms or assigned students cannot be deleted.`)) return;
    setError(null);
    try {
      await deleteHostel(hostel.id);
      setHostels((current) => current.filter((item) => item.id !== hostel.id));
      setNotice('Hostel deleted.');
    } catch (deleteError: unknown) {
      setError(managementErrorMessage(deleteError));
    }
  }

  const visibleHostels = hostels.filter((hostel) => hostel.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div><button className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50" onClick={() => onNavigate('/admin')} type="button">← Back to dashboard</button><h1 className="mt-1 text-2xl font-bold text-slate-950">Hostels</h1></div>
        <button className={managementPrimaryButton} onClick={() => onNavigate('/admin/hostels/add')} type="button">Add hostel</button>
      </div></header>
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {notice ? <p className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">{notice}</p> : null}
        {error ? <ManagementError message={error} /> : null}
        <label className="mb-5 block max-w-lg"><span className="sr-only">Search hostels by name</span><input className={managementInputClass} onChange={(event) => setSearch(event.target.value)} placeholder="Search hostels" type="search" value={search} /></label>
        {isLoading ? <p className="py-12 text-center text-sm text-slate-600">Loading hostels...</p> : null}
        {!isLoading && !error && hostels.length === 0 ? <p className="rounded-md border border-slate-200 bg-white px-5 py-12 text-center text-sm text-slate-700">No hostels found.</p> : null}
        {!isLoading && hostels.length > 0 && visibleHostels.length === 0 ? <p className="rounded-md border border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-600">No hostels match your search.</p> : null}
        {!isLoading && visibleHostels.length > 0 ? <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
          <table className="w-full min-w-[680px] border-collapse text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{['Hostel', 'Gender', 'Total rooms', 'Status', 'Actions'].map((heading) => <th className="px-4 py-3 font-semibold" key={heading}>{heading}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">{visibleHostels.map((hostel) => <tr key={hostel.id}>
              <td className="px-4 py-3 font-medium text-slate-900">{hostel.name}</td><td className="px-4 py-3 text-slate-700">{hostel.gender}</td><td className="px-4 py-3 text-slate-700">{hostel.totalRooms}</td>
              <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-medium ${hostel.status === 'active' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>{hostel.status}</span></td>
              <td className="px-4 py-3"><div className="flex gap-3 whitespace-nowrap"><RowAction label="View" onClick={() => onNavigate(`/admin/hostels/${hostel.id}`)} /><RowAction label="Edit" onClick={() => onNavigate(`/admin/hostels/${hostel.id}/edit`)} /><button className="text-sm font-medium text-red-700 hover:underline" onClick={() => void handleDelete(hostel)} type="button">Delete</button></div></td>
            </tr>)}</tbody>
          </table>
        </div> : null}
      </section>
    </main>
  );
}

function RowAction({ label, onClick }: { label: string; onClick: () => void }) {
  return <button className="text-sm font-medium text-slate-700 hover:underline" onClick={onClick} type="button">{label}</button>;
}