# Texas AirSystems — Service Dispatch & Scheduling

Full-stack application for managing HVAC service technicians, work orders, and intelligent proximity-based scheduling.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + Vite + React Query (TanStack) |
| **Backend** | Node.js + Express |
| **Database** | SQLite (via better-sqlite3) — zero config |
| **Validation** | Zod (server-side schema validation) |
| **Security** | Helmet, CORS, rate limiting, input sanitization |

## Features

- **Dashboard** — Live stats, quick navigation
- **Technicians** — Full CRUD, availability toggle, search/filter
- **Work Orders** — Full CRUD, CSV import, pagination, city/status filters
- **Smart Schedule** — Multi-factor optimization (distance + load balancing + priority), view by region or technician, save to database
- **Audit Log** — Every create/update/delete is logged
- **Toast Notifications** — Success/error feedback
- **Error Boundary** — Graceful crash recovery
- **Accessibility** — ARIA labels, keyboard navigation, focus states

## Setup Instructions

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or higher

### 1. Install everything
```bash
npm run install-all
```

### 2. Start both servers
```bash
npm run dev
```

This runs:
- **Backend** → http://localhost:3001
- **Frontend** → http://localhost:5173

### 3. Open in browser
Go to **http://localhost:5173**

The database auto-seeds with 40 technicians and 92 work orders on first run.

## Project Structure

```
texas-airsystems/
├── package.json                  # Root scripts (runs both)
├── backend/
│   ├── server.js                 # Express app + security middleware
│   ├── database.js               # SQLite schema, seed data, coords
│   ├── db/                       # SQLite database file (auto-created)
│   ├── routes/
│   │   ├── technicians.js        # GET/POST/PUT/DELETE /api/technicians
│   │   ├── jobs.js               # GET/POST/PUT/DELETE /api/jobs + import
│   │   └── schedule.js           # GET /api/schedule + POST /api/schedule/save
│   └── middleware/
│       └── validate.js           # Zod schemas + sanitization
└── frontend/
    ├── vite.config.js            # Dev proxy to backend
    ├── index.html
    └── src/
        ├── main.jsx              # React Query provider
        ├── App.jsx               # All pages + app shell
        ├── api/client.js         # Fetch wrapper with error handling
        ├── hooks/                # React Query hooks
        ├── components/           # Modal, Toast, ErrorBoundary
        └── styles/app.css        # Full stylesheet
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/technicians | List (search, filter, paginate) |
| POST | /api/technicians | Create |
| PUT | /api/technicians/:id | Update |
| DELETE | /api/technicians/:id | Delete |
| GET | /api/jobs | List (search, filter, paginate, sort) |
| GET | /api/jobs/stats | Aggregated statistics |
| POST | /api/jobs | Create |
| PUT | /api/jobs/:id | Update |
| DELETE | /api/jobs/:id | Delete |
| POST | /api/jobs/import | CSV file upload |
| GET | /api/schedule | Generate optimized schedule |
| POST | /api/schedule/save | Persist assignments |
| GET | /api/schedule/audit | View audit log |
| GET | /api/health | Health check |

## CSV Import Format

The importer looks for these column headers (flexible matching):
- `Work Order Number` / `wo` / `WO#`
- `Service Account` / `account`
- `Work Order Type` / `type`
- `Short Description` / `description`
- `System Status` / `status`
- `City` / `city`
- `Zipcode` / `zip`
