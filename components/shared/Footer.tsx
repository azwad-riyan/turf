import Link from "next/link";
import { MapPin, Phone, Mail, Instagram, Facebook } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-secondary-800 bg-secondary-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">T</span>
              </div>
              <span className="font-display font-bold text-white text-xl">TurfBook</span>
            </div>
            <p className="text-secondary-400 text-sm leading-relaxed max-w-sm">
              The easiest way to book artificial turf slots for football, cricket, and volleyball in
              Rajshahi. Pay cash on arrival — no prepayment required.
            </p>
            <div className="flex items-center gap-2 mt-4 text-secondary-500 text-sm">
              <MapPin className="w-4 h-4 text-primary-500" />
              <span>Rajshahi, Bangladesh</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-white mb-3">Quick Links</h3>
            <ul className="space-y-2">
              {[
                { href: "/turfs", label: "Find Turf" },
                { href: "/turfs?sport=football", label: "Football Turfs" },
                { href: "/turfs?sport=cricket", label: "Cricket Grounds" },
                { href: "/my-bookings", label: "My Bookings" },
                { href: "/auth/login", label: "Sign In" },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-secondary-400 hover:text-primary-400 text-sm transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* For Owners */}
          <div>
            <h3 className="font-semibold text-white mb-3">For Owners</h3>
            <ul className="space-y-2">
              {[
                { href: "/auth/login?role=owner", label: "Owner Login" },
                { href: "/auth/register", label: "List Your Turf" },
                { href: "/dashboard", label: "Dashboard" },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-secondary-400 hover:text-primary-400 text-sm transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-secondary-800 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-secondary-500 text-sm">
            © {new Date().getFullYear()} TurfBook. Built with ⚽ in Rajshahi.
          </p>
          <p className="text-secondary-600 text-xs">
            Platform fee: ৳75 per booking • Cash on arrival
          </p>
        </div>
      </div>
    </footer>
  );
}
