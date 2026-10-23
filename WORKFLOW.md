# Airpulse – Project Workflow

This file shows how data moves through Airpulse, from the fare scrapers to the dashboard and the alerts. The diagrams use [Mermaid](https://mermaid.js.org) and render automatically on GitHub and in VS Code's Markdown preview.

---

## 1. End-to-end workflow

```mermaid
flowchart TD
    subgraph SRC["Fare sources"]
        AIR["Airline sites<br/>IndiGo · Air India · Akasa Air"]
        OTA["OTA sites<br/>MakeMyTrip · Goibibo · Cleartrip · Yatra<br/>EaseMyTrip · ixigo · Skyscanner"]
        DGCA["DGCA schedules"]
    end

    SCHED["APScheduler<br/>backend/scheduler.py<br/>runs every 30 min"]
    RUNNER["scripts/run_all_scrapers.py"]
    SCRAPERS["scrapers/&lt;source&gt;/<br/>Playwright scrapers"]
    NORM["data/all_normalized_flights.json<br/>consolidated quotes"]
    INGEST["backend/ingestion.py<br/>save quotes, SHA-256 snapshot,<br/>remove duplicates"]
    SNAP["data/snapshots/*.txt<br/>raw page proof"]
    DB[("MongoDB Atlas<br/>price_quotes · audit logs · alerts<br/>(in-memory fallback)")]

    subgraph ENGINE["Analytics engine"]
        IDX["index_calculator.py<br/>Laspeyres / Geometric Young index<br/>outliers excluded"]
        SPIKE["spike_detector.py<br/>fare spike detection +<br/>Ridge regression forecasts"]
        RSI["route_stress_index.py<br/>airport_substitution.py"]
        TWIN["airport_twin_service.py<br/>live flight radar (OpenSky)"]
    end

    API["FastAPI REST API<br/>backend/api.py · port 8000"]
    MAIL["email_notifier.py<br/>alert emails"]
    EXPORT["dataset_exporter.py<br/>CSV / JSON / ZIP downloads"]
    UI["React + Vite web portal<br/>frontend/my-react-app · port 5173"]
    USER(["User / analyst"])

    SCHED --> RUNNER --> SCRAPERS
    AIR --> SCRAPERS
    OTA --> SCRAPERS
    DGCA --> RUNNER
    SCRAPERS --> NORM --> INGEST
    INGEST --> SNAP
    INGEST --> DB
    DB --> IDX & SPIKE & RSI
    TWIN --> API
    IDX & SPIKE & RSI --> API
    SPIKE --> MAIL
    DB --> EXPORT --> API
    API <-->|"/api/v1/*"| UI
    UI <--> USER
```

---

## 2. Scrape cycle (every 30 minutes)

```mermaid
flowchart TD
    START(["Scheduler fires"]) --> BUSY{"Crawl already<br/>running?"}
    BUSY -->|yes| SKIP(["Skip this cycle"])
    BUSY -->|no| ENV{"Running in the cloud?<br/>(RENDER / IS_CLOUD_CONTAINER)"}
    ENV -->|yes| LIGHT["live_crawler_engine.py<br/>lightweight crawl, ~60 quotes"]
    ENV -->|no| FULL["run_all_scrapers.py<br/>all 10 Playwright scrapers"]
    FULL --> CONS["Merge each scraper's flights.json<br/>into all_normalized_flights.json"]
    CONS --> SYNC["Sync DGCA schedules"]
    SYNC --> ING["ingest_normalized_dataset()<br/>+ clean_database_duplicates()"]
    LIGHT --> SHOT
    ING --> SHOT["Refresh scraper screenshots"]
    SHOT --> LOG["Save audit log to MongoDB<br/>(status, duration, errors)"]
    LOG --> DONE(["Schedule next run"])
```

---

## 3. Request flow: from dashboard to data

```mermaid
sequenceDiagram
    participant U as User
    participant FE as React portal (5173)
    participant API as FastAPI (8000)
    participant ENG as Analytics engine
    participant DB as MongoDB

    U->>FE: Opens a dashboard view
    FE->>API: GET /api/v1/... (proxied by Vite)
    API->>ENG: compute index / spikes / stats
    ENG->>DB: aggregate price_quotes (non-outliers)
    DB-->>ENG: matching quotes
    ENG-->>API: index series, KPIs, alerts
    API-->>FE: JSON response
    FE-->>U: Charts, maps, tables
```

---

## 4. Air Intel chatbot

```mermaid
flowchart LR
    Q(["User types a question"]) --> CHAT["AirIntelFloatingChat.jsx"]
    CHAT -->|"POST /api/v1/intel/chat"| EP["api.py<br/>chat_with_intel_assistant()"]
    EP --> ANS["spike_detector.py<br/>answer_intel_query()"]
    ANS --> KW{"Keyword match"}
    KW -->|"safety, accident"| A1["DGCA safety answer"]
    KW -->|"refund, delay"| A2["Passenger rights answer"]
    KW -->|"weather, flood"| A3["Disruption answer"]
    KW -->|"formula, laspeyres"| A4["Index methodology answer"]
    KW -->|"forecast, ML"| A5["Ridge model answer"]
    KW -->|"cheapest, airline, route"| A6["Live stats from MongoDB"]
    A1 & A2 & A3 & A4 & A5 & A6 --> R(["Reply shown in chat"])
```

---

## 5. Spike alert workflow

```mermaid
flowchart TD
    FEED["GET /api/v1/intel/feed"] --> ALL["get_all_spikes_feed()"]
    ALL --> D1["detect_scraper_spikes()<br/>actual fare vs expected fare"]
    ALL --> D2["generate_predictive_spikes()<br/>Ridge regression forecast"]
    ALL --> D3["fetch_live_news_disruptions()<br/>news feeds"]
    D1 & D2 & D3 --> SAVE["sync_intel_alerts_to_db()"]
    SAVE --> NEW{"New alerts?"}
    NEW -->|yes| MAIL["dispatch_new_intel_emails()<br/>background thread"]
    NEW -->|no| OUT
    MAIL --> AUDIT["email_audit_logs collection"]
    SAVE --> OUT(["Alerts shown on Air Intel view"])
```
