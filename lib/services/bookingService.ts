import prisma from '@/lib/prisma';
import { addMinutes, format, parseISO } from 'date-fns';

export class BookingService {
  async acquireCheckoutLock(turfId: string, slotDateStr: string, startTimes: string[], sessionId: string = 'locked') {
    const slotDate = parseISO(slotDateStr);
    
    // We do a transaction to ensure atomicity
    return await prisma.$transaction(async (tx) => {
      for (const startTime of startTimes) {
        const time = new Date(`1970-01-01T${startTime}:00Z`);
        
        const existing = await tx.slotLock.findUnique({
          where: {
            turfId_date_startTime: {
              turfId,
              date: slotDate,
              startTime: time
            }
          }
        });

        if (existing) {
          if (existing.sessionId === sessionId || existing.expiresAt < new Date()) {
            // we can overwrite
            await tx.slotLock.update({
              where: { id: existing.id },
              data: {
                sessionId,
                expiresAt: addMinutes(new Date(), 10) // 10 min TTL
              }
            });
          } else {
            throw new Error(`Slot at ${startTime} is already locked.`);
          }
        } else {
          await tx.slotLock.create({
            data: {
              turfId,
              date: slotDate,
              startTime: time,
              sessionId,
              expiresAt: addMinutes(new Date(), 10)
            }
          });
        }
      }
      return true;
    });
  }

  async releaseCheckoutLock(turfId: string, slotDateStr: string, startTimes: string[], sessionId: string = 'locked') {
    const slotDate = parseISO(slotDateStr);
    for (const startTime of startTimes) {
      const time = new Date(`1970-01-01T${startTime}:00Z`);
      await prisma.slotLock.deleteMany({
        where: {
          turfId,
          date: slotDate,
          startTime: time,
          sessionId
        }
      });
    }
  }

  async createBooking(data: {
    turfId: string;
    date: string;
    startTimes: string[];
    endTimes: string[];
    playerName: string;
    playerPhone: string;
    playerCount?: number;
    paymentMethod?: string;
    source?: string;
    playerId?: string;
    createdById?: string;
    notes?: string;
    sessionId?: string;
  }) {
    const slotDate = parseISO(data.date);
    
    // Calculate total price based on turf base price
    const turf = await prisma.turf.findUnique({ where: { id: data.turfId } });
    if (!turf) throw new Error('Turf not found');

    return await prisma.$transaction(async (tx) => {
      // 1. Verify availability
      for (const startTime of data.startTimes) {
        const time = new Date(`1970-01-01T${startTime}:00Z`);
        const existing = await tx.booking.findFirst({
          where: {
            turfId: data.turfId,
            date: slotDate,
            startTime: time,
            status: { not: 'CANCELLED' }
          }
        });
        if (existing) throw new Error(`Slot at ${startTime} is already booked.`);
      }

      const bookings = [];
      for (let i = 0; i < data.startTimes.length; i++) {
        const startTime = new Date(`1970-01-01T${data.startTimes[i]}:00Z`);
        const endTime = new Date(`1970-01-01T${data.endTimes[i]}:00Z`);
        
        const booking = await tx.booking.create({
          data: {
            turfId: data.turfId,
            playerId: data.playerId,
            playerName: data.playerName,
            playerPhone: data.playerPhone,
            playerCount: data.playerCount || 1,
            date: slotDate,
            startTime,
            endTime,
            source: (data.source || 'ONLINE') as any,
            status: 'CONFIRMED',
            paymentMethod: (data.paymentMethod || 'CASH') as any,
            paymentStatus: 'UNPAID',
            amount: turf.basePrice, // Use price from turf or override
            platformFee: 0,
            createdByPlayerId: data.createdById,
            notes: data.notes || '',
          }
        });
        bookings.push(booking);
      }

      // Delete locks if any
      if (data.sessionId) {
        for (const startTime of data.startTimes) {
          const time = new Date(`1970-01-01T${startTime}:00Z`);
          await tx.slotLock.deleteMany({
            where: {
              turfId: data.turfId,
              date: slotDate,
              startTime: time,
              sessionId: data.sessionId
            }
          });
        }
      }

      return bookings;
    });
  }
}

export const bookingService = new BookingService();
