import { useEffect, useState } from 'react';

import { listAllLeaveRequests, updateLeaveRequest } from '@/features/leave/services/leaveService';
import type { LeaveRequest, LeaveStatus } from '@/features/leave/types/leave';

export function AdminLeavePage({
  onNavigate,
}: {
  onNavigate: (path: string) => void;
}) {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [notificationWarnings, setNotificationWarnings] = useState<
    Record<string, string>
  >({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [remarks, setRemarks] = useState<Record<string, string>>({});

  async function loadLeaveRequests() {
    setIsLoading(true);
    setError('');

    try {
      const requests = await listAllLeaveRequests();
      setLeaveRequests(requests);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Failed to load leave requests.'
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadLeaveRequests();
  }, []);

  async function handleStatusChange(
    id: string,
    status: LeaveStatus
  ) {
    setUpdatingId(id);
    setError('');
    setNotificationWarnings((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });

    try {
      const result = await updateLeaveRequest(id, {
        status,
        adminRemarks: remarks[id] ?? '',
      });

      setLeaveRequests((currentRequests) =>
        currentRequests.map((request) =>
          request.id === id
            ? {
                ...request,
                status,
                adminRemarks: remarks[id] ?? '',
              }
            : request
        )
      );

      const notificationWarning = result.notificationWarning;
      if (notificationWarning) {
        setNotificationWarnings((current) => ({
          ...current,
          [id]: notificationWarning,
        }));
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Failed to update the leave request.'
      );
    } finally {
      setUpdatingId(null);
    }
  }

  function getStatusClasses(status: LeaveStatus) {
    if (status === 'approved') {
      return 'bg-emerald-100 text-emerald-700';
    }

    if (status === 'rejected') {
      return 'bg-red-100 text-red-700';
    }

    if (status === 'cancelled') {
      return 'bg-slate-200 text-slate-700';
    }

    return 'bg-amber-100 text-amber-700';
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-sm font-semibold text-slate-500">
              UET Hostel Management
            </p>
            <h1 className="text-xl font-bold text-slate-950">
              Admin Leave Management
            </h1>
          </div>

          <button
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={() => onNavigate('/admin')}
            type="button"
          >
            ← Back to dashboard
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm text-slate-500">Leave Requests</p>
              <h2 className="mt-1 text-2xl font-bold text-slate-950">
                Student Leave Requests
              </h2>
            </div>

            <button
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              disabled={isLoading}
              onClick={() => void loadLeaveRequests()}
              type="button"
            >
              {isLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {error ? (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {isLoading ? (
            <p className="mt-8 text-sm text-slate-500">
              Loading leave requests...
            </p>
          ) : leaveRequests.length === 0 ? (
            <div className="mt-8 rounded-lg bg-slate-50 p-6 text-center">
              <p className="font-medium text-slate-700">
                No leave requests found.
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Student leave requests will appear here.
              </p>
            </div>
          ) : (
            <div className="mt-8 space-y-5">
              {leaveRequests.map((request) => (
                <article
                  className="rounded-xl border border-slate-200 p-5"
                  key={request.id}
                >
                  <div className="flex flex-col justify-between gap-4 sm:flex-row">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {request.studentName}
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        {request.studentEmail}
                      </p>
                    </div>

                    <span
                      className={`inline-flex h-fit rounded-full px-3 py-1 text-xs font-semibold capitalize ${getStatusClasses(
                        request.status
                      )}`}
                    >
                      {request.status.charAt(0).toUpperCase() +
                        request.status.slice(1)}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Leave Type
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-800">
                        {request.leaveType}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        From
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-800">
                        {request.fromDate}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        To
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-800">
                        {request.toDate}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Reason
                    </p>

                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                      {request.reason}
                    </p>
                  </div>

                  <div className="mt-5">
                    <label
                      className="text-xs font-semibold uppercase tracking-wide text-slate-400"
                      htmlFor={`remarks-${request.id}`}
                    >
                      Admin Remarks
                    </label>

                    <textarea
                      className="mt-2 min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500"
                      id={`remarks-${request.id}`}
                      onChange={(event) =>
                        setRemarks((currentRemarks) => ({
                          ...currentRemarks,
                          [request.id]: event.target.value,
                        }))
                      }
                      placeholder="Optional remarks for the student"
                      value={
                        remarks[request.id] ?? request.adminRemarks ?? ''
                      }
                    />
                  </div>

                  {request.status === 'pending' ? (
                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                        disabled={updatingId === request.id}
                        onClick={() =>
                          void handleStatusChange(request.id, 'approved')
                        }
                        type="button"
                      >
                        {updatingId === request.id
                          ? 'Updating...'
                          : 'Approve'}
                      </button>

                      <button
                        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                        disabled={updatingId === request.id}
                        onClick={() =>
                          void handleStatusChange(request.id, 'rejected')
                        }
                        type="button"
                      >
                        {updatingId === request.id
                          ? 'Updating...'
                          : 'Reject'}
                      </button>
                    </div>
                  ) : null}

                  {notificationWarnings[request.id] ? (
                    <p
                      className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
                      role="status"
                    >
                      {notificationWarnings[request.id]}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
