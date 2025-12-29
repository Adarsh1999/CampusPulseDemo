namespace CampusPulse.App.Services;

public sealed record PulseStorageOptions
{
    public string DataFile { get; init; } = "App_Data/pulse.json";
    public int MaxFeedbackPerSession { get; init; } = 200;
}
