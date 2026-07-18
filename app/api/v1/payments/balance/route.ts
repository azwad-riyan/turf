import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const owner = await prisma.owner.findUnique({ where: { userId: user.id } });
    
    if (!owner) {
      return NextResponse.json({ error: 'Owner profile not found' }, { status: 404 });
    }

    const turfs = await prisma.turf.findMany({ where: { ownerId: owner.id } });
    const turfIds = turfs.map((t: any) => t.id);

    const bookings = await prisma.booking.findMany({
      where: {
        turfId: { in: turfIds },
        status: 'CONFIRMED'
      },
      select: { platformFee: true }
    });

    const payouts = await prisma.payout.findMany({
      where: { ownerId: owner.id, status: 'PAID' },
      select: { feeDeducted: true }
    });

    const totalFeeOwed = bookings.reduce((sum: number, b: any) => sum + (b.platformFee || 0), 0);
    const totalPaid = payouts.reduce((sum: number, p: any) => sum + (p.feeDeducted || 0), 0);

    return NextResponse.json({
      total_fee_owed: totalFeeOwed,
      total_paid: totalPaid,
      outstanding_balance: totalFeeOwed - totalPaid
    });
  } catch (error: any) {
    console.error('Error fetching fee balance:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
