import { NextResponse } from 'next/server';
import { slotService } from '@/lib/services/slotService';
import { addDays, format } from 'date-fns';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const startStr = searchParams.get('start') || format(new Date(), 'yyyy-MM-dd');
  const daysStr = searchParams.get('days') || '7';
  let days = parseInt(daysStr, 10);
  if (isNaN(days) || days < 1) days = 7;
  if (days > 30) days = 30;

  try {
    const endStr = format(addDays(new Date(startStr), days - 1), 'yyyy-MM-dd');
    const availability = await slotService.getAvailabilityForRange(id, startStr, endStr);
    return NextResponse.json(availability);
  } catch (error: any) {
    console.error('Error fetching availability:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
