# Turf Booking Platform — Technical Specification
### "Foodpanda/Shohoz for Turf" — Rajshahi Pilot
**Version 1.0 — July 2026**

---

## 1. Executive Summary

A two-sided marketplace connecting turf (artificial ground) owners in Rajshahi with players who want to book football/cricket/volleyball slots online. The platform does **not** replace an owner's existing phone-booking system — it adds a parallel online channel that fills off-peak slots, prevents no-show losses through optional prepayment, and gives owners a free digital calendar to track all bookings (online + manual/phone) in one place.

Revenue model: a flat fee of **৳50–100 per booking** made through the platform (not a percentage of the owner's total revenue, and not charged on their existing phone bookings).

MVP scope: **web app only**, mobile-responsive, no native app yet. Payments: **cash-on-arrival by default**, with **direct bKash/Nagad merchant API integration** (no third-party aggregator) as an optional prepayment method.

---

## 2. The Pitch to Owners (Sales Framing)

Lead with pain reduction, not customer acquisition — owners already have enough regulars.

| Pain today | What the platform fixes |
|---|---|
| Dead slots (early morning, weekday afternoon) go unsold | Online discovery brings new players who fill exactly these gaps |
| No-shows on phone bookings waste a paid 1.5-hr slot | Optional online prepayment = real commitment |
| Staff spend time on calls/texts/register-keeping | One shared calendar view (owner still takes phone bookings, just logs them in the dashboard) |
| New-to-town players / students / corporates don't have the owner's number | Searchable public listing = incremental demand, not cannibalized demand |
| No visibility into slot utilization over time | Simple analytics: occupancy %, busiest hours, repeat vs new player split |

**The ask stays small:** "Keep your phone number, keep your regulars, just let us also send you the customers who'd otherwise never have found you — and only pay us when we actually bring you money."

---

## 3. User Roles

1. **Player (Customer)** — browses turfs, books slots, pays cash or online, gets confirmation via SMS/WhatsApp.
2. **Turf Owner / Manager** — manages their turf's profile, pricing, available slots, sees a live calendar of bookings (online + manually entered offline bookings), views payouts.
3. **Platform Admin (you)** — onboards owners, manages disputes, monitors all transactions/commission, views platform-wide analytics, manages payouts to owners.

---

## 4. Core Features

### 4.1 Player-Facing Web App

- **Turf discovery**: list/map view of turfs in Rajshahi, filter by sport (football/cricket/volleyball), price range, area, rating.
- **Turf detail page**: photos, amenities (lights, changing room, parking, water), price per slot, address with map pin, reviews.
- **Live slot calendar**: real-time availability per turf, per day, showing open/booked/blocked slots in 1.5-hr increments across 24 hours.
- **Booking flow**: select date → select slot → enter player count/contact → choose payment method (cash on arrival / bKash / Nagad) → confirmation.
- **Booking management**: "My Bookings" page — upcoming, past, cancel/reschedule (subject to owner's cancellation policy).
- **Notifications**: booking confirmation, reminder 2 hrs before slot, cancellation alerts — via SMS and/or WhatsApp (reuse the Meta WhatsApp Business API integration you're already building for the chatbot agency).
- **Reviews & ratings**: post-play rating for the turf (builds trust, helps discovery ranking).
- **Guest checkout**: no forced signup for first booking (phone number + OTP is enough) — reduces friction; account creation optional for booking history.

### 4.2 Owner Dashboard

- **Slot/calendar management**: define operating hours, block slots for maintenance, set special pricing (peak/off-peak, weekend rates).
- **Unified booking calendar**: shows online bookings automatically; a **"Mark as booked (offline)"** button lets owners log phone bookings so the calendar stays accurate and prevents double-booking.
- **Booking details**: player name, phone, slot, payment status (paid online / pay-at-venue).
- **Payout view**: total bookings this period, platform fee deducted, net payout owed, payout history.
- **Turf profile management**: edit photos, description, amenities, price, contact number.
- **Basic analytics**: occupancy rate by day/hour, revenue trend, repeat customer count, no-show rate.
- **Multi-staff access** (later phase): owner can add a staff login with limited permissions (view/mark bookings only, no pricing changes).

### 4.3 Platform Admin Panel

- **Owner onboarding**: approve new turf listings, verify business details/photos.
- **Global booking monitor**: every transaction across all turfs, real-time.
- **Commission & payout engine**: track fee owed per booking, batch payouts to owners (manual bank transfer/bKash payout initially, automated later).
- **Dispute resolution**: flag/refund/cancel bookings, view player-owner communication log.
- **Platform analytics**: GMV (gross booking value), take rate, active turfs, booking growth, cancellation rate, top-performing turfs/areas.
- **Content moderation**: review flagged reviews, verify turf photos are authentic.
- **SMS/WhatsApp credit monitoring**: usage and cost tracking for notification sending.

---

## 5. Booking & Slot Logic (Core Domain Model)

This is the trickiest part technically — you must **never allow double-booking**, whether the slot was booked online or the owner marked it offline.

**Key design decision: the owner's "mark as booked offline" action and a player's online booking must write to the exact same `bookings` table**, both locking the same slot row. This is what prevents a turf being sold twice.

```
Turf
 └── OperatingSchedule (day-of-week, open_time, close_time, slot_duration=90min)
 └── SlotOverride (date-specific: blocked/maintenance/special price)
 └── Booking
      - turf_id
      - date
      - start_time / end_time
      - source: "online" | "offline_manual"
      - status: "pending_payment" | "confirmed" | "cancelled" | "completed" | "no_show"
      - payment_method: "cash" | "bkash" | "nagad"
      - payment_status: "unpaid" | "paid" | "refunded"
      - player_name, player_phone
      - platform_fee_amount
      - created_by: player_id OR owner_id (if offline)
```

**Concurrency handling:** Use a **database-level unique constraint** on `(turf_id, date, start_time)` for any non-cancelled booking, plus a short-lived lock (Redis, 2–3 min) when a player is mid-checkout on a slot, so two players can't both be filling out payment for the same slot simultaneously. This is the single most important correctness rule in the whole system.

**Cancellation policy:** configurable per turf (e.g., free cancellation up to 3 hrs before slot; after that, no refund). Enforce server-side, not just in UI.

---

## 6. Payment System

**Default: Cash on arrival.** The booking is confirmed instantly online (reserves the slot), the player pays the owner in person. This is the fastest path to launch — zero payment integration risk, zero compliance overhead, and matches how the market already operates.

**Optional: Direct bKash/Nagad prepayment** (no SSLCommerz/ShurjoPay aggregator middleman — you integrate bKash's and Nagad's own Merchant/Checkout APIs directly):
- Reduces per-transaction cost since you skip the aggregator's cut on top of bKash/Nagad's own fee.
- More integration work up front (each has its own sandbox, checkout flow, callback/webhook verification, and settlement process) — budget for this in Phase 2, not MVP week one.
- Useful specifically for reducing no-shows: an online-prepaid booking is a much stronger commitment than a cash-on-arrival one.

**Platform fee collection mechanic:**
- Cash-on-arrival bookings: the ৳50–100 fee is **owed by the owner to the platform**, tracked as a running balance, settled periodically (weekly/monthly) via bKash/bank transfer — similar to how Shohoz/other BD marketplaces net-settle with vendors.
- Online-prepaid bookings: platform collects the full amount, deducts its flat fee, and pays out the remainder (slot price) to the owner on the settlement cycle.

**Do not build your own card processing or hold player funds beyond what's needed for settlement — this avoids most PCI/regulatory overhead for a v1.**

---

## 7. Recommended Tech Stack

Chosen for: fast MVP delivery, self-hosting on your own VPS (reusing the Cloudflare Tunnel setup you already run for Vaultwarden), and staying within tools you already know (Python).

| Layer | Choice | Why |
|---|---|---|
| Frontend | **Next.js (React) + Tailwind CSS** | Server-rendered pages for fast turf listing pages (good for SEO — people will Google "turf Rajshahi"), same JS ecosystem you'll eventually want for a mobile app (React Native reuse later) |
| Backend API | **Django + Django REST Framework**, or **FastAPI** if you want something lighter | You already know Python; Django's admin panel alone can double as a rough internal ops tool in the early days |
| Database | **PostgreSQL** | Strong relational integrity for the booking/slot-locking logic above |
| Caching / slot locks | **Redis** | Short-lived locks during checkout, session cache |
| Auth | **Phone number + OTP** (via local SMS gateway, e.g. a BD bulk SMS provider) for players; email/password for owners & admin | Matches how BD users actually behave — nobody wants to set a password to book a football slot |
| Notifications | **WhatsApp Business Cloud API** (reuse your existing Meta API integration) + **SMS fallback** | Zero-ban-risk since it's the official API, and you're already building this competency |
| File/image storage | **Self-hosted (MinIO on your VPS) or Cloudflare R2** (near-free tier) | Cost-sensitive, avoids AWS S3 bills |
| Hosting | **Your own VPS + Docker Compose**, exposed via **Cloudflare Tunnel** (same pattern as your Vaultwarden setup) | You already have this infra pattern working — reuse it instead of paying for managed hosting |
| Payments | **bKash Merchant API**, **Nagad Merchant API** (direct integration, sandbox → production) | As decided above |
| Maps | **OpenStreetMap + Leaflet.js** (free) instead of Google Maps API (paid at scale) | Cost-sensitive choice; switch to Google Maps only if OSM data quality in Rajshahi proves too sparse |

**Why not a no-code tool (Bubble, etc.)?** Given the slot-locking/double-booking correctness requirement and your existing dev skill set, a real backend is the right call — no-code tools make concurrency-safe booking logic painful.

---

## 8. High-Level Architecture

```
┌─────────────┐      ┌──────────────────┐      ┌─────────────┐
│  Next.js     │◄────►│  Django REST API │◄────►│  PostgreSQL │
│  (Player +   │      │  (Auth, Booking, │      │             │
│  Owner UI)   │      │  Payment, Admin) │      └─────────────┘
└─────────────┘      └────────┬──────────┘
                               │
                    ┌──────────┼───────────┐
                    ▼          ▼           ▼
                 Redis     bKash/Nagad   WhatsApp/SMS
                (locks)     APIs          Gateway
```

All exposed to the internet via **Cloudflare Tunnel** from your VPS — no inbound ports opened, same security model as your Vaultwarden deployment.

---

## 9. Database Schema (Core Tables)

```sql
users (id, phone, name, role[player|owner|admin], created_at)
owners (id, user_id, business_name, verification_status)
turfs (id, owner_id, name, address, lat, lng, sport_types[], amenities[], 
       photos[], base_price, is_active)
operating_schedules (id, turf_id, day_of_week, open_time, close_time, slot_duration_min)
slot_overrides (id, turf_id, date, start_time, end_time, status[blocked|special_price], price)
bookings (id, turf_id, player_id, date, start_time, end_time, source[online|offline],
          status, payment_method, payment_status, platform_fee, amount_paid,
          created_at, cancelled_at)
payments (id, booking_id, provider[bkash|nagad|cash], provider_txn_id, 
          amount, status, created_at)
payouts (id, owner_id, period_start, period_end, gross_amount, fee_deducted, 
         net_payout, status, paid_at)
reviews (id, turf_id, booking_id, player_id, rating, comment, created_at)
notifications_log (id, booking_id, channel[sms|whatsapp], status, sent_at)
```

---

## 10. MVP Phased Roadmap

**Phase 1 — MVP (target: 4–6 weeks, 1–2 turfs pilot)**
- Player web app: browse, view slot calendar, book with cash-on-arrival
- Owner dashboard: calendar view, mark-offline-booking, basic profile edit
- OTP login, SMS booking confirmation
- Admin panel (can be Django's built-in admin, styled minimally)
- Manual payout tracking (spreadsheet is fine at 1–2 turfs)

**Phase 2 — Payments & Scale (weeks 6–12)**
- bKash + Nagad direct prepayment integration
- WhatsApp notifications (reuse your Meta API work)
- Owner analytics dashboard
- Onboard 5–10 more turfs across Rajshahi
- Automated payout batching

**Phase 3 — Growth (month 3+)**
- Reviews/ratings, search ranking by quality
- Referral system for players
- Consider Android app (React Native, reusing Next.js component logic) once web traction is proven
- Expand to other cities if Rajshahi model works

**Do not build the mobile app before the web MVP proves owners will actually use the offline-marking feature and players will actually complete online bookings.** That's the real risk to de-risk first — not the tech.

---

## 11. Security & Compliance Notes

- OTP-based auth avoids storing player passwords.
- Owner/admin accounts: standard hashed passwords (bcrypt/argon2), rate-limited login.
- No card data touches your servers — bKash/Nagad handle that on their end via redirect/webhook flow.
- HTTPS everywhere via Cloudflare (already part of your Tunnel setup).
- Audit log every booking status change (who changed it, when) — essential for dispute resolution ("the owner says I never booked" scenarios).
- Backups: daily PostgreSQL dumps, stored off the VPS (e.g., encrypted to R2/another provider) — booking/payment data must not live in a single point of failure.

---

## 12. Unit Economics (illustrative)

At ৳2,500/slot and a flat ৳75 platform fee (mid-point of your ৳50–100 range):
- Take rate ≈ 3% of slot value — low enough that owners barely notice it, high enough to be sustainable once volume grows.
- Break-even math: if hosting + SMS/WhatsApp costs run roughly ৳3,000–5,000/month at small scale, you need ~50–70 bookings/month across all turfs to cover fixed costs — very achievable with even 3–4 active turfs doing a handful of online bookings a day.

---

## 13. Immediate Next Steps

1. Pick 1–2 friendly turf owners (ideally ones you already know) for the pilot — real feedback from real owners beats building in isolation.
2. Build Phase 1 MVP scoped exactly as above — resist scope creep into payments/apps until the core loop (browse → book → owner sees it → cash paid on-site) is proven.
3. Draft the owner pitch as a one-page flyer using the framing in Section 2 — test it verbally with 2–3 owners before writing a line of code, to make sure the value prop actually lands.
