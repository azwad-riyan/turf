# Deployment Guide: Free Tier Cloud Stack (Option A)

This guide walks you through deploying the Turf Booking Platform to a production-ready, fully free cloud stack using:
1.  **Supabase** (PostgreSQL Database)
2.  **Upstash** (Redis Cache & Slot Locks)
3.  **Koyeb** (Django Backend API)
4.  **Netlify** (Next.js Frontend)

---

## Architecture Overview

```mermaid
graph TD
    Client[Browser / Mobile] -->|HTTPS| Netlify[Netlify: Next.js Frontend]
    Netlify -->|API Requests| Koyeb[Koyeb: Django REST API]
    Koyeb -->|Read/Write| Supabase[Supabase: Postgres DB]
    Koyeb -->|Session Locks & Cache| Upstash[Upstash: Serverless Redis]
```

---

## Phase 1: Database Setup (Supabase)

Supabase provides a generous free tier hosting fully managed PostgreSQL databases.

1.  **Create an Account & Project:**
    *   Sign up at [supabase.com](https://supabase.com/).
    *   Click **New Project**. Select an organization, name your project (e.g., `turf-db`), choose a strong password, and select a region closest to your users.
2.  **Retrieve Database Connection Details:**
    *   Once the database is provisioned, go to **Project Settings** (gear icon) -> **Database**.
    *   Scroll down to the **Connection Settings** section.
    *   Under the **URI** connection string format, you will see a string like:
        `postgresql://postgres.[username]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`
3.  **Extract the Variables:**
    Django expects separate variables. Split the connection string as follows:
    *   **POSTGRES_DB**: `postgres` (or your custom database name)
    *   **POSTGRES_USER**: `postgres.[your-project-id]` (the username displayed in the URI)
    *   **POSTGRES_PASSWORD**: The database password you chose during setup.
    *   **POSTGRES_HOST**: `aws-0-[region].pooler.supabase.com` (use the **Transaction Pooler** host to prevent connection limit exhaustion)
    *   **POSTGRES_PORT**: `6543` (port used by Supabase's transaction pooler)

---

## Phase 2: Cache & Lock Setup (Upstash Redis)

The Turf Booking Platform uses Redis to temporarily lock slots during checkout so that two users cannot book the same slot simultaneously.

1.  **Create an Account & Database:**
    *   Sign up at [upstash.com](https://upstash.com/).
    *   Click **Create Database**.
    *   Name it (e.g., `turf-redis`), select the same region as your Supabase database, and keep the default configuration.
2.  **Retrieve Connection URL:**
    *   Under the database details page, look for the **Redis Connect** section.
    *   Copy the URL under the **redis-cli** or environment variable section. It will look like this:
        `rediss://default:[password]@[endpoint].upstash.io:6379`
    *   *(Note the `rediss://` protocol: the extra `s` ensures an SSL-encrypted connection, which Django supports out of the box).*

---

## Phase 3: Backend Deployment (Koyeb)

Koyeb is a modern developer platform that offers a continuous free tier web service instance that does not sleep.

1.  **Create an Account & App:**
    *   Sign up at [koyeb.com](https://koyeb.com/).
    *   Click **Create Service**.
2.  **Connect GitHub Repository:**
    *   Authenticate with GitHub and select your repository (`turf-system`).
3.  **Configure Service Settings:**
    *   **Work directory**: `backend` (Ensure Koyeb knows Django is inside the backend directory).
    *   **Build Type**: Select **Dockerfile**. Koyeb will automatically detect `/backend/Dockerfile`.
    *   **Instance Type**: Choose **Free** (Nano instance).
    *   **Exposed Port**: `8000` (HTTP).
    *   **Run Command Override** (CRITICAL): By default, the Dockerfile has no startup command. Enable the command override and paste:
        ```bash
        sh -c "python manage.py migrate && python manage.py collectstatic --noinput && gunicorn core.wsgi:application --bind 0.0.0.0:8000"
        ```
        *(This runs database migrations, compiles static assets using WhiteNoise, and launches the production Gunicorn WSGI server).*
4.  **Add Environment Variables:**
    Under the environment variables section, add the following parameters:

    | Key | Value | Notes |
    | :--- | :--- | :--- |
    | `DJANGO_SECRET_KEY` | *[Generate a 50-character random string]* | Security key for signing tokens |
    | `DJANGO_SETTINGS_MODULE` | `core.settings.production` | Enables production security & logging settings |
    | `DJANGO_DEBUG` | `False` | Disables verbose debug pages in production |
    | `POSTGRES_DB` | `postgres` | From Supabase |
    | `POSTGRES_USER` | `postgres.[your-project-id]` | From Supabase |
    | `POSTGRES_PASSWORD` | *[Your Supabase DB Password]* | From Supabase |
    | `POSTGRES_HOST` | `aws-0-[region].pooler.supabase.com` | From Supabase |
    | `POSTGRES_PORT` | `6543` | From Supabase |
    | `REDIS_URL` | `rediss://default:password@name.upstash.io:6379` | From Upstash |
    | `DJANGO_ALLOWED_HOSTS` | `localhost,127.0.0.1,[your-koyeb-subdomain].koyeb.app` | Allow Django to accept requests from these domains |
    | `CORS_ALLOWED_ORIGINS` | `https://[your-netlify-subdomain].netlify.app` | The URL of your live frontend site |

5.  **Deploy:**
    *   Click **Deploy**.
    *   Wait for the build to complete and the service health check to pass. Note down your public URL (e.g., `https://your-koyeb-subdomain.koyeb.app`).

---

## Phase 4: Frontend Deployment (Netlify)

Netlify specializes in frontend Jamstack hosting. It automatically detects and configures Next.js projects.

1.  **Create a Site:**
    *   Log in to [netlify.com](https://netlify.com/).
    *   Click **Add new site** -> **Import an existing project**.
2.  **Configure Git Connection:**
    *   Connect your GitHub account and select the `turf-system` repository.
3.  **Build & Deploy Settings:**
    *   **Base directory**: `frontend`
    *   **Build command**: `npm run build`
    *   **Publish directory**: `frontend/.next`
4.  **Add Environment Variables:**
    In the deployment wizard, click **Advanced build settings** (or go to Site Settings -> Environment Variables after creation) and add:

    | Key | Value | Notes |
    | :--- | :--- | :--- |
    | `NEXT_PUBLIC_API_URL` | `https://[your-koyeb-subdomain].koyeb.app/api` | Point to the Koyeb backend API |
    | `NEXT_PUBLIC_SLOT_LOCK_TTL` | `180` | Lock TTL matching Django config |

5.  **Deploy:**
    *   Click **Deploy site**.
    *   Netlify will build the Next.js pages and deploy the static frontend.
    *   Copy your live Netlify URL (e.g., `https://[your-netlify-subdomain].netlify.app`).
6.  **Update CORS (Crucial):**
    *   Go back to your Koyeb service configurations.
    *   Update `CORS_ALLOWED_ORIGINS` to contain your new Netlify URL.
    *   Redeploy the Koyeb service to apply the change.

---

## Phase 5: Post-Deployment Setup (Create Admin)

Once both apps are running, you must create a Django superuser to access the admin dashboard and create turfs.

1.  **Open Koyeb Console:**
    *   Go to your Koyeb dashboard, select your Backend Service, and navigate to the **Console** tab.
2.  **Run Superuser Command:**
    *   In the web terminal, execute:
        ```bash
        python manage.py createsuperuser
        ```
    *   Provide an email/phone number and password when prompted.
3.  **Seed Initial Data:**
    *   Access `https://[your-koyeb-subdomain].koyeb.app/admin/` using your superuser credentials.
    *   Add your **Owner** profile.
    *   Add your **Turf** profiles.
    *   Configure **Operating Schedules** so time slots are available to customers on the Netlify frontend.

---

## Troubleshooting Common Deployment Issues

### 1. `CORS Error: Origin not allowed`
*   **Symptom:** API calls fail, and browser console displays CORS errors.
*   **Fix:** Double check that `CORS_ALLOWED_ORIGINS` in your Koyeb environment variables exactly matches your Netlify domain (including `https://` but with no trailing slash).

### 2. `Supabase: Connection Timeout / Limit Exceeded`
*   **Symptom:** Backend fails to run migrations or crashes during peaks.
*   **Fix:** Ensure you are using the **Transaction Pooler** port (`6543`) rather than the direct connection port (`5432`) in `POSTGRES_PORT`. This allows Supabase to handle thousands of concurrent queries without exhausting database connection slots.

### 3. `Static Files (Admin Dashboard CSS) Broken`
*   **Symptom:** The Django Admin page looks plain and lacks CSS/styling.
*   **Fix:** Verify that Gunicorn is running with the `collectstatic` command beforehand, and that `whitenoise` is configured under `MIDDLEWARE` in `backend/core/settings/base.py` (which is standard in this codebase).
