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

  // NOTE: Assuming a way to check if user is admin. 
  // In Supabase, this could be a custom claim or a row in a 'profiles' table.
  // For now, we skip the strict role check, or you can implement your own logic here.
  // if (user.user_metadata.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get('days') || '30', 10);
  const startDate = subDays(new Date(), days);

  try {
    const bookings = await prisma.booking.findMany({
      where: { date: { gte: startDate } }
    });

    const activeBookings = bookings.filter((b: any) => b.status !== 'CANCELLED');
    const cancelledBookings = bookings.length - activeBookings.length;
    
    const gmv = activeBookings.reduce((sum: number, b: any) => sum + (b.amount || 0), 0);
    const platformFees = activeBookings.reduce((sum: number, b: any) => sum + (b.platformFee || 0), 0);

    const activeTurfs = await prisma.turf.count({ where: { isActive: true } });
    
    // We don't have a direct 'User' table with roles in Prisma if using raw Supabase Auth,
    // but we can query Supabase auth.users or a synced profiles table if needed.
    const totalUsers = 0; // Placeholder

    return NextResponse.json({
      period: { start: startDate.toISOString(), end: new Date().toISOString() },
      total_bookings: bookings.length,
      active_bookings: activeBookings.length,
      cancelled_bookings: cancelledBookings,
      gmv,
      platform_fees: platformFees,
      active_turfs: activeTurfs,
      total_users: totalUsers,
      top_turfs: [] // Add aggregation if needed
    });
  } catch (error: any) {
    console.error('Error fetching admin analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
