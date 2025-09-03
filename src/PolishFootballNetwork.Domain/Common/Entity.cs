using PolishFootballNetwork.Domain.Events;

namespace PolishFootballNetwork.Domain.Common;

/// <summary>
/// Base class for all domain entities that provides unique identity and domain events support.
/// </summary>
public abstract class Entity : IEquatable<Entity>
{
    private readonly List<IDomainEvent> _domainEvents = new();

    /// <summary>
    /// Gets the unique identifier of the entity.
    /// </summary>
    public int Id { get; protected set; }

    /// <summary>
    /// Gets the date and time when the entity was created.
    /// </summary>
    public DateTime CreatedAt { get; protected set; }

    /// <summary>
    /// Gets the date and time when the entity was last modified.
    /// </summary>
    public DateTime ModifiedAt { get; protected set; }

    /// <summary>
    /// Gets a read-only collection of domain events raised by this entity.
    /// </summary>
    public IReadOnlyCollection<IDomainEvent> DomainEvents => _domainEvents.AsReadOnly();

    /// <summary>
    /// Initializes a new instance of the Entity class.
    /// </summary>
    protected Entity()
    {
        CreatedAt = DateTime.UtcNow;
        ModifiedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Initializes a new instance of the Entity class with the specified identifier.
    /// </summary>
    /// <param name="id">The unique identifier of the entity.</param>
    protected Entity(int id) : this()
    {
        Id = id;
    }

    /// <summary>
    /// Adds a domain event to the entity's event collection.
    /// </summary>
    /// <param name="domainEvent">The domain event to add.</param>
    protected void AddDomainEvent(IDomainEvent domainEvent)
    {
        _domainEvents.Add(domainEvent);
    }

    /// <summary>
    /// Removes a domain event from the entity's event collection.
    /// </summary>
    /// <param name="domainEvent">The domain event to remove.</param>
    protected void RemoveDomainEvent(IDomainEvent domainEvent)
    {
        _domainEvents.Remove(domainEvent);
    }

    /// <summary>
    /// Clears all domain events from the entity's event collection.
    /// </summary>
    public void ClearDomainEvents()
    {
        _domainEvents.Clear();
    }

    /// <summary>
    /// Updates the ModifiedAt timestamp to the current UTC time.
    /// This should be called whenever the entity is modified.
    /// </summary>
    protected void UpdateModifiedAt()
    {
        ModifiedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Determines whether the specified entity is equal to the current entity.
    /// Two entities are considered equal if they have the same type and the same Id.
    /// </summary>
    /// <param name="other">The entity to compare with the current entity.</param>
    /// <returns>true if the specified entity is equal to the current entity; otherwise, false.</returns>
    public bool Equals(Entity? other)
    {
        if (other is null) return false;
        if (ReferenceEquals(this, other)) return true;
        if (GetType() != other.GetType()) return false;
        return Id == other.Id && Id != 0;
    }

    /// <summary>
    /// Determines whether the specified object is equal to the current entity.
    /// </summary>
    /// <param name="obj">The object to compare with the current entity.</param>
    /// <returns>true if the specified object is equal to the current entity; otherwise, false.</returns>
    public override bool Equals(object? obj)
    {
        return Equals(obj as Entity);
    }

    /// <summary>
    /// Returns a hash code for the current entity.
    /// </summary>
    /// <returns>A hash code for the current entity.</returns>
    public override int GetHashCode()
    {
        return HashCode.Combine(GetType(), Id);
    }

    /// <summary>
    /// Determines whether two entities are equal.
    /// </summary>
    /// <param name="left">The first entity to compare.</param>
    /// <param name="right">The second entity to compare.</param>
    /// <returns>true if the entities are equal; otherwise, false.</returns>
    public static bool operator ==(Entity? left, Entity? right)
    {
        return Equals(left, right);
    }

    /// <summary>
    /// Determines whether two entities are not equal.
    /// </summary>
    /// <param name="left">The first entity to compare.</param>
    /// <param name="right">The second entity to compare.</param>
    /// <returns>true if the entities are not equal; otherwise, false.</returns>
    public static bool operator !=(Entity? left, Entity? right)
    {
        return !Equals(left, right);
    }
}
