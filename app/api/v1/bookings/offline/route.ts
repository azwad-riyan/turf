import { NextResponse } from 'next/server';
import { bookingService } from '@/lib/services/bookingService';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await request.json();
    const turf = await prisma.turf.findUnique({ where: { id: data.turfId } });
    
    if (!turf || turf.ownerId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const bookings = await bookingService.createBooking({
      ...data,
      createdById: user.id,
      source: 'OFFLINE',
      paymentMethod: 'CASH',
    });

    return NextResponse.json({ bookings }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating offline booking:', error);
    return NextResponse.json({ error: error.message || 'Failed to create offline booking' }, { status: 400 });
  }
}
