namespace PolishFootballNetwork.Domain.Events;

/// <summary>
/// Represents a domain event that occurred within the domain.
/// Domain events are used to communicate changes and trigger side effects within the domain.
/// </summary>
public interface IDomainEvent
{
    /// <summary>
    /// Gets the unique identifier of the domain event.
    /// </summary>
    Guid Id { get; }

    /// <summary>
    /// Gets the date and time when the domain event occurred.
    /// </summary>
    DateTime OccurredAt { get; }
}
