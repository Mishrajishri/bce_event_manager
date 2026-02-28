# BCE Event Manager - Complete Setup Guide

## Project Overview

BCE Event Manager is a comprehensive event management platform for organizing sports tournaments, tech fests, seminars, and all types of events. It includes real-time analytics, financial tracking, and role-based access control.

### Tech Stack
- **Backend:** FastAPI (Python)
- **Database & Auth:** Supabase (PostgreSQL + Supabase Auth)
- **Frontend:** React 18 + TypeScript + Vite
- **UI Components:** Material UI (MUI)
- **Charts:** Recharts
- **State Management:** Zustand + React Query
- **Deployment:** Vercel (frontend) + Render (backend)

---

## Step-by-Step Setup Guide

### Prerequisites
- Node.js 18+ installed
- Python 3.11+ installed
- Supabase account (free tier works)

---

### Step 1: Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project:
   - Name: `bce-event-manager`
   - Database Password: Create a strong password (save it)
   - Region: Choose closest to you
3. Wait for the project to be provisioned (1-2 minutes)

4. In the Supabase dashboard:
   - Go to **Settings** → **API**
   - Copy the **Project URL** and **anon public key**
   - Save these for later

5. Set up the database:
   - Go to **SQL Editor** in the left sidebar
   - Copy the entire content from `supabase/schema.sql`
   - Paste and run the SQL
   - This creates all tables, indexes, and security policies

---

### Step 2: Configure Backend

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   ```

3. Activate the virtual environment:
   - **macOS/Linux:** `source venv/bin/activate`
   - **Windows:** `venv\Scripts\activate`

4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

5. Create the environment file:
   ```bash
   cp .env.example .env
   ```

6. Edit `.env` with your Supabase credentials:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   APP_ENV=development
   APP_DEBUG=true
   APP_HOST=0.0.0.0
   APP_PORT=8000
   CORS_ORIGINS=http://localhost:5173
   ```

   To get `SUPABASE_SERVICE_ROLE_KEY`:
   - Go to Supabase Dashboard → Settings → API
   - Find "Service role key" (click to reveal)

7. Run the backend server:
   ```bash
   python main.py
   ```

8. The API will be available at `http://localhost:8000`
   - API docs: `http://localhost:8000/docs`

---

### Step 3: Configure Frontend

1. Open a new terminal and navigate to the frontend:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create the environment file:
   ```bash
   cp .env.example .env
   ```

4. Edit `.env` with your credentials:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_API_URL=http://localhost:8000/api
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. The frontend will be available at `http://localhost:5173`

---

### Step 4: Test the Application

1. Open browser to `http://localhost:5173`

2. Register a new user:
   - Click "Register"
   - Enter email, password, name
   - Select role: "Organizer" (to create events) or "Attendee"

3. If you registered as Organizer:
   - Go to Dashboard
   - Click "Create Event"
   - Fill in event details
   - Save

4. If you registered as Attendee:
   - Browse events
   - Click on an event
   - Register or join a team

---

## Project Structure

```
bce_event_manager/
├── SPEC.md                    # Detailed project specification
├── README.md                  # This file
├── backend/                   # FastAPI backend
│   ├── main.py               # Entry point
│   ├── requirements.txt      # Python dependencies
│   ├── .env.example          # Environment template
│   └── app/
│       ├── config.py         # Settings
│       ├── supabase.py       # Supabase client
│       ├── auth.py           # Authentication
│       ├── main.py           # FastAPI app
│       ├── models/           # Pydantic schemas
│       └── routers/          # API endpoints
├── frontend/                 # React frontend
│   ├── package.json          # Node dependencies
│   ├── .env.example          # Environment template
│   └── src/
│       ├── main.tsx          # Entry point
│       ├── App.tsx           # Main app component
│       ├── components/       # Reusable components
│       ├── pages/            # Page components
│       ├── services/         # API services
│       ├── store/           # Zustand state
│       ├── types/           # TypeScript types
│       └── utils/           # Utilities
└── supabase/
    └── schema.sql           # Database schema
```

---

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Events
- `GET /api/events` - List events
- `POST /api/events` - Create event (organizer)
- `GET /api/events/{id}` - Get event
- `PUT /api/events/{id}` - Update event
- `DELETE /api/events/{id}` - Delete event
- `GET /api/events/{id}/analytics` - Get analytics

### Teams
- `GET /api/events/{id}/teams` - List teams
- `POST /api/events/{id}/teams` - Create team
- `POST /api/teams/{id}/members` - Add member

### Matches
- `GET /api/events/{id}/matches` - List matches
- `POST /api/events/{id}/matches` - Create match
- `POST /api/events/{id}/matches/brackets/generate` - Generate brackets

### Registrations
- `POST /api/events/{id}/register` - Register for event
- `GET /api/registrations/my` - My registrations
- `GET /api/events/{id}/registrations` - List (organizer)

### Expenses
- `GET /api/events/{id}/expenses` - List expenses
- `POST /api/events/{id}/expenses` - Add expense

### Announcements
- `GET /api/events/{id}/announcements` - List
- `POST /api/events/{id}/announcements` - Create

### Volunteers
- `GET /api/events/{id}/shifts` - List shifts
- `POST /api/events/{id}/shifts` - Create shift
- `POST /api/events/{id}/shifts/{id}/assign` - Volunteer

---

## Features Implemented

1. **User Authentication**
   - Supabase Auth (email/password)
   - Role-based access (Admin, Organizer, Captain, Attendee)
   - JWT tokens

2. **Event Management**
   - Create/Edit/Delete events
   - Event types: Sports, Tech Fest, Seminar, Other
   - Event status workflow

3. **Team & Bracket System**
   - Team creation and management
   - Auto-generate knockout brackets
   - Auto-generate round-robin brackets
   - Match scheduling and scoring

4. **Registration & Payments**
   - Event registration
   - Team registration
   - Payment status tracking

5. **Financial Management**
   - Expense tracking
   - Revenue tracking
   - Financial reports

6. **Volunteer Management**
   - Shift creation
   - Volunteer assignment

7. **Analytics Dashboard**
   - Registration timeline chart
   - Revenue charts
   - Event statistics

---

## Deployment

### Backend (Render)

1. Push your code to GitHub
2. Go to [render.com](https://render.com) and connect your GitHub
3. Create a new Web Service:
   - Name: `bce-event-manager-api`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `python main.py`
4. Add environment variables in Render dashboard

### Frontend (Vercel)

1. Go to [vercel.com](https://vercel.com) and import your GitHub repo
2. Configure:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

---

## Common Issues

1. **CORS Errors**
   - Check `CORS_ORIGINS` in backend `.env`
   - Make sure it includes your frontend URL

2. **Authentication Errors**
   - Verify Supabase credentials are correct
   - Check that tables were created in Supabase

3. **TypeScript Errors**
   - Run `npm install` again
   - Delete `node_modules` and reinstall

---

## Next Steps (For Future Development)

1. **Certificate Generation** - Add PDF certificate generation
2. **Payment Integration** - Add Razorpay/Stripe
3. **Email Notifications** - Add email templates
4. **Real-time Updates** - Add Supabase subscriptions
5. **Mobile App** - Add React Native/Flutter app

---

## License

MIT License
