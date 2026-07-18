"use client";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { LayoutDashboard, Calendar, BarChart3, Settings, BookOpen, Plus, TrendingUp, Users, DollarSign } from "lucide-react";
import { analyticsApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { OwnerAnalytics } from "@/lib/types";

type Tab = "overview" | "bookings" | "analytics" | "settings";

export default function OwnerDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  // Redirect if not authenticated as owner/admin — use useEffect to avoid rendering-phase side effects
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || (user?.role !== "owner" && user?.role !== "admin"))) {
      router.push("/auth/login?role=owner");
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-secondary-400">Loading...</p></div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">
            {user?.owner_profile?.business_name || "My Dashboard"}
          </h1>
          <p className="text-secondary-400 text-sm mt-0.5">Manage your turf bookings and analytics</p>
        </div>
        <Link href="/dashboard/turfs/new" className="btn-primary">
          <Plus className="w-4 h-4" /> Add Turf
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-secondary-800 rounded-xl mb-8 w-fit">
        {([
          ["overview", "Overview", LayoutDashboard],
          ["bookings", "Bookings", BookOpen],
          ["analytics", "Analytics", BarChart3],
          ["settings", "Settings", Settings],
        ] as [Tab, string, React.ElementType][]).map(([tab, label, Icon]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab ? "bg-primary-600 text-white" : "text-secondary-400 hover:text-white"
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && <OverviewTab />}
      {activeTab === "bookings" && <BookingsTab />}
      {activeTab === "analytics" && <AnalyticsTab />}
      {activeTab === "settings" && (
        <div className="card p-8 text-center text-secondary-400">
          <Settings className="w-8 h-8 mx-auto mb-3 opacity-50" />
          <p>Turf settings coming soon. Contact support to update your turf details.</p>
        </div>
      )}
    </div>
  );
}

function OverviewTab() {
  const { data: analytics } = useQuery({
    queryKey: ["owner-analytics", 7],
    queryFn: () => analyticsApi.owner({ days: 7 }).then((r) => r.data as OwnerAnalytics),
    refetchInterval: 60_000,
  });

  const stats = [
    {
      icon: <BookOpen className="w-5 h-5 text-primary-400" />,
      label: "Bookings (7 days)",
      value: analytics?.total_bookings ?? "—",
      sub: "total slots filled",
    },
    {
      icon: <DollarSign className="w-5 h-5 text-green-400" />,
      label: "Revenue (7 days)",
      value: analytics ? `৳${analytics.total_revenue.toLocaleString()}` : "—",
      sub: "from confirmed bookings",
    },
    {
      icon: <Users className="w-5 h-5 text-blue-400" />,
      label: "Returning Players",
      value: analytics?.returning_players ?? "—",
      sub: "booked more than once",
    },
    {
      icon: <TrendingUp className="w-5 h-5 text-yellow-400" />,
      label: "Net Revenue",
      value: analytics ? `৳${analytics.net_revenue.toLocaleString()}` : "—",
      sub: "after platform fee",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-secondary-800 rounded-xl flex items-center justify-center border border-secondary-700">
                {s.icon}
              </div>
              <span className="text-xs text-secondary-400">{s.label}</span>
            </div>
            <div className="text-2xl font-bold font-display text-white">{s.value}</div>
            <div className="text-xs text-secondary-500 mt-1">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TodayBookings />
        <QuickActions />
      </div>
    </div>
  );
}

function TodayBookings() {
  return (
    <div className="card p-5">
      <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-primary-400" /> Today&apos;s Bookings
      </h3>
      <div className="text-center py-8 text-secondary-500">
        <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Select a turf to view today&apos;s bookings</p>
        <Link href="/dashboard/bookings" className="btn-primary btn-sm mt-3 inline-flex">View Bookings</Link>
      </div>
    </div>
  );
}

function QuickActions() {
  const actions = [
    { href: "/dashboard/turfs/new", icon: "⚽", label: "Add New Turf", desc: "List another turf on the platform" },
    { href: "/dashboard/slots", icon: "🔒", label: "Block Slots", desc: "Mark slots as unavailable" },
    { href: "/dashboard/offline", icon: "📞", label: "Mark Phone Booking", desc: "Log a booking from a phone call" },
  ];

  return (
    <div className="card p-5">
      <h3 className="font-semibold text-white mb-4">Quick Actions</h3>
      <div className="space-y-3">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="flex items-center gap-3 p-3 rounded-xl bg-secondary-800/50 hover:bg-secondary-800 border border-secondary-700 hover:border-primary-700 transition-all group"
          >
            <span className="text-xl">{action.icon}</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">{action.label}</p>
              <p className="text-xs text-secondary-500">{action.desc}</p>
            </div>
            <span className="text-secondary-600 group-hover:text-primary-400 transition-colors">→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function BookingsTab() {
  return (
    <div className="card p-8 text-center text-secondary-400">
      <BookOpen className="w-8 h-8 mx-auto mb-3 opacity-50" />
      <p>Select a turf and date to view and manage bookings.</p>
      <p className="text-xs mt-2">Full booking management with offline marking coming in the next update.</p>
    </div>
  );
}

function AnalyticsTab() {
  const { data: analytics } = useQuery({
    queryKey: ["owner-analytics", 30],
    queryFn: () => analyticsApi.owner({ days: 30 }).then((r) => r.data as OwnerAnalytics),
  });

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <h3 className="font-semibold text-white mb-4">Booking Status Breakdown (30 days)</h3>
        {analytics?.status_breakdown?.length ? (
          <div className="space-y-2">
            {analytics.status_breakdown.map((item) => (
              <div key={item.status} className="flex items-center justify-between">
                <span className="text-sm capitalize text-secondary-300">{item.status.replace("_", " ")}</span>
                <span className="text-sm font-medium text-white">{item.count}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-secondary-500 text-sm">No data yet.</p>
        )}
      </div>
      {analytics && (
        <div className="grid grid-cols-2 gap-4">
          <div className="card p-4 text-center">
            <p className="text-3xl font-bold text-primary-400">৳{analytics.total_revenue.toLocaleString()}</p>
            <p className="text-secondary-400 text-sm mt-1">Total Revenue</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-3xl font-bold text-green-400">৳{analytics.net_revenue.toLocaleString()}</p>
            <p className="text-secondary-400 text-sm mt-1">Net Revenue</p>
          </div>
        </div>
      )}
    </div>
  );
}
