export function serializeUser(dbUser: any) {
  if (!dbUser) return null;
  return {
    id: dbUser.id,
    email: dbUser.email,
    phone: dbUser.phone || '',
    name: dbUser.name || '',
    role: dbUser.role.toLowerCase(), // 'player', 'owner', 'admin'
    created_at: dbUser.createdAt.toISOString(),
    owner_profile: dbUser.ownerProfile ? {
      id: dbUser.ownerProfile.id,
      business_name: dbUser.ownerProfile.businessName,
      verification_status: dbUser.ownerProfile.verificationStatus.toLowerCase(),
      verified_at: dbUser.ownerProfile.verifiedAt ? dbUser.ownerProfile.verifiedAt.toISOString() : null,
    } : undefined
  };
}

export function serializeTurf(turf: any) {
  if (!turf) return null;
  
  const primaryPhoto = turf.photos?.find((p: any) => p.isPrimary)?.image 
    || turf.photos?.[0]?.image 
    || null;

  return {
    id: turf.id,
    name: turf.name,
    address: turf.address,
    area: turf.area,
    lat: turf.lat ? turf.lat.toString() : null,
    lng: turf.lng ? turf.lng.toString() : null,
    sport_types: turf.sportTypes ? turf.sportTypes.map((s: string) => s.toLowerCase()) : [],
    amenities: turf.amenities || [],
    base_price: turf.basePrice || 0,
    is_active: turf.isActive ?? true,
    average_rating: turf.averageRating ? turf.averageRating.toString() : "0.00",
    total_reviews: turf.totalReviews || 0,
    owner_name: turf.owner?.user?.name || turf.owner?.businessName || "Owner",
    primary_photo: primaryPhoto,
    description: turf.description || "",
    contact_phone: turf.contactPhone || "",
    cancellation_hours: turf.cancellationHours || 3,
    photos: turf.photos || [],
  };
}
