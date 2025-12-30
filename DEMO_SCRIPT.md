# CampusPulse Demo Script

> **Duration**: 35-40 minutes  
> **Focus**: ASP.NET Core Minimal APIs, Real-time Updates, Microsoft Technologies  
> **Target Audience**: Students learning .NET development  
> **GitHub**: https://github.com/Adarsh1999/CampusPulseDemo

---

## 🎯 Demo Overview

| Section | Duration | Focus |
|---------|----------|-------|
| Introduction & Problem | 3 min | Why real-time feedback matters |
| Live Demo | 8 min | Show the app working |
| Code Walkthrough | 20 min | Deep dive into .NET concepts |
| Architecture & Extensions | 5 min | How it all connects |
| Q&A | 4 min | Questions and resources |

---

## ⏱️ PART 1: Introduction (0:00 - 3:00)

### What to Say:
> "Today we're building CampusPulse - a real-time feedback app that lets students rate sessions while speakers watch the dashboard update live. This is built 100% with Microsoft technologies - no third-party packages needed!"

### Key Points to Cover:
- **Problem**: Traditional feedback forms come too late
- **Solution**: Live feedback during the session
- **Tech Stack**: Pure ASP.NET Core with Minimal APIs
- **Learning Goals**:
  - ✅ Minimal APIs (clean, fast endpoints)
  - ✅ Dependency Injection
  - ✅ Options Pattern for configuration
  - ✅ Server-Sent Events (SSE) for real-time
  - ✅ BackgroundService for scheduled tasks
  - ✅ JSON persistence without a database

---

## ⏱️ PART 2: Live Demo (3:00 - 11:00)

### Step 1: Start the Application (3:00 - 4:00)

```bash
cd CampusPulseDemo
dotnet run --project CampusPulse.App
```

**Show the terminal output:**
> "Notice the log message showing where our JSON data file is stored. No database setup needed!"

```
info: CampusPulse.App.Services.PulseRepository[0]
      CampusPulse data file: .../App_Data/pulse.json
```

### Step 2: Home Page Tour (4:00 - 5:00)

**Open**: http://127.0.0.1:5055

**Point out:**
- Clean, modern UI (built with vanilla HTML/CSS/JS)
- Three views: Admin, Student, Dashboard
- Demo storyline card showing the flow
- Pre-loaded session code: `MSA101`

### Step 3: Admin Experience (5:00 - 7:00)

**Open**: http://127.0.0.1:5055/admin.html

**Demo:**
1. Show existing sessions (MSA101, AZURE1)
2. Create a NEW session:
   - Title: "Learn .NET APIs"
   - Speaker: Your name
   - Click "Create session"
3. Show the auto-generated session code
4. Click "Copy links" - show both dashboard and submit URLs

**What to Explain:**
> "Each session gets a unique 6-character code. The API validates input and generates collision-free codes."

### Step 4: Student Feedback (7:00 - 9:00)

**Open**: http://127.0.0.1:5055/submit.html

**Demo:**
1. Select a session from the cards
2. Enter your name (optional)
3. Pick a rating (1-5)
4. Add a comment: "Great explanation of APIs!"
5. Click "Send Feedback"
6. Show success message

**What to Explain:**
> "This posts to our Minimal API endpoint. The API validates the rating is 1-5, checks the session exists, and even calculates a basic sentiment score!"

### Step 5: Live Dashboard - THE WOW MOMENT (9:00 - 11:00)

**Open TWO browser windows side-by-side:**
1. Dashboard: http://127.0.0.1:5055/dashboard.html?code=MSA101
2. Submit: http://127.0.0.1:5055/submit.html?code=MSA101

**Demo:**
1. Connect to the dashboard (click Connect)
2. In the other window, submit new feedback
3. **WATCH IT UPDATE IN REAL-TIME!** 🎉

**What to Explain:**
> "This magic happens through Server-Sent Events - a native browser API. No WebSocket libraries, no SignalR complexity - just pure HTTP streaming!"

---

## ⏱️ PART 3: Code Walkthrough (11:00 - 31:00)

### 3.1 Project Structure (11:00 - 12:00)

**Show the folder structure:**

```
CampusPulse.App/
├── Program.cs              ← Entry point + all API endpoints
├── Models/                 ← DTOs and domain objects
│   ├── Session.cs
│   ├── Feedback.cs
│   ├── Requests.cs         ← CreateSessionRequest, CreateFeedbackRequest
│   └── SessionSummary.cs
├── Services/               ← Business logic
│   ├── PulseRepository.cs      ← JSON persistence
│   ├── PulseUpdateStream.cs    ← SSE pub/sub
│   ├── PulseMetricsWorker.cs   ← Background logging
│   ├── PulseSentiment.cs       ← Basic sentiment analysis
│   └── PulseStorageOptions.cs  ← Options pattern config
├── wwwroot/                ← Static front-end
└── appsettings.json        ← Configuration
```

---

### 3.2 Program.cs - Minimal APIs (12:00 - 18:00)

**File**: `CampusPulse.App/Program.cs`

#### A) Service Registration (12:00 - 14:00)

```csharp
// Lines 1-20
var builder = WebApplication.CreateBuilder(args);

// JSON serialization options
var jsonOptions = new JsonSerializerOptions(JsonSerializerDefaults.Web)
{
    WriteIndented = false
};

builder.Services.AddSingleton(jsonOptions);

// Options Pattern - bind config section to strongly-typed class
builder.Services.Configure<PulseStorageOptions>(
    builder.Configuration.GetSection("PulseStorage")
);

// Dependency Injection - register our services
builder.Services.AddSingleton<PulseSentiment>();
builder.Services.AddSingleton<PulseRepository>();
builder.Services.AddSingleton<PulseUpdateStream>();

// BackgroundService - runs on a timer
builder.Services.AddHostedService<PulseMetricsWorker>();
```

**Explain:**
> "This is Dependency Injection in action. We register services as Singletons because we need one shared instance for our in-memory pub/sub system."

> "The Options Pattern lets us bind configuration from appsettings.json to a strongly-typed C# class. No magic strings!"

#### B) Simple API Endpoints (14:00 - 16:00)

```csharp
// Health check - simplest possible endpoint
app.MapGet("/api/health", () => 
    Results.Ok(new { status = "ok", time = DateTimeOffset.UtcNow })
);

// Get all sessions - DI injects the repository
app.MapGet("/api/sessions", (PulseRepository repository) => 
    Results.Ok(repository.GetSessions())
);

// Get single session with route parameter
app.MapGet("/api/sessions/{code}", (string code, PulseRepository repository) =>
{
    var session = repository.GetSession(code);
    return session is null ? Results.NotFound() : Results.Ok(session);
});
```

**Explain:**
> "Notice how clean this is compared to traditional Controllers! Each endpoint is just a lambda. The framework handles routing, serialization, and dependency injection automatically."

> "The `{code}` in the route becomes a method parameter. ASP.NET Core binds it for us!"

#### C) POST with Validation (16:00 - 18:00)

```csharp
// Create session with validation
app.MapPost("/api/sessions", (CreateSessionRequest request, PulseRepository repository) =>
{
    if (string.IsNullOrWhiteSpace(request.Title))
    {
        return Results.BadRequest(new { message = "Title is required." });
    }

    var session = repository.CreateSession(request);
    return Results.Created($"/api/sessions/{session.Code}", session);
});

// Submit feedback with multiple validations
app.MapPost("/api/feedback", (CreateFeedbackRequest request, PulseRepository repository, PulseUpdateStream updates) =>
{
    if (string.IsNullOrWhiteSpace(request.SessionCode))
        return Results.BadRequest(new { message = "Session code is required." });

    if (request.Rating is < 1 or > 5)
        return Results.BadRequest(new { message = "Rating must be between 1 and 5." });

    var feedback = repository.AddFeedback(request);
    if (feedback is null)
        return Results.NotFound(new { message = "Session code not found." });

    // Publish update for real-time dashboard!
    var summary = repository.GetSummary(feedback.SessionCode);
    if (summary is not null)
    {
        updates.Publish(new PulseUpdate { Feedback = feedback, Summary = summary });
    }

    return Results.Created($"/api/sessions/{feedback.SessionCode}/feedback/{feedback.Id}", feedback);
});
```

**Explain:**
> "Look at this pattern validation: `request.Rating is < 1 or > 5`. This is C# pattern matching - super clean!"

> "After saving feedback, we publish to the update stream. Any connected dashboards will receive this instantly!"

---

### 3.3 Server-Sent Events (SSE) - Real-time Magic (18:00 - 22:00)

**File**: `CampusPulse.App/Program.cs` (Lines 92-127)

```csharp
app.MapGet("/api/sessions/{code}/stream", async (
    string code,
    HttpContext context,
    PulseRepository repository,
    PulseUpdateStream updates,
    JsonSerializerOptions options,
    CancellationToken cancellationToken) =>
{
    var session = repository.GetSession(code);
    if (session is null)
    {
        context.Response.StatusCode = StatusCodes.Status404NotFound;
        return;
    }

    // SSE Headers - this is what makes it work!
    context.Response.Headers.ContentType = "text/event-stream";
    context.Response.Headers.CacheControl = "no-cache";
    context.Response.Headers.Connection = "keep-alive";

    // Subscribe to updates for this session
    var subscription = updates.Subscribe(session.Code);

    try
    {
        // Async stream - waits for updates and sends them
        await foreach (var update in subscription.Reader.ReadAllAsync(cancellationToken))
        {
            var payload = JsonSerializer.Serialize(update, options);
            await context.Response.WriteAsync("event: update\n", cancellationToken);
            await context.Response.WriteAsync($"data: {payload}\n\n", cancellationToken);
            await context.Response.Body.FlushAsync(cancellationToken);
        }
    }
    finally
    {
        updates.Unsubscribe(subscription);
    }
});
```

**Explain:**
> "SSE is simpler than WebSockets for one-way server-to-client communication. The browser just opens a GET request that stays open!"

> "The `await foreach` pattern with `ReadAllAsync` is called an 'async enumerable'. It yields items as they arrive - perfect for streaming!"

> "Notice the SSE format: `event: update\n` followed by `data: {...}\n\n`. This is the standard SSE protocol."

**Show**: `CampusPulse.App/Services/PulseUpdateStream.cs`

```csharp
public sealed class PulseUpdateStream
{
    // Each session code gets its own channel
    private readonly ConcurrentDictionary<string, List<ChannelWriter<PulseUpdate>>> _subscribers = new();

    public PulseSubscription Subscribe(string sessionCode)
    {
        var channel = Channel.CreateUnbounded<PulseUpdate>();
        // ... adds to subscribers dictionary
    }

    public void Publish(PulseUpdate update)
    {
        // Send to all subscribers for this session
        if (_subscribers.TryGetValue(update.Feedback.SessionCode, out var writers))
        {
            foreach (var writer in writers)
            {
                writer.TryWrite(update);
            }
        }
    }
}
```

**Explain:**
> "This is a pub/sub pattern using System.Threading.Channels - a high-performance way to pass data between tasks. No external message queue needed!"

---

### 3.4 Options Pattern & Configuration (22:00 - 24:00)

**File**: `CampusPulse.App/appsettings.json`

```json
{
  "PulseStorage": {
    "DataFile": "App_Data/pulse.json",
    "MaxFeedbackPerSession": 200
  }
}
```

**File**: `CampusPulse.App/Services/PulseStorageOptions.cs`

```csharp
public sealed record PulseStorageOptions
{
    public string DataFile { get; init; } = "App_Data/pulse.json";
    public int MaxFeedbackPerSession { get; init; } = 200;
}
```

**Explain:**
> "This is the Options Pattern. We define a POCO (Plain Old C# Object) that mirrors our config section."

> "In Program.cs we bind it: `builder.Services.Configure<PulseStorageOptions>(...)`. Now any service can inject `IOptions<PulseStorageOptions>` and get strongly-typed config!"

> "No more magic strings like `Configuration["PulseStorage:DataFile"]`!"

---

### 3.5 BackgroundService - Hosted Worker (24:00 - 26:00)

**File**: `CampusPulse.App/Services/PulseMetricsWorker.cs`

```csharp
public sealed class PulseMetricsWorker : BackgroundService
{
    private readonly PulseRepository _repository;
    private readonly ILogger<PulseMetricsWorker> _logger;

    public PulseMetricsWorker(PulseRepository repository, ILogger<PulseMetricsWorker> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // PeriodicTimer is more efficient than Task.Delay
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(30));
        
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            var summaries = _repository.GetSummaries();
            foreach (var summary in summaries)
            {
                _logger.LogInformation(
                    "Session {Code}: {Total} responses, avg rating {Avg:F1}",
                    summary.Code,
                    summary.TotalResponses,
                    summary.AverageRating);
            }
        }
    }
}
```

**Explain:**
> "BackgroundService is perfect for scheduled tasks, cleanup jobs, or background processing. It starts automatically with your app!"

> "PeriodicTimer is the modern way to do intervals in .NET 6+. It's more efficient than `while(true) { await Task.Delay(); }`"

**Show the terminal** - you'll see metrics logged every 30 seconds!

---

### 3.6 JSON Persistence (26:00 - 28:00)

**File**: `CampusPulse.App/Services/PulseRepository.cs`

```csharp
public sealed class PulseRepository
{
    private readonly ReaderWriterLockSlim _lock = new();
    private PulseData _data;
    private readonly string _dataFile;

    // Thread-safe read
    public IReadOnlyList<Session> GetSessions()
    {
        _lock.EnterReadLock();
        try
        {
            return _data.Sessions.OrderBy(s => s.StartUtc).ToList();
        }
        finally
        {
            _lock.ExitReadLock();
        }
    }

    // Thread-safe write
    public Session CreateSession(CreateSessionRequest request)
    {
        _lock.EnterWriteLock();
        try
        {
            var session = new Session { ... };
            _data.Sessions.Add(session);
            SaveData();  // Persist to JSON file
            return session;
        }
        finally
        {
            _lock.ExitWriteLock();
        }
    }

    private void SaveData()
    {
        using var stream = File.Create(_dataFile);
        JsonSerializer.Serialize(stream, _data, _fileJsonOptions);
    }
}
```

**Explain:**
> "We use `ReaderWriterLockSlim` for thread-safe access. Multiple readers can access simultaneously, but writers get exclusive access."

> "For a demo app, JSON persistence is perfect - no database setup! In production, you'd swap this for EF Core or Cosmos DB."

**Show the actual data file**: `CampusPulse.App/App_Data/pulse.json`

---

### 3.7 Request DTOs (28:00 - 29:00)

**File**: `CampusPulse.App/Models/Requests.cs`

```csharp
public sealed record CreateSessionRequest
{
    public string? Title { get; init; }
    public string? Speaker { get; init; }
    public DateTimeOffset? StartUtc { get; init; }
}

public sealed record CreateFeedbackRequest
{
    public string? SessionCode { get; init; }
    public int Rating { get; init; }
    public string? Comment { get; init; }
    public string? SubmittedBy { get; init; }
}
```

**Explain:**
> "Records are perfect for DTOs - they're immutable, have value equality, and generate less boilerplate!"

> "ASP.NET Core automatically deserializes JSON request bodies into these objects."

---

### 3.8 Simple Sentiment Analysis (29:00 - 31:00)

**File**: `CampusPulse.App/Services/PulseSentiment.cs`

```csharp
public sealed class PulseSentiment
{
    private static readonly HashSet<string> PositiveWords = new(StringComparer.OrdinalIgnoreCase)
    {
        "great", "awesome", "excellent", "amazing", "good", "love", 
        "fantastic", "helpful", "clear", "wonderful", "best", "perfect"
    };

    private static readonly HashSet<string> NegativeWords = new(StringComparer.OrdinalIgnoreCase)
    {
        "bad", "boring", "confusing", "difficult", "hate", "poor", 
        "slow", "unclear", "worst", "terrible", "awful"
    };

    public int Score(string? comment)
    {
        if (string.IsNullOrWhiteSpace(comment)) return 0;

        var words = comment.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        int score = 0;

        foreach (var word in words)
        {
            var clean = new string(word.Where(char.IsLetter).ToArray());
            if (PositiveWords.Contains(clean)) score++;
            else if (NegativeWords.Contains(clean)) score--;
        }

        return score;
    }
}
```

**Explain:**
> "This is a basic keyword-based sentiment analysis. In production, you'd use Azure AI Language for real NLP!"

> "Notice the HashSet with `StringComparer.OrdinalIgnoreCase` for O(1) case-insensitive lookups."

---

## ⏱️ PART 4: Architecture & Extensions (31:00 - 36:00)

### Show the Data Flow:

```
┌─────────────┐     POST /api/feedback     ┌─────────────────┐
│   Student   │ ─────────────────────────→ │   Minimal API   │
│   Browser   │                            │   (Program.cs)  │
└─────────────┘                            └────────┬────────┘
                                                    │
                    ┌───────────────────────────────┼───────────────────────────────┐
                    │                               │                               │
                    ▼                               ▼                               ▼
           ┌───────────────┐              ┌─────────────────┐             ┌─────────────────┐
           │ PulseRepository│              │ PulseUpdateStream│             │   pulse.json    │
           │   (validate)  │              │   (publish)     │             │   (persist)     │
           └───────────────┘              └────────┬────────┘             └─────────────────┘
                                                   │
                                                   │ Channel<PulseUpdate>
                                                   ▼
                                          ┌─────────────────┐
                                          │  SSE Endpoint   │
                                          │  /stream        │
                                          └────────┬────────┘
                                                   │
                                                   │ text/event-stream
                                                   ▼
                                          ┌─────────────────┐
                                          │   Dashboard     │
                                          │   Browser       │
                                          └─────────────────┘
```

### Azure Extension Ideas (34:00 - 36:00)

| Current | Azure Upgrade |
|---------|---------------|
| JSON file storage | Azure Cosmos DB |
| Keyword sentiment | Azure AI Language |
| localhost | Azure App Service |
| In-memory pub/sub | Azure SignalR Service |
| No auth | Azure AD B2C |

**Say:**
> "This demo shows the patterns. In production, you'd swap JSON for Cosmos DB, add Azure AI for real sentiment analysis, and deploy to App Service!"

---

## ⏱️ PART 5: Wrap-up & Q&A (36:00 - 40:00)

### Key Takeaways:

1. **Minimal APIs** = Less ceremony, more productivity
2. **Dependency Injection** = Testable, loosely-coupled code
3. **Options Pattern** = Type-safe configuration
4. **BackgroundService** = Built-in scheduled tasks
5. **SSE + Channels** = Real-time without SignalR complexity
6. **Records** = Perfect for DTOs

### Resources to Share:

- **GitHub**: https://github.com/Adarsh1999/CampusPulseDemo
- **Docs**: https://learn.microsoft.com/aspnet/core/fundamentals/minimal-apis
- **SSE**: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events

### Challenge for Students:

> "Try adding a DELETE endpoint for sessions, or implement a rating chart using Chart.js!"

---

## 📋 Quick Reference - Files to Show

| Time | File | Concept |
|------|------|---------|
| 12:00 | `Program.cs` (top) | Service registration, DI |
| 14:00 | `Program.cs` (endpoints) | Minimal APIs |
| 18:00 | `Program.cs` (stream) | SSE endpoint |
| 22:00 | `PulseUpdateStream.cs` | Channels, pub/sub |
| 22:00 | `appsettings.json` | Configuration |
| 24:00 | `PulseStorageOptions.cs` | Options pattern |
| 24:00 | `PulseMetricsWorker.cs` | BackgroundService |
| 26:00 | `PulseRepository.cs` | Thread-safe persistence |
| 28:00 | `Requests.cs` | Record types, DTOs |
| 29:00 | `PulseSentiment.cs` | HashSet, LINQ |

---

## 🚀 Pre-Demo Checklist

- [ ] App runs: `dotnet run --project CampusPulse.App`
- [ ] Browser open to http://127.0.0.1:5055
- [ ] Code editor open with `Program.cs`
- [ ] Terminal visible for logs
- [ ] Two browser windows ready for real-time demo
- [ ] GitHub repo link ready to share

---

**Good luck with your demo! 🎉**
