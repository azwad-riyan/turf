import { NextResponse } from 'next/server';
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
    const { booking_id, rating, comment, player_phone } = data;

    const booking = await prisma.booking.findUnique({
      where: { id: booking_id }
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.playerId !== user.id && booking.playerPhone !== player_phone) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const review = await prisma.review.create({
      data: {
        turfId: booking.turfId,
        bookingId: booking.id,
        playerId: user.id,
        playerName: booking.playerName,
        rating: rating,
        comment: comment || ''
      }
    });

    // Update turf average rating
    const allReviews = await prisma.review.findMany({ where: { turfId: booking.turfId } });
    const avgRating = allReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / allReviews.length;
    
    await prisma.turf.update({
      where: { id: booking.turfId },
      data: { averageRating: avgRating, totalReviews: allReviews.length }
    });

    return NextResponse.json(review, { status: 201 });
  } catch (error: any) {
    console.error('Error creating review:', error);
    return NextResponse.json({ error: 'Failed to create review' }, { status: 500 });
  }
}
