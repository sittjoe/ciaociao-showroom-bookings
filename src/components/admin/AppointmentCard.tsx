import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import type { Appointment } from '../../types';

interface AppointmentCardProps {
  appointment: Appointment;
  onAccept: (appointment: Appointment) => Promise<void>;
  onDecline: (appointment: Appointment) => Promise<void>;
  onOpenIdentification?: (path: string) => Promise<void>;
  disabled?: boolean;
}

export const AppointmentCard = ({
  appointment,
  onAccept,
  onDecline,
  onOpenIdentification,
  disabled = false,
}: AppointmentCardProps) => {
  const slot = appointment.slot;
  const identificationPath = appointment.id_storage_path;

  return (
    <div className="rounded-2xl border border-stone-800 bg-stone-950/40 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-brand-200">
            {slot ? format(new Date(slot.start_time), "EEEE d 'de' MMMM", { locale: es }) : 'Sin horario'}
          </p>
          <h4 className="mt-1 text-xl font-semibold text-stone-100">{appointment.full_name}</h4>
          <p className="text-sm text-stone-400">{appointment.email} · {appointment.phone}</p>
          {appointment.notes ? (
            <p className="mt-2 text-sm text-stone-300">{appointment.notes}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {identificationPath && onOpenIdentification ? (
            <button
              onClick={() => onOpenIdentification(identificationPath)}
              className="rounded-full border border-stone-700 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-stone-300 hover:border-brand-400 hover:text-brand-200"
            >
              Ver identificación
            </button>
          ) : null}
          <button
            onClick={() => onDecline(appointment)}
            disabled={disabled}
            className="rounded-full border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:bg-stone-800 disabled:text-stone-500"
          >
            Rechazar
          </button>
          <button
            onClick={() => onAccept(appointment)}
            disabled={disabled}
            className="rounded-full bg-brand-500 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-stone-950 transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:bg-stone-800 disabled:text-stone-500"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
};
