import { NextResponse } from 'next/server';
import { bookingService } from '@/lib/services/bookingService';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await request.json();
    const bookings = await bookingService.createBooking({
      ...data,
      playerId: user.id,
      createdById: user.id,
      source: 'ONLINE',
      paymentMethod: data.payment_method || 'CASH'
    });

    return NextResponse.json({ bookings }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating booking:', error);
    return NextResponse.json({ error: error.message || 'Failed to create booking' }, { status: 400 });
  }
}
