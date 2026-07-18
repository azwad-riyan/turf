"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Clock, User, Phone, Users, CreditCard, ChevronRight, Lock } from "lucide-react";
import { bookingsApi, turfsApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import toast from "react-hot-toast";
import type { Metadata } from "next";

import { Suspense } from "react";

// Steps: 1=Contact Info, 2=Payment, 3=Confirm
const STEPS = [
  { id: 1, label: "Your Details" },
  { id: 2, label: "Payment" },
  { id: 3, label: "Confirm" },
];

interface BookingFormData {
  player_name: string;
  player_phone: string;
  player_count: number;
  payment_method: "cash";
  notes: string;
}

function BookingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const turfId = parseInt(searchParams.get("turf_id") || "0");
  const startTimesStr = searchParams.get("start_times") || "";
  const endTimesStr = searchParams.get("end_times") || "";
  
  const startTimes = startTimesStr ? startTimesStr.split(",") : [];
  const endTimes = endTimesStr ? endTimesStr.split(",") : [];
  
  const price = parseInt(searchParams.get("price") || "0");
  const dateStr = searchParams.get("date") || new Date().toISOString().split("T")[0];

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [lockAcquired, setLockAcquired] = useState(false);
  const [lockTimer, setLockTimer] = useState(180);
  const [completedBooking, setCompletedBooking] = useState<{ id: number } | null>(null);
  const [turfName, setTurfName] = useState("Loading...");
  const [sessionId] = useState(() => Math.random().toString(36).substring(2, 15));

  const [form, setForm] = useState<BookingFormData>({
    player_name: user?.name || "",
    player_phone: user?.phone || "",
    player_count: 1,
    payment_method: "cash",
    notes: "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof BookingFormData, string>>>({});

  useEffect(() => {
    if (!turfId) return;
    turfsApi.get(turfId).then((res) => setTurfName(res.data.name)).catch(() => {});
  }, [turfId]);

  // Acquire slot lock when entering checkout
  useEffect(() => {
    if (!turfId || startTimes.length === 0) return;
    bookingsApi.acquireLock(turfId, dateStr, startTimes, sessionId)
      .then(() => setLockAcquired(true))
      .catch((err: unknown) => {
        const apiErr = (err as { response?: { data?: { error?: { message?: string } } } });
        toast.error(apiErr.response?.data?.error?.message || "One or more slots are already locked or booked");
        router.back();
      });

    // Release lock on unmount
    return () => {
      if (startTimes.length > 0) {
        bookingsApi.releaseLock(turfId, dateStr, startTimes, sessionId).catch(() => {});
      }
    };
  }, [turfId, dateStr, startTimesStr, router, sessionId]);

  // Countdown timer
  useEffect(() => {
    if (!lockAcquired || completedBooking) return;
    const interval = setInterval(() => {
      setLockTimer((t) => {
        if (t <= 1) {
          clearInterval(interval);
          toast.error("Checkout session expired. Please start again.");
          router.back();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockAcquired, completedBooking, router]);

  const validate = () => {
    const errs: Partial<Record<keyof BookingFormData, string>> = {};
    if (!form.player_name.trim()) errs.player_name = "Name is required";
    if (!form.player_phone.trim()) errs.player_phone = "Phone is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await bookingsApi.create({
        turf_id: turfId,
        date: dateStr,
        start_times: startTimes,
        player_name: form.player_name,
        player_phone: form.player_phone,
        player_count: form.player_count,
        payment_method: form.payment_method,
        notes: form.notes,
        session_id: sessionId,
      });
      setCompletedBooking(res.data[0]);
      setStep(3);
      toast.success("Booking confirmed! ✅");
    } catch (err: unknown) {
      const apiErr = (err as { response?: { data?: { error?: { message?: string } } } });
      toast.error(apiErr.response?.data?.error?.message || "Booking failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const timerColor = lockTimer < 60 ? "text-red-400" : lockTimer < 120 ? "text-yellow-400" : "text-primary-400";
  const timerMin = Math.floor(lockTimer / 60);
  const timerSec = lockTimer % 60;

  if (completedBooking) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
          <div className="w-20 h-20 bg-primary-900/40 border border-primary-700 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-primary-400" />
          </div>
        </motion.div>
        <h1 className="font-display text-3xl font-bold text-white mb-2">Booking Confirmed!</h1>
        <p className="text-secondary-400 mb-6">Your slot has been reserved. See you on the field!</p>
        <div className="card p-5 text-left space-y-3 mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-secondary-400">Turf</span>
            <span className="text-white font-medium">{turfName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-secondary-400">Date</span>
            <span className="text-white">{dateStr}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-secondary-400">Time</span>
            <span className="text-white">{startTimes.length > 1 ? `${startTimes.length} slots` : `${startTimes[0]} – ${endTimes[0]}`}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-secondary-400">Amount</span>
            <span className="text-white font-bold">৳{price.toLocaleString()} (cash on arrival)</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-secondary-400">Booking ID</span>
            <span className="text-primary-400 font-mono">#{completedBooking.id}</span>
          </div>
        </div>
        <p className="text-sm text-secondary-400 mb-6">
          A confirmation SMS has been sent to {form.player_phone}.
        </p>
        <button onClick={() => router.push("/")} className="btn-primary w-full">Back to Home</button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      {/* Timer */}
      {lockAcquired && (
        <div className={`flex items-center gap-2 mb-6 p-3 rounded-xl bg-secondary-800/50 border border-secondary-700 text-sm ${timerColor}`}>
          <Lock className="w-4 h-4" />
          <span>Slot reserved for: <strong>{timerMin}:{timerSec.toString().padStart(2, "0")}</strong></span>
        </div>
      )}

      {/* Slot summary */}
      <div className="card p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-semibold">{turfName}</p>
            <p className="text-sm text-secondary-400">{dateStr} · {startTimes.length > 1 ? `${startTimes.length} slots selected` : `${startTimes[0]} – ${endTimes[0]}`}</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-white">৳{price.toLocaleString()}</p>
            <p className="text-xs text-secondary-500">cash on arrival</p>
          </div>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2 flex-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
              step >= s.id ? "bg-primary-600 text-white" : "bg-secondary-800 text-secondary-500"
            }`}>
              {s.id}
            </div>
            <span className={`text-xs hidden sm:block ${step === s.id ? "text-white" : "text-secondary-500"}`}>{s.label}</span>
            {i < STEPS.length - 1 && <div className={`h-px flex-1 ${step > s.id ? "bg-primary-700" : "bg-secondary-800"}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Contact Info */}
      {step === 1 && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
          <h2 className="font-display text-xl font-bold text-white">Your Details</h2>
          <p className="text-sm text-secondary-400">No account needed — just your name and phone number.</p>
          <div>
            <label className="label"><User className="inline w-3.5 h-3.5 mr-1" />Full Name</label>
            <input className={`input ${errors.player_name ? "border-red-500" : ""}`} placeholder="Your full name" value={form.player_name} onChange={(e) => setForm({ ...form, player_name: e.target.value })} />
            {errors.player_name && <p className="text-red-400 text-xs mt-1">{errors.player_name}</p>}
          </div>
          <div>
            <label className="label"><Phone className="inline w-3.5 h-3.5 mr-1" />Phone Number</label>
            <input className={`input ${errors.player_phone ? "border-red-500" : ""}`} placeholder="01XXXXXXXXX" value={form.player_phone} onChange={(e) => setForm({ ...form, player_phone: e.target.value })} />
            {errors.player_phone && <p className="text-red-400 text-xs mt-1">{errors.player_phone}</p>}
          </div>
          <div>
            <label className="label">Notes (optional)</label>
            <textarea className="input resize-none" rows={2} placeholder="e.g. need extra nets, or special requests" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <button onClick={() => { if (validate()) setStep(2); }} className="btn-primary w-full btn-lg">
            Continue <ChevronRight className="w-5 h-5" />
          </button>
        </motion.div>
      )}

      {/* Step 2: Payment */}
      {step === 2 && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
          <h2 className="font-display text-xl font-bold text-white">Payment Method</h2>
          <div className="card p-5 border-primary-700 bg-primary-900/20">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-primary-700 rounded-xl flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-white">Cash on Arrival</p>
                <p className="text-xs text-secondary-400">Pay when you arrive at the turf</p>
              </div>
              <div className="ml-auto w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
            </div>
            <p className="text-sm text-secondary-400">Your slot is reserved now. Pay ৳{price.toLocaleString()} in cash directly to the turf owner when you arrive.</p>
          </div>

          <div className="p-4 rounded-xl bg-secondary-800/50 border border-secondary-700 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-secondary-400">Slot price</span>
              <span className="text-white">৳{price.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary-400">Platform fee</span>
              <span className="text-white font-medium">৳0</span>
            </div>
            <div className="border-t border-secondary-700 pt-2 flex justify-between font-bold">
              <span className="text-white">You pay</span>
              <span className="text-primary-400">৳{price.toLocaleString()} cash</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="btn-secondary flex-1">Back</button>
            <button onClick={() => setStep(3)} className="btn-primary flex-1">
              Review Booking <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Step 3: Confirm */}
      {step === 3 && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
          <h2 className="font-display text-xl font-bold text-white">Confirm Booking</h2>
          <div className="card p-5 space-y-3">
            {[
              { label: "Name", value: form.player_name },
              { label: "Phone", value: form.player_phone },
              { label: "Date", value: dateStr },
              { label: "Time", value: startTimes.length > 1 ? `${startTimes.length} slots` : `${startTimes[0]} – ${endTimes[0]}` },
              { label: "Payment", value: "Cash on arrival" },
              { label: "Amount", value: `৳${price.toLocaleString()}` },
            ].map((item) => (
              <div key={item.label} className="flex justify-between text-sm">
                <span className="text-secondary-400">{item.label}</span>
                <span className="text-white font-medium">{item.value}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-secondary-500 text-center">
            By confirming, you agree to the turf&apos;s cancellation policy.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="btn-secondary flex-1">Back</button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="btn-primary flex-1 btn-lg"
            >
              {loading ? "Booking..." : "Confirm Booking ✅"}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-secondary-400 font-medium">Loading checkout...</p></div>}>
      <BookingForm />
    </Suspense>
  );
}
