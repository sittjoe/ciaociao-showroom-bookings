import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import type { Slot, SlotStatus } from '../../types';
import { formatDayLabel, formatTimeRange, groupSlotsByDate } from '../../utils/datetime';

const statusLabels: Record<SlotStatus, { label: string; style: string }> = {
  available: { label: 'Disponible', style: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
  pending: { label: 'Pendiente', style: 'bg-amber-500/10 text-amber-200 border-amber-500/30' },
  booked: { label: 'Confirmada', style: 'bg-brand-500/20 text-brand-200 border-brand-500/40' },
  blocked: { label: 'Bloqueada', style: 'bg-stone-800/80 text-stone-400 border-stone-700' },
};

interface SlotsTableProps {
  slots: Slot[];
  onUpdateStatus: (slot: Slot, status: SlotStatus) => Promise<void>;
  onDelete: (slot: Slot) => Promise<void>;
  disabled?: boolean;
}

export const SlotsTable = ({ slots, onUpdateStatus, onDelete, disabled = false }: SlotsTableProps) => {
  const sortedSlots = [...slots].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );
  const groupedSlots = groupSlotsByDate(sortedSlots);

  const getActions = (slot: Slot) => {
    switch (slot.status) {
      case 'available':
        return [
          { label: 'Bloquear', action: () => onUpdateStatus(slot, 'blocked') },
        ];
      case 'blocked':
        return [
          { label: 'Liberar', action: () => onUpdateStatus(slot, 'available') },
          { label: 'Eliminar', action: () => onDelete(slot) },
        ];
      case 'pending':
        return [
          { label: 'Liberar', action: () => onUpdateStatus(slot, 'available') },
        ];
      case 'booked':
        return [];
      default:
        return [];
    }
  };

  return (
    <div className="space-y-5">
      {Object.entries(groupedSlots).map(([dayKey, daySlots]) => (
        <div key={dayKey} className="rounded-2xl border border-stone-800 bg-stone-950/40 p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-200">
              {formatDayLabel(daySlots[0].start_time)}
            </p>
            <p className="text-xs text-stone-500">
              {daySlots.length} horario{daySlots.length === 1 ? '' : 's'} · {format(new Date(daySlots[0].start_time), 'PPP', { locale: es })}
            </p>
          </div>

          <div className="space-y-3">
            {daySlots.map((slot) => {
              const status = statusLabels[slot.status];
              return (
                <div
                  key={slot.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-800/80 bg-stone-900/60 px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-stone-100">
                      {formatTimeRange(slot.start_time, slot.end_time)}
                    </p>
                    {slot.notes ? <p className="text-sm text-stone-500">{slot.notes}</p> : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${status.style}`}>
                      {status.label}
                    </span>
                    {getActions(slot).map((action) => (
                      <button
                        key={action.label}
                        onClick={action.action}
                        disabled={disabled}
                        className="rounded-full border border-stone-700 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-stone-300 transition hover:border-brand-400 hover:text-brand-200 disabled:cursor-not-allowed disabled:border-stone-800 disabled:text-stone-600"
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
