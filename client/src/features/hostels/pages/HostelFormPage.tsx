import { useEffect, useState, type FormEvent } from 'react';

import { ManagementError } from '@/features/hostels/components/ManagementError';
import { createHostel, getHostel, listHostelRooms, updateHostel } from '@/features/hostels/services/hostelService';
import type { HostelGender, HostelInput, HostelStatus } from '@/features/hostels/types/hostel';
import { managementErrorMessage, managementInputClass, managementPrimaryButton, managementSecondaryButton } from '@/features/hostels/utils/managementUtils';

interface Values { name: string; gender: HostelGender | ''; description: string; totalRooms: number; status: HostelStatus }
const initialValues: Values = { name: '', gender: '', description: '', totalRooms: 1, status: 'active' };

export function HostelFormPage({ hostelId, onNavigate }: { hostelId?: string; onNavigate: (path: string) => void }) {
  const [values, setValues] = useState<Values>(initialValues);
  const [isLoading, setIsLoading] = useState(Boolean(hostelId));
  const [isSaving, setIsSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hostelId) return;
    let active = true;
    getHostel(hostelId)
      .then((hostel) => {
        if (!active) return;
        if (!hostel) { setNotFound(true); return; }
        setValues({ name: hostel.name, gender: hostel.gender, description: hostel.description ?? '', totalRooms: hostel.totalRooms, status: hostel.status });
      })
      .catch((loadError: unknown) => { if (active) setError(managementErrorMessage(loadError)); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [hostelId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const input: HostelInput = { ...values, name: values.name.trim(), description: values.description.trim() } as HostelInput;
    if (!input.name) { setError('Enter a hostel name.'); return; }
    if (input.gender !== 'Male' && input.gender !== 'Female') { setError('Select Male or Female for the hostel gender category.'); return; }
    if (!Number.isInteger(input.totalRooms) || input.totalRooms <= 0) { setError('Total rooms must be a whole number greater than zero.'); return; }
    if (input.status !== 'active' && input.status !== 'inactive') { setError('Select a valid hostel status.'); return; }

    setIsSaving(true);
    try {
      if (hostelId) {
        const existingRooms = await listHostelRooms(hostelId);
        if (input.totalRooms < existingRooms.length) throw new Error(`Total rooms cannot be less than the ${existingRooms.length} rooms already created.`);
        await updateHostel(hostelId, input);
        sessionStorage.setItem('hostels.notice', 'Hostel updated.');
        onNavigate(`/admin/hostels/${hostelId}`);
      } else {
        await createHostel(input);
        sessionStorage.setItem('hostels.notice', 'Hostel created.');
        onNavigate('/admin/hostels');
      }
    } catch (saveError: unknown) {
      setError(managementErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) return <PageMessage message="Loading hostel..." />;
  if (notFound) return <PageMessage message="Hostel not found." onNavigate={() => onNavigate('/admin/hostels')} />;

  return <main className="min-h-screen bg-slate-100"><PageHeader title={hostelId ? 'Edit hostel' : 'Add hostel'} onNavigate={onNavigate} hostelId={hostelId} />
    <section className="mx-auto max-w-3xl px-4 py-6 sm:px-6">{error ? <ManagementError message={error} /> : null}
      <form className="space-y-5 rounded-md border border-slate-200 bg-white p-5 sm:p-7" onSubmit={(event) => void handleSubmit(event)}>
        <Field label="Name" required><input className={managementInputClass} onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))} required value={values.name} /></Field>
        <Field label="Gender" required><select className={managementInputClass} onChange={(event) => setValues((current) => ({ ...current, gender: event.target.value as HostelGender | '' }))} required value={values.gender}><option value="">Select gender category</option><option value="Male">Male</option><option value="Female">Female</option></select></Field>
        <Field label="Description"><textarea className={managementInputClass} onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))} rows={3} value={values.description} /></Field>
        <Field label="Total rooms" required><input className={managementInputClass} min="1" onChange={(event) => setValues((current) => ({ ...current, totalRooms: Number(event.target.value) }))} required type="number" value={values.totalRooms} /></Field>
        <Field label="Status" required><select className={managementInputClass} onChange={(event) => setValues((current) => ({ ...current, status: event.target.value as HostelStatus }))} required value={values.status}><option value="active">Active</option><option value="inactive">Inactive</option></select></Field>
        <div className="flex gap-3"><button className={managementPrimaryButton} disabled={isSaving} type="submit">{isSaving ? 'Saving...' : hostelId ? 'Save changes' : 'Create hostel'}</button><button className={managementSecondaryButton} onClick={() => onNavigate(hostelId ? `/admin/hostels/${hostelId}` : '/admin/hostels')} type="button">Cancel</button></div>
      </form>
    </section>
  </main>;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className="block space-y-1.5 text-sm font-medium text-slate-700">{label}{required ? ' *' : ''}{children}</label>;
}

function PageHeader({ title, onNavigate, hostelId }: { title: string; onNavigate: (path: string) => void; hostelId?: string }) {
  return <header className="border-b border-slate-200 bg-white"><div className="mx-auto max-w-3xl px-4 py-4 sm:px-6"><button className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50" onClick={() => onNavigate(hostelId ? `/admin/hostels/${hostelId}` : '/admin/hostels')} type="button">{hostelId ? '← Back to hostel' : '← Back to hostels'}</button><h1 className="mt-1 text-2xl font-bold text-slate-950">{title}</h1></div></header>;
}

function PageMessage({ message, onNavigate }: { message: string; onNavigate?: () => void }) {
  return <main className="min-h-screen bg-slate-100 p-8 text-center"><p className="text-slate-700">{message}</p>{onNavigate ? <button className="mt-4 font-medium text-slate-900 underline" onClick={onNavigate} type="button">Return to hostels</button> : null}</main>;
}