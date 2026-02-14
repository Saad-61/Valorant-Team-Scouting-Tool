# Cloud9 VCT Scouting Dashboard

AI-powered competitive analysis and scouting tool for VALORANT esports teams. Built for Cloud9's coaching staff to gain strategic insights and prepare for matches.

## 🎯 Features

- **Automated Scouting Reports**: Generate comprehensive team analysis reports
- **AI-Powered Analysis**: Ask questions about any team using natural language
- **Weakness Detection**: Identify exploitable patterns and vulnerabilities
- **Head-to-Head Comparison**: Compare two teams across multiple metrics
- **Player Statistics**: Deep dive into individual player performance
- **Map Analytics**: Win rates, agent compositions, and strategy breakdowns
- **Match History**: Recent performance and series records
- **Agent Compositions**: Track meta trends and team preferences

## 🏗️ Architecture

```
├── backend/                      # FastAPI REST API
│   ├── main.py                  # API endpoints & routing
│   └── requirements.txt         # Python dependencies
├── frontend/                     # React + Vite dashboard
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   ├── pages/               # Page components
│   │   ├── services/            # API integration
│   │   ├── store/               # State management (Zustand)
│   │   ├── utils/               # Helper functions
│   │   └── App.jsx              # Main application
│   └── package.json
├── dynamic_scouting_engine.py   # AI-powered SQL generation
├── gemini_analyzer.py           # Google Gemini integration
├── report_generator.py          # Scouting report logic
├── valorant_esports.duckdb      # Match database (excluded from git)
└── .env                         # API keys (excluded from git)
```

## 🚀 Quick Start

### Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- **Google Gemini API Key** ([Get one here](https://makersuite.google.com/app/apikey))

### 1. Clone & Setup Environment

```bash
git clone https://github.com/YOUR_USERNAME/c9-vct-scouting.git
cd c9-vct-scouting

# Create .env file in root directory
echo "GEMINI_API_KEY=your_api_key_here" > .env
```

### 2. Backend Setup

```bash
cd backend
pip install -r requirements.txt

# Start the API server
python main.py
```

The backend will run on `http://localhost:8000`

### 3. Frontend Setup

```bash
cd frontend
npm install

# Start the development server
npm run dev
```

The frontend will run on `http://localhost:5173`

### 4. Access the Dashboard

- **Dashboard**: http://localhost:5173
- **API Docs**: http://localhost:8000/docs
- **API Health**: http://localhost:8000/api/

## 📡 API Endpoints

| Method | Endpoint                   | Description                    |
| ------ | -------------------------- | ------------------------------ |
| GET    | `/api/teams`               | List all VCT teams             |
| GET    | `/api/scout/{team}`        | Full scouting report           |
| POST   | `/api/ask`                 | AI-powered Q&A                 |
| GET    | `/api/overview/{team}`     | Team overview & recent matches |
| GET    | `/api/players/{team}`      | Player statistics              |
| GET    | `/api/compositions/{team}` | Agent compositions by map      |
| GET    | `/api/weaknesses/{team}`   | Exploitable weaknesses         |
| GET    | `/api/pistol/{team}`       | Pistol round statistics        |
| GET    | `/api/h2h/{team1}/{team2}` | Head-to-head comparison        |
| GET    | `/api/suggestions`         | AI-suggested questions         |

### Example API Usage

```bash
# Get all teams
curl http://localhost:8000/api/teams

# Full scouting report
curl http://localhost:8000/api/scout/Cloud9?num_matches=10

# Ask a natural language question
curl -X POST http://localhost:8000/api/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "What maps does Sentinels struggle on?", "team_name": "Sentinels"}'
```

## 🛠️ Tech Stack

### Backend
- **FastAPI**: Modern Python web framework
- **DuckDB**: Embedded analytical database
- **Google Gemini AI**: Natural language processing
- **Pydantic**: Data validation

### Frontend
- **React 18**: UI framework
- **Vite**: Build tool & dev server
- **TailwindCSS**: Utility-first styling
- **Framer Motion**: Animations
- **Recharts**: Data visualization
- **Zustand**: State management
- **React Query**: API data fetching

## 📊 Database Schema

See [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) for detailed table structure and relationships.

## 🎨 Features Breakdown

### Scouting Report Generator
Automatically generates comprehensive reports including:
- Team overview & recent performance
- Map pool analysis with win rates
- Agent compositions by map
- Player profiles & statistics
- Identified weaknesses & exploit strategies
- Pistol round tendencies
- Strategic recommendations

### AI Chat Interface
Ask questions like:
- "What is Cloud9's best map?"
- "How does Sentinels perform on pistol rounds?"
- "Show me the agent pool for zekken"
- "Compare Cloud9 vs Sentinels on Haven"

### Weakness Analysis
Identifies exploitable patterns:
- Map pool vulnerabilities
- Pistol round weaknesses
- Economic tendencies
- Post-plant success rates
- Agent diversity issues

## 🔒 Security Notes

- **Never commit `.env` file** (already in .gitignore)
- **Database file excluded** from repository (too large)
- Keep your Gemini API key private
- Frontend uses environment-based API URLs

## 📝 Development

### Adding New Features

1. **Backend**: Add endpoints in `backend/main.py`
2. **Frontend**: Create page in `frontend/src/pages/`
3. **API Integration**: Update `frontend/src/services/api.js`
4. **Routing**: Add to `frontend/src/App.jsx`

### Building for Production

```bash
# Frontend
cd frontend
npm run build
# Output in frontend/dist/

# Backend
cd backend
# Deploy with uvicorn in production mode
uvicorn main:app --host 0.0.0.0 --port 8000
```

## 🤝 Contributing

This is a hackathon project built for Cloud9. For contributions or questions, please open an issue.

## 📄 License

Built for Cloud9 VALORANT Coaching Staff | February 2026

---

**Note**: This tool requires a populated DuckDB database with VCT match data. The database file is excluded from this repository due to size constraints.
