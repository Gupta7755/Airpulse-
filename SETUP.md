# Airpulse – Setup & Run Guide

Step-by-step commands to run Airpulse locally, with Docker, and to push it to GitHub.
The last two sections show how a FastAPI backend and a React (Vite) frontend are created from scratch.

Commands are for **Windows PowerShell** unless marked otherwise. On macOS/Linux, use the alternatives shown in comments.

---

## Contents

1. [Prerequisites](#1-prerequisites)
2. [Get the code](#2-get-the-code)
3. [Configure environment variables](#3-configure-environment-variables)
4. [Run the backend (FastAPI)](#4-run-the-backend-fastapi)
5. [Run the frontend (React + Vite)](#5-run-the-frontend-react--vite)
6. [Scrapers and integrity checks](#6-scrapers-and-integrity-checks)
7. [Run everything with Docker](#7-run-everything-with-docker)
8. [Push to GitHub](#8-push-to-github)
9. [How to initialise a FastAPI app from scratch](#9-how-to-initialise-a-fastapi-app-from-scratch)
10. [How to initialise a React app from scratch](#10-how-to-initialise-a-react-app-from-scratch)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Prerequisites

| Tool | Version | Check with |
| :--- | :--- | :--- |
| Python | 3.11 or newer | `python --version` |
| Node.js | 22 (or 20.19+) | `node --version` |
| npm | comes with Node | `npm --version` |
| Git | any recent | `git --version` |
| MongoDB | 7.x, optional for local runs | `mongosh --eval "db.adminCommand('ping')"` |
| Docker Desktop | optional, for section 7 | `docker --version` |

MongoDB is optional for local development. If it is not reachable, the backend switches to an in-memory database automatically. That database starts empty and is lost when the backend stops.

---

## 2. Get the code

```powershell
git clone https://github.com/Gupta7755/Airpulse-.git
cd Airpulse-
```

Project layout:

```
Airpulse-/
├── backend/               FastAPI app (entry point: backend/api.py)
├── frontend/my-react-app/ React 19 + Vite app
├── scrapers/              Airline and OTA fare scrapers
├── scripts/               Scraper runner, integrity check, verification
├── data/                  Seed and normalised datasets
├── requirements.txt       Python dependencies
├── docker-compose.yml     Full stack: MongoDB + backend + frontend
└── .env.example           Template for your .env
```

---

## 3. Configure environment variables

Copy the template, then edit `.env`:

```powershell
Copy-Item .env.example .env      # macOS/Linux: cp .env.example .env
```

The main settings:

| Variable | What it does | Local value |
| :--- | :--- | :--- |
| `MONGO_URI` | MongoDB connection | `mongodb://localhost:27017` |
| `MONGO_DB_NAME` | Database name | `apix_mospi` |
| `API_AUTH_ENABLED` | Require a username and password for the API | `false` |
| `OPENSKY_CLIENT_ID` / `OPENSKY_CLIENT_SECRET` | Live flight radar ([OpenSky](https://opensky-network.org)) | your key |
| `OPENSKY_CLIENT_ID_2` / `OPENSKY_CLIENT_SECRET_2` | Backup key, used automatically when the first hits its limit | optional |

> **Never commit `.env`.** It is already listed in `.gitignore`. Share only `.env.example`.

---

## 4. Run the backend (FastAPI)

Run all commands from the project root (`Airpulse-/`).

**Step 1: Create a virtual environment (first time only)**

```powershell
python -m venv venv
```

**Step 2: Activate it (every new terminal)**

```powershell
.\venv\Scripts\Activate.ps1      # macOS/Linux: source venv/bin/activate
```

If PowerShell blocks the script, run this once and then try again:
`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

**Step 3: Install dependencies (first time, or after `requirements.txt` changes)**

```powershell
pip install -r requirements.txt
```

**Step 4: Start the server**

```powershell
uvicorn backend.api:app --host 127.0.0.1 --port 8000 --reload
```

`--reload` restarts the server automatically when you save a Python file.

**Step 5: Check that it works**

| URL | Expected |
| :--- | :--- |
| http://127.0.0.1:8000/api/v1/health | `{"status":"ok", ...}` |
| http://127.0.0.1:8000/docs | Interactive Swagger API docs |

To stop the server, press `Ctrl + C`.

---

## 5. Run the frontend (React + Vite)

Open a **second terminal** and keep the backend running in the first one.

**Step 1: Go to the frontend folder**

```powershell
cd frontend\my-react-app
```

**Step 2: Install packages (first time, or after `package.json` changes)**

```powershell
npm install
```

**Step 3: Start the dev server**

```powershell
npm run dev
```

Open **http://localhost:5173**. Vite forwards every `/api` request to the backend on port 8000, as configured in `vite.config.js`, so no extra settings are needed.

**Other frontend commands**

```powershell
npm run build     # production build into dist/
npm run preview   # serve the production build locally
npm run lint      # ESLint checks
```

**Quick start, both servers**

```powershell
# Terminal 1 (project root)
.\venv\Scripts\Activate.ps1
uvicorn backend.api:app --host 127.0.0.1 --port 8000 --reload

# Terminal 2
cd frontend\my-react-app
npm run dev
```

---

## 6. Scrapers and integrity checks

Run these from the project root with the virtual environment active.

```powershell
# First time only: download the browser used by Playwright scrapers
playwright install chromium

# Run all airline and OTA scrapers once
python scripts\run_all_scrapers.py

# Run the 25-point system integrity check (the backend must be running)
python scripts\run_integrity_check.py

# Run the full endpoint test suite against a running backend
python scripts\verify_deployed_backend.py http://127.0.0.1:8000
```

While the backend is running, it also starts a scheduled crawl every 30 minutes (`SCHEDULER_INTERVAL_MINUTES`).

---

## 7. Run everything with Docker

Docker runs MongoDB, the backend and the frontend together. You do not need Python, Node or MongoDB installed.

**Step 1:** Start **Docker Desktop** and wait until it shows "Engine running".

**Step 2:** From the project root, build and start the stack:

```powershell
docker compose up -d --build
```

**Step 3:** Open the app:

| Service | URL |
| :--- | :--- |
| Website (frontend served by nginx) | http://localhost:3000 |
| API through the frontend proxy | http://localhost:3000/api/v1/health |
| API docs | http://localhost:3000/docs |
| Backend directly | http://localhost:8000 |
| MongoDB (for tools like Compass) | `mongodb://localhost:27018` |

**Everyday commands**

```powershell
docker compose ps                 # container status
docker compose logs -f backend    # follow backend logs (Ctrl + C to exit)
docker compose down               # stop (database data is kept)
docker compose up -d --build      # rebuild after code changes
docker compose down -v            # stop AND delete the database volume
```

**How it fits together**

- `mongodb` uses the `mongo:7.0` image. Its data is kept in the `airpulse_mongo_data` volume. It uses host port **27018**, so it does not clash with a local MongoDB on 27017.
- `backend` is built from `Dockerfile.backend` (Python 3.11). It reads optional secrets from `.env`, connects to `mongodb://mongodb:27017`, and loads seed data into an empty database on first start.
- `frontend` is built from `frontend/my-react-app/Dockerfile`. Node 22 builds the app, then nginx serves it and forwards `/api` to the backend.

> Docker uses ports **3000** and **8000**. If you are also running the local backend from section 4, stop it first.

---

## 8. Push to GitHub

**First-time setup** (only for a brand-new repository):

```powershell
git init -b main
git config user.name  "Your Name"
git config user.email "you@example.com"
git remote add origin https://github.com/Gupta7755/Airpulse-.git
git add .
git commit -m "Initial commit"
git push -u origin main
```

**Everyday workflow**

```powershell
git status                      # see what changed
git add .                       # stage everything (.env is ignored automatically)
git commit -m "feat: describe what you changed"
git push                        # upload to GitHub
```

**Get the latest changes from GitHub**

```powershell
git pull
```

**Working on a feature branch**

```powershell
git checkout -b feature/my-change
# ...make changes...
git add .
git commit -m "feat: my change"
git push -u origin feature/my-change    # then open a Pull Request on GitHub
```

**Before every push, check that no secrets are included:**

```powershell
git status          # .env must NOT appear in the list
```

If a secret is ever pushed by mistake, change it with its provider (MongoDB, OpenSky and so on) right away. Deleting the file from the repository does not remove it from the Git history.

---

## 9. How to initialise a FastAPI app from scratch

These steps create a new, minimal FastAPI project with the same structure Airpulse uses.

**Step 1: Create the folder and virtual environment**

```powershell
mkdir my-api
cd my-api
python -m venv venv
.\venv\Scripts\Activate.ps1
```

**Step 2: Install FastAPI and the server**

```powershell
pip install fastapi "uvicorn[standard]" pydantic-settings python-dotenv
pip freeze > requirements.txt
```

**Step 3: Create the app package**

```powershell
mkdir backend
New-Item backend\__init__.py -ItemType File
```

**Step 4: Write `backend/api.py`**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="My API", version="1.0.0")

# Allow the React dev server to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/v1/health")
def health():
    return {"status": "ok"}


@app.get("/api/v1/items/{item_id}")
def read_item(item_id: int, q: str | None = None):
    return {"item_id": item_id, "q": q}
```

**Step 5: Run it**

```powershell
uvicorn backend.api:app --reload --port 8000
```

Open http://127.0.0.1:8000/docs to try the endpoints.

**Step 6 (optional): Settings from `.env`**

Create `backend/config.py`:

```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    MONGO_URI: str = "mongodb://localhost:27017"

    class Config:
        env_file = ".env"


settings = Settings()
```

Then use `from backend.config import settings` anywhere in the app.

---

## 10. How to initialise a React app from scratch

These steps create a new React project with Vite, the same tooling Airpulse uses.

**Step 1: Create the project**

```powershell
npm create vite@latest my-react-app -- --template react
cd my-react-app
npm install
```

**Step 2: Start it**

```powershell
npm run dev
```

Open http://localhost:5173.

**Step 3: Proxy API calls to FastAPI**

Edit `vite.config.js`:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
```

**Step 4: Call the backend from a component**

Replace `src/App.jsx` with:

```jsx
import { useEffect, useState } from 'react'

export default function App() {
  const [health, setHealth] = useState(null)

  useEffect(() => {
    fetch('/api/v1/health')
      .then((res) => res.json())
      .then(setHealth)
      .catch(() => setHealth({ status: 'backend not reachable' }))
  }, [])

  return (
    <main>
      <h1>My App</h1>
      <p>Backend status: {health ? health.status : 'loading…'}</p>
    </main>
  )
}
```

With the FastAPI app from section 9 running, the page shows **Backend status: ok**.

**Step 5: Add libraries as needed** (Airpulse uses these):

```powershell
npm install leaflet three lucide-react
```

**Step 6: Build for production**

```powershell
npm run build      # output goes to dist/
```

---

## 11. Troubleshooting

| Problem | Fix |
| :--- | :--- |
| `Activate.ps1 cannot be loaded` | Run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, then activate again |
| `uvicorn` / `pip` not found | Activate the virtual environment first (section 4, step 2) |
| `ModuleNotFoundError: backend` | Run uvicorn from the project root, not from inside `backend/` |
| Port 8000 / 5173 / 3000 already in use | Stop the other process, or change the port (`--port 8001`). In PowerShell: `Get-NetTCPConnection -LocalPort 8000` shows who uses it |
| Site loads but shows no data | The backend is not running, or is on a different port than `vite.config.js` expects |
| Backend log says "Engaging embedded MongoDB store (mongomock)" | MongoDB is not reachable. Start MongoDB or fix `MONGO_URI`. The app still runs, but the data is not saved |
| Live flight map shows simulated flights | No valid OpenSky key in `.env`, or every key hit its limit. Add or refresh `OPENSKY_CLIENT_ID` / `OPENSKY_CLIENT_SECRET` |
| `docker compose` fails to start | Make sure Docker Desktop shows "Engine running" |
| Docker frontend shows old code | Rebuild: `docker compose up -d --build` |
