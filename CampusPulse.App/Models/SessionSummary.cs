namespace CampusPulse.App.Models;

public sealed record SessionSummary
{
    public string Code { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string Speaker { get; init; } = string.Empty;
    public DateTimeOffset StartUtc { get; init; }
    public int TotalResponses { get; init; }
    public double AverageRating { get; init; }
    public double PositiveShare { get; init; }
    public double SentimentAverage { get; init; }
    public DateTimeOffset? LastUpdatedUtc { get; init; }
}
