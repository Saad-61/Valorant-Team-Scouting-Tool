# 🚀 Vercel Deployment Checklist - Complete Beginner's Guide

## Phase 1: Database Setup (Supabase) ⏱️ 20-30 minutes

### Step 1.1: Create Supabase Account
- [ ] Go to https://supabase.com
- [ ] Click "Start your project"
- [ ] Sign up with GitHub (recommended) or email
- [ ] Verify your email if needed

### Step 1.2: Create New Project
- [ ] Click "New Project"
- [ ] **Organization**: Create new (or select existing)
- [ ] **Name**: `valorant-scouting` (or any name you prefer)
- [ ] **Database Password**: Create a STRONG password
  - ⚠️ IMPORTANT: Save this password - you'll need it later!
  - Example: `MyStr0ng!Pass2024` (use your own!)
- [ ] **Region**: Choose closest to you (e.g., US West, EU Central)
- [ ] **Pricing**: Free plan is fine
- [ ] Click "Create new project"
- [ ] Wait 2-3 minutes for project to initialize

### Step 1.3: Import Database Schema
- [ ] In Supabase dashboard, go to **SQL Editor** (left sidebar)
- [ ] Click "New query"
- [ ] Open the file `supabase_schema.sql` from your project
- [ ] Copy ALL the content
- [ ] Paste into Supabase SQL Editor
- [ ] Click **"Run"** (bottom right)
- [ ] Wait for success message (should see "Success. No rows returned")

### Step 1.4: Import Data (CSV Files)
**⚠️ CRITICAL: Import in this EXACT order!**

Go to **Table Editor** (left sidebar) → Select table → Click "Import data from CSV"

**Core Tables First:**
1. [ ] `series` ← import `export_series.csv`
2. [ ] `games` ← import `export_games.csv`
3. [ ] `rounds` ← import `export_rounds.csv`
4. [ ] `agent_metadata` ← import `export_agent_metadata.csv`
5. [ ] `map_metadata` ← import `export_map_metadata.csv`

**Game Data Second:**
6. [ ] `game_compositions` ← import `export_game_compositions.csv`
7. [ ] `player_round_stats` ← import `export_player_round_stats.csv`
8. [ ] `player_economy` ← import `export_player_economy.csv`
9. [ ] `weapon_kills` ← import `export_weapon_kills.csv`
10. [ ] `ingestion_log` ← import `export_ingestion_log.csv`

**Views Last:**
11. [ ] `v_team_map_stats` ← import `export_v_team_map_stats.csv`
12. [ ] `v_team_agent_picks` ← import `export_v_team_agent_picks.csv`
13. [ ] `v_player_agent_pool` ← import `export_v_player_agent_pool.csv`
14. [ ] `v_pistol_performance` ← import `export_v_pistol_performance.csv`
15. [ ] `v_weapon_usage` ← import `export_v_weapon_usage.csv`
16. [ ] `v_round_win_types` ← import `export_v_round_win_types.csv`
17. [ ] `v_team_compositions` ← import `export_v_team_compositions.csv`
18. [ ] `v_post_plant_stats` ← import `export_v_post_plant_stats.csv`

**For each import:**
- Click table name in Table Editor
- Click "Insert" → "Import data from CSV"
- Select the corresponding export file
- Click "Import"
- Wait for success message

### Step 1.5: Get Database Connection String
- [ ] Go to **Project Settings** (gear icon, bottom left)
- [ ] Click **Database** (left sidebar)
- [ ] Scroll to **Connection string** section
- [ ] Select **URI** tab
- [ ] Copy the connection string (looks like: `postgresql://postgres:[YOUR-PASSWORD]@...`)
- [ ] Replace `[YOUR-PASSWORD]` with your actual database password
- [ ] **Save this complete connection string** - you'll need it for Vercel!

Example format:
```
postgresql://postgres:MyStr0ng!Pass2024@db.xxxxxxxxxxxxx.supabase.co:5432/postgres
```

---

## Phase 2: Get GROQ API Key ⏱️ 2 minutes

- [ ] Go to https://console.groq.com
- [ ] Sign up for free account (use Google/GitHub login)
- [ ] Go to "API Keys" section
- [ ] Click "Create API Key"
- [ ] Name it: `valorant-scouting`
- [ ] Copy the key (starts with `gsk_...`)
- [ ] **Save this key** - you'll need it for Vercel!

Example format: `gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

---

## Phase 3: Push Code to GitHub ⏱️ 5 minutes

### Step 3.1: Check Git Status
Open PowerShell/Command Prompt in your project folder:

```powershell
cd "E:\work\New folder\c9hackathon"
git status
```

### Step 3.2: Commit All Changes
```powershell
git add .
git commit -m "Prepare for Vercel deployment"
```

### Step 3.3: Push to GitHub
```powershell
git push origin main
```

If you get an error about "origin", make sure your repository is connected to GitHub.

**Don't have a GitHub repo yet?**
1. Go to https://github.com/new
2. Name: `valorant-scouting-tool`
3. Keep it **Public** or **Private** (your choice)
4. Don't initialize with README (you already have one)
5. Click "Create repository"
6. Follow the commands shown to push your code

---

## Phase 4: Deploy to Vercel ⏱️ 10-15 minutes

### Step 4.1: Create Vercel Account
- [ ] Go to https://vercel.com
- [ ] Click "Sign Up"
- [ ] Choose "Continue with GitHub" (recommended)
- [ ] Authorize Vercel to access your repositories

### Step 4.2: Deploy Backend API

1. [ ] Click "Add New..." → "Project"
2. [ ] Find and select your `valorant-scouting-tool` repository
3. [ ] Click "Import"
4. [ ] **Configure Project:**

   **Framework Preset:** Other
   
   **Root Directory:** Click "Edit" → Select `api`
   
   **Build Settings:**
   - Build Command: (leave empty)
   - Output Directory: (leave empty)
   - Install Command: `pip install -r requirements.txt`

5. [ ] **Environment Variables** - Click "Add" for each:

   ```
   DATABASE_URL
   postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres
   ```
   
   ```
   GROQ_API_KEY
   gsk_your_key_here
   ```
   
   ```
   PYTHON_VERSION
   3.11
   ```

6. [ ] Click **"Deploy"**
7. [ ] Wait 2-3 minutes for deployment
8. [ ] **Copy your backend URL** when done (looks like: `https://valorant-scouting-tool-xxx.vercel.app`)
   - Click on the deployment link
   - Save this URL - you'll need it!

### Step 4.3: Deploy Frontend

1. [ ] Go back to Vercel dashboard
2. [ ] Click "Add New..." → "Project" again
3. [ ] Select the **same repository** (valorant-scouting-tool)
4. [ ] Click "Import"
5. [ ] **Configure Project:**

   **Framework Preset:** Vite
   
   **Root Directory:** Click "Edit" → Select `frontend`
   
   **Build Settings:**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

6. [ ] **Environment Variables** - Add this one:

   ```
   VITE_API_URL
   https://your-backend-url.vercel.app/api
   ```
   
   ⚠️ Replace `your-backend-url` with your ACTUAL backend URL from Step 4.2!
   
   Example: `https://valorant-scouting-tool-abc123.vercel.app/api`

7. [ ] Click **"Deploy"**
8. [ ] Wait 2-3 minutes for deployment
9. [ ] **Save your frontend URL** (looks like: `https://valorant-scouting-tool-xxx.vercel.app`)

### Step 4.4: Update Backend CORS

⚠️ IMPORTANT: Your backend needs to allow requests from your frontend!

1. [ ] Go to your backend project in Vercel
2. [ ] Click "Settings" → "Environment Variables"
3. [ ] Add new variable:

   ```
   FRONTEND_URL
   https://your-frontend-url.vercel.app
   ```
   
   Use the frontend URL from Step 4.3!

4. [ ] Click "Deployments" tab
5. [ ] Click the "..." menu on the latest deployment
6. [ ] Click "Redeploy"
7. [ ] Select "Use existing Build Cache"
8. [ ] Click "Redeploy"

---

## Phase 5: Test Your Deployment ⏱️ 5 minutes

### Step 5.1: Test Backend
- [ ] Open your backend URL in browser: `https://your-backend-url.vercel.app`
- [ ] You should see:
  ```json
  {
    "status": "online",
    "service": "VALORANT Scouting API",
    "ai_enabled": true
  }
  ```

### Step 5.2: Test API Endpoint
- [ ] Test teams endpoint: `https://your-backend-url.vercel.app/api/teams`
- [ ] Should see a list of team names like: `["Cloud9", "Sentinels", "LOUD", ...]`

### Step 5.3: Test Frontend
- [ ] Open your frontend URL: `https://your-frontend-url.vercel.app`
- [ ] Should see the VALORANT Scouting Dashboard
- [ ] Try to:
  - [ ] Select a team from dropdown
  - [ ] View dashboard data
  - [ ] Ask a question in Chat page

### Step 5.4: Test Full Integration
- [ ] Go to Chat page
- [ ] Select a team (e.g., "Cloud9")
- [ ] Ask: "What maps does this team play best on?"
- [ ] Should get AI-generated response with data

---

## 🎉 Success! You're Live!

Your URLs:
- **Frontend:** https://your-frontend-url.vercel.app
- **Backend API:** https://your-backend-url.vercel.app
- **API Docs:** https://your-backend-url.vercel.app/docs

---

## 🐛 Troubleshooting

### Frontend shows "Failed to fetch teams"
- Check that VITE_API_URL is set correctly in frontend environment variables
- Make sure backend URL ends with `/api`
- Check backend deployment logs for errors

### Backend returns "database connection failed"
- Verify DATABASE_URL is correct
- Test connection string in a PostgreSQL client
- Check Supabase project is not paused (free tier pauses after 7 days inactivity)

### AI Chat not working
- Verify GROQ_API_KEY is set correctly
- Check backend logs for API errors
- GROQ free tier has rate limits (try waiting 1 minute between requests)

### CORS errors in browser console
- Add frontend URL to FRONTEND_URL environment variable in backend
- Redeploy backend after adding the variable
- Clear browser cache

### Import failed during CSV upload
- Make sure you imported in the correct order
- Check CSV files are not corrupted
- Try importing in smaller batches

---

## 📝 Post-Deployment Notes

### Domain Names (Optional)
You can add custom domains in Vercel:
1. Go to project Settings → Domains
2. Add your custom domain (requires DNS configuration)

### Monitoring
- Check Vercel Analytics (free tier included)
- Monitor function execution time in Vercel dashboard
- Check database usage in Supabase dashboard

### Updates
When you want to update the app:
1. Make changes locally
2. Commit: `git add . && git commit -m "Your changes"`
3. Push: `git push origin main`
4. Vercel auto-deploys!

### Free Tier Limits
- **Vercel:** 100 GB bandwidth/month, 100 hours serverless execution
- **Supabase:** 500 MB database, 2 GB bandwidth, 50 MB file storage
- **GROQ:** Rate limits vary, generous free tier

---

## 🎯 Quick Reference

**Files You Modified:**
- Fixed duplicate bug in `report_generator.py`

**Important URLs to Save:**
- Supabase Dashboard: https://supabase.com/dashboard
- GROQ Console: https://console.groq.com
- Vercel Dashboard: https://vercel.com/dashboard
- GitHub Repo: https://github.com/YOUR_USERNAME/valorant-scouting-tool

**Environment Variables Summary:**

Backend (api):
- `DATABASE_URL` - Supabase connection string
- `GROQ_API_KEY` - GROQ API key
- `PYTHON_VERSION` - 3.11
- `FRONTEND_URL` - Your frontend Vercel URL

Frontend:
- `VITE_API_URL` - Your backend Vercel URL + /api

---

Need help? Check:
- Vercel docs: https://vercel.com/docs
- Supabase docs: https://supabase.com/docs
- This project's README.md
