using System.Globalization;

namespace CampusPulse.App.Services;

public sealed class PulseSentiment
{
    private static readonly HashSet<string> PositiveWords = new(StringComparer.OrdinalIgnoreCase)
    {
        "amazing", "awesome", "clear", "confident", "cool", "easy", "excellent", "fast",
        "good", "great", "helpful", "insightful", "love", "nice", "smooth", "useful"
    };

    private static readonly HashSet<string> NegativeWords = new(StringComparer.OrdinalIgnoreCase)
    {
        "bad", "boring", "confusing", "hard", "issue", "lag", "slow", "pain",
        "poor", "rough", "unclear", "stuck", "tough", "waste"
    };

    public int Score(string? comment)
    {
        if (string.IsNullOrWhiteSpace(comment))
        {
            return 0;
        }

        var tokens = comment
            .ToLower(CultureInfo.InvariantCulture)
            .Split(new[] { ' ', ',', '.', '!', '?', ';', ':', '/', '\\', '\t', '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries);

        var score = 0;
        foreach (var token in tokens)
        {
            if (PositiveWords.Contains(token))
            {
                score++;
            }

            if (NegativeWords.Contains(token))
            {
                score--;
            }
        }

        return Math.Clamp(score, -3, 3);
    }
}
