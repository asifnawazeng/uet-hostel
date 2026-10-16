export const inputClass = 'w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-700 focus:ring-2 focus:ring-slate-200';
export const primaryButton = 'rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60';

export function getStudentErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return 'Unable to complete the student record request.';
  if (error.message.includes('already exists') || error.message.includes('room assignment') || error.message.includes('Remove this student')) return error.message;
  const code = 'code' in error && typeof error.code === 'string' ? error.code : '';
  if (code === 'permission-denied' || code === 'unauthenticated') return 'You do not have permission to access student records.';
  if (code === 'unavailable' || code === 'deadline-exceeded') return 'Student records are temporarily unavailable. Check your connection and try again.';
  if (error.message.includes('Firebase is not configured')) return error.message;
  return 'Unable to complete the student record request. Please try again.';
}