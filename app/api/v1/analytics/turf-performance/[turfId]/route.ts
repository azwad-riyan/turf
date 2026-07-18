import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';
import { subDays, format } from 'date-fns';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ turfId: string }> }
) {
  const { turfId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const timeframe = searchParams.get('timeframe') || 'month';
  
  let days = 30;
  if (timeframe === 'week') days = 7;
  if (timeframe === 'year') days = 365;

  const startDate = subDays(new Date(), days);

  try {
    const turf = await prisma.turf.findUnique({ where: { id: turfId } });
    if (!turf || turf.ownerId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const bookings = await prisma.booking.findMany({
      where: {
        turfId: turfId,
        date: { gte: startDate },
        status: { not: 'CANCELLED' }
      },
      select: { amount: true, date: true, status: true, source: true }
    });

    const revenueData = Array(days).fill(0).map((_, i) => {
      const d = subDays(new Date(), days - i - 1);
      return {
        name: format(d, 'MMM dd'),
        revenue: 0,
        bookings: 0
      };
    });

    bookings.forEach((b: any) => {
      const dateStr = format(b.date, 'MMM dd');
      const entry = revenueData.find((r: any) => r.name === dateStr);
      if (entry) {
        entry.revenue += (b.amount || 0);
        entry.bookings += 1;
      }
    });

    return NextResponse.json(revenueData);
  } catch (error: any) {
    console.error('Error fetching turf performance:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
