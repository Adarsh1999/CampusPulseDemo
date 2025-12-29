# CampusPulse Demo (MSA Student Project)

CampusPulse is a lightweight, end-to-end **ASP.NET Core** demo that lets students submit quick feedback during a session while a live dashboard updates in real time. It is designed to fit a **30-minute teaching demo** and highlight core Microsoft technologies without extra dependencies.

## What you get
- **Minimal API backend** for sessions, feedback, and live metrics.
- **Server-Sent Events (SSE)** for real-time dashboard updates.
- **JSON persistence** with the Options pattern (no database setup).
- **Hosted background worker** that logs session snapshots.
- **Bold UI** with multiple views: Admin, Student, Dashboard.

## Tech stack (Microsoft-first)
- ASP.NET Core (Minimal hosting model)
- Dependency Injection + Options pattern
- BackgroundService (hosted worker)
- Native JSON serialization
- Static front-end served by ASP.NET Core

## Project layout
```
CampusPulseDemo/
- CampusPulse.App/
  - Models/                 # DTOs and domain records
  - Services/               # Repository, update stream, worker
  - wwwroot/                # Front-end (HTML/CSS/JS)
  - Program.cs              # API + SSE endpoints
  - appsettings.json        # Options configuration
- README.md                 # This guide
```

## Quick start
```bash
cd /home/adarsh/msa-project/CampusPulseDemo

dotnet run --project CampusPulse.App
```

Open it in your browser:
- `http://127.0.0.1:5055` (HTTP)
- `https://127.0.0.1:7055` (HTTPS)

Starter session codes (seeded on first run):
- `MSA101` - Build Your First .NET API
- `AZURE1` - Azure in 15 Minutes

## Demo flow (30-minute walkthrough)
1. **Set the stage (2 min)**
   - Show the landing page and describe the goal: live feedback for workshops.
2. **Admin experience (6 min)**
   - Open `/admin.html` and create a new session.
   - Explain the `CreateSessionRequest` DTO and endpoint.
3. **Student experience (6 min)**
   - Open `/submit.html`, enter the session code, send feedback.
   - Highlight API validation and JSON persistence.
4. **Live dashboard (8 min)**
   - Open `/dashboard.html` and connect to the session.
   - Submit more feedback; show live updates (SSE).
5. **Under the hood (6 min)**
   - Show `Program.cs` minimal APIs and the SSE handler.
   - Show `Services/PulseRepository.cs` JSON persistence.
   - Mention `PulseMetricsWorker` logging every 30 seconds.
6. **Wrap-up (2 min)**
   - Discuss how to extend with Azure or a database.

## API endpoints
- `GET /api/sessions` - list sessions
- `POST /api/sessions` - create a session
- `GET /api/sessions/{code}` - session details
- `GET /api/sessions/{code}/summary` - live summary
- `GET /api/sessions/{code}/feedback?take=12` - latest feedback
- `POST /api/feedback` - submit feedback
- `GET /api/sessions/{code}/stream` - SSE stream for live updates
- `GET /api/health` - simple health check

## Data storage
- Stored in `CampusPulse.App/App_Data/pulse.json`
- Controlled by `PulseStorage` in `appsettings.json`
- Easy swap: replace with EF Core / Azure SQL / Cosmos DB later

## PPT outline (suggested slides)
1. Title + why live feedback matters
2. Problem statement in classrooms & events
3. Solution overview (CampusPulse)
4. Architecture diagram (UI -> API -> JSON store)
5. Minimal API highlights
6. Real-time updates with SSE
7. Hosted services & logging
8. Demo results (screenshots)
9. Future upgrades with Azure (App Service, Storage, AI)
10. Q&A

## Optional Azure ideas
- **Azure App Service**: deploy the app and share a public dashboard URL.
- **Azure Storage**: replace JSON file with Blob storage for feedback data.
- **Azure AI Language**: run real sentiment analysis instead of keyword scoring.

## Notes
- This project intentionally avoids third-party packages to keep setup simple.
- If you want a different port, set `ASPNETCORE_URLS`:
  ```bash
  ASPNETCORE_URLS=http://localhost:5055 dotnet run --project CampusPulse.App
  ```

---

If you want enhancements (authentication, dashboards, Azure integration), tell me the direction and I can extend the project.
