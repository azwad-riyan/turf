# PROJECT.md
_Last updated: 2026-07-14_

## Identity
- **Name**: Turf Booking Platform
- **Purpose**: Two-sided marketplace for booking artificial turf slots (football/cricket/volleyball) in Rajshahi, Bangladesh — "Foodpanda/Shohoz for Turf"
- **Status**: development

## Stack
- **Language(s)**: Python 3.12 (backend), TypeScript 5 (frontend)
- **Framework(s)**: Django 5 + DRF (backend), Next.js 15 App Router + React 19 (frontend)
- **Database**: PostgreSQL 16
- **Cache / Locks**: Redis 7
- **Key services**: JWT auth, Phone OTP, OpenStreetMap/Leaflet, SMS gateway stub, WhatsApp Business API stub, bKash/Nagad (Phase 2)

## Architecture
- **Pattern**: Monolith (Django) with layered arch: URLs → Views → Services → Models/Managers
- **Entry points**:
  - `backend/core/urls.py` — API root router
  - `frontend/app/layout.tsx` — Next.js root layout
  - `backend/manage.py` — Django management
- **State management**: React Context (auth), TanStack Query (server state)

## Conventions
- **Naming**: snake_case (Python), camelCase/PascalCase (TypeScript)
- **File layout**: Feature-based apps in `backend/apps/`, business logic in `backend/services/`
- **Error handling**: DRF exception handler, custom `AppError` classes, all errors logged
- **Testing**: Django TestCase + pytest (backend), Jest + React Testing Library (frontend)
- **API versioning**: `/api/v1/` prefix on all endpoints

## Active Features
<!-- Auto-updated by CodeTrack -->
- [x] auth → features/auth.md
- [x] turf-management → features/turf-management.md
- [x] booking-engine → features/booking-engine.md
- [x] payments → features/payments.md
- [x] notifications → features/notifications.md
- [x] frontend-player → features/frontend-player.md
- [x] frontend-owner → features/frontend-owner.md

## Critical Notes
<!-- Things Claude must never forget about this project -->
- **NEVER allow double-booking**: Redis lock + DB UniqueConstraint on (turf_id, date, start_time) for non-cancelled bookings is the SINGLE most important correctness requirement
- **Both online AND offline bookings write to the same `bookings` table** — this is what prevents double-booking
- **Phase 1 payments = cash-on-arrival only**. bKash/Nagad is Phase 2.
- **Platform fee = ৳75 flat per booking** (configurable via PLATFORM_FEE_AMOUNT env var)
- **Slot duration = 90 minutes** derived from OperatingSchedule
- **OTP auth for players**, email+password for owners/admin
- Backend runs on port 8000, frontend on port 3000
- All API routes prefixed with `/api/v1/`
- Django admin at `/admin/` for internal ops
