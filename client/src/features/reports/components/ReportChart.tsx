interface ReportChartProps {
  title: string;
  items: {
    label: string;
    count: number;
  }[];
}

export function ReportChart({
  title,
  items,
}: ReportChartProps) {
  const maxCount = Math.max(
    ...items.map((item) => item.count),
    1
  );

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">
        {title}
      </h3>

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          No data available.
        </p>
      ) : (
        <div className="mt-5 space-y-4">
          {items.map((item) => {
            const width =
              item.count === 0
                ? 0
                : Math.max(
                    (item.count / maxCount) * 100,
                    4
                  );

            return (
              <div key={item.label}>
                <div className="mb-1 flex items-center justify-between gap-4">
                  <span className="truncate text-sm text-slate-700">
                    {item.label}
                  </span>

                  <span className="text-sm font-semibold text-slate-900">
                    {item.count}
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-slate-900 transition-all"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}