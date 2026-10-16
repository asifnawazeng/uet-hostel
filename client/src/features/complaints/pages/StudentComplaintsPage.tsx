import { useEffect, useState } from 'react';

import { useAuth } from '@/context/useAuth';
import {
  createComplaint,
  listStudentComplaints,
} from '@/features/complaints/services/complaintService';
import { StudentRequestList } from '@/features/requests/components/StudentRequestList';
import {
  archiveMyRequest,
  listMyArchivedRequests,
  performStudentRequestAction,
  restoreMyRequest,
} from '@/features/requests/services/studentRequestService';
import type {
  Complaint,
  ComplaintInput,
} from '@/features/complaints/types/complaint';

const categories = [
  'Maintenance',
  'Room',
  'Mess',
  'Cleanliness',
  'Security',
  'Other',
];

export function StudentComplaintsPage({
  onNavigate,
}: {
  onNavigate: (path: string) => void;
}) {
  const { currentUser } = useAuth();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [notificationWarning, setNotificationWarning] = useState<string | null>(null);
  const [archivedKeys, setArchivedKeys] = useState<Set<string>>(new Set());
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);

  const [form, setForm] = useState<ComplaintInput>({
    subject: '',
    description: '',
    category: 'Maintenance',
    priority: 'medium',
  });

  useEffect(() => {
    if (!currentUser) return;

    const studentUid = currentUser.uid;
    let active = true;

    async function loadComplaints() {
      try {
        setIsLoading(true);
        setError(null);

        const [records, archived] = await Promise.all([
          listStudentComplaints(studentUid),
          listMyArchivedRequests(),
        ]);

        if (active) {
          setComplaints(records);
          setArchivedKeys(archived);
        }
      } catch (loadError: unknown) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Unable to load your complaints.'
          );
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadComplaints();

    return () => {
      active = false;
    };
  }, [currentUser]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!currentUser) {
      setError('You must be signed in to submit a complaint.');
      return;
    }

    if (!form.subject.trim() || !form.description.trim()) {
      setError('Please enter a subject and description.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setNotice(null);
      setNotificationWarning(null);

      const result = await createComplaint(
        currentUser.uid,
        currentUser.name,
        form
      );

      setForm({
        subject: '',
        description: '',
        category: 'Maintenance',
        priority: 'medium',
      });

      setNotice('Your complaint has been submitted successfully.');
      setNotificationWarning(result.notificationWarning);

      try {
        const updatedComplaints = await listStudentComplaints(
          currentUser.uid
        );
        setComplaints(updatedComplaints);
      } catch (refreshError: unknown) {
        setError(
          refreshError instanceof Error
            ? `Your complaint was submitted, but the list could not be refreshed: ${refreshError.message}`
            : 'Your complaint was submitted, but the list could not be refreshed.'
        );
      }
    } catch (submitError: unknown) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Unable to submit the complaint.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRequestAction(
    complaint: Complaint,
    action: 'withdraw' | 'archive' | 'restore'
  ) {
    if (!currentUser) return;

    try {
      setBusyRequestId(complaint.id);
      setError(null);
      setNotice(null);

      if (action === 'archive') {
        await archiveMyRequest('complaint', complaint.id);
        setArchivedKeys((current) =>
          new Set(current).add(`complaint:${complaint.id}`)
        );
        setNotice('Complaint archived. It remains available in Archived.');
        return;
      }

      if (action === 'restore') {
        await restoreMyRequest('complaint', complaint.id);
        setArchivedKeys((current) => {
          const next = new Set(current);
          next.delete(`complaint:${complaint.id}`);
          return next;
        });
        setNotice('Complaint restored to History.');
        return;
      }

      const result = await performStudentRequestAction(
        'complaint',
        complaint.id,
        'withdraw'
      );
      setComplaints((current) =>
        current.map((record) =>
          record.id === complaint.id
            ? { ...record, status: 'withdrawn' }
            : record
        )
      );
      setNotice(
        result.notificationWarning
          ? `${result.message} ${result.notificationWarning}`
          : result.message
      );
    } catch (actionError: unknown) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : 'Unable to update this complaint.'
      );
    } finally {
      setBusyRequestId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-500">
              Student area
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-950">
              Complaints
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Submit a complaint and track its status.
            </p>
          </div>

          <button
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={() => onNavigate('/student')}
            type="button"
          >
            ← Back to dashboard
          </button>
        </div>

        {error && (
          <div aria-live="assertive" className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}

        {notice && (
          <div aria-live="polite" className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700" role="status">
            {notice}
          </div>
        )}

        {notificationWarning && (
          <div aria-live="polite" className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800" role="status">
            {notificationWarning}
          </div>
        )}

        <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-lg font-bold text-slate-950">
            Submit a complaint
          </h2>

          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label
                className="text-sm font-medium text-slate-700"
                htmlFor="complaint-subject"
              >
                Subject
              </label>

              <input
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                id="complaint-subject"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    subject: event.target.value,
                  }))
                }
                placeholder="Example: Room fan is not working"
                value={form.subject}
              />
            </div>

            <div>
              <label
                className="text-sm font-medium text-slate-700"
                htmlFor="complaint-category"
              >
                Category
              </label>

              <select
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                id="complaint-category"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    category: event.target.value,
                  }))
                }
                value={form.category}
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                className="text-sm font-medium text-slate-700"
                htmlFor="complaint-priority"
              >
                Priority
              </label>

              <select
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                id="complaint-priority"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    priority: event.target.value as ComplaintInput['priority'],
                  }))
                }
                value={form.priority}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label
                className="text-sm font-medium text-slate-700"
                htmlFor="complaint-description"
              >
                Description
              </label>

              <textarea
                className="mt-1.5 min-h-32 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                id="complaint-description"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Describe your problem clearly..."
                value={form.description}
              />
            </div>

            <button
              className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Complaint'}
            </button>
          </form>
        </section>

        <div className="mt-8">
          <StudentRequestList
            archivedKeys={archivedKeys}
            busyRequestId={busyRequestId}
            isActive={(complaint) =>
              complaint.status === 'pending' ||
              complaint.status === 'in-progress'
            }
            isArchivable={(complaint) => complaint.status === 'resolved'}
            isLoading={isLoading}
            onAction={handleRequestAction}
            records={complaints}
            renderRecord={(complaint) => (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      {complaint.subject}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {complaint.category} · {complaint.priority}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Submitted{' '}
                      <time dateTime={complaint.createdAt.toDate().toISOString()}>
                        {complaint.createdAt.toDate().toLocaleDateString()}
                      </time>
                      {' · '}Updated{' '}
                      <time dateTime={complaint.updatedAt.toDate().toISOString()}>
                        {complaint.updatedAt.toDate().toLocaleDateString()}
                      </time>
                    </p>
                  </div>
                  <StatusBadge status={complaint.status} />
                </div>

                <p className="mt-4 text-sm text-slate-600">
                  {detailsId === complaint.id
                    ? complaint.description
                    : `${complaint.description.slice(0, 180)}${complaint.description.length > 180 ? '…' : ''}`}
                </p>

                {detailsId === complaint.id && complaint.adminResponse ? (
                  <div className="mt-4 rounded-lg bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase text-slate-500">
                      Administrator response
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                      {complaint.adminResponse}
                    </p>
                  </div>
                ) : null}

                {complaint.description.length > 180 || complaint.adminResponse ? (
                  <button
                    aria-expanded={detailsId === complaint.id}
                    className="mt-3 text-sm font-medium text-slate-700 underline underline-offset-2"
                    onClick={() =>
                      setDetailsId((current) =>
                        current === complaint.id ? null : complaint.id
                      )
                    }
                    type="button"
                  >
                    {detailsId === complaint.id ? 'Hide details' : 'View details'}
                  </button>
                ) : null}
              </>
            )}
            requestType="complaint"
            searchableText={(complaint) =>
              `${complaint.subject} ${complaint.category} ${complaint.description} ${complaint.adminResponse ?? ''}`
            }
            statuses={[
              { value: 'pending', label: 'Pending' },
              { value: 'in-progress', label: 'In Progress' },
              { value: 'resolved', label: 'Resolved' },
              { value: 'withdrawn', label: 'Withdrawn' },
            ]}
            title="My Complaints"
          />
        </div>
      </div>
    </main>
  );
}

function StatusBadge({
  status,
}: {
  status: Complaint['status'];
}) {
  const label =
    status === 'in-progress'
      ? 'In Progress'
      : status === 'resolved'
        ? 'Resolved'
        : status === 'withdrawn'
          ? 'Withdrawn'
          : 'Pending';

  const colors =
    status === 'resolved'
      ? 'bg-green-100 text-green-700'
      : status === 'withdrawn'
        ? 'bg-slate-200 text-slate-700'
        : status === 'in-progress'
          ? 'bg-blue-100 text-blue-700'
          : 'bg-amber-100 text-amber-700';

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${colors}`}>
      {label}
    </span>
  );
}