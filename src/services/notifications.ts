import emailjs from '@emailjs/browser';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import type { Appointment, Slot } from '../types';

const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID as string | undefined;
const adminTemplateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ADMIN as string | undefined;
const customerTemplateId = import.meta.env.VITE_EMAILJS_TEMPLATE_CUSTOMER as string | undefined;
const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string | undefined;
const ownerEmail = import.meta.env.VITE_OWNER_EMAIL as string | undefined;

const ensureConfig = () => {
  if (!serviceId || !publicKey) {
    throw new Error('Configura EmailJS en tu archivo .env antes de enviar correos');
  }
};

const formatSlotDate = (dateIso: string): string =>
  format(new Date(dateIso), "EEEE d 'de' MMMM yyyy 'a las' HH:mm", { locale: es });

export const notifyAdminNewAppointment = async (
  appointment: Appointment,
  slot: Slot
) => {
  ensureConfig();

  if (!adminTemplateId) {
    console.warn('No se definió VITE_EMAILJS_TEMPLATE_ADMIN. Se omite el correo al administrador.');
    return;
  }

  await emailjs.send(
    serviceId!,
    adminTemplateId,
    {
      to_email: ownerEmail,
      appointment_id: appointment.id,
      customer_name: appointment.full_name,
      customer_email: appointment.email,
      customer_phone: appointment.phone,
      appointment_date: formatSlotDate(slot.start_time),
      appointment_notes: appointment.notes ?? 'Sin comentarios',
    },
    {
      publicKey: publicKey!,
    }
  );
};

export const notifyCustomerStatus = async (
  appointment: Appointment,
  slot: Slot
) => {
  ensureConfig();

  if (!customerTemplateId) {
    console.warn('No se definió VITE_EMAILJS_TEMPLATE_CUSTOMER. Se omite correo al cliente.');
    return;
  }

  await emailjs.send(
    serviceId!,
    customerTemplateId,
    {
      customer_name: appointment.full_name,
      customer_email: appointment.email,
      appointment_status: appointment.status,
      appointment_date: formatSlotDate(slot.start_time),
      appointment_notes: appointment.notes ?? 'Sin comentarios',
      appointment_phone: appointment.phone,
    },
    {
      publicKey: publicKey!,
    }
  );
};
