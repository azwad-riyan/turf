import Link from "next/link";
import { Search, Shield, Clock, Star, ArrowRight, Zap, CheckCircle } from "lucide-react";
import { turfsApi } from "@/lib/api";
import TurfCard from "@/components/turf/TurfCard";
import type { Metadata } from "next";
import { TurfListItem } from "@/lib/types";

export const metadata: Metadata = {
  title: "TurfBook — Book Turf Slots in Rajshahi Online",
  description: "Find and book football, cricket & volleyball turf slots in Rajshahi. Instant confirmation. Pay cash on arrival. No registration required.",
};

async function getFeaturedTurfs(): Promise<TurfListItem[]> {
  try {
    const res = await turfsApi.list({ ordering: "-average_rating" });
    const data = res.data;
    if (Array.isArray(data)) return data.slice(0, 6);
    if (data && Array.isArray(data.results)) return data.results.slice(0, 6);
    return [];
  } catch {
    return [];
  }
}

const SPORTS = [
  { emoji: "⚽", label: "Football", slug: "football", color: "from-green-900 to-green-800" },
  { emoji: "🏏", label: "Cricket", slug: "cricket", color: "from-blue-900 to-blue-800" },
  { emoji: "🏐", label: "Volleyball", slug: "volleyball", color: "from-orange-900 to-orange-800" },
];

const HOW_IT_WORKS = [
  { step: "1", icon: "🔍", title: "Find a Turf", desc: "Browse available turfs in Rajshahi by sport, area, and price." },
  { step: "2", icon: "📅", title: "Pick a Slot", desc: "Choose your date and time slot from the live availability calendar." },
  { step: "3", icon: "✅", title: "Instant Confirm", desc: "Your slot is reserved instantly. No payment required upfront." },
  { step: "4", icon: "💵", title: "Pay on Arrival", desc: "Show up and pay cash to the owner. Enjoy the game!" },
];

const STATS = [
  { value: "5+", label: "Active Turfs" },
  { value: "90min", label: "Per Slot" },
  { value: "৳0", label: "Upfront Cost" },
  { value: "24/7", label: "Online Booking" },
];

export default async function HomePage() {
  const featuredTurfs = await getFeaturedTurfs();

  return (
    <div>
      {/* ── Hero ──────────────────────────────────── */}
      <section className="relative min-h-[80vh] flex items-center overflow-hidden bg-hero-gradient">
        {/* Background grid */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "linear-gradient(rgba(34,197,94,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(34,197,94,0.3) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-secondary-950/80" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-primary-900/40 border border-primary-800 rounded-full px-4 py-2 mb-6">
            <Zap className="w-4 h-4 text-primary-400" />
            <span className="text-sm text-primary-300 font-medium">Rajshahi's First Online Turf Booking Platform</span>
          </div>

          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight text-balance">
            Book Your{" "}
            <span className="gradient-text">Perfect Turf</span>
            <br />in Rajshahi
          </h1>

          <p className="text-xl text-secondary-300 max-w-2xl mx-auto mb-10 text-balance">
            Football, cricket, volleyball — find available slots in seconds.
            Instant confirmation. Pay cash on arrival. No app needed.
          </p>

          {/* Search bar */}
          <div className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto mb-12">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-500" />
              <input
                type="text"
                placeholder="Search turfs in Rajshahi..."
                className="input pl-12 text-base"
              />
            </div>
            <Link href="/turfs" className="btn-primary btn-lg whitespace-nowrap">
              Find Turf <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          {/* Sport pills */}
          <div className="flex flex-wrap justify-center gap-3">
            {SPORTS.map((s) => (
              <Link
                key={s.slug}
                href={`/turfs?sport=${s.slug}`}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-secondary-800/80 border border-secondary-700 text-white hover:border-primary-600 hover:bg-secondary-700 transition-all text-sm font-medium"
              >
                <span>{s.emoji}</span> {s.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────── */}
      <section className="bg-secondary-900 border-y border-secondary-800">
        <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-2 sm:grid-cols-4 gap-6">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl font-display font-bold text-primary-400">{stat.value}</div>
              <div className="text-secondary-400 text-sm mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ──────────────────────────── */}
      <section className="section">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-3">
            Book in 4 Simple Steps
          </h2>
          <p className="text-secondary-400 max-w-xl mx-auto">
            No account required. Just your phone number and you&apos;re good to go.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {HOW_IT_WORKS.map((step, i) => (
            <div key={step.step} className="relative">
              {i < HOW_IT_WORKS.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-primary-800 to-transparent z-10" />
              )}
              <div className="card p-6 text-center group hover:border-primary-700 transition-colors">
                <div className="w-14 h-14 bg-primary-900/40 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl border border-primary-800 group-hover:bg-primary-900/60 transition-colors">
                  {step.icon}
                </div>
                <div className="text-xs font-bold text-primary-500 mb-1">STEP {step.step}</div>
                <h3 className="font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-secondary-400 text-sm leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Featured Turfs ────────────────────────── */}
      {featuredTurfs.length > 0 && (
        <section className="section border-t border-secondary-800">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-display text-3xl font-bold text-white">Featured Turfs</h2>
              <p className="text-secondary-400 mt-1">Top-rated venues in Rajshahi</p>
            </div>
            <Link href="/turfs" className="btn-outline btn-sm">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {(featuredTurfs || []).map((turf) => (
              <TurfCard key={turf.id} turf={turf} />
            ))}
          </div>
        </section>
      )}

      {/* ── Trust signals ─────────────────────────── */}
      <section className="section border-t border-secondary-800">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { icon: <Shield className="w-6 h-6 text-primary-400" />, title: "Safe & Verified", desc: "All turfs are manually reviewed by our team before going live." },
            { icon: <Clock className="w-6 h-6 text-primary-400" />, title: "Instant Booking", desc: "No waiting for confirmation calls. Your slot is locked the moment you book." },
            { icon: <Star className="w-6 h-6 text-primary-400" />, title: "Real Reviews", desc: "Ratings from real players who played at the turf." },
          ].map((item) => (
            <div key={item.title} className="card p-6 flex gap-4">
              <div className="shrink-0 w-10 h-10 bg-primary-900/40 rounded-xl flex items-center justify-center border border-primary-800">
                {item.icon}
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">{item.title}</h3>
                <p className="text-secondary-400 text-sm">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Owner CTA ─────────────────────────────── */}
      <section className="section border-t border-secondary-800">
        <div className="card p-8 sm:p-12 text-center bg-gradient-to-br from-primary-950 to-secondary-900 border-primary-800">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
            Own a Turf in Rajshahi?
          </h2>
          <p className="text-secondary-300 max-w-xl mx-auto mb-6">
            List your turf for free. Fill dead slots with online bookings. Keep your phone-booking regulars.
            You only pay us when we bring you new customers.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {["Free to list", "No monthly fee", "৳75 per successful booking", "Your regulars stay yours"].map((feat) => (
              <div key={feat} className="flex items-center gap-2 text-sm text-primary-300">
                <CheckCircle className="w-4 h-4 text-primary-500" /> {feat}
              </div>
            ))}
          </div>
          <Link href="/auth/register" className="btn-primary btn-lg inline-flex">
            List Your Turf <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
