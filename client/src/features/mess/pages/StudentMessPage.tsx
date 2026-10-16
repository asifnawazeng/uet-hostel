import { useEffect, useMemo, useState } from 'react';

import { listMenuItems } from '@/features/mess/services/menuService';
import type {
  MealPeriod,
  MenuDay,
  MenuItem,
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

const MEAL_PERIODS: {
  value: MealPeriod;
  label: string;
}[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
];

export function StudentMessPage({
  onNavigate,
}: {
  onNavigate: (path: string) => void;
}) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMenu() {
      try {
        setIsLoading(true);
        setError(null);

        const items = await listMenuItems();
        setMenuItems(items);
      } catch (loadError: unknown) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Unable to load the mess menu.'
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadMenu();
  }, []);

  const menuByDay = useMemo(() => {
    return DAYS.map((day) => ({
      ...day,
      meals: MEAL_PERIODS.map((meal) => ({
        ...meal,
        items: menuItems.filter(
          (menuItem) =>
            menuItem.day === day.value &&
            menuItem.mealPeriod === meal.value
        ),
      })),
    }));
  }, [menuItems]);

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
            Mess Menu
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            View the weekly hostel mess menu.
          </p>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-8">
        {error ? (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            Loading mess menu...
          </div>
        ) : menuItems.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
            <p className="font-medium text-slate-700">
              No menu has been added yet.
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Please check again later.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {menuByDay.map((day) => (
              <section key={day.value}>
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-slate-950">
                    {day.label}
                  </h2>

                  <div className="mt-1 h-1 w-12 rounded-full bg-slate-900" />
                </div>

                <div className="grid gap-5 md:grid-cols-3">
                  {day.meals.map((meal) => {
                    const items = meal.items;

                    return (
                      <article
                        className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                        key={meal.value}
                      >
                        {items.length === 0 ? (
                          <div className="flex h-44 items-center justify-center bg-slate-100 text-sm text-slate-400">
                            No meal added
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {items.map((item) =>
                              item.imageUrl ? (
                                <img
                                  alt={item.name}
                                  className="h-44 w-full object-cover"
                                  key={item.id}
                                  src={item.imageUrl}
                                />
                              ) : null
                            )}

                            {items.every((item) => !item.imageUrl) ? (
                              <div className="flex h-44 items-center justify-center bg-slate-100 text-sm text-slate-400">
                                No food image
                              </div>
                            ) : null}
                          </div>
                        )}

                        <div className="p-5">
                          <div className="flex items-center justify-between gap-3">
                            <h3 className="font-semibold text-slate-950">
                              {meal.label}
                            </h3>

                            {items.length > 0 ? (
                              <span
                                className={
                                  items.every(
                                    (item) => item.isAvailable
                                  )
                                    ? 'rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700'
                                    : 'rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700'
                                }
                              >
                                {items.every(
                                  (item) => item.isAvailable
                                )
                                  ? 'Available'
                                  : 'Some Unavailable'}
                              </span>
                            ) : null}
                          </div>

                          {items.length > 0 ? (
                            <div className="mt-4 space-y-4">
                              {items.map((item) => (
                                <div key={item.id}>
                                  <h4 className="text-lg font-bold text-slate-900">
                                    {item.name}
                                  </h4>

                                  {item.description ? (
                                    <p className="mt-1 text-sm leading-6 text-slate-500">
                                      {item.description}
                                    </p>
                                  ) : null}

                                  {!item.isAvailable ? (
                                    <p className="mt-1 text-xs font-medium text-red-600">
                                      Currently unavailable
                                    </p>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="mt-3 text-sm text-slate-400">
                              No meal added for this time.
                            </p>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

