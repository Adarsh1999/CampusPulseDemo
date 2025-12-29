using System.Text.Json;
using CampusPulse.App.Models;
using CampusPulse.App.Services;

var builder = WebApplication.CreateBuilder(args);

var jsonOptions = new JsonSerializerOptions(JsonSerializerDefaults.Web)
{
    WriteIndented = false
};

builder.Services.AddSingleton(jsonOptions);
builder.Services.Configure<PulseStorageOptions>(builder.Configuration.GetSection("PulseStorage"));
builder.Services.AddSingleton<PulseSentiment>();
builder.Services.AddSingleton<PulseRepository>();
builder.Services.AddSingleton<PulseUpdateStream>();
builder.Services.AddHostedService<PulseMetricsWorker>();

builder.Services.AddRouting(options => options.LowercaseUrls = true);

var app = builder.Build();

app.UseHttpsRedirection();
app.UseDefaultFiles();
app.UseStaticFiles();

app.MapGet("/api/health", () => Results.Ok(new { status = "ok", time = DateTimeOffset.UtcNow }));

app.MapGet("/api/sessions", (PulseRepository repository) => Results.Ok(repository.GetSessions()));

app.MapGet("/api/sessions/{code}", (string code, PulseRepository repository) =>
{
    var session = repository.GetSession(code);
    return session is null ? Results.NotFound() : Results.Ok(session);
});

app.MapPost("/api/sessions", (CreateSessionRequest request, PulseRepository repository) =>
{
    if (string.IsNullOrWhiteSpace(request.Title))
    {
        return Results.BadRequest(new { message = "Title is required." });
    }

    var session = repository.CreateSession(request);
    return Results.Created($"/api/sessions/{session.Code}", session);
});

app.MapGet("/api/sessions/{code}/summary", (string code, PulseRepository repository) =>
{
    var summary = repository.GetSummary(code);
    return summary is null ? Results.NotFound() : Results.Ok(summary);
});

app.MapGet("/api/sessions/{code}/feedback", (string code, int? take, PulseRepository repository) =>
{
    if (repository.GetSession(code) is null)
    {
        return Results.NotFound();
    }

    var safeTake = Math.Clamp(take ?? 12, 1, 50);
    return Results.Ok(repository.GetFeedback(code, safeTake));
});

app.MapPost("/api/feedback", (CreateFeedbackRequest request, PulseRepository repository, PulseUpdateStream updates) =>
{
    if (string.IsNullOrWhiteSpace(request.SessionCode))
    {
        return Results.BadRequest(new { message = "Session code is required." });
    }

    if (request.Rating is < 1 or > 5)
    {
        return Results.BadRequest(new { message = "Rating must be between 1 and 5." });
    }

    var feedback = repository.AddFeedback(request);
    if (feedback is null)
    {
        return Results.NotFound(new { message = "Session code not found." });
    }

    var summary = repository.GetSummary(feedback.SessionCode);
    if (summary is not null)
    {
        updates.Publish(new PulseUpdate { Feedback = feedback, Summary = summary });
    }

    return Results.Created($"/api/sessions/{feedback.SessionCode}/feedback/{feedback.Id}", feedback);
});

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

    context.Response.Headers.ContentType = "text/event-stream";
    context.Response.Headers.CacheControl = "no-cache";
    context.Response.Headers.Connection = "keep-alive";

    var subscription = updates.Subscribe(session.Code);

    try
    {
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

app.MapFallbackToFile("index.html");

app.Run();
