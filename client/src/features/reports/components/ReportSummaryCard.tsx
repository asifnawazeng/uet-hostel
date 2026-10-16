interface ReportSummaryCardProps {
    title: string;
    value: number;
    description: string;
    suffix?: string;
}

export function ReportSummaryCard({
    title,
    value,
    description,
    suffix,
}: ReportSummaryCardProps) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
                {title}
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-950">
                {value}
                {suffix}
            </p>

            <p className="mt-1 text-xs text-slate-500">
                {description}
            </p>
        </div>
    );
}