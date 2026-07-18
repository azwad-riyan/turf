# Step-by-Step Guide: Running the Turf Booking Platform

This guide walks you through setting up and running the entire Turf Booking Platform locally on your Windows machine.

---

## Prerequisites
Make sure you have the following installed:
*   [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for PostgreSQL and Redis)
*   [Python 3.10+](https://www.python.org/downloads/)
*   [Node.js 18.x or later](https://nodejs.org/) (includes `npm`)

---

## Step 1: Clone & Navigate to the Workspace
Open your PowerShell or Command Prompt terminal in the project root:
```powershell
cd "e:\Nobho\Arczen Studio\portfolio-projects\turf-system"
```

---

## Step 2: Set Up Infrastructure (PostgreSQL & Redis)
We use Docker to run the database and cache system easily.

1.  Make sure Docker Desktop is running.
2.  Start the database and Redis cache containers:
    ```powershell
    docker-compose up -d postgres redis
    ```
3.  Verify the containers are running:
    ```powershell
    docker-compose ps
    ```

---

## Step 3: Configure Backend (Django)

1.  **Navigate to the backend directory:**
    ```powershell
    cd backend
    ```
2.  **Create and activate a Python Virtual Environment:**
    *   **Create the environment:**
        ```powershell
        python -m venv venv
        ```
    *   **Activate it:**
        *   **If using PowerShell:**
            ```powershell
            .\venv\Scripts\Activate.ps1
            ```
            *(If you get a script execution policy error, run `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process` first, then run the activation script).*
        *   **If using Command Prompt (cmd):**
            ```cmd
            .\venv\Scripts\activate.bat
            ```
3.  **Install dependencies:**
    ```powershell
    pip install -r requirements.txt
    ```
    Copy the sample environment file from the root directory to `.env` in the backend directory:
    ```powershell
    copy ..\.env.example .env
    ```
    *(Open the `.env` file and review configuration. The default credentials are ready to work with the Docker containers started in Step 2).*

5.  **Generate and Run Database Migrations:**
    First, generate the migration files for the custom database models:
    ```powershell
    python manage.py makemigrations
    ```
    Then, apply the migrations to create the tables in the database:
    ```powershell
    python manage.py migrate
    ```

6.  **Create a Superuser (Admin Dashboard Access):**
    ```powershell
    python manage.py createsuperuser
    ```
    Follow the prompts to set up an email/username and password.

7.  **Run the Django Development Server:**
    ```powershell
    python manage.py runserver
    ```
    The backend API will now be live at **`http://localhost:8000`**.
    *   **Interactive API Docs:** `http://localhost:8000/api/docs/`
    *   **Django Admin:** `http://localhost:8000/admin/`

---

## Step 4: Configure Frontend (Next.js)

1.  **Open a new terminal window** (leave the backend server running) and navigate to the frontend directory:
    ```powershell
    cd "e:\Nobho\Arczen Studio\portfolio-projects\turf-system\frontend"
    ```
2.  **Install npm packages:**
    ```powershell
    npm install --legacy-peer-deps
    ```
3.  **Verify Environment Setup:**
    Ensure `.env.local` contains:
    ```env
    NEXT_PUBLIC_API_URL=http://localhost:8000/api
    NEXT_PUBLIC_SLOT_LOCK_TTL=180
    ```
4.  **Run the Next.js Development Server:**
    ```powershell
    npm run dev
    ```
    The frontend will now be running at **`http://localhost:3000`**.

---

## Step 5: Verify the Booking Flow (Testing)

### 1. Create a Turf
To book slots, a turf must exist:
1.  Go to `http://localhost:8000/admin/` and sign in with your superuser account.
2.  Navigate to **Owners** and add an owner profile.
3.  Navigate to **Turfs** and create a new turf, linking it to the owner you just created.
4.  Add at least one **Operating Schedule** for the current day of the week (e.g., Day = `1` for Tuesday, start `06:00:00`, end `23:00:00`, duration `90` mins).

### 2. Live Booking Check
1.  Open your browser to `http://localhost:3000`.
2.  Navigate to **Find Turf** and click your newly created Turf.
3.  Select a slot from the live interactive calendar.
4.  Notice the **"In Checkout"** yellow indicator starts (powered by Redis lock mechanism).
5.  Complete the guest checkout form with name and phone number.
6.  Click **Confirm Booking** to finalize the transaction.
7.  Check the terminal logs on the Django server to observe the SMS stub payload logging.
