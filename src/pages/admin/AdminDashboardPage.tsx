import { useEffect, useState } from 'react';
import { differenceInCalendarDays, format } from 'date-fns';
import { es } from 'date-fns/locale';

import { Alert } from '../../components/Alert';
import { LoadingScreen } from '../../components/LoadingScreen';
import { AppointmentCard } from '../../components/admin/AppointmentCard';
import { SlotGeneratorForm } from '../../components/admin/SlotGeneratorForm';
import { SlotsTable } from '../../components/admin/SlotsTable';
import { StatsSummary } from '../../components/admin/StatsSummary';
import {
  deleteSlot,
  fetchAppointments,
  fetchSlotsForAdmin,
  getIdentificationSignedUrl,
  updateAppointmentStatus,
  updateSlotStatus,
} from '../../services/appointments';
import { notifyCustomerStatus } from '../../services/notifications';
import type { Appointment, Slot, SlotStatus } from '../../types';

export const AdminDashboardPage = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [appointmentsData, slotsData] = await Promise.all([
        fetchAppointments(),
        fetchSlotsForAdmin(),
      ]);
      setAppointments(appointmentsData);
      setSlots(slotsData);
      setError(null);
    } catch (fetchError) {
      console.error(fetchError);
      setError('No pudimos cargar la información del panel.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const refreshAppointments = async () => {
    try {
      const latest = await fetchAppointments();
      setAppointments(latest);
    } catch (refreshError) {
      console.error(refreshError);
    }
  };

  const refreshSlots = async () => {
    try {
      const latest = await fetchSlotsForAdmin();
      setSlots(latest);
    } catch (refreshError) {
      console.error(refreshError);
    }
  };

  const handleDecision = async (appointment: Appointment, status: SlotStatus, appointmentStatus: 'approved' | 'declined') => {
    try {
      setProcessingId(appointment.id);
      const updatedAppointment = await updateAppointmentStatus(appointment.id, appointmentStatus);
      const updatedSlot = await updateSlotStatus(appointment.slot_id, status);

      const appointmentWithSlot: Appointment = {
        ...updatedAppointment,
        slot: updatedSlot,
      };

      setAppointments((prev) =>
        prev.map((item) => (item.id === appointment.id ? appointmentWithSlot : item))
      );
      setSlots((prev) => prev.map((slot) => (slot.id === appointment.slot_id ? updatedSlot : slot)));

      try {
        await notifyCustomerStatus(appointmentWithSlot, updatedSlot);
      } catch (notificationError) {
        console.error('No se pudo enviar el correo al cliente', notificationError);
      }
    } catch (decisionError) {
      console.error(decisionError);
      setError('No pudimos actualizar el estado. Intenta nuevamente.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleAccept = async (appointment: Appointment) => {
    await handleDecision(appointment, 'booked', 'approved');
  };

  const handleDecline = async (appointment: Appointment) => {
    await handleDecision(appointment, 'available', 'declined');
  };

  const handleOpenIdentification = async (path: string) => {
    try {
      setProcessingId(path);
      const signedUrl = await getIdentificationSignedUrl(path);
      window.open(signedUrl, '_blank', 'noopener');
    } catch (openError) {
      console.error(openError);
      setError('No se pudo abrir la identificación.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleSlotsCreated = (created: Slot[]) => {
    if (!created.length) return;
    setSlots((prev) => [...prev, ...created]);
  };

  const handleSlotStatusUpdate = async (slot: Slot, status: SlotStatus) => {
    try {
      setProcessingId(slot.id);
      const updated = await updateSlotStatus(slot.id, status);
      setSlots((prev) => prev.map((item) => (item.id === slot.id ? updated : item)));
    } catch (updateError) {
      console.error(updateError);
      setError('No pudimos actualizar el horario.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleSlotDelete = async (slot: Slot) => {
    try {
      setProcessingId(slot.id);
      await deleteSlot(slot.id);
      setSlots((prev) => prev.filter((item) => item.id !== slot.id));
    } catch (deleteError) {
      console.error(deleteError);
      setError('No pudimos eliminar el horario.');
    } finally {
      setProcessingId(null);
    }
  };

  const pendingAppointments = appointments.filter((item) => item.status === 'pending');
  const approvedAppointments = appointments.filter((item) => item.status === 'approved');
  const upcomingApproved = approvedAppointments
    .filter((appointment) =>
      appointment.slot ? differenceInCalendarDays(new Date(appointment.slot.start_time), new Date()) >= 0 : false
    )
    .sort((a, b) =>
      new Date(a.slot!.start_time).getTime() - new Date(b.slot!.start_time).getTime()
    );
  const availableSlots = slots.filter((slot) => slot.status === 'available');

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="space-y-8">
      {error ? <Alert variant="error">{error}</Alert> : null}

      <StatsSummary
        items={[
          {
            label: 'Solicitudes pendientes',
            value: pendingAppointments.length,
            helper: pendingAppointments.length ? 'Aprueba o rechaza para liberar horarios.' : 'Todo al día',
          },
          {
            label: 'Citas confirmadas',
            value: upcomingApproved.length,
            helper: upcomingApproved.length
              ? `Próxima cita: ${format(
                  new Date(upcomingApproved[0].slot!.start_time),
                  "EEEE d 'de' MMMM · HH:mm",
                  { locale: es }
                )}`
              : 'Aún no hay citas confirmadas.',
          },
          {
            label: 'Horarios disponibles',
            value: availableSlots.length,
            helper: 'Genera más horarios si deseas abrir agenda.',
          },
        ]}
      />

      <section className="rounded-2xl border border-stone-800 bg-stone-950/40 p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-stone-500">Solicitudes</p>
            <h3 className="text-lg font-semibold text-brand-200">Pendientes de aprobar</h3>
          </div>
          <button
            onClick={() => void refreshAppointments()}
            className="rounded-full border border-stone-700 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-stone-300 hover:border-brand-400 hover:text-brand-200"
          >
            Actualizar lista
          </button>
        </div>
        {pendingAppointments.length === 0 ? (
          <Alert variant="info">No hay solicitudes pendientes. ¡Excelente!</Alert>
        ) : (
          <div className="space-y-4">
            {pendingAppointments.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                onAccept={handleAccept}
                onDecline={handleDecline}
                onOpenIdentification={appointment.id_storage_path ? handleOpenIdentification : undefined}
                disabled={processingId === appointment.id}
              />
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <SlotGeneratorForm onCreated={handleSlotsCreated} />
        <div className="rounded-2xl border border-stone-800 bg-stone-950/40 p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-stone-500">Calendario</p>
              <h3 className="text-lg font-semibold text-brand-200">Horarios publicados</h3>
            </div>
            <button
              onClick={() => void refreshSlots()}
              className="rounded-full border border-stone-700 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-stone-300 hover:border-brand-400 hover:text-brand-200"
            >
              Actualizar
            </button>
          </div>
          {slots.length === 0 ? (
            <Alert variant="info">Todavía no has creado horarios. Usa el generador para comenzar.</Alert>
          ) : (
            <SlotsTable
              slots={slots}
              onUpdateStatus={handleSlotStatusUpdate}
              onDelete={handleSlotDelete}
              disabled={processingId !== null}
            />
          )}
        </div>
      </section>
    </div>
  );
};
