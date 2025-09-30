import clsx from 'clsx';
import type { ReactNode } from 'react';

type AlertVariant = 'success' | 'error' | 'info' | 'warning';

const variantStyles: Record<AlertVariant, string> = {
  success: 'bg-emerald-900/60 text-emerald-200 border-emerald-600/40',
  error: 'bg-red-900/60 text-red-200 border-red-600/40',
  info: 'bg-slate-900/60 text-slate-200 border-slate-600/40',
  warning: 'bg-amber-900/60 text-amber-100 border-amber-500/40',
};

interface AlertProps {
  title?: string;
  children: ReactNode;
  variant?: AlertVariant;
}

export const Alert = ({ title, children, variant = 'info' }: AlertProps) => (
  <div className={clsx('rounded-xl border px-4 py-3 shadow-glow', variantStyles[variant])}>
    {title ? <p className="mb-1 font-semibold uppercase tracking-wide">{title}</p> : null}
    <div className="text-sm leading-relaxed">{children}</div>
  </div>
);
