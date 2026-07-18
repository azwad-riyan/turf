import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const schedules = await prisma.operatingSchedule.findMany({
      where: { turfId: id }
    });
    return NextResponse.json(schedules);
  } catch (error: any) {
    console.error('Error fetching schedules:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const turf = await prisma.turf.findUnique({ where: { id: id } });
    if (!turf || turf.ownerId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const data = await request.json();
    
    // Upsert schedule for that day
    const schedule = await prisma.operatingSchedule.upsert({
      where: {
        turfId_dayOfWeek: {
          turfId: id,
          dayOfWeek: data.day_of_week
        }
      },
      update: {
        openTime: new Date(`1970-01-01T${data.open_time}:00Z`),
        closeTime: new Date(`1970-01-01T${data.close_time}:00Z`),
        slotDurationMin: data.slot_duration_min,
        isClosed: data.is_closed
      },
      create: {
        turfId: id,
        dayOfWeek: data.day_of_week,
        openTime: new Date(`1970-01-01T${data.open_time}:00Z`),
        closeTime: new Date(`1970-01-01T${data.close_time}:00Z`),
        slotDurationMin: data.slot_duration_min,
        isClosed: data.is_closed
      }
    });

    return NextResponse.json(schedule, { status: 201 });
  } catch (error: any) {
    console.error('Error creating schedule:', error);
    return NextResponse.json({ error: 'Failed to create schedule' }, { status: 500 });
  }
}
