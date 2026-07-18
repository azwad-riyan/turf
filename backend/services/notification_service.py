"""
Notification service — SMS and WhatsApp dispatch.
Phase 1: Stubs that log intent but don't actually send.
Phase 2: Connect to BD bulk SMS gateway and WhatsApp Business Cloud API.
"""
import logging
from typing import Optional

from django.conf import settings

logger = logging.getLogger(__name__)


class NotificationService:
    def send_otp_sms(self, phone: str, otp_code: str) -> bool:
        """Send OTP via SMS."""
        message = f"Your TurfBook OTP is: {otp_code}. Valid for {settings.OTP_EXPIRY_SECONDS // 60} minutes."
        return self._send_sms(phone, message)

    def send_booking_confirmation(self, phone: str, booking) -> bool:
        """Send booking confirmation via SMS/WhatsApp."""
        message = (
            f"Booking confirmed! {booking.turf.name}\n"
            f"Date: {booking.date.strftime('%d %b %Y')}\n"
            f"Time: {booking.slot_label}\n"
            f"Payment: {'Cash on arrival' if booking.payment_method == 'cash' else booking.payment_method.upper()}\n"
            f"Booking ID: #{booking.id}"
        )
        return self._send_sms(phone, message)

    def send_booking_reminder(self, phone: str, booking) -> bool:
        """Send 2-hour reminder before slot."""
        message = (
            f"Reminder: Your turf booking is in 2 hours!\n"
            f"{booking.turf.name} — {booking.slot_label}\n"
            f"See you there!"
        )
        return self._send_sms(phone, message)

    def send_cancellation_notice(self, phone: str, booking) -> bool:
        """Send cancellation confirmation."""
        message = (
            f"Your booking at {booking.turf.name} on "
            f"{booking.date.strftime('%d %b %Y')} ({booking.slot_label}) has been cancelled."
        )
        return self._send_sms(phone, message)

    def _send_sms(self, phone: str, message: str) -> bool:
        """
        Phase 1: Log only.
        Phase 2: Integrate BD bulk SMS gateway (e.g. Mim SMS, Bulk SMS BD).
        """
        if not settings.SMS_GATEWAY_API_KEY:
            logger.info(f"[SMS STUB] To: {phone} | Message: {message}")
            return True

        # Phase 2 implementation:
        # import httpx
        # response = httpx.post(
        #     settings.SMS_GATEWAY_URL,
        #     json={"api_key": settings.SMS_GATEWAY_API_KEY,
        #           "sender_id": settings.SMS_GATEWAY_SENDER_ID,
        #           "to": phone, "message": message}
        # )
        # return response.status_code == 200
        logger.warning("SMS_GATEWAY_API_KEY set but Phase 2 integration not implemented.")
        return False

    def _send_whatsapp(self, phone: str, template_name: str, params: list) -> bool:
        """
        Phase 2: WhatsApp Business Cloud API.
        Reuse existing Meta API integration.
        """
        if not settings.WHATSAPP_API_TOKEN:
            logger.info(f"[WHATSAPP STUB] To: {phone} | Template: {template_name}")
            return True
        # Phase 2: implement Meta Cloud API call
        return False
