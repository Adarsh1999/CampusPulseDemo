using System.Text.Json;
using CampusPulse.App.Models;
using Microsoft.Extensions.Options;

namespace CampusPulse.App.Services;

public sealed class PulseRepository
{
    private readonly ReaderWriterLockSlim _lock = new();
    private readonly PulseStorageOptions _options;
    private readonly PulseSentiment _sentiment;
    private readonly JsonSerializerOptions _jsonOptions;
    private readonly JsonSerializerOptions _fileJsonOptions;
    private readonly string _dataFile;
    private readonly Random _random = new();
    private PulseData _data;

    public PulseRepository(
        IOptions<PulseStorageOptions> options,
        IHostEnvironment environment,
        JsonSerializerOptions jsonOptions,
        PulseSentiment sentiment,
        ILogger<PulseRepository> logger)
    {
        _options = options.Value;
        _sentiment = sentiment;
        _jsonOptions = jsonOptions;
        _fileJsonOptions = new JsonSerializerOptions(jsonOptions) { WriteIndented = true };
        _dataFile = Path.Combine(environment.ContentRootPath, _options.DataFile);

        var directory = Path.GetDirectoryName(_dataFile);
        if (!string.IsNullOrWhiteSpace(directory))
        {
            Directory.CreateDirectory(directory);
        }

        _data = LoadData() ?? SeedData();
        SaveData();

        logger.LogInformation("CampusPulse data file: {DataFile}", _dataFile);
    }

    public IReadOnlyList<Session> GetSessions()
    {
        _lock.EnterReadLock();
        try
        {
            return _data.Sessions
                .OrderBy(s => s.StartUtc)
                .ToList();
        }
        finally
        {
            _lock.ExitReadLock();
        }
    }

    public Session? GetSession(string code)
    {
        var normalized = NormalizeCode(code);
        _lock.EnterReadLock();
        try
        {
            return _data.Sessions.FirstOrDefault(s => s.Code.Equals(normalized, StringComparison.OrdinalIgnoreCase));
        }
        finally
        {
            _lock.ExitReadLock();
        }
    }

    public Session CreateSession(CreateSessionRequest request)
    {
        var title = request.Title?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(title))
        {
            throw new ArgumentException("Title is required.");
        }

        var speaker = string.IsNullOrWhiteSpace(request.Speaker) ? "Guest Speaker" : request.Speaker.Trim();

        _lock.EnterWriteLock();
        try
        {
            var code = GenerateSessionCode();
            var session = new Session
            {
                Code = code,
                Title = title,
                Speaker = speaker,
                StartUtc = request.StartUtc ?? DateTimeOffset.UtcNow.AddHours(1),
                CreatedUtc = DateTimeOffset.UtcNow
            };

            _data.Sessions.Add(session);
            SaveData();
            return session;
        }
        finally
        {
            _lock.ExitWriteLock();
        }
    }

    public Feedback? AddFeedback(CreateFeedbackRequest request)
    {
        var normalized = NormalizeCode(request.SessionCode);
        var comment = request.Comment?.Trim();

        _lock.EnterWriteLock();
        try
        {
            var session = _data.Sessions.FirstOrDefault(s => s.Code.Equals(normalized, StringComparison.OrdinalIgnoreCase));
            if (session is null)
            {
                return null;
            }

            var feedback = new Feedback
            {
                Id = Guid.NewGuid(),
                SessionCode = session.Code,
                Rating = request.Rating,
                Comment = comment,
                SentimentScore = _sentiment.Score(comment),
                CreatedUtc = DateTimeOffset.UtcNow
            };

            _data.FeedbackEntries.Add(feedback);
            TrimFeedbackLocked(session.Code);
            SaveData();

            return feedback;
        }
        finally
        {
            _lock.ExitWriteLock();
        }
    }

    public IReadOnlyList<Feedback> GetFeedback(string code, int take)
    {
        var normalized = NormalizeCode(code);
        _lock.EnterReadLock();
        try
        {
            return _data.FeedbackEntries
                .Where(f => f.SessionCode.Equals(normalized, StringComparison.OrdinalIgnoreCase))
                .OrderByDescending(f => f.CreatedUtc)
                .Take(take)
                .ToList();
        }
        finally
        {
            _lock.ExitReadLock();
        }
    }

    public SessionSummary? GetSummary(string code)
    {
        var normalized = NormalizeCode(code);
        _lock.EnterReadLock();
        try
        {
            var session = _data.Sessions.FirstOrDefault(s => s.Code.Equals(normalized, StringComparison.OrdinalIgnoreCase));
            if (session is null)
            {
                return null;
            }

            return BuildSummary(session);
        }
        finally
        {
            _lock.ExitReadLock();
        }
    }

    public IReadOnlyList<SessionSummary> GetSummaries()
    {
        _lock.EnterReadLock();
        try
        {
            return _data.Sessions
                .Select(BuildSummary)
                .OrderBy(summary => summary.StartUtc)
                .ToList();
        }
        finally
        {
            _lock.ExitReadLock();
        }
    }

    private SessionSummary BuildSummary(Session session)
    {
        var feedback = _data.FeedbackEntries
            .Where(f => f.SessionCode.Equals(session.Code, StringComparison.OrdinalIgnoreCase))
            .ToList();

        var total = feedback.Count;
        var avgRating = total > 0 ? feedback.Average(f => f.Rating) : 0;
        var avgSentiment = total > 0 ? feedback.Average(f => f.SentimentScore) : 0;
        var positiveShare = total > 0 ? feedback.Count(f => f.SentimentScore > 0) / (double)total : 0;
        var lastUpdate = feedback.Count > 0 ? feedback.Max(f => f.CreatedUtc) : (DateTimeOffset?)null;

        return new SessionSummary
        {
            Code = session.Code,
            Title = session.Title,
            Speaker = session.Speaker,
            TotalResponses = total,
            AverageRating = avgRating,
            PositiveShare = positiveShare,
            SentimentAverage = avgSentiment,
            LastUpdatedUtc = lastUpdate,
            StartUtc = session.StartUtc
        };
    }

    private void TrimFeedbackLocked(string sessionCode)
    {
        if (_options.MaxFeedbackPerSession <= 0)
        {
            return;
        }

        var overflow = _data.FeedbackEntries
            .Where(f => f.SessionCode.Equals(sessionCode, StringComparison.OrdinalIgnoreCase))
            .OrderByDescending(f => f.CreatedUtc)
            .Skip(_options.MaxFeedbackPerSession)
            .ToList();

        foreach (var entry in overflow)
        {
            _data.FeedbackEntries.Remove(entry);
        }
    }

    private string GenerateSessionCode()
    {
        const string alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        Span<char> buffer = stackalloc char[6];

        while (true)
        {
            for (var i = 0; i < buffer.Length; i++)
            {
                buffer[i] = alphabet[_random.Next(alphabet.Length)];
            }

            var code = new string(buffer);
            if (_data.Sessions.All(s => !s.Code.Equals(code, StringComparison.OrdinalIgnoreCase)))
            {
                return code;
            }
        }
    }

    private string NormalizeCode(string code) => (code ?? string.Empty).Trim().ToUpperInvariant();

    private PulseData? LoadData()
    {
        if (!File.Exists(_dataFile))
        {
            return null;
        }

        try
        {
            using var stream = File.OpenRead(_dataFile);
            return JsonSerializer.Deserialize<PulseData>(stream, _jsonOptions);
        }
        catch
        {
            return null;
        }
    }

    private void SaveData()
    {
        using var stream = File.Create(_dataFile);
        JsonSerializer.Serialize(stream, _data, _fileJsonOptions);
    }

    private PulseData SeedData()
    {
        var now = DateTimeOffset.UtcNow;

        var sessionOne = new Session
        {
            Code = "MSA101",
            Title = "Build Your First .NET API",
            Speaker = "MSA Ambassador",
            StartUtc = now.AddHours(1),
            CreatedUtc = now
        };

        var sessionTwo = new Session
        {
            Code = "AZURE1",
            Title = "Azure in 15 Minutes",
            Speaker = "Student Lead",
            StartUtc = now.AddHours(2),
            CreatedUtc = now
        };

        var feedback = new List<Feedback>
        {
            new()
            {
                Id = Guid.NewGuid(),
                SessionCode = sessionOne.Code,
                Rating = 5,
                Comment = "Great pace and clear demos",
                SentimentScore = _sentiment.Score("Great pace and clear demos"),
                CreatedUtc = now.AddMinutes(-28)
            },
            new()
            {
                Id = Guid.NewGuid(),
                SessionCode = sessionOne.Code,
                Rating = 4,
                Comment = "Useful examples, slightly fast",
                SentimentScore = _sentiment.Score("Useful examples, slightly fast"),
                CreatedUtc = now.AddMinutes(-12)
            },
            new()
            {
                Id = Guid.NewGuid(),
                SessionCode = sessionTwo.Code,
                Rating = 5,
                Comment = "Awesome intro to Azure services",
                SentimentScore = _sentiment.Score("Awesome intro to Azure services"),
                CreatedUtc = now.AddMinutes(-18)
            }
        };

        return new PulseData
        {
            Sessions = new List<Session> { sessionOne, sessionTwo },
            FeedbackEntries = feedback
        };
    }
}
