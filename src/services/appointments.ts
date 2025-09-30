import type { Appointment, AppointmentStatus, Slot, SlotStatus } from '../types';
import { supabase } from './supabaseClient';

const IDENTIFICATION_BUCKET = 'identificaciones';

const raise = (error?: { message: string } | null) => {
  if (!error) return;
  console.error('Supabase error', error);
  throw new Error(error.message ?? 'Error inesperado');
};

export const fetchActiveSlots = async (): Promise<Slot[]> => {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('available_slots')
    .select('id,start_time,end_time,status,notes')
    .gte('start_time', now)
    .neq('status', 'blocked')
    .order('start_time', { ascending: true });

  raise(error);
  return (data ?? []) as Slot[];
};

export const fetchSlotsForAdmin = async (): Promise<Slot[]> => {
  const { data, error } = await supabase
    .from('available_slots')
    .select('id,start_time,end_time,status,notes,created_at')
    .order('start_time', { ascending: true });

  raise(error);
  return (data ?? []) as Slot[];
};

export const uploadIdentification = async (file: File): Promise<string> => {
  const extension = file.name.split('.').pop() ?? 'pdf';
  const filename = `${crypto.randomUUID()}.${extension}`;
  const path = `ids/${filename}`;

  const { data, error } = await supabase.storage
    .from(IDENTIFICATION_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });

  raise(error);

  if (!data) {
    throw new Error('No fue posible guardar la identificación. Intenta de nuevo');
  }

  return data.path;
};

export const getIdentificationSignedUrl = async (path: string): Promise<string> => {
  const { data, error } = await supabase.storage
    .from(IDENTIFICATION_BUCKET)
    .createSignedUrl(path, 60 * 60); // 1 hora

  raise(error);

  if (!data?.signedUrl) {
    throw new Error('No fue posible generar el enlace');
  }

  return data.signedUrl;
};

interface BookAppointmentInput {
  slotId: string;
  fullName: string;
  email: string;
  phone: string;
  notes?: string;
  idFile: File;
}

export const bookAppointment = async (
  input: BookAppointmentInput
): Promise<Appointment> => {
  const identificationPath = await uploadIdentification(input.idFile);

  const { data: appointment, error: createError } = await supabase
    .from('appointments')
    .insert({
      slot_id: input.slotId,
      full_name: input.fullName,
      email: input.email,
      phone: input.phone,
      notes: input.notes ?? null,
      id_storage_path: identificationPath,
      status: 'pending',
    })
    .select(
      'id,slot_id,full_name,email,phone,notes,status,created_at,id_storage_path'
    )
    .single();

  if (createError || !appointment) {
    await supabase.storage.from(IDENTIFICATION_BUCKET).remove([identificationPath]);
    if (createError) {
      raise(createError);
    }
    throw new Error('No fue posible crear la cita.');
  }

  const { data: updatedSlot, error: slotUpdateError } = await supabase
    .from('available_slots')
    .update({ status: 'pending' })
    .eq('id', input.slotId)
    .eq('status', 'available')
    .select('id')
    .maybeSingle();

  if (slotUpdateError || !updatedSlot) {
    await supabase.from('appointments').delete().eq('id', appointment.id);
    await supabase.storage.from(IDENTIFICATION_BUCKET).remove([identificationPath]);
    throw new Error('El horario ya no está disponible. Selecciona otro horario.');
  }

  return appointment as Appointment;
};

export const fetchAppointments = async (
  filter?: { status?: AppointmentStatus; upcomingOnly?: boolean }
): Promise<Appointment[]> => {
  let query = supabase
    .from('appointments')
    .select(
      'id,slot_id,full_name,email,phone,notes,status,created_at,id_storage_path,slot:available_slots(id,start_time,end_time,status,notes)'
    )
    .order('created_at', { ascending: false });

  if (filter?.status) {
    query = query.eq('status', filter.status);
  }

  if (filter?.upcomingOnly) {
    query = query.gte('slot.start_time', new Date().toISOString());
  }

  const { data, error } = await query;
  raise(error);
  return (data ?? []) as unknown as Appointment[];
};

export const updateAppointmentStatus = async (
  appointmentId: string,
  status: AppointmentStatus
): Promise<Appointment> => {
  const { data, error } = await supabase
    .from('appointments')
    .update({ status })
    .eq('id', appointmentId)
    .select(
      'id,slot_id,full_name,email,phone,notes,status,created_at,id_storage_path,slot:available_slots(id,start_time,end_time,status,notes)'
    )
    .single();

  raise(error);
  if (!data) {
    throw new Error('No se encontró la cita solicitada.');
  }

  return data as unknown as Appointment;
};

export const updateSlotStatus = async (
  slotId: string,
  status: SlotStatus
): Promise<Slot> => {
  const { data, error } = await supabase
    .from('available_slots')
    .update({ status })
    .eq('id', slotId)
    .select('id,start_time,end_time,status,notes,created_at')
    .single();

  raise(error);
  if (!data) {
    throw new Error('No encontramos el horario especificado.');
  }

  return data as unknown as Slot;
};

interface GenerateSlotsInput {
  slots: Array<{
    start_time: string;
    end_time: string;
    notes?: string | null;
  }>;
}

export const createSlots = async ({ slots }: GenerateSlotsInput): Promise<Slot[]> => {
  if (!slots.length) {
    return [];
  }

  const payload = slots.map((slot) => ({
    ...slot,
    status: 'available',
  }));

  const { data, error } = await supabase
    .from('available_slots')
    .insert(payload)
    .select('id,start_time,end_time,status,notes,created_at');

  raise(error);
  return (data ?? []) as unknown as Slot[];
};

export const deleteSlot = async (slotId: string): Promise<void> => {
  const { error } = await supabase.from('available_slots').delete().eq('id', slotId);
  raise(error);
};
