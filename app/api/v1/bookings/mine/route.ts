import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const phone = searchParams.get('phone');

  if (!user && !phone) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const where: any = {};
  if (user) {
    where.playerId = user.id;
  } else if (phone) {
    where.playerPhone = phone;
  }

  if (status) {
    where.status = status;
  }

  try {
    const bookings = await prisma.booking.findMany({
      where,
      include: {
        turf: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(bookings);
  } catch (error: any) {
    console.error('Error fetching my bookings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
