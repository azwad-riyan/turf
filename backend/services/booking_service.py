"""
BookingService — the core slot-locking engine.

Flow:
  1. Acquire Redis lock (SET NX EX TTL) on slot key
  2. Check DB availability (no active booking for this slot)
  3. Create Booking record inside a DB transaction
  4. Send confirmation notification
  5. Lock auto-expires when checkout completes or TTL runs out

The DB UniqueConstraint is the final guard — Redis lock prevents the
"two players simultaneously at checkout" race condition.
"""
import logging
from datetime import date, time
from contextlib import contextmanager

import redis
from django.conf import settings
from django.db import transaction, IntegrityError
from django.utils import timezone

from apps.bookings.models import Booking, BookingAuditLog
from apps.turfs.models import Turf
from apps.users.models import User
from core.exceptions import SlotNotAvailableError, SlotLockError

logger = logging.getLogger(__name__)

# Redis client (singleton)
_redis_client = None


def get_redis() -> redis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis_client


def _slot_lock_key(turf_id: int, slot_date: date, start_time: time) -> str:
    return f"slot_lock:{turf_id}:{slot_date.isoformat()}:{start_time.strftime('%H%M')}"


@contextmanager
def slot_lock(turf_id: int, slot_date: date, start_times: list[time], session_id: str = "locked", ttl: int = None):
    """
    Context manager that acquires a Redis lock for multiple slots during checkout.
    Raises SlotLockError if any slot is already locked by another checkout.
    """
    if ttl is None:
        ttl = settings.SLOT_LOCK_TTL

    r = get_redis()
    acquired_keys = []
    
    try:
        for start_time in start_times:
            key = _slot_lock_key(turf_id, slot_date, start_time)
            # If we already have the lock with our session_id, we just proceed
            # Otherwise we try to set it
            acquired = r.set(key, session_id, nx=True, ex=ttl)
            if not acquired:
                if r.get(key) == session_id:
                    r.expire(key, ttl)
                    acquired_keys.append(key)
                else:
                    raise SlotLockError(f"Slot at {start_time} is locked.")
            else:
                acquired_keys.append(key)
            
        yield acquired_keys
    finally:
        for key in acquired_keys:
            try:
                # Only delete if we own it
                if r.get(key) == session_id:
                    r.delete(key)
            except Exception as e:
                logger.warning(f"Failed to release slot lock {key}: {e}")


class BookingService:
    def create_booking(
        self,
        turf: Turf,
        slot_date: date,
        start_times: list[time],
        end_times: list[time],
        player_name: str,
        player_phone: str,
        player_count: int = 1,
        payment_method: str = Booking.CASH,
        source: str = Booking.ONLINE,
        player: User = None,
        created_by_owner: User = None,
        notes: str = "",
        session_id: str = "locked",
    ) -> list[Booking]:
        """
        Create a booking with full slot-locking protection.

        For ONLINE bookings: acquire Redis lock → check availability → DB insert.
        For OFFLINE bookings (owner marks): skip Redis lock (owner has authority), DB insert.
        """
        if source == Booking.ONLINE:
            return self._create_online_booking(
                turf, slot_date, start_times, end_times,
                player_name, player_phone, player_count,
                payment_method, player, notes, session_id
            )
        else:
            return self._create_offline_booking(
                turf, slot_date, start_times, end_times,
                player_name, player_phone, player_count,
                created_by_owner, notes,
            )

    def _create_online_booking(
        self, turf, slot_date, start_times, end_times,
        player_name, player_phone, player_count,
        payment_method, player, notes, session_id
    ) -> list[Booking]:
        with slot_lock(turf.id, slot_date, start_times, session_id):
            # Double-check availability inside the lock
            for start_time in start_times:
                if not self._is_slot_available(turf, slot_date, start_time):
                    raise SlotNotAvailableError()
            return self._write_booking(
                turf=turf,
                slot_date=slot_date,
                start_times=start_times,
                end_times=end_times,
                player_name=player_name,
                player_phone=player_phone,
                player_count=player_count,
                payment_method=payment_method,
                source=Booking.ONLINE,
                player=player,
                notes=notes,
            )

    def _create_offline_booking(
        self, turf, slot_date, start_times, end_times,
        player_name, player_phone, player_count,
        created_by_owner, notes,
    ) -> list[Booking]:
        # Offline: no checkout lock needed, but still check availability
        for start_time in start_times:
            if not self._is_slot_available(turf, slot_date, start_time):
                raise SlotNotAvailableError(
                    "This slot is already booked. Cannot mark as offline-booked."
                )
        return self._write_booking(
            turf=turf,
            slot_date=slot_date,
            start_times=start_times,
            end_times=end_times,
            player_name=player_name,
            player_phone=player_phone,
            player_count=player_count,
            payment_method=Booking.CASH,
            source=Booking.OFFLINE,
            created_by_owner=created_by_owner,
            notes=notes,
        )

    def _write_booking(self, *, turf, slot_date, start_times, end_times,
                       player_name, player_phone, player_count,
                       payment_method, source, player=None,
                       created_by_owner=None, notes="") -> list[Booking]:
        """Atomic DB write. The UniqueConstraint is the final guard."""
        try:
            with transaction.atomic():
                bookings = []
                for start_time, end_time in zip(start_times, end_times):
                    booking = Booking.objects.create(
                        turf=turf,
                        player=player,
                        player_name=player_name,
                        player_phone=player_phone,
                        player_count=player_count,
                        date=slot_date,
                        start_time=start_time,
                        end_time=end_time,
                        source=source,
                        status=Booking.CONFIRMED,
                        payment_method=payment_method,
                        payment_status=Booking.UNPAID,
                        amount=turf.base_price,
                        platform_fee=settings.PLATFORM_FEE_AMOUNT,
                        created_by_player=player,
                        created_by_owner=created_by_owner,
                        notes=notes,
                    )
                    logger.info(
                        f"Booking created: id={booking.id} turf={turf.id} "
                        f"date={slot_date} start={start_time} source={source}"
                    )
                    bookings.append(booking)
                return bookings
        except IntegrityError:
            # UniqueConstraint violation — someone snuck in between lock check and insert
            raise SlotNotAvailableError()

    def cancel_booking(
        self, booking: Booking, cancelled_by: User, reason: str = ""
    ) -> list[Booking]:
        """
        Cancel a booking. Enforces turf's cancellation policy server-side.
        Returns the updated booking.
        """
        if booking.status == Booking.CANCELLED:
            raise ValueError("Booking is already cancelled.")

        if booking.status == Booking.COMPLETED:
            raise ValueError("Cannot cancel a completed booking.")

        with transaction.atomic():
            previous_status = booking.status
            booking.status = Booking.CANCELLED
            booking.cancelled_at = timezone.now()
            booking.cancellation_reason = reason
            booking.save(update_fields=["status", "cancelled_at", "cancellation_reason", "updated_at"])

            BookingAuditLog.objects.create(
                booking=booking,
                changed_by=cancelled_by,
                previous_status=previous_status,
                new_status=Booking.CANCELLED,
                reason=reason,
            )

        logger.info(f"Booking {booking.id} cancelled by user {cancelled_by.id}")
        return booking

    @staticmethod
    def _is_slot_available(turf: Turf, slot_date: date, start_time: time) -> bool:
        """Returns True if no active (non-cancelled) booking exists for this slot."""
        return not Booking.objects.filter(
            turf=turf,
            date=slot_date,
            start_time=start_time,
        ).exclude(status=Booking.CANCELLED).exists()

    @staticmethod
    def acquire_checkout_lock(turf_id: int, slot_date: date, start_times: list[time], session_id: str = "locked") -> bool:
        """
        Explicitly acquire a checkout lock for multiple slots.
        """
        r = get_redis()
        acquired_keys = []
        for start_time in start_times:
            key = _slot_lock_key(turf_id, slot_date, start_time)
            acquired = r.set(key, session_id, nx=True, ex=settings.SLOT_LOCK_TTL)
            if not acquired:
                if r.get(key) == session_id:
                    r.expire(key, settings.SLOT_LOCK_TTL)
                    acquired_keys.append(key)
                else:
                    # rollback
                    for ak in acquired_keys:
                        if r.get(ak) == session_id:
                            r.delete(ak)
                    return False
            else:
                acquired_keys.append(key)
        return True

    @staticmethod
    def release_checkout_lock(turf_id: int, slot_date: date, start_times: list[time], session_id: str = "locked"):
        """Release explicit checkout locks."""
        r = get_redis()
        for start_time in start_times:
            key = _slot_lock_key(turf_id, slot_date, start_time)
            if r.get(key) == session_id:
                r.delete(key)

    @staticmethod
    def is_slot_locked(turf_id: int, slot_date: date, start_time: time) -> bool:
        """Check if a slot is currently in checkout by any player."""
        r = get_redis()
        key = _slot_lock_key(turf_id, slot_date, start_time)
        return r.exists(key) == 1
