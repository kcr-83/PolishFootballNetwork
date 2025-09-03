namespace PolishFootballNetwork.Domain.Exceptions;

/// <summary>
/// Exception thrown when an entity is not found in the repository.
/// </summary>
public class EntityNotFoundException : DomainException
{
    /// <summary>
    /// Initializes a new instance of the EntityNotFoundException class with a default message.
    /// </summary>
    public EntityNotFoundException() : base("Entity was not found.")
    {
    }

    /// <summary>
    /// Initializes a new instance of the EntityNotFoundException class for a specific entity type.
    /// </summary>
    /// <param name="entityType">The type of entity that was not found.</param>
    public EntityNotFoundException(string entityType) : base($"{entityType} was not found.")
    {
    }

    /// <summary>
    /// Initializes a new instance of the EntityNotFoundException class for a specific entity type and identifier.
    /// </summary>
    /// <param name="entityType">The type of entity that was not found.</param>
    /// <param name="id">The identifier of the entity that was not found.</param>
    public EntityNotFoundException(string entityType, object id) : base($"{entityType} with id '{id}' was not found.")
    {
    }

    /// <summary>
    /// Initializes a new instance of the EntityNotFoundException class with a specified error message 
    /// and a reference to the inner exception that is the cause of this exception.
    /// </summary>
    /// <param name="message">The error message that explains the reason for the exception.</param>
    /// <param name="innerException">The exception that is the cause of the current exception.</param>
    public EntityNotFoundException(string message, Exception innerException) : base(message, innerException)
    {
    }
}
