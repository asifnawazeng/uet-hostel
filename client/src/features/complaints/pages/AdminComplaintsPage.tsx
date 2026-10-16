import { useEffect, useState } from 'react';

import {
  listComplaints,
  updateComplaintStatus,
} from '@/features/complaints/services/complaintService';
import type {
  Complaint,
  ComplaintStatus,
} from '@/features/complaints/types/complaint';

export function AdminComplaintsPage({
  onNavigate,
}: {
  onNavigate: (path: string) => void;
}) {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notificationWarning, setNotificationWarning] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;

    async function loadComplaints() {
      try {
        setIsLoading(true);
        setError(null);

        const records = await listComplaints();

        if (active) {
          setComplaints(records);
        }
      } catch (loadError: unknown) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Unable to load complaints.'
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
  }, []);

  async function handleStatusChange(
    complaint: Complaint,
    status: ComplaintStatus
  ) {
    try {
      setUpdatingId(complaint.id);
      setError(null);
      setNotificationWarning(null);

      const response = responses[complaint.id] ?? '';

      const result = await updateComplaintStatus(
        complaint.id,
        status,
        response
      );

      setComplaints((current) =>
        current.map((record) =>
          record.id === complaint.id
            ? {
                ...record,
                status,
                adminResponse: response,
              }
            : record
        )
      );
      setNotificationWarning(result.notificationWarning);
    } catch (updateError: unknown) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : 'Unable to update the complaint.'
      );
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <button
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              onClick={() => onNavigate('/admin')}
              type="button"
            >
              ← Back to dashboard
            </button>

            <h1 className="mt-1 text-2xl font-bold text-slate-950">
              Complaints
            </h1>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {error ? (
          <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {notificationWarning ? (
          <div aria-live="polite" className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="status">
            {notificationWarning}
          </div>
        ) : null}

        {isLoading ? (
          <p className="py-12 text-center text-sm text-slate-600">
            Loading complaints...
          </p>
        ) : null}

        {!isLoading && !error && complaints.length === 0 ? (
          <div className="rounded-md border border-slate-200 bg-white px-5 py-12 text-center">
            <h2 className="font-semibold text-slate-900">
              No complaints found.
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              Student complaints will appear here.
            </p>
          </div>
        ) : null}

        {!isLoading && !error && complaints.length > 0 ? (
          <div className="space-y-5">
            {complaints.map((complaint) => (
              <article
                className="rounded-md border border-slate-200 bg-white p-5 shadow-sm"
                key={complaint.id}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">
                      {complaint.category}
                    </p>

                    <h2 className="mt-1 text-lg font-bold text-slate-950">
                      {complaint.subject}
                    </h2>

                    <p className="mt-1 text-sm text-slate-600">
                      Student: {complaint.studentName}
                    </p>

                    <p className="text-sm text-slate-600">
                      Priority: {complaint.priority}
                    </p>
                  </div>

                  <StatusBadge status={complaint.status} />
                </div>

                <div className="mt-5 rounded-lg bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    Complaint description
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {complaint.description}
                  </p>
                </div>

                <div className="mt-5">
                  <label
                    className="text-sm font-medium text-slate-700"
                    htmlFor={`response-${complaint.id}`}
                  >
                    Admin response
                  </label>

                  <textarea
                    className="mt-1.5 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                    disabled={
                      complaint.status === 'withdrawn' ||
                      updatingId === complaint.id
                    }
                    id={`response-${complaint.id}`}
                    onChange={(event) =>
                      setResponses((current) => ({
                        ...current,
                        [complaint.id]: event.target.value,
                      }))
                    }
                    placeholder="Write a response to the student..."
                    value={
                      responses[complaint.id] ??
                      complaint.adminResponse ??
                      ''
                    }
                  />
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {complaint.status === 'withdrawn' ? (
                    <span className="text-sm font-medium text-slate-600">
                      Withdrawn by student
                    </span>
                  ) : (
                    <label className="text-sm text-slate-600">
                      Status
                      <select
                        className="ml-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                        disabled={updatingId === complaint.id}
                        onChange={(event) =>
                          void handleStatusChange(
                            complaint,
                            event.target.value as ComplaintStatus
                          )
                        }
                        value={complaint.status}
                      >
                        <option value="pending">Pending</option>
                        <option value="in-progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </label>
                  )}

                  {complaint.status !== 'withdrawn' ? (
                    <button
                      className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
                      disabled={updatingId === complaint.id}
                      onClick={() =>
                        void handleStatusChange(
                          complaint,
                          complaint.status
                        )
                      }
                      type="button"
                    >
                      {updatingId === complaint.id
                        ? 'Saving...'
                        : 'Save Response'}
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}

function StatusBadge({
  status,
}: {
  status: ComplaintStatus;
}) {
  const label =
    status === 'in-progress'
      ? 'In Progress'
      : status === 'resolved'
        ? 'Resolved'
        : status === 'withdrawn'
          ? 'Withdrawn'
          : 'Pending';

  const colorClass =
    status === 'withdrawn'
      ? 'bg-slate-200 text-slate-700'
      : 'bg-slate-100 text-slate-700';

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${colorClass}`}>
      {label}
    </span>
  );
}