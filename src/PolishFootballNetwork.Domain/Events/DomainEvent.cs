namespace PolishFootballNetwork.Domain.Events;

/// <summary>
/// Base implementation of a domain event with common properties.
/// </summary>
public abstract class DomainEvent : IDomainEvent
{
    /// <summary>
    /// Gets the unique identifier of the domain event.
    /// </summary>
    public Guid Id { get; }

    /// <summary>
    /// Gets the date and time when the domain event occurred.
    /// </summary>
    public DateTime OccurredAt { get; }

    /// <summary>
    /// Initializes a new instance of the DomainEvent class.
    /// </summary>
    protected DomainEvent()
    {
        Id = Guid.NewGuid();
        OccurredAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Initializes a new instance of the DomainEvent class with a specific occurrence time.
    /// </summary>
    /// <param name="occurredAt">The date and time when the event occurred.</param>
    protected DomainEvent(DateTime occurredAt)
    {
        Id = Guid.NewGuid();
        OccurredAt = occurredAt;
    }
}
