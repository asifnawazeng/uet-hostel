import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';

import { AdminSidebar } from '@/components/AdminSidebar';
import { StudentSidebar } from '@/components/StudentSidebar';
import { useAuth } from '@/context/useAuth';
import {
  getMyProfile,
  uploadProfilePhoto,
  updateMyProfile,
} from '@/features/profile/services/profileService';
import type { UserProfileData } from '@/features/profile/types/profile';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function StudentProfilePage({
  onNavigate,
}: {
  onNavigate: (path: string) => void;
}) {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [validationErrors, setValidationErrors] = useState<{
    name?: string;
    phone?: string;
  }>({});
  const photoInputRef = useRef<HTMLInputElement>(null);

  async function loadProfile() {
    setIsLoading(true);
    setError('');

    try {
      const userProfile = await getMyProfile();
      setProfile(userProfile);
      setName(userProfile.name);
      setPhone(userProfile.phone || '');
    } catch (profileError) {
      setError(
        profileError instanceof Error
          ? profileError.message
          : 'Failed to load your profile.'
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadProfile();
  }, []);

  function handleCancelEdit() {
    if (profile) {
      setName(profile.name);
      setPhone(profile.phone || '');
    }
    setValidationErrors({});
    setError('');
    setIsEditing(false);
  }

  function validateForm(): boolean {
    const errors: { name?: string; phone?: string } = {};

    if (!name.trim()) {
      errors.name = 'Full name is required.';
    } else if (name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters.';
    }

    if (phone.trim() && !/^[0-9+\-\s()]{7,20}$/.test(phone.trim())) {
      errors.phone = 'Please enter a valid phone number format.';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      await updateMyProfile({
        name: name.trim(),
        phone: phone.trim(),
      });

      setProfile((currentProfile) =>
        currentProfile
          ? {
              ...currentProfile,
              name: name.trim(),
              phone: phone.trim(),
            }
          : currentProfile
      );

      setSuccess('Your profile details have been saved successfully.');
      setIsEditing(false);
    } catch (profileError) {
      setError(
        profileError instanceof Error
          ? profileError.message
          : 'Failed to update your profile. Please try again.'
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setIsUploadingPhoto(true);
    setError('');
    setSuccess('');

    try {
      const photoURL = await uploadProfilePhoto(file);
      setProfile((currentProfile) =>
        currentProfile ? { ...currentProfile, photoURL } : currentProfile
      );
      setSuccess('Your profile image has been updated successfully.');
    } catch (photoError) {
      setError(
        photoError instanceof Error
          ? photoError.message
          : 'Failed to update your profile image.'
      );
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  const roleLabel = isAdmin ? 'Hostel Administrator' : 'Student';
  const initials = getInitials(profile?.name || currentUser?.name || 'User');

  return (
    <main className="min-h-screen bg-slate-100">
      {isAdmin ? (
        <AdminSidebar
          currentPath="/admin/profile"
          onNavigate={onNavigate}
        />
      ) : (
        <StudentSidebar
          currentPath="/student/profile"
          onNavigate={onNavigate}
        />
      )}

      <div className="min-h-screen lg:pl-64">
        {/* Sticky Top Header */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex h-16 items-center justify-between px-6 lg:px-8">
            <div className="pl-16 lg:pl-0">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {isAdmin ? 'Administration' : 'Student Portal'}
              </p>
              <h1 className="text-lg font-bold text-slate-950">
                Profile Management
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <button
                className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                onClick={() => onNavigate(isAdmin ? '/admin' : '/student')}
                type="button"
              >
                ← Back to dashboard
              </button>
            </div>
          </div>
        </header>

        <section className="px-6 py-8 lg:px-8">
          <div className="mx-auto max-w-5xl space-y-6">
            {/* Notification Messages */}
            {error ? (
              <div
                className="flex items-start justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-sm"
                role="alert"
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Error:</span>
                  <span>{error}</span>
                </div>
                <button
                  className="text-red-600 hover:text-red-900"
                  onClick={() => setError('')}
                  type="button"
                >
                  ✕
                </button>
              </div>
            ) : null}

            {success ? (
              <div
                className="flex items-start justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 shadow-sm"
                role="status"
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Success:</span>
                  <span>{success}</span>
                </div>
                <button
                  className="text-emerald-600 hover:text-emerald-900"
                  onClick={() => setSuccess('')}
                  type="button"
                >
                  ✕
                </button>
              </div>
            ) : null}

            {/* Profile Hero Banner */}
            <div className="rounded-2xl bg-slate-950 p-6 text-white shadow-sm sm:p-8">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                  {/* Circular Avatar */}
                  <div className="relative">
                    <div className="flex h-20 w-20 shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-slate-800 text-2xl font-bold tracking-wider text-white ring-4 ring-white/10 sm:h-24 sm:w-24 sm:text-3xl">
                      {profile?.photoURL ? (
                        <img
                          alt={profile.name}
                          className="h-full w-full object-cover"
                          src={profile.photoURL}
                        />
                      ) : (
                        <span>{initials}</span>
                      )}
                    </div>
                    <input
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoChange}
                      ref={photoInputRef}
                      type="file"
                    />
                    <button
                      aria-label="Change profile image"
                      className="absolute bottom-0 right-0 rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isUploadingPhoto || isLoading}
                      onClick={() => photoInputRef.current?.click()}
                      type="button"
                    >
                      {isUploadingPhoto ? '...' : 'Edit'}
                    </button>
                  </div>

                  {/* Profile Identity Details */}
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="text-2xl font-bold sm:text-3xl">
                        {isLoading
                          ? 'Loading...'
                          : profile?.name || currentUser?.name || 'User'}
                      </h2>
                      <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200 ring-1 ring-slate-700">
                        {roleLabel}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-slate-300">
                      {profile?.email || currentUser?.email}
                    </p>

                    {profile?.department || profile?.hostel ? (
                      <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                        {profile?.department ? (
                          <span>{profile.department}</span>
                        ) : null}
                        {profile?.department && profile?.hostel ? (
                          <span aria-hidden="true">·</span>
                        ) : null}
                        {profile?.hostel ? (
                          <span>
                            Hostel: {profile.hostel}
                            {profile.room ? `, Room ${profile.room}` : ''}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Edit Toggle / Action Status */}
                <div className="flex shrink-0 items-center gap-2">
                  {!isEditing ? (
                    <button
                      className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-slate-100"
                      disabled={isLoading}
                      onClick={() => {
                        setSuccess('');
                        setError('');
                        setIsEditing(true);
                      }}
                      type="button"
                    >
                      <span>✏️</span>
                      <span>Edit Profile</span>
                    </button>
                  ) : (
                    <span className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 ring-1 ring-slate-700">
                      Editing Mode Active
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Profile Loading Skeleton */}
            {isLoading ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <div className="space-y-4">
                  <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="h-12 animate-pulse rounded-lg bg-slate-100" />
                    <div className="h-12 animate-pulse rounded-lg bg-slate-100" />
                    <div className="h-12 animate-pulse rounded-lg bg-slate-100" />
                    <div className="h-12 animate-pulse rounded-lg bg-slate-100" />
                  </div>
                </div>
              </div>
            ) : (
              <form className="space-y-6" onSubmit={handleSubmit}>
                {/* 1. Personal Information */}
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
                  <div className="mb-6 border-b border-slate-100 pb-4">
                    <h3 className="text-base font-bold text-slate-900">
                      Personal Information
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Update your display name and contact phone number.
                    </p>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2">
                    {/* Name */}
                    <div>
                      <label
                        className="block text-sm font-medium text-slate-700"
                        htmlFor="profile-name"
                      >
                        Full Name <span className="text-red-500">*</span>
                      </label>

                      {isEditing ? (
                        <>
                          <input
                            className={`mt-2 w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:ring-2 ${
                              validationErrors.name
                                ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                                : 'border-slate-300 focus:border-slate-900 focus:ring-slate-100'
                            }`}
                            id="profile-name"
                            onChange={(e) => {
                              setName(e.target.value);
                              if (validationErrors.name) {
                                setValidationErrors((prev) => ({
                                  ...prev,
                                  name: undefined,
                                }));
                              }
                            }}
                            placeholder="Enter your full name"
                            required
                            type="text"
                            value={name}
                          />
                          {validationErrors.name ? (
                            <p className="mt-1.5 text-xs text-red-600">
                              {validationErrors.name}
                            </p>
                          ) : null}
                        </>
                      ) : (
                        <p className="mt-2 rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-900 ring-1 ring-slate-200">
                          {profile?.name || 'Not provided'}
                        </p>
                      )}
                    </div>

                    {/* Email (Read-Only) */}
                    <div>
                      <label
                        className="block text-sm font-medium text-slate-700"
                        htmlFor="profile-email"
                      >
                        Email Address
                      </label>
                      <div className="mt-2 flex items-center justify-between rounded-xl bg-slate-100 px-3.5 py-2.5 ring-1 ring-slate-200">
                        <span className="text-sm font-medium text-slate-700">
                          {profile?.email || currentUser?.email || 'N/A'}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-400">
                          Primary Email
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs text-slate-400">
                        University authentication email cannot be modified.
                      </p>
                    </div>

                    {/* Phone */}
                    <div>
                      <label
                        className="block text-sm font-medium text-slate-700"
                        htmlFor="profile-phone"
                      >
                        Contact Phone
                      </label>

                      {isEditing ? (
                        <>
                          <input
                            className={`mt-2 w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:ring-2 ${
                              validationErrors.phone
                                ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                                : 'border-slate-300 focus:border-slate-900 focus:ring-slate-100'
                            }`}
                            id="profile-phone"
                            onChange={(e) => {
                              setPhone(e.target.value);
                              if (validationErrors.phone) {
                                setValidationErrors((prev) => ({
                                  ...prev,
                                  phone: undefined,
                                }));
                              }
                            }}
                            placeholder="e.g. +92 300 1234567"
                            type="tel"
                            value={phone}
                          />
                          {validationErrors.phone ? (
                            <p className="mt-1.5 text-xs text-red-600">
                              {validationErrors.phone}
                            </p>
                          ) : null}
                        </>
                      ) : (
                        <p className="mt-2 rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-900 ring-1 ring-slate-200">
                          {profile?.phone || 'Not provided'}
                        </p>
                      )}
                      <p className="mt-1.5 text-xs text-slate-400">
                        Used for urgent hostel notices and warden communication.
                      </p>
                    </div>

                    {/* Gender */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700">
                        Gender Category
                      </label>
                      <p className="mt-2 rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-900 ring-1 ring-slate-200">
                        {profile?.gender || (isAdmin ? 'Administrative Staff' : 'Not specified')}
                      </p>
                      <p className="mt-1.5 text-xs text-slate-400">
                        Determines dormitory wing eligibility.
                      </p>
                    </div>
                  </div>
                </section>

                {/* 2. Academic Information (Only for Students) */}
                {!isAdmin && (
                  <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
                    <div className="mb-6 border-b border-slate-100 pb-4">
                      <h3 className="text-base font-bold text-slate-900">
                        Academic Information
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Official university student registration and faculty records.
                      </p>
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                      {/* Student ID */}
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Student ID / Roll No.
                        </label>
                        <p className="mt-2 rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm font-bold text-slate-900 ring-1 ring-slate-200">
                          {profile?.studentId || 'Not assigned'}
                        </p>
                      </div>

                      {/* Department */}
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Department
                        </label>
                        <p className="mt-2 rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-900 ring-1 ring-slate-200">
                          {profile?.department || 'Not registered'}
                        </p>
                      </div>

                      {/* Semester */}
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Current Semester
                        </label>
                        <p className="mt-2 rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-900 ring-1 ring-slate-200">
                          {profile?.semester ? `Semester ${profile.semester}` : 'N/A'}
                        </p>
                      </div>

                      {/* Status */}
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Enrolment Status
                        </label>
                        <p className="mt-2 flex items-center gap-2 rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-900 ring-1 ring-slate-200">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          <span className="capitalize">
                            {profile?.status || 'Active'}
                          </span>
                        </p>
                      </div>
                    </div>
                  </section>
                )}

                {/* 3. Hostel Information */}
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
                  <div className="mb-6 border-b border-slate-100 pb-4">
                    <h3 className="text-base font-bold text-slate-900">
                      Hostel & Residence Details
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {isAdmin
                        ? 'Administrative facility privileges and oversight level.'
                        : 'Official campus dormitory and bed allocation.'}
                    </p>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2">
                    {isAdmin ? (
                      <>
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Management Authority
                          </label>
                          <p className="mt-2 rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-900 ring-1 ring-slate-200">
                            Campus-wide Hostel Management
                          </p>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                            System Permissions
                          </label>
                          <p className="mt-2 rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-900 ring-1 ring-slate-200">
                            Full Administrator Access
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Assigned Hostel
                          </label>
                          <p className="mt-2 rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm font-bold text-slate-900 ring-1 ring-slate-200">
                            {profile?.hostel || 'Not allocated yet'}
                          </p>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Room Number
                          </label>
                          <p className="mt-2 rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm font-bold text-slate-900 ring-1 ring-slate-200">
                            {profile?.room ? `Room ${profile.room}` : 'Not allocated yet'}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </section>

                {/* 4. Account Security & Verification */}
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
                  <div className="mb-6 border-b border-slate-100 pb-4">
                    <h3 className="text-base font-bold text-slate-900">
                      Account & Security Identifiers
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      System identification and security credentials.
                    </p>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Account Role
                      </label>
                      <div className="mt-2 flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2.5 ring-1 ring-slate-200">
                        <span className="text-sm font-semibold capitalize text-slate-900">
                          {roleLabel}
                        </span>
                        <span className="text-xs text-slate-400">
                          Protected System Role
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                        System Account UID
                      </label>
                      <div className="mt-2 flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2.5 font-mono text-xs text-slate-700 ring-1 ring-slate-200">
                        <span className="truncate">{profile?.uid || currentUser?.uid}</span>
                        <span className="ml-2 shrink-0 text-[11px] font-sans text-slate-400">
                          Verified
                        </span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Edit Action Bar */}
                {isEditing ? (
                  <div className="flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <button
                      className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                      disabled={isSaving}
                      onClick={handleCancelEdit}
                      type="button"
                    >
                      Cancel
                    </button>

                    <button
                      className="rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isSaving}
                      type="submit"
                    >
                      {isSaving ? 'Saving Changes...' : 'Save Changes'}
                    </button>
                  </div>
                ) : null}
              </form>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
