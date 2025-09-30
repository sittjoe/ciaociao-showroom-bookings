import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { addDays, eachDayOfInterval, format } from 'date-fns';
import { z } from 'zod';

import { Alert } from '../../components/Alert';
import { createSlots } from '../../services/appointments';
import type { Slot } from '../../types';
import { buildSlotRange } from '../../utils/datetime';

const weekdays: Array<{ value: number; label: string }> = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
];

const generatorSchema = z.object({
  startDate: z.string().min(1, 'Selecciona la fecha de inicio'),
  endDate: z.string().min(1, 'Selecciona la fecha final'),
  startTime: z.string().min(1, 'Define la hora inicial'),
  endTime: z.string().min(1, 'Define la hora final'),
  interval: z.number().min(15, 'Intervalo mínimo de 15 minutos'),
  days: z.array(z.number()).min(1, 'Elige al menos un día'),
  notes: z.string().optional(),
});

type GeneratorForm = z.infer<typeof generatorSchema>;

interface SlotGeneratorFormProps {
  onCreated: (slots: Slot[]) => void;
}

export const SlotGeneratorForm = ({ onCreated }: SlotGeneratorFormProps) => {
  const [formValues, setFormValues] = useState<GeneratorForm>({
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
    startTime: '10:00',
    endTime: '18:00',
    interval: 60,
    days: [3, 4, 5],
    notes: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof GeneratorForm, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const estimatedSlots = useMemo(() => {
    const intervalMinutes = formValues.interval;
    if (!intervalMinutes) {
      return 0;
    }

    const dayCount = eachDayOfInterval({
      start: new Date(formValues.startDate),
      end: new Date(formValues.endDate),
    }).filter((day) => formValues.days.includes(day.getDay())).length;

    const start = new Date(`1970-01-01T${formValues.startTime}`);
    const end = new Date(`1970-01-01T${formValues.endTime}`);
    const minutesRange = (end.getTime() - start.getTime()) / 60000;
    const blocksPerDay = Math.floor(minutesRange / intervalMinutes);

    return Math.max(blocksPerDay * dayCount, 0);
  }, [formValues]);

  const handleCheckboxChange = (dayValue: number) => {
    setFormValues((prev) => ({
      ...prev,
      days: prev.days.includes(dayValue)
        ? prev.days.filter((value) => value !== dayValue)
        : [...prev.days, dayValue],
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccessMessage(null);

    const result = generatorSchema.safeParse(formValues);
    if (!result.success) {
      const issues: Partial<Record<keyof GeneratorForm, string>> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof GeneratorForm;
        issues[key] = issue.message;
      }
      setErrors(issues);
      return;
    }

    setErrors({});

    const { startDate, endDate, days, startTime, endTime, interval, notes } = result.data;

    const daysList = eachDayOfInterval({
      start: new Date(startDate),
      end: new Date(endDate),
    }).filter((day) => days.includes(day.getDay()));

    const payload = daysList.flatMap((day) => {
      const date = format(day, 'yyyy-MM-dd');
      return buildSlotRange(date, startTime, endTime, interval).map((slot) => ({
        ...slot,
        notes: notes ?? null,
      }));
    });

    if (!payload.length) {
      setErrors({ startDate: 'Con la configuración actual no se generan horarios.' });
      return;
    }

    try {
      setSubmitting(true);
      const created = await createSlots({ slots: payload });
      onCreated(created);
      setSuccessMessage(`Se generaron ${created.length} horarios.`);
    } catch (submitError) {
      console.error(submitError);
      setErrors({ startDate: 'No pudimos crear los horarios. Intenta nuevamente.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-stone-800 bg-stone-950/50 p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-stone-500">Agenda</p>
          <h3 className="text-lg font-semibold text-brand-200">Generador semanal</h3>
        </div>
        <p className="text-sm text-stone-400">Se crearán aproximadamente {estimatedSlots} horarios</p>
      </div>

      {successMessage ? <Alert variant="success">{successMessage}</Alert> : null}

      <form onSubmit={handleSubmit} className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-stone-400">
            Desde
          </label>
          <input
            type="date"
            value={formValues.startDate}
            onChange={(event) => setFormValues((prev) => ({ ...prev, startDate: event.target.value }))}
            className="w-full rounded-xl border border-stone-800 bg-stone-900/60 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
          />
          {errors.startDate ? <p className="mt-1 text-xs text-red-300">{errors.startDate}</p> : null}
        </div>
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-stone-400">
            Hasta
          </label>
          <input
            type="date"
            value={formValues.endDate}
            onChange={(event) => setFormValues((prev) => ({ ...prev, endDate: event.target.value }))}
            className="w-full rounded-xl border border-stone-800 bg-stone-900/60 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
          />
          {errors.endDate ? <p className="mt-1 text-xs text-red-300">{errors.endDate}</p> : null}
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-stone-400">
            Horario inicial
          </label>
          <input
            type="time"
            value={formValues.startTime}
            onChange={(event) => setFormValues((prev) => ({ ...prev, startTime: event.target.value }))}
            className="w-full rounded-xl border border-stone-800 bg-stone-900/60 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
          />
          {errors.startTime ? <p className="mt-1 text-xs text-red-300">{errors.startTime}</p> : null}
        </div>
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-stone-400">
            Horario final
          </label>
          <input
            type="time"
            value={formValues.endTime}
            onChange={(event) => setFormValues((prev) => ({ ...prev, endTime: event.target.value }))}
            className="w-full rounded-xl border border-stone-800 bg-stone-900/60 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
          />
          {errors.endTime ? <p className="mt-1 text-xs text-red-300">{errors.endTime}</p> : null}
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-stone-400">
            Intervalo (minutos)
          </label>
          <input
            type="number"
            min={15}
            step={15}
            value={formValues.interval}
            onChange={(event) => setFormValues((prev) => ({ ...prev, interval: Number(event.target.value) }))}
            className="w-full rounded-xl border border-stone-800 bg-stone-900/60 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
          />
          {errors.interval ? <p className="mt-1 text-xs text-red-300">{errors.interval}</p> : null}
        </div>

        <div className="md:col-span-2">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-stone-400">
            Días hábiles
          </label>
          <div className="flex flex-wrap gap-2">
            {weekdays.map((day) => (
              <button
                key={day.value}
                type="button"
                onClick={() => handleCheckboxChange(day.value)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  formValues.days.includes(day.value)
                    ? 'border-brand-400 bg-brand-500/20 text-brand-200'
                    : 'border-stone-700 bg-stone-900/60 text-stone-300 hover:border-brand-400 hover:text-brand-200'
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>
          {errors.days ? <p className="mt-2 text-xs text-red-300">{errors.days}</p> : null}
        </div>

        <div className="md:col-span-2">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-stone-400">
            Notas internas
          </label>
          <textarea
            value={formValues.notes ?? ''}
            onChange={(event) => setFormValues((prev) => ({ ...prev, notes: event.target.value }))}
            rows={3}
            className="w-full rounded-xl border border-stone-800 bg-stone-900/60 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
            placeholder="Ej. Showroom colección invierno"
          />
        </div>

        <div className="md:col-span-2 flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-stone-950 transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:bg-stone-700 disabled:text-stone-400"
          >
            {submitting ? 'Generando...' : 'Crear horarios'}
          </button>
        </div>
      </form>
    </div>
  );
};
