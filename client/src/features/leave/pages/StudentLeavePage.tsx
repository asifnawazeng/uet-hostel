import { useCallback, useEffect, useState, type FormEvent } from 'react';

import { useAuth } from '@/context/useAuth';
import {
  createLeaveRequest,
  listMyLeaveRequests,
} from '@/features/leave/services/leaveService';
import type {
  LeaveRequest,
  LeaveRequestInput,
} from '@/features/leave/types/leave';
import { StudentRequestList } from '@/features/requests/components/StudentRequestList';
import {
  archiveMyRequest,
  listMyArchivedRequests,
  performStudentRequestAction,
  restoreMyRequest,
} from '@/features/requests/services/studentRequestService';

export function StudentLeavePage({
  onNavigate,
}: {
  onNavigate: (path: string) => void;
}) {
  const { currentUser } = useAuth();

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [archivedKeys, setArchivedKeys] = useState<Set<string>>(new Set());
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);

  const [form, setForm] = useState<LeaveRequestInput>({
    leaveType: 'Home Leave',
    fromDate: '',
    toDate: '',
    reason: '',
  });

  const loadLeaveRequests = useCallback(async () => {
    if (!currentUser) {
      setError('You must be logged in to view your leave requests.');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const [requests, archived] = await Promise.all([
        listMyLeaveRequests(),
        listMyArchivedRequests(),
      ]);
      setLeaveRequests(requests);
      setArchivedKeys(archived);
    } catch (loadError: unknown) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load your leave requests.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    void loadLeaveRequests();
  }, [loadLeaveRequests]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      setError(null);
      setSuccess(null);

      await createLeaveRequest(form);

      setForm({
        leaveType: 'Home Leave',
        fromDate: '',
        toDate: '',
        reason: '',
      });

      setSuccess('Your leave request has been submitted successfully.');

      await loadLeaveRequests();
    } catch (submitError: unknown) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Unable to submit the leave request.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRequestAction(
    request: LeaveRequest,
    action: 'cancel' | 'archive' | 'restore'
  ) {
    try {
      setBusyRequestId(request.id);
      setError(null);
      setSuccess(null);

      if (action === 'archive') {
        await archiveMyRequest('leave', request.id);
        setArchivedKeys((current) =>
          new Set(current).add(`leave:${request.id}`)
        );
        setSuccess('Leave request archived. It remains available in Archived.');
        return;
      }

      if (action === 'restore') {
        await restoreMyRequest('leave', request.id);
        setArchivedKeys((current) => {
          const next = new Set(current);
          next.delete(`leave:${request.id}`);
          return next;
        });
        setSuccess('Leave request restored to History.');
        return;
      }

      const result = await performStudentRequestAction(
        'leave',
        request.id,
        'cancel'
      );
      setLeaveRequests((current) =>
        current.map((record) =>
          record.id === request.id
            ? { ...record, status: 'cancelled' }
            : record
        )
      );
      setSuccess(
        result.notificationWarning
          ? `${result.message} ${result.notificationWarning}`
          : result.message
      );
    } catch (actionError: unknown) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : 'Unable to update this leave request.'
      );
    } finally {
      setBusyRequestId(null);
    }
  }

  function getStatusClass(status: LeaveRequest['status']) {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-700';

      case 'rejected':
        return 'bg-red-100 text-red-700';

      case 'cancelled':
        return 'bg-slate-200 text-slate-700';

      case 'pending':
        return 'bg-amber-100 text-amber-700';

      default:
        return 'bg-green-100 text-green-700';
    }
  }

  function formatStatus(status: LeaveRequest['status']) {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <button
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              onClick={() => onNavigate('/student')}
              type="button"
            >
              ← Back to dashboard
            </button>

          <h1 className="mt-1 text-2xl font-bold text-slate-950">
            Leave Management
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Submit a leave request and track its status.
          </p>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-8">
        {error ? (
          <div aria-live="assertive" className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {error}
          </div>
        ) : null}

        {success ? (
          <div aria-live="polite" className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700" role="status">
            {success}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">
              Submit Leave Request
            </h2>

            <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
              <div>
                <label
                  className="block text-sm font-medium text-slate-700"
                  htmlFor="leaveType"
                >
                  Leave Type
                </label>

                <select
                  id="leaveType"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
                  value={form.leaveType}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      leaveType: event.target.value,
                    }))
                  }
                >
                  <option value="Home Leave">Home Leave</option>
                  <option value="Medical Leave">Medical Leave</option>
                  <option value="Emergency Leave">Emergency Leave</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label
                  className="block text-sm font-medium text-slate-700"
                  htmlFor="fromDate"
                >
                  From Date
                </label>

                <input
                  id="fromDate"
                  type="date"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
                  value={form.fromDate}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      fromDate: event.target.value,
                    }))
                  }
                  required
                />
              </div>

              <div>
                <label
                  className="block text-sm font-medium text-slate-700"
                  htmlFor="toDate"
                >
                  To Date
                </label>

                <input
                  id="toDate"
                  type="date"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
                  value={form.toDate}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      toDate: event.target.value,
                    }))
                  }
                  required
                />
              </div>

              <div>
                <label
                  className="block text-sm font-medium text-slate-700"
                  htmlFor="reason"
                >
                  Reason
                </label>

                <textarea
                  id="reason"
                  rows={5}
                  placeholder="Enter the reason for your leave..."
                  className="mt-2 w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
                  value={form.reason}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      reason: event.target.value,
                    }))
                  }
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Leave Request'}
              </button>
            </form>
          </section>

          <StudentRequestList
            archivedKeys={archivedKeys}
            busyRequestId={busyRequestId}
            isActive={(request) => request.status === 'pending'}
            isArchivable={(request) => request.status !== 'pending'}
            isLoading={isLoading}
            onRefresh={() => void loadLeaveRequests()}
            onAction={handleRequestAction}
            records={leaveRequests}
            renderRecord={(request) => (
              <>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      {request.leaveType}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {request.fromDate} to {request.toDate}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Submitted{' '}
                      <time dateTime={request.createdAt.toDate().toISOString()}>
                        {request.createdAt.toDate().toLocaleDateString()}
                      </time>
                      {' · '}Updated{' '}
                      <time dateTime={request.updatedAt.toDate().toISOString()}>
                        {request.updatedAt.toDate().toLocaleDateString()}
                      </time>
                    </p>
                  </div>
                  <span
                    className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                      request.status
                    )}`}
                  >
                    {formatStatus(request.status)}
                  </span>
                </div>

                {detailsId === request.id ? (
                  <div className="mt-3">
                    <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {request.reason}
                    </p>
                    {request.adminRemarks ? (
                      <div className="mt-4 rounded-lg bg-slate-50 p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Administrator remarks
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                          {request.adminRemarks}
                        </p>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-700">
                    {request.reason}
                  </p>
                )}
                {request.reason.length > 120 || request.adminRemarks ? (
                  <button
                    aria-expanded={detailsId === request.id}
                    className="mt-3 text-sm font-medium text-slate-700 underline underline-offset-2"
                    onClick={() =>
                      setDetailsId((current) =>
                        current === request.id ? null : request.id
                      )
                    }
                    type="button"
                  >
                    {detailsId === request.id ? 'Hide details' : 'View details'}
                  </button>
                ) : null}
              </>
            )}
            requestType="leave"
            searchableText={(request) =>
              `${request.leaveType} ${request.reason} ${request.adminRemarks ?? ''}`
            }
            statuses={[
              { value: 'pending', label: 'Pending' },
              { value: 'approved', label: 'Approved' },
              { value: 'rejected', label: 'Rejected' },
              { value: 'cancelled', label: 'Cancelled' },
            ]}
            title="My Leave Requests"
          />
        </div>
      </section>
    </main>
  );
}