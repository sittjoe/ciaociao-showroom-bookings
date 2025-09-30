import { addMinutes, format, isBefore, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

import type { Slot } from '../types';

export const formatDayLabel = (isoDate: string): string =>
  format(new Date(isoDate), "EEEE d 'de' MMMM", { locale: es });

export const formatTimeRange = (startIso: string, endIso: string): string => {
  const start = new Date(startIso);
  const end = new Date(endIso);
  return `${format(start, 'HH:mm', { locale: es })} – ${format(end, 'HH:mm', { locale: es })}`;
};

export const groupSlotsByDate = (slots: Slot[]): Record<string, Slot[]> => {
  return slots.reduce<Record<string, Slot[]>>((acc, slot) => {
    const dayKey = format(startOfDay(new Date(slot.start_time)), 'yyyy-MM-dd');
    acc[dayKey] = acc[dayKey] ? [...acc[dayKey], slot] : [slot];
    return acc;
  }, {});
};

export const isSlotPast = (slot: Slot): boolean => isBefore(new Date(slot.end_time), new Date());

export const buildSlotRange = (
  date: string,
  start: string,
  end: string,
  stepMinutes: number
): Array<{ start_time: string; end_time: string }> => {
  const startDate = new Date(`${date}T${start}`);
  const endDate = new Date(`${date}T${end}`);

  const slots: Array<{ start_time: string; end_time: string }> = [];
  let pointer = startDate;

  while (pointer < endDate) {
    const slotStart = pointer;
    const slotEnd = addMinutes(pointer, stepMinutes);
    if (slotEnd > endDate) {
      break;
    }
    slots.push({ start_time: slotStart.toISOString(), end_time: slotEnd.toISOString() });
    pointer = slotEnd;
  }

  return slots;
};
