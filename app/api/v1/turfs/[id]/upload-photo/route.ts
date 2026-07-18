import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';

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
    const turf = await prisma.turf.findUnique({ 
      where: { id: id },
      include: { photos: true }
    });
    if (!turf || turf.ownerId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('image') as File | null;
    
    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Convert File to Buffer/Blob for Supabase Storage upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Create unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${id}/${uuidv4()}.${fileExt}`;

    // Upload to Supabase Storage bucket named 'turf-photos'
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('turf-photos')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      throw uploadError;
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('turf-photos')
      .getPublicUrl(fileName);

    const isPrimary = turf.photos.length === 0;

    // Save to Prisma
    const photo = await prisma.turfPhoto.create({
      data: {
        turfId: id,
        image: publicUrlData.publicUrl,
        isPrimary
      }
    });

    return NextResponse.json(photo, { status: 201 });
  } catch (error: any) {
    console.error('Error uploading photo:', error);
    return NextResponse.json({ error: 'Failed to upload photo' }, { status: 500 });
  }
}
