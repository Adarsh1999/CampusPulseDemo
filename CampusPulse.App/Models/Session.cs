namespace CampusPulse.App.Models;

public sealed record Session
{
    public string Code { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string Speaker { get; init; } = string.Empty;
    public DateTimeOffset StartUtc { get; init; }
    public DateTimeOffset CreatedUtc { get; init; }
}
