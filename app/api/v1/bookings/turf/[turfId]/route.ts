import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';
import { parseISO } from 'date-fns';

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
  const dateStr = searchParams.get('date');

  try {
    const turf = await prisma.turf.findUnique({ where: { id: turfId } });
    if (!turf || turf.ownerId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const where: any = { turfId: turfId };
    if (dateStr) {
      where.date = parseISO(dateStr);
    }

    const bookings = await prisma.booking.findMany({
      where,
      orderBy: { startTime: 'asc' }
    });

    return NextResponse.json(bookings);
  } catch (error: any) {
    console.error('Error fetching owner bookings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
