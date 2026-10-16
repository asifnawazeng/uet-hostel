import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/context/useAuth';
import {
  createMenuItem,
  deleteMenuItem,
  listMenuItems,
  updateMenuItem,
  uploadMenuImage,
} from '@/features/mess/services/menuService';
import type {
  MealPeriod,
  MenuDay,
  MenuItem,
  MenuItemInput,
} from '@/features/mess/types/menu';

const DAYS: { value: MenuDay; label: string }[] = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
];

const MEAL_PERIODS: { value: MealPeriod; label: string }[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
];

const EMPTY_FORM: MenuItemInput = {
  day: 'monday',
  mealPeriod: 'breakfast',
  name: '',
  description: '',
  imageUrl: '',
  isAvailable: true,
};

export function AdminMessPage({
  onNavigate,
}: {
  onNavigate: (path: string) => void;
}) {
  const { currentUser } = useAuth();

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [form, setForm] = useState<MenuItemInput>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [selectedDay, setSelectedDay] = useState<MenuDay | 'all'>('all');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const [imagePreviewError, setImagePreviewError] = useState(false);

  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadMenuItems();
  }, []);

  async function loadMenuItems() {
    try {
      setIsLoading(true);
      setError(null);

      const items = await listMenuItems();
      setMenuItems(items);
    } catch (loadError: unknown) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load menu items.'
      );
    } finally {
      setIsLoading(false);
    }
  }

  function updateForm<K extends keyof MenuItemInput>(
    field: K,
    value: MenuItemInput[K]
  ) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));

    if (field === 'imageUrl') {
      setImagePreviewError(false);
    }
  }

  async function handleImageUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const fileInput = event.currentTarget;
    const file = fileInput.files?.[0];

    if (!file) {
      return;
    }

    if (!currentUser) {
      setError('You must be logged in as an administrator.');
      fileInput.value = '';
      return;
    }

    try {
      setIsUploadingImage(true);
      setError(null);
      setSuccess(null);

      const imageUrl = await uploadMenuImage(file, currentUser.uid);
      updateForm('imageUrl', imageUrl);
      setSuccess('Image uploaded. Save the menu item to apply it.');
    } catch (uploadError: unknown) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : 'Unable to upload menu image.'
      );
    } finally {
      setIsUploadingImage(false);
      fileInput.value = '';
    }
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setImagePreviewError(false);
  }

  function handleEdit(item: MenuItem) {
    setEditingId(item.id);

    setForm({
      day: item.day,
      mealPeriod: item.mealPeriod,
      name: item.name,
      description: item.description ?? '',
      imageUrl: item.imageUrl ?? '',
      isAvailable: item.isAvailable,
    });

    setImagePreviewError(false);
    setSuccess(null);
    setError(null);
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!currentUser) {
      setError('You must be logged in as an administrator.');
      return;
    }

    if (!form.name.trim()) {
      setError('Please enter a food name.');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);

      if (editingId) {
        await updateMenuItem(editingId, form);
        setSuccess('Menu item updated successfully.');
      } else {
        await createMenuItem(currentUser.uid, form);
        setSuccess('Menu item added successfully.');
      }

      resetForm();
      await loadMenuItems();
    } catch (saveError: unknown) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Unable to save menu item.'
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm(
      'Are you sure you want to delete this menu item?'
    );

    if (!confirmed) {
      return;
    }

    try {
      setError(null);
      setSuccess(null);

      await deleteMenuItem(id);

      if (editingId === id) {
        resetForm();
      }

      setSuccess('Menu item deleted successfully.');
      await loadMenuItems();
    } catch (deleteError: unknown) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Unable to delete menu item.'
      );
    }
  }

  function formatDay(day: MenuDay) {
    return DAYS.find((item) => item.value === day)?.label ?? day;
  }

  function formatMealPeriod(mealPeriod: MealPeriod) {
    return (
      MEAL_PERIODS.find((item) => item.value === mealPeriod)?.label ??
      mealPeriod
    );
  }

  const groupedMenu = useMemo(() => {
    const daysToShow =
      selectedDay === 'all'
        ? DAYS
        : DAYS.filter((day) => day.value === selectedDay);

    return daysToShow.map((day) => ({
      ...day,
      meals: MEAL_PERIODS.map((meal) => ({
        ...meal,
        items: menuItems.filter(
          (item) =>
            item.day === day.value &&
            item.mealPeriod === meal.value
        ),
      })),
    }));
  }, [menuItems, selectedDay]);

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <button
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              onClick={() => onNavigate('/admin')}
              type="button"
            >
              ← Back to dashboard
            </button>

          <h1 className="mt-1 text-2xl font-bold text-slate-950">
            Mess Menu
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage the weekly hostel mess menu.
          </p>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-8">
        {success ? (
          <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        ) : null}

        {error ? (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
          {/* Add / Edit Form */}
          <form
            className="h-fit space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
            onSubmit={(event) => void handleSubmit(event)}
          >
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                {editingId ? 'Edit Menu Item' : 'Add Menu Item'}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Add food for a specific day and meal.
              </p>
            </div>

            <div>
              <label
                className="mb-2 block text-sm font-medium text-slate-700"
                htmlFor="day"
              >
                Day
              </label>

              <select
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
                id="day"
                onChange={(event) =>
                  updateForm('day', event.target.value as MenuDay)
                }
                value={form.day}
              >
                {DAYS.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                className="mb-2 block text-sm font-medium text-slate-700"
                htmlFor="mealPeriod"
              >
                Meal
              </label>

              <select
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
                id="mealPeriod"
                onChange={(event) =>
                  updateForm(
                    'mealPeriod',
                    event.target.value as MealPeriod
                  )
                }
                value={form.mealPeriod}
              >
                {MEAL_PERIODS.map((meal) => (
                  <option key={meal.value} value={meal.value}>
                    {meal.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                className="mb-2 block text-sm font-medium text-slate-700"
                htmlFor="name"
              >
                Food Name
              </label>

              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                id="name"
                onChange={(event) =>
                  updateForm('name', event.target.value)
                }
                placeholder="e.g. Chicken Biryani"
                value={form.name}
              />
            </div>

            <div>
              <label
                className="mb-2 block text-sm font-medium text-slate-700"
                htmlFor="description"
              >
                Description
              </label>

              <textarea
                className="min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                id="description"
                onChange={(event) =>
                  updateForm('description', event.target.value)
                }
                placeholder="Optional description"
                value={form.description}
              />
            </div>

            {/* Image URL */}
            <div>
              <label
                className="mb-2 block text-sm font-medium text-slate-700"
                htmlFor="imageUrl"
              >
                Food Image URL
              </label>

              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                id="imageUrl"
                onChange={(event) =>
                  updateForm('imageUrl', event.target.value)
                }
                placeholder="Paste food image URL"
                type="url"
                value={form.imageUrl}
              />

              <label
                className="mt-3 block text-sm font-medium text-slate-700"
                htmlFor="imageFile"
              >
                Or upload an image to Cloudinary
              </label>

              <input
                accept="image/*"
                className="mt-1 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200 disabled:opacity-60"
                disabled={isUploadingImage || isSaving}
                id="imageFile"
                onChange={(event) => void handleImageUpload(event)}
                type="file"
              />

              <p className="mt-1 text-xs text-slate-500">
                Select an image up to 5 MB. Uploading fills the URL above;
                save the menu item to apply it.
              </p>

              {isUploadingImage ? (
                <p className="mt-2 text-sm text-slate-500">
                  Uploading image...
                </p>
              ) : null}

              {/* Image Preview */}
              {form.imageUrl && !imagePreviewError ? (
                <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                  <img
                    alt="Food preview"
                    className="h-48 w-full object-cover"
                    onError={() => setImagePreviewError(true)}
                    src={form.imageUrl}
                  />
                </div>
              ) : form.imageUrl && imagePreviewError ? (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-sm font-medium text-red-700">
                    Unable to load image.
                  </p>

                  <p className="mt-1 text-xs text-red-600">
                    Please check that the URL is a direct image link.
                  </p>
                </div>
              ) : null}
            </div>

            <label className="flex items-center gap-3 text-sm text-slate-700">
              <input
                checked={form.isAvailable}
                onChange={(event) =>
                  updateForm('isAvailable', event.target.checked)
                }
                type="checkbox"
              />

              Food is available
            </label>

            <div className="flex gap-3">
              <button
                className="flex-1 rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSaving || isUploadingImage}
                type="submit"
              >
                {isSaving
                  ? 'Saving...'
                  : editingId
                    ? 'Update Item'
                    : 'Add Item'}
              </button>

              {editingId ? (
                <button
                  className="rounded-lg border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={resetForm}
                  type="button"
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </form>

          {/* Weekly Menu */}
          <div>
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  Weekly Menu
                </h2>

                <p className="text-sm text-slate-500">
                  {menuItems.length} menu item
                  {menuItems.length === 1 ? '' : 's'} in total
                </p>
              </div>

              <div className="sm:w-48">
                <label
                  className="mb-2 block text-sm font-medium text-slate-700"
                  htmlFor="dayFilter"
                >
                  Filter by Day
                </label>

                <select
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
                  id="dayFilter"
                  onChange={(event) =>
                    setSelectedDay(
                      event.target.value as MenuDay | 'all'
                    )
                  }
                  value={selectedDay}
                >
                  <option value="all">All Days</option>

                  {DAYS.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {isLoading ? (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                Loading menu...
              </div>
            ) : menuItems.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
                <p className="font-medium text-slate-700">
                  No menu items yet.
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Add the first meal using the form.
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {groupedMenu.map((day) => (
                  <section key={day.value}>
                    {/* Day Heading */}
                    <div className="mb-4">
                      <h3 className="text-xl font-bold text-slate-950">
                        {formatDay(day.value)}
                      </h3>

                      <div className="mt-1 h-1 w-12 rounded-full bg-slate-900" />
                    </div>

                    {/* Meals */}
                    <div className="grid gap-5 md:grid-cols-3">
                      {day.meals.map((meal) => (
                        <article
                          className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                          key={meal.value}
                        >
                          {/* Meal Header */}
                          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                            <div className="flex items-center justify-between gap-3">
                              <h4 className="font-semibold text-slate-950">
                                {formatMealPeriod(meal.value)}
                              </h4>

                              <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600">
                                {meal.items.length} item
                                {meal.items.length === 1 ? '' : 's'}
                              </span>
                            </div>
                          </div>

                          {/* Meal Items */}
                          {meal.items.length === 0 ? (
                            <div className="p-5">
                              <p className="text-sm text-slate-400">
                                No meal added.
                              </p>
                            </div>
                          ) : (
                            <div className="divide-y divide-slate-100">
                              {meal.items.map((item) => (
                                <div
                                  className="p-5"
                                  key={item.id}
                                >
                                  <div className="flex gap-4">
                                    {item.imageUrl ? (
                                      <img
                                        alt={item.name}
                                        className="h-16 w-16 shrink-0 rounded-lg object-cover"
                                        src={item.imageUrl}
                                      />
                                    ) : (
                                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400">
                                        No image
                                      </div>
                                    )}

                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-start justify-between gap-2">
                                        <h5 className="font-semibold text-slate-950">
                                          {item.name}
                                        </h5>

                                        <span
                                          className={
                                            item.isAvailable
                                              ? 'shrink-0 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700'
                                              : 'shrink-0 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700'
                                          }
                                        >
                                          {item.isAvailable
                                            ? 'Available'
                                            : 'Unavailable'}
                                        </span>
                                      </div>

                                      {item.description ? (
                                        <p className="mt-1 text-sm leading-5 text-slate-500">
                                          {item.description}
                                        </p>
                                      ) : null}
                                    </div>
                                  </div>

                                  {/* Actions */}
                                  <div className="mt-4 flex gap-2">
                                    <button
                                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                      onClick={() =>
                                        handleEdit(item)
                                      }
                                      type="button"
                                    >
                                      Edit
                                    </button>

                                    <button
                                      className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                                      onClick={() =>
                                        void handleDelete(item.id)
                                      }
                                      type="button"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </article>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
