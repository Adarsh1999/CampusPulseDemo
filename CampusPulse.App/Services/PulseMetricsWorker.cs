namespace CampusPulse.App.Services;

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
        var timer = new PeriodicTimer(TimeSpan.FromSeconds(30));

        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            var summaries = _repository.GetSummaries();
            if (summaries.Count == 0)
            {
                continue;
            }

            foreach (var summary in summaries)
            {
                _logger.LogInformation(
                    "Pulse snapshot {Code}: {AverageRating:N1} avg, {Total} responses, {Positive:P0} positive",
                    summary.Code,
                    summary.AverageRating,
                    summary.TotalResponses,
                    summary.PositiveShare);
            }
        }
    }
}
