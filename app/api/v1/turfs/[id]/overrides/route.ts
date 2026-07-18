import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';

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
    
    const override = await prisma.slotOverride.create({
      data: {
        turfId: id,
        date: new Date(data.date),
        startTime: new Date(`1970-01-01T${data.start_time}:00Z`),
        endTime: new Date(`1970-01-01T${data.end_time}:00Z`),
        status: data.status,
        price: data.price ? parseFloat(data.price) : null,
      }
    });

    return NextResponse.json(override, { status: 201 });
  } catch (error: any) {
    console.error('Error creating override:', error);
    return NextResponse.json({ error: 'Failed to create override' }, { status: 500 });
  }
}
