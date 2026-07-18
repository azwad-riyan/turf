# INDEX.md
_Last updated: 2026-07-14_

| File path | Feature(s) | Notes |
|-----------|-----------|-------|
| backend/apps/users/models.py | auth | User, Owner models |
| backend/apps/users/views.py | auth | OTP request/verify, owner login |
| backend/apps/users/serializers.py | auth | Auth serializers |
| backend/apps/users/urls.py | auth | Auth URL routes |
| backend/apps/turfs/models.py | turf-management | Turf, OperatingSchedule, SlotOverride |
| backend/apps/turfs/views.py | turf-management | Turf CRUD, slot availability |
| backend/apps/turfs/serializers.py | turf-management | Turf serializers |
| backend/apps/turfs/urls.py | turf-management | Turf URL routes |
| backend/apps/bookings/models.py | booking-engine | Booking model with UniqueConstraint |
| backend/apps/bookings/views.py | booking-engine | Create/cancel/list bookings |
| backend/apps/bookings/serializers.py | booking-engine | Booking serializers |
| backend/apps/bookings/urls.py | booking-engine | Booking URL routes |
| backend/services/booking_service.py | booking-engine | Redis lock + availability check + create |
| backend/services/slot_service.py | booking-engine | Slot availability computation |
| backend/apps/payments/models.py | payments | Payment, Payout models |
| backend/apps/payments/views.py | payments | Fee tracking, payout list |
| backend/apps/reviews/models.py | payments | Review model |
| backend/apps/reviews/views.py | payments | Review CRUD |
| backend/apps/notifications/models.py | notifications | NotificationLog model |
| backend/services/notification_service.py | notifications | SMS/WhatsApp dispatch stub |
| backend/apps/analytics/views.py | turf-management | Occupancy, revenue analytics |
| backend/core/settings/base.py | auth, booking-engine | Shared Django settings |
| backend/core/urls.py | auth, turf-management, booking-engine | API root URL conf |
| frontend/app/(player)/page.tsx | frontend-player | Homepage / discovery |
| frontend/app/(player)/turfs/page.tsx | frontend-player | Turf listing with filters |
| frontend/app/(player)/turfs/[id]/page.tsx | frontend-player | Turf detail + slot calendar |
| frontend/app/(player)/book/[id]/page.tsx | frontend-player | Multi-step booking flow |
| frontend/app/(player)/my-bookings/page.tsx | frontend-player | Player booking history |
| frontend/app/(owner)/dashboard/page.tsx | frontend-owner | Owner calendar dashboard |
| frontend/app/(owner)/bookings/page.tsx | frontend-owner | Owner booking management |
| frontend/app/(owner)/profile/page.tsx | frontend-owner | Turf profile editor |
| frontend/app/auth/login/page.tsx | auth | OTP / email login page |
| frontend/app/auth/verify/page.tsx | auth | OTP verification page |
| frontend/app/(admin)/admin/page.tsx | auth | Admin overview |
| frontend/components/turf/SlotCalendar.tsx | booking-engine, frontend-player | Slot grid UI |
| frontend/components/turf/TurfCard.tsx | frontend-player | Turf listing card |
| frontend/components/owner/OfflineBookingModal.tsx | frontend-owner | Mark offline booking |
| frontend/lib/api.ts | auth, booking-engine | Typed API client |
| frontend/lib/types.ts | auth, booking-engine | Shared TypeScript types |
| frontend/lib/auth.tsx | auth | Auth context + hooks |
