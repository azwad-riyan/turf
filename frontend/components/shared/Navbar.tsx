"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, MapPin, ChevronDown, LogOut, User, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuth();

  const navLinks = [
    { href: "/turfs", label: "Find Turf" },
    { href: "/turfs?sport=football", label: "Football" },
    { href: "/turfs?sport=cricket", label: "Cricket" },
    { href: "/turfs?sport=volleyball", label: "Volleyball" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-secondary-800 backdrop-blur-xl bg-secondary-950/80">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center group-hover:bg-primary-500 transition-colors">
              <span className="text-white font-bold text-sm">T</span>
            </div>
            <span className="font-display font-bold text-white text-xl">TurfBook</span>
            <span className="hidden sm:block text-xs text-primary-400 bg-primary-900/40 px-2 py-0.5 rounded-full border border-primary-800">
              Rajshahi
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? "bg-primary-900/40 text-primary-400"
                    : "text-secondary-300 hover:text-white hover:bg-secondary-800"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 bg-secondary-800 rounded-xl px-3 py-2 hover:bg-secondary-700 transition-colors"
                >
                  <div className="w-7 h-7 bg-primary-700 rounded-lg flex items-center justify-center">
                    <span className="text-white text-xs font-bold">
                      {user.name?.[0]?.toUpperCase() || "U"}
                    </span>
                  </div>
                  <span className="text-sm text-white font-medium">{user.name || user.phone}</span>
                  <ChevronDown className="w-4 h-4 text-secondary-400" />
                </button>
                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 mt-2 w-52 card shadow-xl shadow-black/50 overflow-hidden"
                    >
                      {(user.role === "owner" || user.role === "admin") && (
                        <Link
                          href="/dashboard"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-secondary-800 transition-colors text-sm text-secondary-200"
                        >
                          <LayoutDashboard className="w-4 h-4 text-primary-400" />
                          Dashboard
                        </Link>
                      )}
                      <Link
                        href="/my-bookings"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-secondary-800 transition-colors text-sm text-secondary-200"
                      >
                        <User className="w-4 h-4 text-secondary-400" />
                        My Bookings
                      </Link>
                      <div className="border-t border-secondary-800" />
                      <button
                        onClick={() => { setUserMenuOpen(false); logout(); }}
                        className="flex w-full items-center gap-3 px-4 py-3 hover:bg-red-900/20 transition-colors text-sm text-red-400"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <>
                <Link href="/auth/login" className="btn-ghost text-sm">Sign In</Link>
                <Link href="/auth/login" className="btn-primary btn-sm">Book Now</Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg text-secondary-400 hover:text-white hover:bg-secondary-800"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-secondary-800 py-4 space-y-1"
            >
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block px-4 py-2.5 rounded-lg text-sm font-medium text-secondary-300 hover:text-white hover:bg-secondary-800"
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-2 flex flex-col gap-2 px-4">
                {isAuthenticated ? (
                  <>
                    <Link href="/my-bookings" className="btn-secondary w-full justify-center" onClick={() => setMobileOpen(false)}>My Bookings</Link>
                    <button onClick={logout} className="btn-ghost w-full justify-center text-red-400">Sign Out</button>
                  </>
                ) : (
                  <Link href="/auth/login" className="btn-primary w-full justify-center" onClick={() => setMobileOpen(false)}>Book Now</Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  );
}
