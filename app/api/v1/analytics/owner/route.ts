import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';
import { subDays } from 'date-fns';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const turfId = searchParams.get('turf_id');
  const days = parseInt(searchParams.get('days') || '30', 10);
  const startDate = subDays(new Date(), days);

  try {
    const where: any = {
      date: { gte: startDate },
      status: { not: 'CANCELLED' }
    };

    if (turfId) {
      const turf = await prisma.turf.findUnique({ where: { id: turfId } });
      if (!turf || turf.ownerId !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      where.turfId = turfId;
    } else {
      const turfs = await prisma.turf.findMany({ where: { ownerId: user.id } });
      where.turfId = { in: turfs.map((t: any) => t.id) };
    }

    const bookings = await prisma.booking.findMany({
      where,
      select: { amount: true, platformFee: true, date: true, status: true, playerPhone: true }
    });

    const totalRevenue = bookings.reduce((sum: number, b: any) => sum + (b.amount || 0), 0);
    const totalFees = bookings.reduce((sum: number, b: any) => sum + (b.platformFee || 0), 0);
    const totalBookings = bookings.length;

    const uniquePlayers = new Set(bookings.map((b: any) => b.playerPhone)).size;

    return NextResponse.json({
      period: { start: startDate.toISOString(), end: new Date().toISOString(), days },
      total_bookings: totalBookings,
      total_revenue: totalRevenue,
      platform_fees: totalFees,
      net_revenue: totalRevenue - totalFees,
      returning_players: totalBookings > uniquePlayers ? totalBookings - uniquePlayers : 0,
      new_players: uniquePlayers
    });
  } catch (error: any) {
    console.error('Error fetching owner analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
