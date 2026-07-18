"""
SlotService — computes available slots for a turf on a given date.

Algorithm:
  1. Load OperatingSchedule for the day-of-week
  2. Generate all possible slot windows (start_time, end_time) across the operating day
  3. Load all active Bookings for that turf + date
  4. Load all SlotOverrides for that turf + date
  5. Load all Redis checkout locks
  6. Return a list of SlotInfo objects with status: open | booked | blocked | locked
"""
import logging
from dataclasses import dataclass
from datetime import date, time, datetime, timedelta
from typing import List, Optional

from django.conf import settings

from apps.bookings.models import Booking
from apps.turfs.models import Turf, OperatingSchedule, SlotOverride
from services.booking_service import BookingService, get_redis, _slot_lock_key

logger = logging.getLogger(__name__)


@dataclass
class SlotInfo:
    start_time: time
    end_time: time
    status: str          # "open" | "booked" | "blocked" | "locked" | "past"
    price: int
    booking_id: Optional[int] = None
    override_id: Optional[int] = None

    def to_dict(self) -> dict:
        return {
            "start_time": self.start_time.strftime("%H:%M"),
            "end_time": self.end_time.strftime("%H:%M"),
            "status": self.status,
            "price": self.price,
            "booking_id": self.booking_id,
            "label": f"{self.start_time.strftime('%I:%M %p')} – {self.end_time.strftime('%I:%M %p')}",
        }


class SlotService:
    def get_slots_for_date(self, turf: Turf, slot_date: date) -> List[SlotInfo]:
        """
        Return all slot windows for a turf on a given date, each with its status.
        """
        day_of_week = slot_date.weekday()

        try:
            schedule = turf.schedules.get(day_of_week=day_of_week)
            if schedule.is_closed:
                return []
            open_time = schedule.open_time
            close_time = schedule.close_time
            duration_min = schedule.slot_duration_min
        except OperatingSchedule.DoesNotExist:
            # Default to always open (24/7) with 90-minute slots starting from 12:00 AM (00:00)
            open_time = time(0, 0)
            close_time = time(0, 0)
            duration_min = 90

        # 1. Generate all slot windows for the day
        slots = self._generate_slot_windows(
            open_time, close_time, duration_min, turf.base_price
        )

        # 2. Mark booked slots
        active_bookings = Booking.objects.filter(
            turf=turf, date=slot_date
        ).exclude(status=Booking.CANCELLED).values("start_time", "id")
        booked_map = {b["start_time"]: b["id"] for b in active_bookings}

        # 3. Mark overrides
        overrides = list(SlotOverride.objects.filter(turf=turf, date=slot_date))

        # 4. Check Redis locks
        r = get_redis()

        now = datetime.now().time()

        for slot in slots:
            # Past slots
            if slot_date == date.today() and slot.start_time < now:
                slot.status = "past"
                continue

            if slot.start_time in booked_map:
                slot.status = "booked"
                slot.booking_id = booked_map[slot.start_time]
                continue

            # Check override overlap (blocks or special prices)
            slot_start_dt = datetime.combine(slot_date, slot.start_time)
            slot_end_dt = datetime.combine(slot_date, slot.end_time)
            if slot_end_dt <= slot_start_dt:
                slot_end_dt += timedelta(days=1)

            overlapping_override = None
            for ov in overrides:
                ov_start_dt = datetime.combine(ov.date, ov.start_time)
                ov_end_dt = datetime.combine(ov.date, ov.end_time)
                if ov_end_dt <= ov_start_dt:
                    ov_end_dt += timedelta(days=1)

                if slot_start_dt < ov_end_dt and slot_end_dt > ov_start_dt:
                    overlapping_override = ov
                    break

            if overlapping_override:
                if overlapping_override.status == SlotOverride.BLOCKED:
                    slot.status = "blocked"
                    slot.override_id = overlapping_override.id
                    continue
                elif overlapping_override.status == SlotOverride.SPECIAL_PRICE:
                    slot.price = overlapping_override.price or slot.price

            # Check Redis lock
            lock_key = _slot_lock_key(turf.id, slot_date, slot.start_time)
            if r.exists(lock_key):
                slot.status = "locked"
                continue

            slot.status = "open"

        return slots

    @staticmethod
    def _generate_slot_windows(
        open_time: time, close_time: time, duration_min: int, base_price: int
    ) -> List[SlotInfo]:
        slots = []
        dt_open = datetime.combine(date.today(), open_time)
        dt_close = datetime.combine(date.today(), close_time)
        if dt_close <= dt_open:
            dt_close += timedelta(days=1)
        duration = timedelta(minutes=duration_min)

        current = dt_open
        while current + duration <= dt_close:
            slots.append(
                SlotInfo(
                    start_time=current.time(),
                    end_time=(current + duration).time(),
                    status="open",
                    price=base_price,
                )
            )
            current += duration

        return slots

    def get_availability_for_range(self, turf: Turf, start_date: date, end_date: date) -> dict:
        """Returns {date_str: [SlotInfo]} for a date range (used for calendar month view)."""
        result = {}
        current = start_date
        while current <= end_date:
            slots = self.get_slots_for_date(turf, current)
            result[current.isoformat()] = [s.to_dict() for s in slots]
            current += timedelta(days=1)
        return result
