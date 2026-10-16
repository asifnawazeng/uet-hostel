import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';

import { auth, db } from '@/config/firebase';
import { findLinkedStudentRecord } from '@/features/students/services/linkedStudentService';
import type {
  UserProfileData,
  ProfileUpdateInput,
} from '@/features/profile/types/profile';

const USERS_COLLECTION = 'users';

function getDatabase() {
  if (!db) {
    throw new Error(
      'Profile storage is unavailable because Firebase is not configured.'
    );
  }

  return db;
}

/**
 * Get the profile of the currently logged-in user.
 *
 * Resolves both base user metadata from `users/{uid}` and any linked
 * student records from `students` where applicable.
 */
export async function getMyProfile(): Promise<UserProfileData> {
  if (!auth?.currentUser) {
    throw new Error('You must be logged in to view your profile.');
  }

  const database = getDatabase();
  const user = auth.currentUser;

  // 1. Fetch base user document from `users/{uid}`
  const userRef = doc(database, USERS_COLLECTION, user.uid);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.data();

  const role: 'student' | 'admin' =
    userData?.role === 'admin' ? 'admin' : 'student';

  const baseProfile: UserProfileData = {
    uid: user.uid,
    name:
      typeof userData?.name === 'string' && userData.name.trim()
        ? userData.name
        : user.displayName || user.email?.split('@')[0] || 'User',
    email: user.email ?? '',
    role,
    phone: typeof userData?.phone === 'string' ? userData.phone : '',
    photoURL: user.photoURL ?? userData?.photoURL ?? '',
    createdAt: userData?.createdAt ?? null,
    updatedAt: userData?.updatedAt ?? null,
  };

  // 2. If student, attempt to resolve academic and hostel records from `students` collection
  if (role === 'student') {
    try {
      const studentDoc = await findLinkedStudentRecord(
        database,
        user.uid,
        user.email
      );

      if (studentDoc) {
        const studentData = studentDoc.data();

        return {
          ...baseProfile,
          id: studentDoc.id,
          name: baseProfile.name || studentData.name || 'User',
          phone: baseProfile.phone || studentData.phone || '',
          studentId: studentData.studentId ?? '',
          department: studentData.department ?? '',
          semester: Number(studentData.semester) || undefined,
          gender: studentData.gender,
          hostel: studentData.hostel ?? '',
          room: studentData.room ?? '',
          status: studentData.status ?? 'active',
          createdAt: studentData.createdAt ?? baseProfile.createdAt,
          updatedAt: studentData.updatedAt ?? baseProfile.updatedAt,
        };
      }
    } catch {
      // If student collection read encounters permission restrictions, return base profile
    }
  }

  return baseProfile;
}

/**
 * Update permitted personal fields for the authenticated user.
 *
 * Users can update only their display name and phone number.
 * Protected attributes (role, uid, studentId, hostel, room) cannot be modified.
 */
export async function updateMyProfile(
  input: ProfileUpdateInput
): Promise<void> {
  if (!auth?.currentUser) {
    throw new Error('You must be logged in to update your profile.');
  }

  const database = getDatabase();
  const user = auth.currentUser;

  const name = input.name.trim();
  const phone = input.phone.trim();

  if (!name) {
    throw new Error('Please enter your full name.');
  }

  if (!phone) {
    throw new Error('Please enter your phone number.');
  }

  // 1. Update Firebase Auth display name if changed
  try {
    if (user.displayName !== name) {
      await updateProfile(user, { displayName: name });
    }
  } catch {
    // Non-fatal if auth profile update is restricted
  }

  // 2. Update user document `users/{uid}` in Firestore
  const userRef = doc(database, USERS_COLLECTION, user.uid);
  await setDoc(
    userRef,
    {
      name,
      phone,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  // 3. If the user is a student, also update their linked record in `students` collection
  try {
    const studentDoc = await findLinkedStudentRecord(
      database,
      user.uid,
      user.email
    );

    if (studentDoc) {
      await updateDoc(studentDoc.ref, {
        name,
        phone,
        updatedAt: serverTimestamp(),
      });
    }
  } catch {
    // Non-fatal: if rules only permit admin to modify the students collection,
    // the primary users/{uid} profile update has already succeeded.
  }
}

/** Upload and save the authenticated user's profile image. */
export async function uploadProfilePhoto(file: File): Promise<string> {
  if (!auth?.currentUser) {
    throw new Error('You must be logged in to change your profile image.');
  }

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error(
      'Profile image upload is not configured. Add the Cloudinary settings to .env.'
    );
  }

  if (!file.type.startsWith('image/')) {
    throw new Error('Please select an image file.');
  }

  const maxFileSize = 5 * 1024 * 1024;
  if (file.size > maxFileSize) {
    throw new Error('Profile images must be 5 MB or smaller.');
  }

  const user = auth.currentUser;
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);
  formData.append('folder', `profile-images/${user.uid}`);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`,
    { method: 'POST', body: formData }
  );

  const result = (await response.json()) as {
    secure_url?: string;
    error?: { message?: string };
  };

  if (!response.ok || !result.secure_url) {
    throw new Error(
      result.error?.message || 'Cloudinary could not upload the profile image.'
    );
  }

  const photoURL = result.secure_url;

  await updateProfile(user, { photoURL });

  if (db) {
    await setDoc(
      doc(db, USERS_COLLECTION, user.uid),
      { photoURL, updatedAt: serverTimestamp() },
      { merge: true }
    );
  }

  return photoURL;
}
