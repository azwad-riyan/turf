"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, RefreshCw, Info } from "lucide-react";
import { format, addDays, isSameDay } from "date-fns";
import { Slot, SlotStatus } from "@/lib/types";
import { turfsApi } from "@/lib/api";
import { clsx } from "clsx";

interface SlotCalendarProps {
  turfId: number;
  onSlotSelect?: (slot: Slot) => void;
  selectedSlots?: Slot[];
  readOnly?: boolean;
  /** Show owner controls (who booked, offline mark) */
  ownerMode?: boolean;
}

const STATUS_CONFIG: Record<SlotStatus, { class: string; label: string }> = {
  open: { class: "slot-open", label: "Available" },
  booked: { class: "slot-booked", label: "Booked" },
  blocked: { class: "slot-blocked", label: "Blocked" },
  locked: { class: "slot-locked", label: "In Checkout" },
  past: { class: "slot-past", label: "Past" },
};

const formatTimeTo12Hour = (timeStr: string) => {
  if (!timeStr) return "";
  const parts = timeStr.split(":");
  if (parts.length < 2) return timeStr;
  const hour = parseInt(parts[0], 10);
  const min = parts[1];
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${min} ${ampm}`;
};

export default function SlotCalendar({
  turfId,
  onSlotSelect,
  selectedSlots,
  readOnly = false,
  ownerMode = false,
}: SlotCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchSlots = useCallback(async (date: Date) => {
    setLoading(true);
    setError(null);
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      const res = await turfsApi.getSlots(turfId, dateStr);
      setSlots(res.data.slots);
      setLastRefreshed(new Date());
    } catch {
      setError("Could not load slots. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [turfId]);

  useEffect(() => {
    fetchSlots(currentDate);
  }, [currentDate, fetchSlots]);

  // Auto-refresh every 30 seconds for live availability
  useEffect(() => {
    const interval = setInterval(() => fetchSlots(currentDate), 30_000);
    return () => clearInterval(interval);
  }, [currentDate, fetchSlots]);

  const prevDay = () => {
    const prev = addDays(currentDate, -1);
    if (prev >= new Date(new Date().setHours(0, 0, 0, 0))) setCurrentDate(prev);
  };
  const nextDay = () => setCurrentDate(addDays(currentDate, 1));

  const isToday = isSameDay(currentDate, new Date());
  const dateLabel = isToday ? "Today" : format(currentDate, "EEEE, d MMM yyyy");

  return (
    <div className="space-y-4">
      {/* Date Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={prevDay}
            disabled={isToday}
            className="p-2 rounded-lg hover:bg-secondary-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h3 suppressHydrationWarning className="font-semibold text-white">{dateLabel}</h3>
            <p suppressHydrationWarning className="text-xs text-secondary-500">{format(currentDate, "yyyy-MM-dd")}</p>
          </div>
          <button onClick={nextDay} className="p-2 rounded-lg hover:bg-secondary-800 transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <button
          onClick={() => fetchSlots(currentDate)}
          className="flex items-center gap-1.5 text-xs text-secondary-400 hover:text-white transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Date quick-select row */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {Array.from({ length: 7 }).map((_, i) => {
          const d = addDays(new Date(), i);
          const selected = isSameDay(d, currentDate);
          return (
            <button
              key={i}
              onClick={() => setCurrentDate(d)}
              className={clsx(
                "shrink-0 flex flex-col items-center px-3 py-2 rounded-xl text-xs transition-all",
                selected
                  ? "bg-primary-600 text-white"
                  : "bg-secondary-800 text-secondary-400 hover:bg-secondary-700 hover:text-white"
              )}
            >
              <span suppressHydrationWarning className="font-medium">{format(d, "EEE")}</span>
              <span suppressHydrationWarning className="text-lg font-bold leading-tight">{format(d, "d")}</span>
            </button>
          );
        })}
      </div>

      {/* Slots Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 bg-secondary-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="py-8 text-center text-secondary-400">
          <p>{error}</p>
          <button onClick={() => fetchSlots(currentDate)} className="btn-secondary mt-3 btn-sm">Retry</button>
        </div>
      ) : slots.length === 0 ? (
        <div className="py-8 text-center text-secondary-400">
          <p className="text-4xl mb-2">🔒</p>
          <p>No slots available on this day.</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={format(currentDate, "yyyy-MM-dd")}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-2 sm:grid-cols-3 gap-2"
          >
            {slots.map((slot) => {
              const config = STATUS_CONFIG[slot.status];
              const isSelected = selectedSlots?.some((s) => s.start_time === slot.start_time);
              const isClickable = slot.status === "open" && !readOnly;

              return (
                <button
                  key={slot.start_time}
                  onClick={() => isClickable && onSlotSelect?.(slot)}
                  disabled={!isClickable}
                  className={clsx(
                    "relative rounded-xl border p-3 text-left transition-all duration-200 group",
                    isSelected ? "slot-selected ring-2 ring-primary-400" : config.class,
                    isClickable && "hover:scale-[1.02] active:scale-[0.98]"
                  )}
                >
                  <div className="font-semibold text-sm leading-tight">
                    {formatTimeTo12Hour(slot.start_time)}
                  </div>
                  <div className="text-xs opacity-70 mt-0.5">{formatTimeTo12Hour(slot.end_time)}</div>
                  {slot.status === "open" && (
                    <div className="text-xs font-medium mt-1 opacity-90">৳{slot.price.toLocaleString()}</div>
                  )}
                  {slot.status !== "open" && (
                    <div className="text-xs mt-1 opacity-70">{config.label}</div>
                  )}
                  {slot.status === "locked" && (
                    <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                  )}
                </button>
              );
            })}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-2 border-t border-secondary-800">
        {Object.entries(STATUS_CONFIG).map(([key, val]) => (
          <div key={key} className="flex items-center gap-1.5 text-xs text-secondary-400">
            <span className={clsx("w-3 h-3 rounded-sm border", val.class)} />
            {val.label}
          </div>
        ))}
      </div>

      <p suppressHydrationWarning className="text-xs text-secondary-600 flex items-center gap-1">
        <RefreshCw className="w-3 h-3" />
        Auto-refreshes every 30 seconds. Last: {mounted ? format(lastRefreshed, "HH:mm:ss") : "--:--:--"}
      </p>
    </div>
  );
}
