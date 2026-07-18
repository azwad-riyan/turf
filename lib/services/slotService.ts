import prisma from '@/lib/prisma';
import { addDays, format, parseISO, startOfDay, addMinutes, isBefore, isEqual, isAfter, startOfToday } from 'date-fns';

export interface SlotInfo {
  start_time: string;
  end_time: string;
  status: 'open' | 'booked' | 'blocked' | 'locked' | 'past';
  price: number;
  booking_id?: string;
  override_id?: string;
  label: string;
}

export class SlotService {
  async getSlotsForDate(turfId: string, slotDateStr: string): Promise<SlotInfo[]> {
    const slotDate = parseISO(slotDateStr);
    const dayOfWeek = slotDate.getDay(); // 0 is Sunday, 1 is Monday ... 
    // Django uses 0=Monday, 6=Sunday. In JS, 0=Sunday, 1=Monday.
    // Wait, let's map it: JS to Django (JS day - 1, if -1 then 6)
    const djangoDayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    const turf = await prisma.turf.findUnique({
      where: { id: turfId },
      include: {
        schedules: {
          where: { dayOfWeek: djangoDayOfWeek }
        }
      }
    });

    if (!turf) return [];

    let openTime = new Date();
    openTime.setHours(0, 0, 0, 0);
    let closeTime = new Date();
    closeTime.setHours(0, 0, 0, 0);
    let durationMin = 90;

    const schedule = turf.schedules[0];
    if (schedule) {
      if (schedule.isClosed) return [];
      openTime = schedule.openTime;
      closeTime = schedule.closeTime;
      durationMin = schedule.slotDurationMin;
    }

    // 1. Generate all slot windows for the day
    const slots = this.generateSlotWindows(openTime, closeTime, durationMin, turf.basePrice, slotDateStr);

    // 2. Mark booked slots
    const activeBookings = await prisma.booking.findMany({
      where: {
        turfId,
        date: slotDate,
        status: { not: 'CANCELLED' }
      },
      select: { startTime: true, id: true }
    });
    const bookedMap = new Map(activeBookings.map(b => [format(b.startTime, 'HH:mm'), b.id]));

    // 3. Mark overrides
    const overrides = await prisma.slotOverride.findMany({
      where: { turfId, date: slotDate }
    });

    // 4. Check locks (locks expiring in future)
    const activeLocks = await prisma.slotLock.findMany({
      where: {
        turfId,
        date: slotDate,
        expiresAt: { gt: new Date() }
      }
    });
    const lockMap = new Set(activeLocks.map(l => format(l.startTime, 'HH:mm')));

    const now = new Date();
    const todayStr = format(now, 'yyyy-MM-dd');
    const nowTimeStr = format(now, 'HH:mm');

    for (const slot of slots) {
      // Past slots
      if (slotDateStr === todayStr && slot.start_time < nowTimeStr) {
        slot.status = 'past';
        continue;
      }

      if (bookedMap.has(slot.start_time)) {
        slot.status = 'booked';
        slot.booking_id = bookedMap.get(slot.start_time);
        continue;
      }

      // Check overrides
      const slotStartDt = parseISO(`${slotDateStr}T${slot.start_time}:00`);
      let slotEndDt = parseISO(`${slotDateStr}T${slot.end_time}:00`);
      if (slotEndDt <= slotStartDt) {
        slotEndDt = addDays(slotEndDt, 1);
      }

      let overlappingOverride = null;
      for (const ov of overrides) {
        const ovStartDt = parseISO(`${slotDateStr}T${format(ov.startTime, 'HH:mm')}:00`);
        let ovEndDt = parseISO(`${slotDateStr}T${format(ov.endTime, 'HH:mm')}:00`);
        if (ovEndDt <= ovStartDt) {
          ovEndDt = addDays(ovEndDt, 1);
        }

        if (isBefore(slotStartDt, ovEndDt) && isAfter(slotEndDt, ovStartDt)) {
          overlappingOverride = ov;
          break;
        }
      }

      if (overlappingOverride) {
        if (overlappingOverride.status === 'BLOCKED') {
          slot.status = 'blocked';
          slot.override_id = overlappingOverride.id;
          continue;
        } else if (overlappingOverride.status === 'SPECIAL_PRICE') {
          slot.price = overlappingOverride.price || slot.price;
        }
      }

      // Check lock
      if (lockMap.has(slot.start_time)) {
        slot.status = 'locked';
        continue;
      }
    }

    return slots;
  }

  private generateSlotWindows(openTime: Date, closeTime: Date, durationMin: number, basePrice: number, dateStr: string): SlotInfo[] {
    const slots: SlotInfo[] = [];
    
    // Create actual dates for iteration based on hours/minutes
    let dtOpen = new Date(`${dateStr}T${format(openTime, 'HH:mm')}:00`);
    let dtClose = new Date(`${dateStr}T${format(closeTime, 'HH:mm')}:00`);
    
    if (dtClose <= dtOpen) {
      dtClose = addDays(dtClose, 1);
    }

    let current = dtOpen;
    while (addMinutes(current, durationMin) <= dtClose) {
      const next = addMinutes(current, durationMin);
      slots.push({
        start_time: format(current, 'HH:mm'),
        end_time: format(next, 'HH:mm'),
        status: 'open',
        price: basePrice,
        label: `${format(current, 'hh:mm a')} – ${format(next, 'hh:mm a')}`
      });
      current = next;
    }

    return slots;
  }

  async getAvailabilityForRange(turfId: string, startStr: string, endStr: string) {
    const result: Record<string, SlotInfo[]> = {};
    let current = parseISO(startStr);
    const end = parseISO(endStr);

    while (current <= end) {
      const dateStr = format(current, 'yyyy-MM-dd');
      const slots = await this.getSlotsForDate(turfId, dateStr);
      result[dateStr] = slots;
      current = addDays(current, 1);
    }
    return result;
  }
}

export const slotService = new SlotService();
