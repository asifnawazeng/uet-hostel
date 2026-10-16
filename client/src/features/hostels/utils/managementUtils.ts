import type { Timestamp } from 'firebase/firestore';

export const managementInputClass = 'w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-700 focus:ring-2 focus:ring-slate-200';
export const managementPrimaryButton = 'rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60';
export const managementSecondaryButton = 'rounded-md border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60';

export function managementErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return 'Unable to complete this request.';
  if (error.message.startsWith('Hostel ') || error.message.startsWith('Room ') || error.message.startsWith('Student ')) return error.message;
  if (error.message.includes('already exists') || error.message.includes('cannot') || error.message.includes('Cannot') || error.message.includes('full') || error.message.includes('inactive') || error.message.includes('assigned') || error.message.includes('capacity') || error.message.includes('number') || error.message.includes('gender') || error.message.includes('gender category') || error.message.includes('student record') || error.message.includes('Student’s') || error.message.includes('renamed')) return error.message;
  const code = 'code' in error && typeof error.code === 'string' ? error.code : '';
  if (code === 'permission-denied' || code === 'unauthenticated') return 'You do not have permission to manage hostels and rooms.';
  if (code === 'unavailable' || code === 'deadline-exceeded') return 'The service is temporarily unavailable. Check your connection and try again.';
  if (error.message.includes('Firebase is not configured')) return error.message;
  return 'Unable to complete this request. Please try again.';
}

export function formatManagementDate(timestamp: Timestamp): string {
  return timestamp.toDate().toLocaleString();
}