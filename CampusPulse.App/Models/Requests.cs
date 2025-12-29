namespace CampusPulse.App.Models;

public sealed record CreateSessionRequest
{
    public string Title { get; init; } = string.Empty;
    public string Speaker { get; init; } = string.Empty;
    public DateTimeOffset? StartUtc { get; init; }
}

public sealed record CreateFeedbackRequest
{
    public string SessionCode { get; init; } = string.Empty;
    public int Rating { get; init; }
    public string? Comment { get; init; }
    public string? SubmittedBy { get; init; }
}
