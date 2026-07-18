import Image from "next/image";
import Link from "next/link";
import { MapPin, Star, Clock, ChevronRight } from "lucide-react";
import { TurfListItem, SPORT_LABELS, AMENITY_LABELS } from "@/lib/types";

interface TurfCardProps {
  turf: TurfListItem;
  compact?: boolean;
}

export default function TurfCard({ turf, compact }: TurfCardProps) {
  const rating = parseFloat(turf.average_rating);

  return (
    <Link href={`/turfs/${turf.id}`} className="group block">
      <div className="card-hover overflow-hidden h-full">
        {/* Photo */}
        <div className="relative h-48 bg-secondary-800 overflow-hidden">
          {turf.primary_photo ? (
            <Image
              src={turf.primary_photo}
              alt={turf.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-6xl">⚽</span>
            </div>
          )}
          {/* Sport tags */}
          <div className="absolute bottom-3 left-3 flex gap-1.5">
            {(turf.sport_types || []).slice(0, 2).map((sport) => (
              <span key={sport} className="badge-green text-xs px-2 py-1 backdrop-blur-sm bg-primary-900/80">
                {SPORT_LABELS[sport as keyof typeof SPORT_LABELS] || sport}
              </span>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-semibold text-white text-base leading-snug group-hover:text-primary-400 transition-colors">
              {turf.name}
            </h3>
            {rating > 0 && (
              <div className="flex items-center gap-1 shrink-0">
                <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                <span className="text-sm font-medium text-yellow-400">{rating.toFixed(1)}</span>
                <span className="text-xs text-secondary-500">({turf.total_reviews})</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-secondary-400 text-sm mb-3">
            <MapPin className="w-3.5 h-3.5 text-primary-500 shrink-0" />
            <span className="truncate">{turf.area}</span>
          </div>

          {/* Amenities */}
          {!compact && turf.amenities?.length > 0 && (
            <div className="flex gap-1.5 flex-wrap mb-3">
              {turf.amenities.slice(0, 3).map((amenity) => (
                <span key={amenity} className="text-xs text-secondary-400 bg-secondary-800 px-2 py-0.5 rounded-md">
                  {AMENITY_LABELS[amenity] || amenity}
                </span>
              ))}
            </div>
          )}

          {/* Price & CTA */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xl font-bold text-white">৳{turf.base_price.toLocaleString()}</span>
              <span className="text-secondary-500 text-xs ml-1">/ slot</span>
            </div>
            <span className="flex items-center gap-1 text-primary-400 text-sm font-medium group-hover:gap-2 transition-all">
              Book Now <ChevronRight className="w-4 h-4" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
