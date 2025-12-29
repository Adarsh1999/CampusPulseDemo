namespace CampusPulse.App.Models;

public sealed record PulseUpdate
{
    public Feedback Feedback { get; init; } = default!;
    public SessionSummary Summary { get; init; } = default!;
}
