import { useEffect, useState } from 'react';

import { listNotices } from '@/features/notices/services/noticeService';
import type { Notice } from '@/features/notices/types/notice';

export function StudentNoticesPage({
  onNavigate,
}: {
  onNavigate: (path: string) => void;
}) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadNotices() {
      try {
        setIsLoading(true);
        setError(null);

        const records = await listNotices();

        if (active) {
          setNotices(records);
        }
      } catch (loadError: unknown) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Unable to load notices.'
          );
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadNotices();

    return () => {
      active = false;
    };
  }, []);

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
            Notices
          </h1>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-8">
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <p className="py-12 text-center text-sm text-slate-600">
            Loading notices...
          </p>
        ) : null}

        {!isLoading && !error && notices.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
            <h2 className="font-semibold text-slate-900">
              No notices available.
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              New hostel notices will appear here.
            </p>
          </div>
        ) : null}

        {!isLoading && !error && notices.length > 0 ? (
          <div className="space-y-5">
            {notices.map((notice) => (
              <article
                className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
                key={notice.id}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <h2 className="text-xl font-bold text-slate-950">
                    {notice.title}
                  </h2>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium capitalize text-slate-700">
                    {notice.priority}
                  </span>
                </div>

                <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                  {notice.content}
                </p>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}