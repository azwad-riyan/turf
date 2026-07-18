"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import SlotCalendar from "@/components/turf/SlotCalendar";
import { Slot } from "@/lib/types";

interface BookSlotButtonProps {
  turfId: number;
  turfName: string;
  basePrice: number;
}

export default function BookSlotButton({ turfId, turfName, basePrice }: BookSlotButtonProps) {
  const [selectedSlots, setSelectedSlots] = useState<Slot[]>([]);
  const router = useRouter();

  const handleSlotSelect = (slot: Slot) => {
    setSelectedSlots((prev) => {
      const isSelected = prev.some((s) => s.start_time === slot.start_time);
      if (isSelected) {
        return prev.filter((s) => s.start_time !== slot.start_time);
      } else {
        return [...prev, slot];
      }
    });
  };

  const handleBook = () => {
    if (selectedSlots.length === 0) return;
    
    const start_times = selectedSlots.map(s => s.start_time).join(",");
    const end_times = selectedSlots.map(s => s.end_time).join(",");
    const total_price = selectedSlots.reduce((sum, s) => sum + s.price, 0);

    const params = new URLSearchParams({
      turf_id: String(turfId),
      start_times: start_times,
      end_times: end_times,
      price: String(total_price),
    });
    router.push(`/book/${turfId}?${params.toString()}`);
  };

  const totalPrice = selectedSlots.reduce((sum, s) => sum + s.price, 0);

  return (
    <div className="space-y-4">
      <SlotCalendar
        turfId={turfId}
        onSlotSelect={handleSlotSelect}
        selectedSlots={selectedSlots}
      />
      {selectedSlots.length > 0 && (
        <div className="p-4 bg-primary-900/30 rounded-xl border border-primary-800 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-secondary-400">Selected slots</span>
            <span className="text-white font-medium">{selectedSlots.length} slot(s)</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-secondary-400">Total Price</span>
            <span className="text-white font-bold">৳{totalPrice.toLocaleString()}</span>
          </div>
          <button onClick={handleBook} className="btn-primary w-full btn-lg">
            Proceed to Book
          </button>
          <p className="text-xs text-secondary-500 text-center">
            Your slots are reserved for 3 minutes while you complete the booking.
          </p>
        </div>
      )}
    </div>
  );
}
