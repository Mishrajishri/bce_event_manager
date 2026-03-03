# BCE Event Manager - Deployment Guide ($0 Cost)

This guide explains how to deploy the application for free.

## 1. Database (MongoDB Atlas)
1.  Create a free account at [mongodb.com](https://www.mongodb.com/cloud/atlas).
2.  Create a new Cluster (M0 Free Tier).
3.  Go to **Database Access** and create a user (keep the password safe).
4.  Go to **Network Access** and add `0.0.0.0/0` (Allow from anywhere) for starters.
5.  Click **Connect** -> **Drivers** to get your connection string.

## 2. Backend (Render)
1.  Create a free account at [render.com](https://render.com).
2.  Click **New** -> **Web Service**.
3.  Connect your GitHub repository.
4.  **Settings**:
    *   **Runtime**: Python 3
    *   **Build Command**: `pip install -r requirements.txt`
    *   **Start Command**: `./prod_start.sh` (make sure it's executable: `chmod +x prod_start.sh`)
5.  **Environment Variables**:
    *   `MONGODB_URL`: Your Atlas connection string.
    *   `SECRET_KEY`: A random hex string.
    *   `SUPABASE_URL`: From your Supabase project.
    *   `SUPABASE_KEY`: From your Supabase project.
    *   `CORS_ORIGINS`: Your Vercel URL (add this *after* deploying frontend).

## 3. Frontend (Vercel)
1.  Create a free account at [vercel.com](https://vercel.com).
2.  Click **Add New** -> **Project**.
3.  Connect your GitHub repository.
4.  **Framework Preset**: Vite.
5.  **Environment Variables**:
    *   `VITE_API_URL`: Your Render backend URL (e.g., `https://bce-backend.onrender.com/api`).
    *   `VITE_SUPABASE_URL`: From your Supabase project.
    *   `VITE_SUPABASE_ANON_KEY`: From your Supabase project.
6.  Click **Deploy**.

## 4. Final Connection
Once the frontend is deployed (e.g., `https://bce-events.vercel.app`):
1.  Go back to **Render** (Backend settings).
2.  Update `CORS_ORIGINS` to include your Vercel URL.
3.  Save and redeploy.

---
**Note**: The first time you visit the site each day, it may take 30 seconds to load because the free tier goes to sleep. This is normal for free hosting!
