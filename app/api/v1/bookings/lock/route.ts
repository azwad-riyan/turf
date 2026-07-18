import { NextResponse } from 'next/server';
import { bookingService } from '@/lib/services/bookingService';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    await bookingService.acquireCheckoutLock(
      data.turf_id,
      data.date,
      data.start_times,
      data.session_id
    );
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error acquiring lock:', error);
    return NextResponse.json({ error: error.message || 'Failed to acquire lock' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const data = await request.json();
    await bookingService.releaseCheckoutLock(
      data.turf_id,
      data.date,
      data.start_times,
      data.session_id
    );
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error releasing lock:', error);
    return NextResponse.json({ error: error.message || 'Failed to release lock' }, { status: 500 });
  }
}
