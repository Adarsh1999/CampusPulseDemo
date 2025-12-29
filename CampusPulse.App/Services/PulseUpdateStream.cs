using System.Collections.Concurrent;
using System.Threading.Channels;
using CampusPulse.App.Models;

namespace CampusPulse.App.Services;

public sealed class PulseUpdateStream
{
    private readonly ConcurrentDictionary<string, ConcurrentDictionary<Guid, Channel<PulseUpdate>>> _streams
        = new(StringComparer.OrdinalIgnoreCase);

    public PulseSubscription Subscribe(string sessionCode)
    {
        var channel = Channel.CreateUnbounded<PulseUpdate>(new UnboundedChannelOptions
        {
            SingleReader = true,
            SingleWriter = false
        });

        var group = _streams.GetOrAdd(sessionCode, _ => new ConcurrentDictionary<Guid, Channel<PulseUpdate>>());
        var id = Guid.NewGuid();
        group[id] = channel;

        return new PulseSubscription(sessionCode, id, channel.Reader);
    }

    public void Unsubscribe(PulseSubscription subscription)
    {
        if (_streams.TryGetValue(subscription.SessionCode, out var group) && group.TryRemove(subscription.Id, out var channel))
        {
            channel.Writer.TryComplete();
        }
    }

    public void Publish(PulseUpdate update)
    {
        if (!_streams.TryGetValue(update.Feedback.SessionCode, out var group))
        {
            return;
        }

        foreach (var channel in group.Values)
        {
            channel.Writer.TryWrite(update);
        }
    }
}

public sealed record PulseSubscription(string SessionCode, Guid Id, ChannelReader<PulseUpdate> Reader);
