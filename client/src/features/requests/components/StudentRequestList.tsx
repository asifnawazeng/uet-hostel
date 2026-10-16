import { useEffect, useState, type ReactNode } from 'react';

import type {
  StudentRequestType,
} from '@/features/requests/services/studentRequestService';

export type StudentRequestView = 'active' | 'history' | 'archived';
type StudentRequestListAction<T extends StudentRequestType> =
  T extends 'complaint'
    ? 'withdraw' | 'archive' | 'restore'
    : 'cancel' | 'archive' | 'restore';

interface RequestRecord {
  id: string;
  status: string;
}

interface StudentRequestListProps<
  T extends RequestRecord,
  RequestType extends StudentRequestType
> {
  title: string;
  requestType: RequestType;
  records: T[];
  statuses: { value: T['status']; label: string }[];
  archivedKeys: Set<string>;
  busyRequestId: string | null;
  isLoading: boolean;
  onRefresh?: () => void;
  isActive: (record: T) => boolean;
  isArchivable: (record: T) => boolean;
  searchableText: (record: T) => string;
  renderRecord: (record: T) => ReactNode;
  onAction: (
    record: T,
    action: StudentRequestListAction<RequestType>
  ) => Promise<void>;
}

const PAGE_SIZE = 10;

export function StudentRequestList<
  T extends RequestRecord,
  RequestType extends StudentRequestType
>({
  title,
  requestType,
  records,
  statuses,
  archivedKeys,
  busyRequestId,
  isLoading,
  onRefresh,
  isActive,
  isArchivable,
  searchableText,
  renderRecord,
  onAction,
}: StudentRequestListProps<T, RequestType>) {
  const [view, setView] = useState<StudentRequestView>('active');
  const [statusFilter, setStatusFilter] = useState<T['status'] | 'all'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  function archiveKey(record: T) {
    return `${requestType}:${record.id}`;
  }

  const viewRecords = records.filter((record) => {
    const isArchived = archivedKeys.has(archiveKey(record));
    if (view === 'active') return isActive(record) && !isArchived;
    if (view === 'history') return !isActive(record) && !isArchived;
    return isArchived;
  });

  const normalizedSearch = search.trim().toLocaleLowerCase();
  const filteredRecords = viewRecords.filter((record) => {
    const matchesStatus =
      statusFilter === 'all' || record.status === statusFilter;
    const matchesSearch =
      !normalizedSearch ||
      searchableText(record).toLocaleLowerCase().includes(normalizedSearch);

    return matchesStatus && matchesSearch;
  });

  const pageCount = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const visibleRecords = filteredRecords.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  useEffect(() => {
    setPage((currentPage) => Math.min(currentPage, pageCount));
  }, [pageCount]);

  function changeView(nextView: StudentRequestView) {
    setView(nextView);
    setStatusFilter('all');
    setPage(1);
  }

  function changeSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function changeStatus(value: T['status'] | 'all') {
    setStatusFilter(value);
    setPage(1);
  }

  async function handleAction(
    record: T,
    action: StudentRequestListAction<RequestType>
  ) {
    if (action === 'withdraw' &&
      !window.confirm(
        'Withdraw this pending complaint? It will remain in your history.'
      )) {
      return;
    }

    if (action === 'cancel' &&
      !window.confirm(
        'Cancel this pending leave request? It will remain in your history.'
      )) {
      return;
    }

    await onAction(record, action);
  }

  const activeCount = records.filter(
    (record) => isActive(record) && !archivedKeys.has(archiveKey(record))
  ).length;
  const historyCount = records.filter(
    (record) => !isActive(record) && !archivedKeys.has(archiveKey(record))
  ).length;
  const archivedCount = records.filter((record) =>
    archivedKeys.has(archiveKey(record))
  ).length;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {records.length} total request{records.length === 1 ? '' : 's'}
          </p>
        </div>

        <div aria-label={`${title} views`} className="flex flex-wrap gap-2" role="group">
          <ViewButton
            count={activeCount}
            isSelected={view === 'active'}
            label="Active"
            onClick={() => changeView('active')}
          />
          <ViewButton
            count={historyCount}
            isSelected={view === 'history'}
            label="History"
            onClick={() => changeView('history')}
          />
          <ViewButton
            count={archivedCount}
            isSelected={view === 'archived'}
            label="Archived"
            onClick={() => changeView('archived')}
          />
        </div>

        {onRefresh ? (
          <button
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading}
            onClick={onRefresh}
            type="button"
          >
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
        ) : null}
      </div>

      <div className="mt-5 flex flex-wrap gap-2" aria-label="Request counts">
        {statuses.map((status) => (
          <span
            className="rounded-md bg-slate-100 px-2.5 py-1.5 text-xs text-slate-600"
            key={status.value}
          >
            {status.label}:{' '}
            {records.filter((record) => record.status === status.value).length}
          </span>
        ))}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
        <div>
          <label
            className="mb-1 block text-sm font-medium text-slate-700"
            htmlFor={`${requestType}-search`}
          >
            Search
          </label>
          <input
            autoComplete="off"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            id={`${requestType}-search`}
            onChange={(event) => changeSearch(event.target.value)}
            placeholder={
              requestType === 'complaint'
                ? 'Subject, category, or description'
                : 'Leave type, reason, or remarks'
            }
            type="search"
            value={search}
          />
        </div>

        <div>
          <label
            className="mb-1 block text-sm font-medium text-slate-700"
            htmlFor={`${requestType}-status-filter`}
          >
            Filter by status
          </label>
          <select
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            id={`${requestType}-status-filter`}
            onChange={(event) =>
              changeStatus(event.target.value as T['status'] | 'all')
            }
            value={statusFilter}
          >
            <option value="all">All statuses</option>
            {statuses.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <p aria-live="polite" className="mt-8 rounded-lg bg-slate-50 p-6 text-center text-sm text-slate-500" role="status">
          Loading {title.toLocaleLowerCase()}...
        </p>
      ) : filteredRecords.length === 0 ? (
        <div aria-live="polite" className="mt-8 rounded-lg bg-slate-50 p-8 text-center" role="status">
          <p className="font-medium text-slate-700">
            {view === 'active'
              ? `No active ${title.toLocaleLowerCase()} match these filters.`
              : view === 'history'
                ? `No history ${title.toLocaleLowerCase()} match these filters.`
                : `No archived ${title.toLocaleLowerCase()} match these filters.`}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Adjust your search or status filter to see other requests.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 space-y-4" aria-live="polite">
            {visibleRecords.map((record) => {
              const isUpdating = busyRequestId === record.id;
              const hasActionInProgress = busyRequestId !== null;

              return (
                <article
                  className="rounded-lg border border-slate-200 p-4 sm:p-5"
                  key={record.id}
                >
                  {renderRecord(record)}

                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                    {view === 'active' && record.status === 'pending' ? (
                      <button
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={hasActionInProgress}
                        onClick={() =>
                          void handleAction(
                            record,
                            (requestType === 'complaint'
                              ? 'withdraw'
                              : 'cancel') as StudentRequestListAction<RequestType>
                          )
                        }
                        type="button"
                      >
                        {isUpdating
                          ? 'Updating...'
                          : requestType === 'complaint'
                            ? 'Withdraw complaint'
                            : 'Cancel request'}
                      </button>
                    ) : null}

                    {view === 'history' && isArchivable(record) ? (
                      <button
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={hasActionInProgress}
                        onClick={() => void handleAction(record, 'archive')}
                        type="button"
                      >
                        {isUpdating ? 'Updating...' : 'Archive'}
                      </button>
                    ) : null}

                    {view === 'archived' ? (
                      <button
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={hasActionInProgress}
                        onClick={() => void handleAction(record, 'restore')}
                        type="button"
                      >
                        {isUpdating ? 'Updating...' : 'Restore to history'}
                      </button>
                    ) : null}

                    {requestType === 'leave' && record.status === 'approved' ? (
                      <p className="text-sm text-slate-500">
                        Approved leave cannot be cancelled here. Contact the hostel administrator.
                      </p>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
            <p aria-live="polite" className="text-sm text-slate-500">
              Showing {(page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, filteredRecords.length)} of{' '}
              {filteredRecords.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={page <= 1}
                onClick={() => setPage((currentPage) => currentPage - 1)}
                type="button"
              >
                Previous
              </button>
              <span className="min-w-20 text-center text-sm text-slate-600">
                Page {page} of {pageCount}
              </span>
              <button
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={page >= pageCount}
                onClick={() => setPage((currentPage) => currentPage + 1)}
                type="button"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function ViewButton({
  count,
  isSelected,
  label,
  onClick,
}: {
  count: number;
  isSelected: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={isSelected}
      className={`rounded-md border px-3 py-2 text-sm font-medium ${
        isSelected
          ? 'border-slate-900 bg-slate-900 text-white'
          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
      }`}
      onClick={onClick}
      type="button"
    >
      {label} <span className="ml-1 opacity-75">{count}</span>
    </button>
  );
}