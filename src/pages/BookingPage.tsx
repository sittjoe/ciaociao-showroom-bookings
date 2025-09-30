import { useEffect, useMemo, useState } from 'react';
import { differenceInMinutes, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { z } from 'zod';

import { Alert } from '../components/Alert';
import { LoadingScreen } from '../components/LoadingScreen';
import { bookAppointment, fetchActiveSlots } from '../services/appointments';
import { notifyAdminNewAppointment } from '../services/notifications';
import type { Slot } from '../types';
import { formatDayLabel, formatTimeRange, groupSlotsByDate } from '../utils/datetime';

const bookingSchema = z.object({
  fullName: z.string().min(3, 'Ingresa el nombre completo'),
  email: z.string().email('Correo inválido'),
  phone: z.string().min(8, 'Número inválido'),
  notes: z.string().max(500, 'Máximo 500 caracteres').optional(),
  idFile: z.instanceof(File, { message: 'Adjunta una identificación oficial' }),
});

type BookingForm = z.infer<typeof bookingSchema>;

export const BookingPage = () => {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [formValues, setFormValues] = useState<Omit<BookingForm, 'idFile'> & { idFile: File | null }>(
    {
      fullName: '',
      email: '',
      phone: '',
      notes: '',
      idFile: null,
    }
  );
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof BookingForm, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadSlots = async () => {
      try {
        setLoading(true);
        const data = await fetchActiveSlots();
        setSlots(data);
        if (data.length) {
          setSelectedSlot(data.find((slot) => slot.status === 'available') ?? null);
        }
      } catch (fetchError) {
        console.error(fetchError);
        setError('No pudimos cargar los horarios. Intenta más tarde.');
      } finally {
        setLoading(false);
      }
    };

    void loadSlots();
  }, []);

  const groupedSlots = useMemo(() => groupSlotsByDate(slots), [slots]);

  const handleInputChange = (field: keyof BookingForm, value: string | File | null) => {
    setFormValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const validate = (): BookingForm | null => {
    if (!selectedSlot) {
      setError('Selecciona un horario antes de enviar tu solicitud.');
      return null;
    }

    const result = bookingSchema.safeParse({
      fullName: formValues.fullName,
      email: formValues.email,
      phone: formValues.phone,
      notes: formValues.notes,
      idFile: formValues.idFile,
    });

    if (!result.success) {
      const issues: Partial<Record<keyof BookingForm, string>> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof BookingForm;
        issues[key] = issue.message;
      }
      setFormErrors(issues);
      return null;
    }

    setFormErrors({});
    return result.data;
  };

  const resetForm = () => {
    setFormValues({ fullName: '', email: '', phone: '', notes: '', idFile: null });
    setSelectedSlot(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const values = validate();

    if (!values || !selectedSlot) {
      return;
    }

    try {
      setSubmitting(true);
      const appointment = await bookAppointment({
        slotId: selectedSlot.id,
        fullName: values.fullName,
        email: values.email,
        phone: values.phone,
        notes: values.notes,
        idFile: values.idFile,
      });

      try {
        await notifyAdminNewAppointment(appointment, selectedSlot);
      } catch (notificationError) {
        console.error('No se pudo enviar el correo al administrador', notificationError);
      }

      setSuccessMessage(
        '¡Tu solicitud fue enviada! Te contactaremos por correo para confirmar la cita.'
      );
      resetForm();
      setSlots((prev) =>
        prev.map((slot) =>
          slot.id === selectedSlot.id ? { ...slot, status: 'pending' } : slot
        )
      );
    } catch (submitError) {
      console.error(submitError);
      setError(submitError instanceof Error ? submitError.message : 'Ocurrió un error inesperado.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
      <section className="rounded-3xl border border-stone-800 bg-stone-900/60 p-8 shadow-xl">
        <p className="mb-2 text-sm uppercase tracking-[0.3em] text-stone-500">Agenda tu visita</p>
        <h1 className="mb-6 font-display text-4xl font-semibold text-brand-200">
          Reserva tu cita privada
        </h1>
        <p className="mb-8 max-w-2xl text-lg text-stone-300">
          Selecciona el horario que mejor se adapte a tu semana. Nuestro showroom está listo para mostrarte las últimas piezas exclusivas de CiaoCiao Atelier.
        </p>

        <div className="space-y-6">
          {Object.keys(groupedSlots).length === 0 ? (
            <Alert variant="info" title="Sin horarios disponibles">
              Estamos preparando la agenda de la próxima semana. Vuelve a intentarlo en breve o contáctanos directamente en hola@ciaociao.mx.
            </Alert>
          ) : (
            Object.entries(groupedSlots).map(([dayKey, daySlots]) => (
              <div key={dayKey} className="rounded-2xl border border-stone-800 bg-stone-950/40 p-5">
                <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-brand-200">
                  {formatDayLabel(daySlots[0].start_time)}
                </p>
                <div className="flex flex-wrap gap-3">
                  {daySlots.map((slot) => {
                    const disabled = slot.status !== 'available';
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => !disabled && setSelectedSlot(slot)}
                        className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                          selectedSlot?.id === slot.id
                            ? 'border-brand-400 bg-brand-500/20 text-brand-100'
                            : disabled
                              ? 'cursor-not-allowed border-stone-800 bg-stone-900/40 text-stone-600'
                              : 'border-stone-700 bg-stone-900/60 text-stone-200 hover:border-brand-400 hover:text-brand-200'
                        }`}
                        disabled={disabled}
                      >
                        {format(new Date(slot.start_time), 'HH:mm', { locale: es })}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="space-y-6">
        <div className="rounded-3xl border border-stone-800 bg-stone-900/60 p-8 shadow-xl">
          <h2 className="mb-2 font-display text-2xl font-semibold">Completa tu solicitud</h2>
          <p className="mb-6 text-sm text-stone-400">
            Compartiremos tu información únicamente para confirmar la cita. Adjunta una identificación oficial para agilizar tu ingreso al showroom.
          </p>

          {error ? <Alert variant="error">{error}</Alert> : null}
          {successMessage ? (
            <Alert variant="success">{successMessage}</Alert>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-stone-300" htmlFor="fullName">
                Nombre completo
              </label>
              <input
                id="fullName"
                type="text"
                value={formValues.fullName}
                onChange={(event) => handleInputChange('fullName', event.target.value)}
                className="w-full rounded-xl border border-stone-800 bg-stone-950/40 px-4 py-3 text-sm focus:border-brand-400 focus:outline-none"
              />
              {formErrors.fullName ? (
                <p className="mt-1 text-xs text-red-300">{formErrors.fullName}</p>
              ) : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-stone-300" htmlFor="email">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                value={formValues.email}
                onChange={(event) => handleInputChange('email', event.target.value)}
                className="w-full rounded-xl border border-stone-800 bg-stone-950/40 px-4 py-3 text-sm focus:border-brand-400 focus:outline-none"
              />
              {formErrors.email ? (
                <p className="mt-1 text-xs text-red-300">{formErrors.email}</p>
              ) : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-stone-300" htmlFor="phone">
                Teléfono de contacto
              </label>
              <input
                id="phone"
                type="tel"
                value={formValues.phone}
                onChange={(event) => handleInputChange('phone', event.target.value)}
                className="w-full rounded-xl border border-stone-800 bg-stone-950/40 px-4 py-3 text-sm focus:border-brand-400 focus:outline-none"
              />
              {formErrors.phone ? (
                <p className="mt-1 text-xs text-red-300">{formErrors.phone}</p>
              ) : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-stone-300" htmlFor="notes">
                ¿Deseas contarnos algo más?
              </label>
              <textarea
                id="notes"
                value={formValues.notes ?? ''}
                onChange={(event) => handleInputChange('notes', event.target.value)}
                rows={4}
                className="w-full rounded-xl border border-stone-800 bg-stone-950/40 px-4 py-3 text-sm focus:border-brand-400 focus:outline-none"
              />
              {formErrors.notes ? (
                <p className="mt-1 text-xs text-red-300">{formErrors.notes}</p>
              ) : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-stone-300" htmlFor="idFile">
                Identificación oficial (PDF o imagen, máx 5MB)
              </label>
              <input
                id="idFile"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.heic"
                onChange={(event) => handleInputChange('idFile', event.target.files?.[0] ?? null)}
                className="block w-full text-sm text-stone-300 file:mr-4 file:rounded-full file:border-0 file:bg-brand-500/20 file:px-4 file:py-2 file:font-semibold file:text-brand-100 file:hover:bg-brand-500/30"
              />
              {formErrors.idFile ? (
                <p className="mt-1 text-xs text-red-300">{formErrors.idFile}</p>
              ) : (
                <p className="mt-1 text-xs text-stone-500">
                  Sólo la usamos para validar tu acceso el día de la cita.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-stone-800 bg-stone-950/50 p-4 text-sm text-stone-400">
              <p className="mb-1 font-semibold text-stone-200">Tu selección</p>
              {selectedSlot ? (
                <>
                  <p>{formatDayLabel(selectedSlot.start_time)}</p>
                  <p className="text-brand-200">
                    {formatTimeRange(selectedSlot.start_time, selectedSlot.end_time)} · {differenceInMinutes(new Date(selectedSlot.end_time), new Date(selectedSlot.start_time))} minutos
                  </p>
                </>
              ) : (
                <p>Elige un horario disponible en la parte izquierda.</p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting || !selectedSlot}
              className="w-full rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-stone-950 transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:bg-stone-700 disabled:text-stone-400"
            >
              {submitting ? 'Enviando...' : 'Solicitar cita'}
            </button>
          </form>
        </div>

        <div className="rounded-3xl border border-brand-500/40 bg-brand-500/10 p-6 text-sm text-brand-100">
          <p className="mb-2 font-semibold uppercase tracking-[0.3em] text-brand-200">
            ¿Qué sigue?
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>Te enviaremos un correo en menos de 24 horas para confirmar tu cita.</li>
            <li>Podrás reagendar respondiendo el correo de confirmación.</li>
            <li>Recibirás un recordatorio automático un día antes de tu visita.</li>
          </ul>
        </div>
      </section>
    </div>
  );
};
