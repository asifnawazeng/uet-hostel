import type { Timestamp } from 'firebase/firestore';

export type MealPeriod = 'breakfast' | 'lunch' | 'dinner';

export type MenuDay =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export interface MenuItem {
  id: string;
  day: MenuDay;
  mealPeriod: MealPeriod;
  name: string;
  description?: string;
  imageUrl?: string;
  isAvailable: boolean;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type MenuItemInput = {
  day: MenuDay;
  mealPeriod: MealPeriod;
  name: string;
  description?: string;
  imageUrl?: string;
  isAvailable: boolean;
};

