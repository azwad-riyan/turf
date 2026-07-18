# ⚽ Turf Booking Platform

> **"Foodpanda/Shohoz for Turf" — Rajshahi Pilot**
> A two-sided marketplace connecting turf owners with players for online football/cricket/volleyball slot booking.

## Architecture

```
Next.js 15 (Frontend) ←→ Django REST API (Backend) ←→ PostgreSQL
                                    │
                          ┌─────────┼──────────┐
                          ▼         ▼          ▼
                        Redis    bKash/Nagad  SMS/WhatsApp
                      (locks)      APIs        Gateway
```

All services run in Docker Compose, exposed via Cloudflare Tunnel.

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local frontend dev without Docker)
- Python 3.12+ (for local backend dev without Docker)

### 1. Clone & Configure
```bash
cp .env.example .env
# Edit .env with your values
```

### 2. Run with Docker
```bash
docker compose up -d
```

Services:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000/api
- **Django Admin**: http://localhost:8000/admin

### 3. Create Admin User
```bash
docker compose exec backend python manage.py createsuperuser
```

## Local Development (without Docker)

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Project Structure

```
turf-system/
├── backend/                 # Django REST Framework API
│   ├── apps/
│   │   ├── users/           # Auth (OTP + email/password)
│   │   ├── turfs/           # Turf profiles & schedules
│   │   ├── bookings/        # Booking engine (slot locking)
│   │   ├── payments/        # Fee tracking & payouts
│   │   ├── reviews/         # Ratings & reviews
│   │   ├── notifications/   # SMS/WhatsApp stubs
│   │   └── analytics/       # Occupancy & revenue stats
│   ├── services/            # Business logic layer
│   └── core/                # Django project settings
├── frontend/                # Next.js 15 App Router
│   ├── app/
│   │   ├── (player)/        # Player-facing pages
│   │   ├── (owner)/         # Owner dashboard
│   │   ├── (admin)/         # Admin panel
│   │   └── auth/            # Login / OTP verify
│   ├── components/          # Reusable UI components
│   └── lib/                 # API client, types, auth
├── docs/                    # Technical documentation
└── .codetrack/              # CodeTrack change tracking
```

## User Roles

| Role | Access | Auth Method |
|------|--------|-------------|
| **Player** | Browse, book, review turfs | Phone OTP |
| **Owner** | Manage turf, calendar, bookings, payouts | Email + Password |
| **Admin** | All platform operations, disputes, analytics | Email + Password (superuser) |

## Key Technical Decisions

### Double-Booking Prevention
The booking engine uses a **two-layer lock**:
1. **Redis lock** (`SET NX EX 180`): Short-lived lock while player is mid-checkout (~3 min)
2. **DB unique constraint** on `bookings(turf_id, date, start_time)` filtered to non-cancelled: Final guard against race conditions

### Payment Flow (Phase 1)
- All bookings are **cash-on-arrival** — slot is reserved, player pays owner in person
- Platform fee (৳50–100) is tracked as owner's running balance, settled periodically
- Phase 2 adds bKash/Nagad direct API integration

### Slot Logic
- Slots are 1.5hr (90 min) increments derived from `OperatingSchedule`
- Owners can create `SlotOverride` records to block slots or set special pricing
- Both online bookings and offline (phone) bookings write to the same `bookings` table

## MVP Roadmap

- **Phase 1** (current): Browse, book (cash), owner calendar, OTP login, admin
- **Phase 2**: bKash/Nagad payments, WhatsApp notifications, owner analytics
- **Phase 3**: Reviews ranking, referrals, Android app (React Native)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, Tailwind CSS, TypeScript |
| Backend | Django 5, Django REST Framework |
| Database | PostgreSQL 16 |
| Cache / Locks | Redis 7 |
| Maps | OpenStreetMap + Leaflet.js |
| Auth | JWT (DRF Simple JWT) + Phone OTP |
| Hosting | Docker Compose + Cloudflare Tunnel |
| Storage | Local / Cloudflare R2 |
