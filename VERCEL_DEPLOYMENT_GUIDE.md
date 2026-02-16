# Vercel Deployment Guide

## Prerequisites

✅ Supabase database set up with all data imported
✅ DATABASE_URL in your `.env` file working locally
✅ GitHub repository pushed

## Step 1: Push to GitHub (if not already)

```bash
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

## Step 2: Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"Add New Project"**
3. Select your **Valorant-Team-Scouting-Tool** repository
4. Configure project settings:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

5. **Environment Variables** - Add these:

   ```
   VITE_API_URL=https://your-backend-url.vercel.app
   ```

   (We'll update this after deploying backend)

6. Click **"Deploy"**

## Step 3: Deploy Backend to Vercel

1. Click **"Add New Project"** again
2. Select the **same repository**
3. Configure project settings:
   - **Framework Preset**: Other
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Output Directory**: Leave empty
   - **Install Command**: `pip install -r requirements.txt`

4. **Environment Variables** - Add these:

   ```
   DATABASE_URL=postgresql://postgres:yourpassword@db.jygvszaggwltgjvummdb.supabase.co:5432/postgres
   GROQ_API_KEY=your_groq_api_key_here
   PYTHON_VERSION=3.11
   ```

5. Click **"Deploy"**

## Step 4: Update Frontend Environment Variable

1. Copy your **backend** deployment URL (e.g., `https://backend-abc123.vercel.app`)
2. Go to your **frontend** project in Vercel
3. Settings → Environment Variables
4. Update `VITE_API_URL` to your backend URL
5. Click **"Redeploy"** to apply changes

## Step 5: Update Backend CORS

If you get CORS errors, update the `allowed_origins` in `backend/main.py`:

```python
allowed_origins = [
    "http://localhost:5173",
    "https://your-frontend-url.vercel.app",  # Add your actual frontend URL
]
```

Then push to GitHub - Vercel will auto-deploy.

## Troubleshooting

### Backend not starting?

- Check logs in Vercel dashboard
- Verify DATABASE_URL is correct
- Make sure `psycopg2-binary` is in requirements.txt

### Frontend can't connect to backend?

- Check VITE_API_URL is correct
- Verify CORS is allowing your frontend domain
- Check Network tab in browser DevTools

### Database connection errors?

- Test connection string locally first
- Verify Supabase project is not paused
- Check password has no special characters that need escaping

## Done! 🎉

Your app should now be live at:

- Frontend: `https://your-frontend.vercel.app`
- Backend: `https://your-backend.vercel.app`

Test the AI Analyst with: "What are LOUD's biggest weaknesses?"
