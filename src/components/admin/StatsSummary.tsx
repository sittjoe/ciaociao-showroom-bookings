interface StatCard {
  label: string;
  value: number | string;
  helper?: string;
}

interface StatsSummaryProps {
  items: StatCard[];
}

export const StatsSummary = ({ items }: StatsSummaryProps) => (
  <div className="grid gap-4 md:grid-cols-3">
    {items.map((item) => (
      <div
        key={item.label}
        className="rounded-2xl border border-stone-800 bg-stone-950/40 p-6"
      >
        <p className="text-sm uppercase tracking-[0.3em] text-stone-500">{item.label}</p>
        <p className="mt-3 text-3xl font-semibold text-brand-200">{item.value}</p>
        {item.helper ? <p className="mt-2 text-xs text-stone-400">{item.helper}</p> : null}
      </div>
    ))}
  </div>
);
