namespace CampusPulse.App.Models;

public sealed class PulseData
{
    public List<Session> Sessions { get; set; } = new();
    public List<Feedback> FeedbackEntries { get; set; } = new();
}
