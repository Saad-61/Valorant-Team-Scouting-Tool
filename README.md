# VALORANT Scouting Tool

AI-powered competitive analysis tool for VALORANT esports teams.

## Architecture

```
├── backend/           # FastAPI REST API
│   ├── main.py        # API endpoints
│   └── requirements.txt
├── frontend/          # React + Vite UI
│   ├── src/
│   │   ├── App.jsx    # Main chat interface
│   │   ├── api.js     # API client
│   │   └── main.jsx   # Entry point
│   └── package.json
├── dynamic_scouting_engine.py   # SQL generation engine
├── valorant_esports.duckdb      # Match database
└── .env                         # API keys
```

## Setup

### 1. Environment Variables

Create a `.env` file in the root directory:

```
GEMINI_API_KEY=your_api_key_here
```

### 2. Backend Setup

```bash
# From the hackthon directory
cd backend
pip install -r requirements.txt

# Start the API server
python main.py
# OR
uvicorn main:app --reload --port 8000
```

### 3. Frontend Setup

```bash
# From the hackthon directory
cd frontend
npm install

# Start the dev server
npm run dev
```

### 4. Access the App

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## API Endpoints

| Method | Endpoint                   | Description         |
| ------ | -------------------------- | ------------------- |
| GET    | `/api/teams`               | List all teams      |
| GET    | `/api/scout/{team}`        | Full scouting data  |
| POST   | `/api/ask`                 | AI-powered Q&A      |
| GET    | `/api/overview/{team}`     | Team overview       |
| GET    | `/api/players/{team}`      | Player statistics   |
| GET    | `/api/compositions/{team}` | Agent compositions  |
| GET    | `/api/weaknesses/{team}`   | Team weaknesses     |
| GET    | `/api/pistol/{team}`       | Pistol round stats  |
| GET    | `/api/h2h/{team1}/{team2}` | Head-to-head record |
| GET    | `/api/suggestions`         | Suggested questions |

## Example API Usage

```bash
# Get all teams
curl http://localhost:8000/api/teams

# Ask a question
curl -X POST http://localhost:8000/api/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "What is their win rate on Haven?", "team_name": "Cloud9"}'
```

## Tech Stack

- **Backend**: FastAPI, DuckDB, Google Gemini AI
- **Frontend**: React 18, Vite, TailwindCSS, React Query
- **Database**: DuckDB (embedded analytics)

---

Built for Cloud9 VALORANT Coaching Staff | January 2026
