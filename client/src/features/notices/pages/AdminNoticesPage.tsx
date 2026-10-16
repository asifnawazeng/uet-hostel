import { useEffect, useState } from 'react';

import { useAuth } from '@/context/useAuth';
import {
  createNotice,
  deleteNotice,
  listNotices,
  updateNotice,
} from '@/features/notices/services/noticeService';
import type {
  Notice,
  NoticeInput,
  NoticePriority,
} from '@/features/notices/types/notice';

const emptyForm: NoticeInput = {
  title: '',
  content: '',
  priority: 'normal',
};

export function AdminNoticesPage({
  onNavigate,
}: {
  onNavigate: (path: string) => void;
}) {
  const { currentUser } = useAuth();

  const [notices, setNotices] = useState<Notice[]>([]);
  const [form, setForm] = useState<NoticeInput>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notificationWarning, setNotificationWarning] = useState<string | null>(null);

  async function loadNotices() {
    try {
      setIsLoading(true);
      setError(null);

      const records = await listNotices();
      setNotices(records);
    } catch (loadError: unknown) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load notices.'
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadNotices();
  }, []);

  function handleInputChange(
    field: keyof NoticeInput,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleEdit(notice: Notice) {
    setEditingId(notice.id);

    setForm({
      title: notice.title,
      content: notice.content,
      priority: notice.priority,
    });

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  function handleCancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!currentUser) {
      setError('Your account could not be identified.');
      return;
    }

    if (!form.title.trim() || !form.content.trim()) {
      setError('Please enter a title and notice content.');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      setNotificationWarning(null);

      if (editingId) {
        await updateNotice(editingId, form);
      } else {
        const result = await createNotice(currentUser.uid, form);
        setNotificationWarning(result.notificationWarning);
      }

      setForm(emptyForm);
      setEditingId(null);

      await loadNotices();
    } catch (saveError: unknown) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Unable to save the notice.'
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm(
      'Are you sure you want to delete this notice?'
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(id);
      setError(null);

      await deleteNotice(id);

      setNotices((current) =>
        current.filter((notice) => notice.id !== id)
      );

      if (editingId === id) {
        handleCancelEdit();
      }
    } catch (deleteError: unknown) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Unable to delete the notice.'
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div>
            <button
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              onClick={() => onNavigate('/admin')}
              type="button"
            >
              ← Back to dashboard
            </button>

            <h1 className="mt-1 text-2xl font-bold text-slate-950">
              Notices
            </h1>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-8">
        {error ? (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {notificationWarning ? (
          <div aria-live="polite" className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="status">
            {notificationWarning}
          </div>
        ) : null}

        <form
          className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
          onSubmit={handleSubmit}
        >
          <h2 className="text-lg font-bold text-slate-950">
            {editingId ? 'Edit Notice' : 'Create Notice'}
          </h2>

          <div className="mt-5 grid gap-5">
            <div>
              <label
                className="text-sm font-medium text-slate-700"
                htmlFor="notice-title"
              >
                Title
              </label>

              <input
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                id="notice-title"
                onChange={(event) =>
                  handleInputChange('title', event.target.value)
                }
                placeholder="Enter notice title"
                value={form.title}
              />
            </div>

            <div>
              <label
                className="text-sm font-medium text-slate-700"
                htmlFor="notice-priority"
              >
                Priority
              </label>

              <select
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
                id="notice-priority"
                onChange={(event) =>
                  handleInputChange(
                    'priority',
                    event.target.value as NoticePriority
                  )
                }
                value={form.priority}
              >
                <option value="normal">Normal</option>
                <option value="important">Important</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label
                className="text-sm font-medium text-slate-700"
                htmlFor="notice-content"
              >
                Notice content
              </label>

              <textarea
                className="mt-1.5 min-h-32 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                id="notice-content"
                onChange={(event) =>
                  handleInputChange('content', event.target.value)
                }
                placeholder="Write the notice..."
                value={form.content}
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
              disabled={isSaving}
              type="submit"
            >
              {isSaving
                ? 'Saving...'
                : editingId
                  ? 'Update Notice'
                  : 'Create Notice'}
            </button>

            {editingId ? (
              <button
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={handleCancelEdit}
                type="button"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>

        <section className="mt-8">
          <h2 className="text-lg font-bold text-slate-950">
            Published Notices
          </h2>

          {isLoading ? (
            <p className="py-10 text-center text-sm text-slate-600">
              Loading notices...
            </p>
          ) : notices.length === 0 ? (
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-8 text-center">
              <p className="font-medium text-slate-900">
                No notices yet.
              </p>

              <p className="mt-1 text-sm text-slate-600">
                Create the first notice above.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {notices.map((notice) => (
                <article
                  className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
                  key={notice.id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                        {notice.priority}
                      </span>

                      <h3 className="mt-3 text-lg font-bold text-slate-950">
                        {notice.title}
                      </h3>
                    </div>

                    <div className="flex gap-2">
                      <button
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        onClick={() => handleEdit(notice)}
                        type="button"
                      >
                        Edit
                      </button>

                      <button
                        className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                        disabled={deletingId === notice.id}
                        onClick={() => void handleDelete(notice.id)}
                        type="button"
                      >
                        {deletingId === notice.id
                          ? 'Deleting...'
                          : 'Delete'}
                      </button>
                    </div>
                  </div>

                  <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {notice.content}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}