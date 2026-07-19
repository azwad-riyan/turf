import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Find user in Prisma database
  let dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      ownerProfile: true
    }
  });

  // If user signed in but doesn't exist in Prisma yet, create them
  if (!dbUser && user.email) {
    dbUser = await prisma.user.create({
      data: {
        id: user.id,
        email: user.email,
        role: 'PLAYER',
      },
      include: {
        ownerProfile: true
      }
    });
  }

  return NextResponse.json(dbUser);
}
