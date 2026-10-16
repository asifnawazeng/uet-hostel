import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';

import { db } from '@/config/firebase';
import type {
  MenuItem,
  MenuItemInput,
} from '@/features/mess/types/menu';

const MENU_COLLECTION = 'menuItems';
const MENU_LIST_LIMIT = 500;
const MAX_MENU_IMAGE_SIZE = 5 * 1024 * 1024;

export async function uploadMenuImage(
  file: File,
  userId: string
): Promise<string> {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error(
      'Menu image upload is not configured. Add the Cloudinary settings to .env.'
    );
  }

  if (!file.type.startsWith('image/')) {
    throw new Error('Please select an image file.');
  }

  if (file.size > MAX_MENU_IMAGE_SIZE) {
    throw new Error('Menu images must be 5 MB or smaller.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);
  formData.append('folder', `mess-menu/${userId}`);

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
      result.error?.message || 'Cloudinary could not upload the menu image.'
    );
  }

  return result.secure_url;
}

export async function createMenuItem(
  createdBy: string,
  input: MenuItemInput
): Promise<string> {
  const database = getDatabase();

  const menuItemData = {
    day: input.day,
    mealPeriod: input.mealPeriod,
    name: input.name.trim(),
    description: input.description?.trim() || '',
    imageUrl: input.imageUrl?.trim() || '',
    isAvailable: input.isAvailable,
    createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const created = await addDoc(
    collection(database, MENU_COLLECTION),
    menuItemData
  );

  return created.id;
}

export async function listMenuItems(): Promise<MenuItem[]> {
  const database = getDatabase();

  const snapshot = await getDocs(
    query(
      collection(database, MENU_COLLECTION),
      orderBy('day'),
      limit(MENU_LIST_LIMIT)
    )
  );

  return snapshot.docs.map((menuDocument) => ({
    ...menuDocument.data(),
    id: menuDocument.id,
  })) as MenuItem[];
}

export async function updateMenuItem(
  id: string,
  input: MenuItemInput
): Promise<void> {
  const database = getDatabase();

  await updateDoc(
    doc(database, MENU_COLLECTION, id),
    {
      day: input.day,
      mealPeriod: input.mealPeriod,
      name: input.name.trim(),
      description: input.description?.trim() || '',
      imageUrl: input.imageUrl?.trim() || '',
      isAvailable: input.isAvailable,
      updatedAt: serverTimestamp(),
    }
  );
}

export async function deleteMenuItem(id: string): Promise<void> {
  const database = getDatabase();

  await deleteDoc(
    doc(database, MENU_COLLECTION, id)
  );
}

function getDatabase() {
  if (!db) {
    throw new Error(
      'Mess menu is not available because Firebase is not configured.'
    );
  }

  return db;
}
