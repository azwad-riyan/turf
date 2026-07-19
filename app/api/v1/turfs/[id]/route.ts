import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { serializeTurf } from '@/lib/serializers';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const turf = await prisma.turf.findUnique({
      where: { id: id },
      include: {
        photos: true,
        owner: {
          include: {
            user: true
          }
        },
        reviews: true,
      }
    });

    if (!turf) {
      return NextResponse.json({ error: 'Turf not found' }, { status: 404 });
    }

    return NextResponse.json(serializeTurf(turf));
  } catch (error: any) {
    console.error('Error fetching turf:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { id } = await params;

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const turf = await prisma.turf.findUnique({ where: { id: id } });
    if (!turf) {
      return NextResponse.json({ error: 'Turf not found' }, { status: 404 });
    }

    if (turf.ownerId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const data = await request.json();
    const updatedTurf = await prisma.turf.update({
      where: { id: id },
      data
    });

    return NextResponse.json(updatedTurf);
  } catch (error: any) {
    console.error('Error updating turf:', error);
    return NextResponse.json({ error: 'Failed to update turf' }, { status: 500 });
  }
}
