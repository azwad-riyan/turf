import { NextResponse } from 'next/server';
import { slotService } from '@/lib/services/slotService';
import { format } from 'date-fns';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get('date');
  
  if (!dateParam) {
    return NextResponse.json({ error: 'Date is required (YYYY-MM-DD)' }, { status: 400 });
  }

  try {
    const slots = await slotService.getSlotsForDate(id, dateParam);
    return NextResponse.json({
      turf_id: id,
      date: dateParam,
      slots
    });
  } catch (error: any) {
    console.error('Error fetching slots:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
