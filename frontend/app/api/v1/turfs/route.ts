import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');
  const type = searchParams.get('type');
  const ownerId = searchParams.get('owner_id');

  const where: any = {};
  if (search) {
    where.name = { contains: search, mode: 'insensitive' };
  }
  if (type) {
    where.turfType = type;
  }
  if (ownerId) {
    where.ownerId = ownerId;
  }

  try {
    const turfs = await prisma.turf.findMany({
      where,
      include: {
        photos: true,
        owner: {
          include: {
            ownerProfile: true
          }
        },
        reviews: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(turfs);
  } catch (error: any) {
    console.error('Error fetching turfs:', error);
    return NextResponse.json({ error: 'Failed to fetch turfs' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if owner
  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (dbUser?.role !== 'OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    
    const turf = await prisma.turf.create({
      data: {
        ownerId: user.id,
        name: formData.get('name') as string,
        location: formData.get('location') as string,
        turfType: formData.get('turf_type') as string,
        pricePerHour: parseFloat(formData.get('price_per_hour') as string),
        amenities: formData.get('amenities') ? JSON.parse(formData.get('amenities') as string) : {},
        isAvailable: formData.get('is_available') !== 'false',
        // Optional location details if provided
        lat: formData.get('lat') ? parseFloat(formData.get('lat') as string) : null,
        lng: formData.get('lng') ? parseFloat(formData.get('lng') as string) : null,
        address: (formData.get('address') as string) || null,
      }
    });
    return NextResponse.json(turf);
  } catch (error: any) {
    console.error('Error creating turf:', error);
    return NextResponse.json({ error: 'Failed to create turf' }, { status: 500 });
  }
}
