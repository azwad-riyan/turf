import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ turfId: string }> }
) {
  const { turfId } = await params;
  try {
    const reviews = await prisma.review.findMany({
      where: { turfId: turfId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(reviews);
  } catch (error: any) {
    console.error('Error fetching turf reviews:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
