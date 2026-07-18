import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await request.json();
    const reason = data.reason || '';

    const booking = await prisma.booking.findUnique({
      where: { id: id },
      include: { turf: true }
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.playerId !== user.id && booking.turf.ownerId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (booking.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Booking is already cancelled' }, { status: 400 });
    }

    if (booking.status === 'COMPLETED') {
      return NextResponse.json({ error: 'Cannot cancel a completed booking' }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx: any) => {
      const updatedBooking = await tx.booking.update({
        where: { id: id },
        data: {
          status: 'CANCELLED',
          cancellationReason: reason,
        }
      });

      await tx.bookingAuditLog.create({
        data: {
          bookingId: booking.id,
          changedById: user.id,
          previousStatus: booking.status,
          newStatus: 'CANCELLED',
          reason
        }
      });

      return updatedBooking;
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error cancelling booking:', error);
    return NextResponse.json({ error: error.message || 'Failed to cancel booking' }, { status: 500 });
  }
}
