import { useEffect, useState } from 'react';

import { StudentErrorMessage } from '@/features/students/components/StudentErrorMessage';
import { getStudent } from '@/features/students/services/studentService';
import type { Student } from '@/features/students/types/student';
import { getStudentErrorMessage, primaryButton } from '@/features/students/utils/studentPageUtils';

export function StudentDetailsPage({ studentId, onNavigate }: { studentId: string; onNavigate: (path: string) => void }) {
  const [student, setStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice] = useState(() => sessionStorage.getItem('students.notice'));

  useEffect(() => {
    let active = true;
    getStudent(studentId)
      .then((record) => {
        if (active) setStudent(record);
      })
      .catch((loadError: unknown) => {
        if (active) setError(getStudentErrorMessage(loadError));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    sessionStorage.removeItem('students.notice');
    return () => {
      active = false;
    };
  }, [studentId]);

  if (isLoading) return <main className="min-h-screen bg-slate-100 p-8 text-center text-sm text-slate-600">Loading student...</main>;
  if (error) return <main className="min-h-screen bg-slate-100 px-4 py-8"><div className="mx-auto max-w-3xl"><StudentErrorMessage message={error} /><BackButton onNavigate={onNavigate} /></div></main>;
  if (!student) return <main className="min-h-screen bg-slate-100 p-8 text-center"><p className="text-slate-700">Student record not found.</p><BackButton onNavigate={onNavigate} /></main>;

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div><button className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50" onClick={() => onNavigate('/admin/students')} type="button">← Back to students</button><h1 className="mt-1 text-2xl font-bold text-slate-950">{student.name}</h1></div>
          <button className={primaryButton} onClick={() => onNavigate(`/admin/students/${student.id}/edit`)} type="button">Edit student</button>
        </div>
      </header>
      <section className="mx-auto max-w-4xl space-y-4 px-4 py-6 sm:px-6">
        {notice ? <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">{notice}</p> : null}
        <DetailsSection title="Student information">
          <Detail label="Student ID" value={student.studentId} /><Detail label="Name" value={student.name} /><Detail label="Email" value={student.email} /><Detail label="Department" value={student.department} /><Detail label="Semester" value={String(student.semester)} /><Detail label="Phone" value={student.phone} /><Detail label="Gender" value={student.gender} />
        </DetailsSection>
        <DetailsSection title="Hostel information">
  <Detail label="Hostel" value={student.hostel} />
  <Detail label="Room" value={student.room} />
  <Detail
    label="Status"
    value={student.status === 'active' ? 'Active' : 'Inactive'}
  />

  <div className="sm:col-span-2">
    <button
      className={primaryButton}
      onClick={() => onNavigate(`/admin/students/${student.id}/room`)}
      type="button"
    >
      Change Room
    </button>
  </div>
</DetailsSection>
        <DetailsSection title="Record dates">
          <Detail label="Created" value={formatDate(student.createdAt)} /><Detail label="Last updated" value={formatDate(student.updatedAt)} />
        </DetailsSection>
      </section>
    </main>
  );
}

function DetailsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-md border border-slate-200 bg-white p-5 sm:p-6"><h2 className="mb-4 text-base font-semibold text-slate-900">{title}</h2><dl className="grid gap-4 sm:grid-cols-2">{children}</dl></section>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-medium uppercase text-slate-500">{label}</dt><dd className="mt-1 break-words text-sm text-slate-900">{value || 'Not provided'}</dd></div>;
}

function BackButton({ onNavigate }: { onNavigate: (path: string) => void }) {
  return <button className="mt-4 text-sm font-medium text-slate-900 underline" onClick={() => onNavigate('/admin/students')} type="button">Return to students</button>;
}

function formatDate(value: Student['createdAt']) {
  if (!value) return 'Not available';
  return value.toDate().toLocaleString();
}