import { useEffect, useState, type FormEvent } from 'react';

import { StudentErrorMessage } from '@/features/students/components/StudentErrorMessage';
import { createStudent, getStudent, updateStudent } from '@/features/students/services/studentService';
import type { Student, StudentGender, StudentInput, StudentStatus } from '@/features/students/types/student';
import { getStudentErrorMessage, inputClass, primaryButton } from '@/features/students/utils/studentPageUtils';

interface StudentFormPageProps {
  studentId?: string;
  onNavigate: (path: string) => void;
}

type FormValues = Omit<StudentInput, 'uid' | 'gender'> & { gender: StudentGender | '' };

const emptyForm: FormValues = {
  name: '',
  email: '',
  studentId: '',
  department: '',
  semester: 1,
  phone: '',
  gender: '',
  hostel: '',
  room: '',
  status: 'active',
};

export function StudentFormPage({ studentId, onNavigate }: StudentFormPageProps) {
  const isEditing = Boolean(studentId);
  const [form, setForm] = useState<FormValues>(emptyForm);
  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!studentId) return;
    let active = true;
    getStudent(studentId)
      .then((student) => {
        if (!active) return;
        if (!student) {
          setNotFound(true);
          return;
        }
        setForm(toFormValues(student));
      })
      .catch((loadError: unknown) => {
        if (active) setError(getStudentErrorMessage(loadError));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [studentId]);

  function setField<Key extends keyof FormValues>(key: Key, value: FormValues[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const input: FormValues = {
      ...form,
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      studentId: form.studentId.trim(),
      department: form.department.trim(),
      phone: form.phone.trim(),
      gender: form.gender,
      hostel: form.hostel.trim(),
      room: form.room.trim(),
    };
    if (!input.name) {
      setError('Enter the student’s full name.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
      setError('Enter a valid email address.');
      return;
    }
    if (!input.studentId) {
      setError('Enter the Student ID.');
      return;
    }
    if (!input.department) {
      setError('Enter the department.');
      return;
    }
    if (!Number.isInteger(input.semester) || input.semester < 1 || input.semester > 8) {
      setError('Semester must be a whole number from 1 to 8.');
      return;
    }
    if (!input.phone) {
      setError('Enter the student’s phone number.');
      return;
    }
    if (input.gender !== 'Male' && input.gender !== 'Female') {
      setError('Select Male or Female for gender.');
      return;
    }
    if (input.status !== 'active' && input.status !== 'inactive') {
      setError('Select a valid student status.');
      return;
    }

    const validInput: StudentInput = { ...input, gender: input.gender };

    setIsSaving(true);
    try {
      if (studentId) {
        await updateStudent(studentId, validInput);
        sessionStorage.setItem('students.notice', 'Student record updated.');
        onNavigate(`/admin/students/${studentId}`);
      } else {
        await createStudent(validInput);
        sessionStorage.setItem('students.notice', 'Student record created.');
        onNavigate('/admin/students');
      }
    } catch (saveError: unknown) {
      setError(getStudentErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) return <main className="min-h-screen bg-slate-100 p-8 text-center text-sm text-slate-600">Loading student...</main>;
  if (notFound) return <FormNotFound onNavigate={onNavigate} />;

  return (
    <main className="min-h-screen bg-slate-100">
      <PageHeader title={isEditing ? 'Edit student' : 'Add student'} onNavigate={onNavigate} isEditing={isEditing} studentId={studentId} />
      <section className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        {error ? <StudentErrorMessage message={error} /> : null}
        <form className="rounded-md border border-slate-200 bg-white p-5 sm:p-7" onSubmit={(event) => void handleSubmit(event)}>
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField label="Full Name" required value={form.name} onChange={(value) => setField('name', value)} />
            <TextField label="Email" required type="email" value={form.email} onChange={(value) => setField('email', value)} />
            <TextField label="Student ID" required value={form.studentId} onChange={(value) => setField('studentId', value)} />
            <TextField label="Department" required value={form.department} onChange={(value) => setField('department', value)} />
            <label className="block text-sm font-medium text-slate-700">Semester <span aria-hidden="true">*</span>
              <input className={`${inputClass} mt-1.5`} max="8" min="1" onChange={(event) => setField('semester', Number(event.target.value))} required type="number" value={form.semester} />
            </label>
            <TextField label="Phone" required type="tel" value={form.phone} onChange={(value) => setField('phone', value)} />
            <label className="block text-sm font-medium text-slate-700">Gender <span aria-hidden="true">*</span>
              <select className={`${inputClass} mt-1.5`} onChange={(event) => setField('gender', event.target.value as StudentGender | '')} required value={form.gender}>
                <option value="">Not specified</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </label>
            <TextField label="Hostel" readOnly value={form.hostel || 'Unassigned'} onChange={() => undefined} />
            <TextField label="Room" readOnly value={form.room || 'Unassigned'} onChange={() => undefined} />
            <label className="block text-sm font-medium text-slate-700">Status <span aria-hidden="true">*</span>
              <select className={`${inputClass} mt-1.5`} onChange={(event) => setField('status', event.target.value as StudentStatus)} required value={form.status}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
          </div>
          <p className="mt-5 text-xs text-slate-500">Fields marked with * are required. Room assignments are managed from Hostel Management. This does not create or remove a Firebase login account.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button className={primaryButton} disabled={isSaving} type="submit">{isSaving ? 'Saving...' : isEditing ? 'Save changes' : 'Create student'}</button>
            <button className="rounded-md border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={() => onNavigate(isEditing && studentId ? `/admin/students/${studentId}` : '/admin/students')} type="button">Cancel</button>
          </div>
        </form>
      </section>
    </main>
  );
}

function TextField({ label, value, onChange, required = false, type = 'text', readOnly = false }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string; readOnly?: boolean }) {
  return (
    <label className="block text-sm font-medium text-slate-700">{label}{required ? <span aria-hidden="true"> *</span> : null}
      <input className={`${inputClass} mt-1.5 read-only:bg-slate-50 read-only:text-slate-500`} autoComplete={type === 'email' ? 'email' : undefined} onChange={(event) => onChange(event.target.value)} readOnly={readOnly} required={required} type={type} value={value} />
    </label>
  );
}

function PageHeader({ title, onNavigate, isEditing, studentId }: { title: string; onNavigate: (path: string) => void; isEditing: boolean; studentId?: string }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6">
        <button className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50" onClick={() => onNavigate(isEditing && studentId ? `/admin/students/${studentId}` : '/admin/students')} type="button">{isEditing ? '← Back to student' : '← Back to students'}</button>
        <h1 className="mt-1 text-2xl font-bold text-slate-950">{title}</h1>
      </div>
    </header>
  );
}

function FormNotFound({ onNavigate }: { onNavigate: (path: string) => void }) {
  return <main className="min-h-screen bg-slate-100 p-8 text-center"><p className="text-slate-700">Student record not found.</p><button className="mt-4 font-medium text-slate-900 underline" onClick={() => onNavigate('/admin/students')} type="button">Return to students</button></main>;
}

function toFormValues(student: Student): FormValues {
  return {
    name: student.name ?? '',
    email: student.email ?? '',
    studentId: student.studentId ?? '',
    department: student.department ?? '',
    semester: student.semester ?? 1,
    phone: student.phone ?? '',
    gender: student.gender === 'Male' || student.gender === 'Female' ? student.gender : '',
    hostel: student.hostel ?? '',
    room: student.room ?? '',
    status: student.status === 'inactive' ? 'inactive' : 'active',
  };
}