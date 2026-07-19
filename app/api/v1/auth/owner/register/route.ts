import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import prisma from '@/lib/prisma';

// Use service role key to create user and bypass auth restrictions
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // We need to add this to .env.local
);

export async function POST(request: Request) {
  try {
    const { email, password, name, business_name, phone } = await request.json();

    if (!email || !password || !name || !business_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for password login
      user_metadata: { name, role: 'OWNER' }
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    const user = authData.user;

    // 2. Create user and owner profile in Prisma
    const dbUser = await prisma.user.create({
      data: {
        id: user.id,
        email: user.email!,
        phone: phone || null,
        role: 'OWNER',
        ownerProfile: { create: { businessName: business_name } }
      }
    });

    return NextResponse.json({ user: dbUser });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error', stack: error.stack }, { status: 500 });
  }
}
