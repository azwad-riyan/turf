import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Star, Phone, Clock, Shield, ChevronRight } from "lucide-react";
import { turfsApi, reviewsApi } from "@/lib/api";
import SlotCalendar from "@/components/turf/SlotCalendar";
import type { Metadata } from "next";
import { TurfDetail, Review } from "@/lib/types";
import { SPORT_LABELS, AMENITY_LABELS } from "@/lib/types";
import BookSlotButton from "@/components/booking/BookSlotButton";

interface Props {
  params: Promise<{ id: string }>;
}

async function getTurf(id: string): Promise<TurfDetail | null> {
  try {
    const res = await turfsApi.get(parseInt(id));
    return res.data;
  } catch {
    return null;
  }
}

async function getReviews(id: string): Promise<Review[]> {
  try {
    const res = await reviewsApi.forTurf(id);
    return res.data;
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const turf = await getTurf(id);
  return {
    title: turf ? `${turf.name} — Book Slots | TurfBook` : "Turf Not Found",
    description: turf?.description || `Book a slot at ${turf?.name} in ${turf?.area}, Rajshahi.`,
  };
}

export default async function TurfDetailPage({ params }: Props) {
  const { id } = await params;
  const [turf, reviews] = await Promise.all([getTurf(id), getReviews(id)]);

  if (!turf) notFound();

  const rating = parseFloat(turf.average_rating);
  const primaryPhoto = turf.photos.find((p) => p.is_primary) || turf.photos[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-secondary-500 mb-6">
        <Link href="/turfs" className="hover:text-primary-400 transition-colors">Turfs</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-secondary-300">{turf.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left — Turf Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Photo gallery */}
          <div className="grid grid-cols-3 gap-2 rounded-2xl overflow-hidden h-64 sm:h-80">
            <div className="col-span-2 relative">
              {primaryPhoto ? (
                <Image src={primaryPhoto.image} alt={turf.name} fill className="object-cover" />
              ) : (
                <div className="w-full h-full bg-secondary-800 flex items-center justify-center text-6xl">⚽</div>
              )}
            </div>
            <div className="grid grid-rows-2 gap-2">
              {turf.photos.slice(1, 3).map((photo, i) => (
                <div key={photo.id} className="relative">
                  <Image src={photo.image} alt={`Photo ${i + 2}`} fill className="object-cover" />
                </div>
              ))}
              {turf.photos.length < 2 && Array.from({ length: 2 - turf.photos.length }).map((_, i) => (
                <div key={i} className="bg-secondary-800 rounded-xl" />
              ))}
            </div>
          </div>

          {/* Header */}
          <div>
            <div className="flex flex-wrap gap-2 mb-3">
              {turf.sport_types.map((sport) => (
                <span key={sport} className="badge-green">
                  {SPORT_LABELS[sport as keyof typeof SPORT_LABELS] || sport}
                </span>
              ))}
            </div>
            <h1 className="font-display text-3xl font-bold text-white mb-2">{turf.name}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-secondary-400">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-primary-500" />
                {turf.address}, {turf.area}
              </div>
              {rating > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="font-medium text-yellow-400">{rating.toFixed(1)}</span>
                  <span>({turf.total_reviews} reviews)</span>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {turf.description && (
            <div className="card p-5">
              <h2 className="font-semibold text-white mb-2">About this turf</h2>
              <p className="text-secondary-300 text-sm leading-relaxed">{turf.description}</p>
            </div>
          )}

          {/* Amenities */}
          <div className="card p-5">
            <h2 className="font-semibold text-white mb-3">Amenities</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {turf.amenities.map((amenity) => (
                <div key={amenity} className="flex items-center gap-2 text-sm text-secondary-300">
                  <span className="w-7 h-7 bg-primary-900/40 rounded-lg flex items-center justify-center text-base border border-primary-800">
                    {AMENITY_LABELS[amenity]?.split(" ")[0] || "✓"}
                  </span>
                  <span className="capitalize">{amenity.replace(/_/g, " ")}</span>
                </div>
              ))}
              {turf.amenities.length === 0 && (
                <p className="text-secondary-500 text-sm col-span-3">No amenities listed.</p>
              )}
            </div>
          </div>

          {/* Cancellation Policy */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-secondary-800/50 border border-secondary-700">
            <Shield className="w-5 h-5 text-primary-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-white">Cancellation Policy</p>
              <p className="text-sm text-secondary-400 mt-0.5">
                Free cancellation up to {turf.cancellation_hours} hour{turf.cancellation_hours !== 1 ? "s" : ""} before the slot.
                After that, the slot cannot be cancelled.
              </p>
            </div>
          </div>

          {/* Reviews */}
          {reviews.length > 0 && (
            <div>
              <h2 className="font-semibold text-white mb-4">Player Reviews</h2>
              <div className="space-y-3">
                {reviews.map((review) => (
                  <div key={review.id} className="card p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-white text-sm">{review.player_name || "Player"}</span>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${i < review.rating ? "text-yellow-400 fill-yellow-400" : "text-secondary-700"}`}
                          />
                        ))}
                      </div>
                    </div>
                    {review.comment && <p className="text-secondary-400 text-sm">{review.comment}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right — Booking Panel */}
        <div className="space-y-4">
          <div className="card p-5 sticky top-20">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-2xl font-bold text-white">৳{turf.base_price.toLocaleString()}</span>
                <span className="text-secondary-500 text-sm ml-1">/ 90 min slot</span>
              </div>
              <span className="badge-green">Cash on arrival</span>
            </div>

            {turf.contact_phone && (
              <div className="flex items-center gap-2 text-sm text-secondary-400 mb-4 p-3 bg-secondary-800/50 rounded-xl">
                <Phone className="w-4 h-4 text-primary-400" />
                <span>{turf.contact_phone}</span>
              </div>
            )}

            <h3 className="font-semibold text-white mb-4">Select a Slot</h3>
            <BookSlotButton turfId={turf.id} turfName={turf.name} basePrice={turf.base_price} />
          </div>
        </div>
      </div>
    </div>
  );
}
