# Turf Booking Platform — Complete System Guide
**Your definitive reference for running, understanding, and controlling the platform.**

---

## 🗺️ What This System Is

A two-sided marketplace (like Foodpanda, but for football/cricket turfs in Rajshahi):

| Who                      | What they do                                                         |
| ------------------------ | -------------------------------------------------------------------- |
| **Platform Admin (you)** | Run everything. Add turfs, manage bookings, see all money            |
| **Turf Owner**           | Manage their turf's calendar, see their bookings, log phone bookings |
| **Player**               | Browse turfs, book slots, pay cash or online                         |

---

## 🟢 How to Start Everything

### Step 1 — Start the database and cache (Docker)
```powershell
cd "e:\Nobho\Arczen Studio\portfolio-projects\turf-system"
docker-compose up -d db redis
```

### Step 2 — Start the Django backend (API + Admin Panel)
```powershell
cd backend
.\venv\Scripts\activate
python manage.py runserver
```
- Backend API: **http://localhost:8000**
- Admin panel: **http://localhost:8000/admin**
- API docs: **http://localhost:8000/api/docs/**

### Step 3 — Start the Next.js frontend
```powershell
cd frontend
npm run dev
```
- Frontend: **http://localhost:3000**

---

## 👑 PLATFORM ADMIN — What You Control

### How to Log In as Admin
Go to: **http://localhost:8000/admin**
- **Username:** your admin phone number (e.g. `01712345678`)
- **Password:** the password you set when running `createsuperuser`

If you haven't created an admin account yet:
```powershell
cd backend
.\venv\Scripts\activate
python manage.py createsuperuser
```

---

### The Django Admin Panel — What's Inside (Now Organized)

#### 📋 USERS section
| Item          | What you do here                                                                 |
| ------------- | -------------------------------------------------------------------------------- |
| **Users**     | See all registered users. Change roles (player/owner/admin), activate/deactivate |
| **Otp Codes** | See every OTP ever sent — code, phone, used/not, expiry                          |
| **Owners**    | See owner applications. Use **"Approve selected owners"** action                 |

#### ⚽ TURFS section (NEW — was missing before)
| Item                    | What you do here                                                      |
| ----------------------- | --------------------------------------------------------------------- |
| **Turfs**               | **Add/edit turfs. Set the price per slot (tariff/base_price).**       |
| **Operating Schedules** | Set open/close hours per day (also editable inline on the Turf page)  |
| **Slot Overrides**      | Block slots for maintenance, or set special prices for specific dates |

#### 📅 BOOKINGS section (NEW — was missing before)
| Item                   | What you do here                                                     |
| ---------------------- | -------------------------------------------------------------------- |
| **Bookings**           | ALL bookings across all turfs. Filter, cancel, mark complete/no-show |
| **Booking Audit Logs** | Read-only history of every status change. Use for dispute resolution |

---

### How to Add a Turf + Set Tariff (Step by Step)

1. Go to **http://localhost:8000/admin**
2. Click **"Turfs"** → click **"+ Add Turf"**
3. Fill in:
   - **Owner** → select the owner
   - **Name** → e.g. "Green Field Turf"
   - **Area** → e.g. "Rajpara"
   - **Address** → full address
   - **Sport types** → `["football"]` or `["football","cricket"]`
   - **Amenities** → `["lights","changing_room","parking","water"]`
   - **Base price** → e.g. `2500` ← **THIS IS THE TARIFF (price per slot in BDT)**
   - **Cancellation hours** → e.g. `3` (free cancellation up to 3 hrs before)
   - **Is active** → ✅ check this to show it to players
4. Scroll down — add **Operating Schedules** inline:
   - Monday: Open 06:00, Close 22:00, Slot: 90 min
   - Repeat for each day
5. Click **Save**

> **"Base price" = "Tariff"** — it is the amount the player pays per 90-minute slot.

---

### How to Add an Owner

**Option A (recommended) — Owner registers themselves:**
1. Owner visits `http://localhost:3000/auth/register`
2. Fills in phone, password, business name
3. You go to Admin → **Owners** → select them → **"Approve selected owners"**

**Option B — You create them manually:**
1. Admin → **Users** → **Add User** → set role to `owner`, set password
2. Admin → **Owners** → **Add Owner** → link to that user, set status to `verified`

---

### How to Manage Bookings
1. Admin → **Bookings**
2. Filter by date, status, turf name
3. Click any booking to see full details and audit trail
4. Admin actions available:
   - ✅ **Mark as Completed** — slot was played
   - ⚠️ **Mark as No-Show** — player didn't come
   - ❌ **Cancel** — dispute or mistake

---

### Platform Fee
Set in `backend/.env`:
```
PLATFORM_FEE_AMOUNT=75
```
This is ৳75 tracked per booking as your revenue. Edit and restart Django to change it.

---

## 🏢 TURF OWNER — What They See

### How an Owner Logs In
1. Go to `http://localhost:3000/auth/login`
2. Click **"Owner Login"** tab
3. Enter phone number + password → **"Sign In to Dashboard"**
4. Redirected to **http://localhost:3000/dashboard**

### Owner Dashboard Tabs
| Tab           | What they see                                                  |
| ------------- | -------------------------------------------------------------- |
| **Overview**  | 7-day stats: bookings, revenue, returning players, net revenue |
| **Bookings**  | Placeholder — full list coming next phase                      |
| **Analytics** | 30-day: booking status breakdown, total + net revenue          |
| **Settings**  | Placeholder — contact admin for turf changes                   |

### Quick Actions on Dashboard
- **Add New Turf** → goes to a turf creation form
- **Block Slots** → placeholder (do this in Django admin for now)
- **Mark Phone Booking** → placeholder (do this in Django admin for now)

---

## 👤 PLAYER — What They See & Do

### How a Player Logs In
1. Go to `http://localhost:3000/auth/login`
2. **"Player Login"** tab is default
3. Enter phone number → **"Send OTP"**
4. A 6-digit OTP is generated
   - **In development:** check Django Admin → OTP Codes → most recent entry for that phone
   - **In production (future):** SMS sent to phone
5. Enter the 6-digit code → **"Verify & Sign In"**
6. Logged in, redirected to homepage

### Player Booking Flow
1. Browse turfs at `http://localhost:3000/`
2. Click a turf to see its detail page (photos, amenities, price, slot calendar)
3. Pick a date → pick an available time slot
4. Enter name, phone, number of players
5. Choose: **Cash on Arrival** / bKash / Nagad
6. Submit → booking confirmed, slot reserved
7. View bookings at **"My Bookings"**

---

## 🐛 Bugs Fixed Today

### Bug 1 — OTP Login: OTP marked "used" but nothing happens
**Root cause:** Backend responds `{ tokens: { access: "...", refresh: "..." }, user: {...} }` but the frontend code read `res.data.access` instead of `res.data.tokens.access` — login silently failed every time.
**Fixed in:** `frontend/app/auth/login/page.tsx`

### Bug 2 — Owner Dashboard crashes (console error)
**Root cause:** `router.push()` was called directly inside the component render body. React forbids state changes (including navigation) during rendering.
**Fixed in:** `frontend/app/dashboard/page.tsx` — moved redirect into `useEffect()`

### Bug 3 — Django Admin had no Turf or Booking management
**Root cause:** The `turfs` and `bookings` Django apps had NO `admin.py` file at all. So turfs, schedules, slot overrides, and bookings were invisible in the admin panel.
**Fixed:** Created complete `admin.py` in both apps.

---

## 📁 File Structure Map

```
turf-system/
├── backend/
│   ├── apps/
│   │   ├── users/
│   │   │   ├── models.py      ← User, OTPCode, Owner
│   │   │   ├── admin.py       ← ✅ Users, OTPs, Owners admin
│   │   │   └── views.py       ← OTP request/verify, owner login
│   │   ├── turfs/
│   │   │   ├── models.py      ← Turf, OperatingSchedule, SlotOverride
│   │   │   ├── admin.py       ← ✅ NEW: Turf admin with pricing/tariff
│   │   │   └── views.py       ← Turf API
│   │   ├── bookings/
│   │   │   ├── models.py      ← Booking, BookingAuditLog
│   │   │   ├── admin.py       ← ✅ NEW: Booking management admin
│   │   │   └── views.py       ← Booking API
│   │   ├── payments/          ← Payouts, fee tracking
│   │   ├── reviews/           ← Ratings
│   │   ├── analytics/         ← Owner + admin stats
│   │   └── notifications/     ← SMS/WhatsApp (Phase 2)
│   └── core/
│       ├── settings/base.py   ← All config (DB, JWT, fees)
│       └── urls.py            ← URL routing
│
├── frontend/
│   ├── app/
│   │   ├── (player)/page.tsx  ← Homepage: turf listing
│   │   ├── auth/login/        ← ✅ FIXED: OTP + Owner login
│   │   ├── auth/register/     ← Owner registration
│   │   └── dashboard/page.tsx ← ✅ FIXED: Owner dashboard
│   └── lib/
│       ├── api.ts             ← All API calls
│       ├── auth.tsx           ← JWT auth context
│       └── types.ts           ← TypeScript types
│
├── docs/
│   └── turf-booking-platform-tech-doc.md
└── docker-compose.yml         ← PostgreSQL + Redis
```

---

## ⚙️ Important Config (backend/.env)

| Setting                             | Default | What it controls                     |
| ----------------------------------- | ------- | ------------------------------------ |
| `PLATFORM_FEE_AMOUNT`               | `75`    | Your fee per booking in BDT          |
| `OTP_EXPIRY_SECONDS`                | `300`   | OTP valid for 5 minutes              |
| `SLOT_LOCK_TTL`                     | `180`   | Redis lock during checkout (seconds) |
| `JWT_ACCESS_TOKEN_LIFETIME_MINUTES` | `60`    | How long login sessions last         |
| `DJANGO_DEBUG`                      | `True`  | Set to `False` in production         |

---

## 🔑 API Endpoints Quick Reference

| Endpoint                              | Who       | What                       |
| ------------------------------------- | --------- | -------------------------- |
| `POST /api/v1/auth/otp/request/`      | Player    | Send OTP                   |
| `POST /api/v1/auth/otp/verify/`       | Player    | Verify OTP → JWT tokens    |
| `POST /api/v1/auth/owner/login/`      | Owner     | Phone + password → JWT     |
| `POST /api/v1/auth/owner/register/`   | New owner | Create account             |
| `GET /api/v1/auth/me/`                | Any       | Get my profile             |
| `GET /api/v1/turfs/`                  | Anyone    | List turfs                 |
| `GET /api/v1/turfs/{id}/slots/?date=` | Anyone    | Slot calendar              |
| `POST /api/v1/turfs/{id}/schedules/`  | Owner     | Add operating hours        |
| `POST /api/v1/turfs/{id}/overrides/`  | Owner     | Block slot / special price |
| `POST /api/v1/bookings/`              | Player    | Create booking             |
| `POST /api/v1/bookings/offline/`      | Owner     | Log phone booking          |
| `GET /api/v1/bookings/mine/`          | Player    | My bookings                |
| `GET /api/v1/bookings/turf/{id}/`     | Owner     | Their turf's bookings      |
| `GET /api/v1/analytics/owner/`        | Owner     | Dashboard stats            |
| `GET /api/v1/analytics/admin/`        | Admin     | Platform stats             |

Full interactive docs: **http://localhost:8000/api/docs/**

---

## 🚦 What's Working vs. What's Next

### ✅ Working Now
- Admin panel: users, OTPs, owner approval, turfs with pricing, bookings
- Player OTP login (fixed)
- Owner dashboard (fixed)
- Turf browsing and slot calendar
- Booking creation + double-booking prevention
- Owner analytics

### 🔨 Build Next (Phase 2)
- Owner "Mark Phone Booking" full UI
- Owner "Block Slots" full UI
- SMS OTP delivery (real SMS gateway)
- bKash / Nagad payment integration
- Player "My Bookings" page
- WhatsApp booking confirmations

### 📋 Later (Phase 3)
- Player reviews/ratings
- Payout tracking + settlement
- Platform-wide admin analytics UI
- Mobile app

---

## 🆘 Common Problems & Fixes

| Problem                               | Solution                                             |
| ------------------------------------- | ---------------------------------------------------- |
| Admin shows database error            | Run `python manage.py migrate`                       |
| OTP marked "used" but login fails     | Fixed — restart frontend                             |
| Dashboard crashes (console error)     | Fixed — restart frontend                             |
| No "Turfs" section in admin           | Fixed — restart Django server                        |
| Owner can't log in ("Not authorized") | Admin → Users → change their role to `owner`         |
| No turfs on homepage                  | Admin → Turfs → Add Turf → set Is Active ✅           |
| OTP never arrives on phone            | Normal in dev — check Admin → OTP Codes for the code |
