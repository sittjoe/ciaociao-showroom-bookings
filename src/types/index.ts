export type SlotStatus = 'available' | 'pending' | 'booked' | 'blocked';

export interface Slot {
  id: string;
  start_time: string;
  end_time: string;
  status: SlotStatus;
  notes?: string | null;
  created_at?: string;
}

export type AppointmentStatus = 'pending' | 'approved' | 'declined' | 'cancelled';

export interface Appointment {
  id: string;
  slot_id: string;
  full_name: string;
  email: string;
  phone: string;
  notes?: string | null;
  id_storage_path?: string | null;
  status: AppointmentStatus;
  created_at: string;
  reminder_sent?: boolean;
  slot?: Slot;
}

export interface BookingPayload {
  slotId: string;
  fullName: string;
  email: string;
  phone: string;
  notes?: string;
  idFile: File;
}

export interface EmailConfig {
  serviceId: string;
  adminTemplateId: string;
  customerTemplateId: string;
  publicKey: string;
  ownerEmail: string;
}
