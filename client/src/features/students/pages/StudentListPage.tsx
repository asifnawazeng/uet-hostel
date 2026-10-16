import { useEffect, useMemo, useState } from 'react';

import { StudentErrorMessage } from '@/features/students/components/StudentErrorMessage';
import { deleteStudent, listStudents } from '@/features/students/services/studentService';
import type { Student, StudentStatus } from '@/features/students/types/student';
import { getStudentErrorMessage, inputClass, primaryButton } from '@/features/students/utils/studentPageUtils';

interface StudentListPageProps {
  onNavigate: (path: string) => void;
}

export function StudentListPage({ onNavigate }: StudentListPageProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [hostel, setHostel] = useState('');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState(() => sessionStorage.getItem('students.notice'));
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listStudents()
      .then((records) => {
        if (active) setStudents(records);
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
  }, []);

  const departments = useMemo(() => uniqueValues(students.map((student) => student.department)), [students]);
  const hostels = useMemo(() => uniqueValues(students.map((student) => student.hostel)), [students]);
  const visibleStudents = useMemo(() => {
    const searchTerm = search.trim().toLocaleLowerCase();
    return students.filter((student) => {
      const matchesSearch =
        !searchTerm ||
        [student.name, student.studentId, student.email].some((value) =>
          value.toLocaleLowerCase().includes(searchTerm)
        );
      return (
        matchesSearch &&
        (!department || student.department === department) &&
        (!hostel || student.hostel === hostel) &&
        (!status || student.status === status)
      );
    });
  }, [department, hostel, search, status, students]);

  async function handleDelete(student: Student) {
    if (!window.confirm('Are you sure you want to delete this student?')) return;

    setDeletingId(student.id);
    setError(null);
    try {
      await deleteStudent(student.id);
      setStudents((current) => current.filter((record) => record.id !== student.id));
      setNotice('Student record deleted.');
    } catch (deleteError: unknown) {
      setError(getStudentErrorMessage(deleteError));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <button className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50" onClick={() => onNavigate('/admin')} type="button">
              ← Back to dashboard
            </button>
            <h1 className="mt-1 text-2xl font-bold text-slate-950">Students</h1>
          </div>
          <button className={primaryButton} onClick={() => onNavigate('/admin/students/add')} type="button">
            Add student
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {notice ? (
          <div className="mb-4 flex items-center justify-between rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
            {notice}
            <button aria-label="Dismiss message" className="px-2 font-semibold" onClick={() => setNotice(null)} type="button">×</button>
          </div>
        ) : null}
        {error ? <StudentErrorMessage message={error} /> : null}

        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="sm:col-span-2">
            <span className="sr-only">Search students by name, Student ID, or email</span>
            <input className={inputClass} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, Student ID, or email" type="search" value={search} />
          </label>
          <FilterSelect label="Department" value={department} values={departments} onChange={setDepartment} />
          <FilterSelect label="Hostel" value={hostel} values={hostels} onChange={setHostel} />
          <label className="text-sm text-slate-600">
            <span className="sr-only">Filter by status</span>
            <select className={inputClass} onChange={(event) => setStatus(event.target.value)} value={status}>
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
        </div>

        {isLoading ? <p className="py-12 text-center text-sm text-slate-600">Loading students...</p> : null}
        {!isLoading && !error && students.length === 0 ? (
          <div className="rounded-md border border-slate-200 bg-white px-5 py-12 text-center">
            <h2 className="font-semibold text-slate-900">No students found.</h2>
            <p className="mt-1 text-sm text-slate-600">Add a student record to get started.</p>
          </div>
        ) : null}
        {!isLoading && !error && students.length > 0 && visibleStudents.length === 0 ? (
          <p className="rounded-md border border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-600">No students match these search and filter options.</p>
        ) : null}
        {!isLoading && !error && visibleStudents.length > 0 ? (
          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
            <table className="w-full min-w-[850px] border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  {['Student ID', 'Name', 'Department', 'Semester', 'Hostel', 'Room', 'Status', 'Actions'].map((heading) => <th className="px-4 py-3 font-semibold" key={heading}>{heading}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleStudents.map((student) => (
                  <tr key={student.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{student.studentId}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{student.name}</td>
                    <td className="px-4 py-3 text-slate-700">{student.department}</td>
                    <td className="px-4 py-3 text-slate-700">{student.semester}</td>
                    <td className="px-4 py-3 text-slate-700">{student.hostel}</td>
                    <td className="px-4 py-3 text-slate-700">{student.room}</td>
                    <td className="px-4 py-3"><StatusBadge status={student.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 whitespace-nowrap">
                        <RowAction label="View" onClick={() => onNavigate(`/admin/students/${student.id}`)} />
                        <RowAction label="Edit" onClick={() => onNavigate(`/admin/students/${student.id}/edit`)} />
                        <button className="text-sm font-medium text-red-700 hover:underline disabled:opacity-50" disabled={deletingId === student.id} onClick={() => void handleDelete(student)} type="button">
                          {deletingId === student.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {students.length >= 500 ? <p className="mt-3 text-xs text-slate-500">Showing up to 500 records. Refine your filters or contact support for a larger directory.</p> : null}
      </section>
    </main>
  );
}

function uniqueValues(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((first, second) => first.localeCompare(second));
}

function FilterSelect({ label, value, values, onChange }: { label: string; value: string; values: string[]; onChange: (value: string) => void }) {
  return (
    <label className="text-sm text-slate-600">
      <span className="sr-only">Filter by {label.toLocaleLowerCase()}</span>
      <select className={inputClass} onChange={(event) => onChange(event.target.value)} value={value}>
        <option value="">All {label.toLocaleLowerCase()}s</option>
        {values.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function StatusBadge({ status }: { status: StudentStatus }) {
  return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${status === 'active' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>{status === 'active' ? 'Active' : 'Inactive'}</span>;
}

function RowAction({ label, onClick }: { label: string; onClick: () => void }) {
  return <button className="text-sm font-medium text-slate-700 hover:underline" onClick={onClick} type="button">{label}</button>;
}