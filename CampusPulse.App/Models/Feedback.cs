namespace CampusPulse.App.Models;

public sealed record Feedback
{
    public Guid Id { get; init; }
    public string SessionCode { get; init; } = string.Empty;
    public int Rating { get; init; }
    public string? Comment { get; init; }
    public int SentimentScore { get; init; }
    public DateTimeOffset CreatedUtc { get; init; }
}
