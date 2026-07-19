require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ['info'] });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function main() {
  console.log('Starting seed...');

  // 1. Create Admin User
  const adminEmail = 'admin@turfbook.com';
  const adminPassword = 'AdminPassword123!';
  const adminName = 'System Admin';

  let adminId;

  console.log(`Creating/fetching admin user with email: ${adminEmail}`);

  // Create in Supabase
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: { name: adminName, role: 'ADMIN' }
  });

  if (authError) {
    if (authError.message.includes('already exists') || authError.message.includes('User already registered')) {
      console.log('Admin user already exists in Supabase, fetching user...');
      const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = users.users.find(u => u.email === adminEmail);
      if (existingUser) {
        adminId = existingUser.id;
      }
    } else {
      console.error('Error creating admin in Supabase:', authError);
      throw authError;
    }
  } else {
    adminId = authData.user.id;
  }

  // Ensure user exists in Prisma (as OWNER role so they can own turfs, or ADMIN if we have that role)
  // Our schema has Role.ADMIN but turfs belong to Owner. Let's make them an OWNER for the turfs, 
  // or create a separate owner profile.
  let dbAdmin = await prisma.user.findUnique({ where: { id: adminId } });
  
  if (!dbAdmin) {
    dbAdmin = await prisma.user.create({
      data: {
        id: adminId,
        email: adminEmail,
        name: adminName,
        role: 'ADMIN', // Actually ADMIN role
        ownerProfile: {
          create: {
            businessName: 'TurfBook Admin Turfs',
            verificationStatus: 'VERIFIED',
            verifiedAt: new Date(),
          }
        }
      },
      include: { ownerProfile: true }
    });
  } else if (!dbAdmin.ownerProfile) {
    // If they exist but don't have an owner profile
    await prisma.owner.create({
      data: {
        userId: adminId,
        businessName: 'TurfBook Admin Turfs',
        verificationStatus: 'VERIFIED',
        verifiedAt: new Date(),
      }
    });
  }

  const ownerId = (await prisma.owner.findUnique({ where: { userId: adminId } }))?.id;

  if (!ownerId) {
    throw new Error('Failed to create or find owner profile for admin');
  }

  console.log(`Admin user ready. Owner ID: ${ownerId}`);

  // 2. Create 10 Dummy Turfs
  console.log('Creating dummy turfs...');

  const dummyTurfs = [
    {
      name: "Green Arena FC",
      description: "Premium FIFA standard 5-a-side artificial turf in the heart of the city.",
      address: "123 Sports Avenue",
      area: "Downtown",
      lat: 23.7937,
      lng: 90.4066,
      sportTypes: ["FOOTBALL"],
      amenities: ["Parking", "Washroom", "Floodlights", "Drinking Water"],
      basePrice: 1500,
      contactPhone: "01711223344",
      cancellationHours: 3
    },
    {
      name: "Skyline Cricket Nets",
      description: "Professional indoor cricket nets with bowling machine availability.",
      address: "45 Rooftop Tower, Commercial Block",
      area: "Banani",
      lat: 23.7940,
      lng: 90.4050,
      sportTypes: ["CRICKET"],
      amenities: ["Bowling Machine", "Equipment Rental", "Washroom", "Waiting Area"],
      basePrice: 1200,
      contactPhone: "01822334455",
      cancellationHours: 6
    },
    {
      name: "Metro Volleyball Court",
      description: "Outdoor sand volleyball court with professional netting and lighting.",
      address: "Central Park West",
      area: "Gulshan",
      lat: 23.7925,
      lng: 90.4075,
      sportTypes: ["VOLLEYBALL"],
      amenities: ["Shower", "Locker", "Floodlights"],
      basePrice: 800,
      contactPhone: "01933445566",
      cancellationHours: 2
    },
    {
      name: "Legends Futsal Turf",
      description: "High quality indoor futsal court with excellent shock absorption.",
      address: "Level 3, Action Mall",
      area: "Dhanmondi",
      lat: 23.7465,
      lng: 90.3760,
      sportTypes: ["FOOTBALL"],
      amenities: ["Air Conditioned", "Locker", "Washroom", "Cafeteria"],
      basePrice: 2000,
      contactPhone: "01744556677",
      cancellationHours: 4
    },
    {
      name: "Strikers Field",
      description: "Large 7-a-side field suitable for tournaments and practice matches.",
      address: "Plot 12, Sports City",
      area: "Uttara",
      lat: 23.8759,
      lng: 90.3956,
      sportTypes: ["FOOTBALL"],
      amenities: ["Parking", "Spectator Seating", "Washroom", "Floodlights"],
      basePrice: 2500,
      contactPhone: "01855667788",
      cancellationHours: 12
    },
    {
      name: "Pace & Spin Cricket Academy",
      description: "Four dedicated net practice pitches with varied pitch conditions.",
      address: "South End Club Ground",
      area: "Mirpur",
      lat: 23.8052,
      lng: 90.3639,
      sportTypes: ["CRICKET"],
      amenities: ["Coach Available", "Equipment Rental", "Washroom", "Drinking Water"],
      basePrice: 1000,
      contactPhone: "01966778899",
      cancellationHours: 5
    },
    {
      name: "The Kickoff Turf",
      description: "Cozy 5-a-side turf perfect for evening matches with friends.",
      address: "Alley 4, Residential Area",
      area: "Badda",
      lat: 23.7805,
      lng: 90.4267,
      sportTypes: ["FOOTBALL"],
      amenities: ["Floodlights", "Washroom", "First Aid"],
      basePrice: 1200,
      contactPhone: "01777889900",
      cancellationHours: 2
    },
    {
      name: "Smash Volleyball Arena",
      description: "Professional indoor volleyball court with synthetic flooring.",
      address: "Indoor Stadium Complex",
      area: "Mirpur",
      lat: 23.8070,
      lng: 90.3680,
      sportTypes: ["VOLLEYBALL"],
      amenities: ["Air Conditioned", "Shower", "Locker", "Spectator Seating"],
      basePrice: 1500,
      contactPhone: "01888990011",
      cancellationHours: 3
    },
    {
      name: "Champion's Multi-Sport Complex",
      description: "Versatile facility offering football, cricket, and volleyball on interchangeable courts.",
      address: "Mega Sports Center",
      area: "Bashundhara",
      lat: 23.8193,
      lng: 90.4320,
      sportTypes: ["FOOTBALL", "CRICKET", "VOLLEYBALL"],
      amenities: ["Parking", "Cafeteria", "Shower", "Locker", "Floodlights"],
      basePrice: 2200,
      contactPhone: "01999001122",
      cancellationHours: 6
    },
    {
      name: "Urban Pitch",
      description: "Premium rooftop 5-a-side football turf with an amazing city view.",
      address: "Roof level, Corporate Tower",
      area: "Motijheel",
      lat: 23.7282,
      lng: 90.4182,
      sportTypes: ["FOOTBALL"],
      amenities: ["Floodlights", "Washroom", "Cafeteria", "Elevator Access"],
      basePrice: 1800,
      contactPhone: "01700112233",
      cancellationHours: 4
    }
  ];

  let createdCount = 0;

  for (const turf of dummyTurfs) {
    // Check if a turf with this name exists for this owner
    const existing = await prisma.turf.findFirst({
      where: { ownerId: ownerId, name: turf.name }
    });

    if (!existing) {
      await prisma.turf.create({
        data: {
          ownerId: ownerId,
          ...turf
        }
      });
      createdCount++;
    }
  }

  console.log(`Successfully created ${createdCount} new dummy turfs.`);
  console.log('Seed completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
