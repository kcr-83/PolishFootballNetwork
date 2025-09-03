namespace PolishFootballNetwork.Domain.Exceptions;

/// <summary>
/// Exception that represents a domain rule violation.
/// This exception should be thrown when business rules are violated within the domain layer.
/// </summary>
public class DomainException : Exception
{
    /// <summary>
    /// Initializes a new instance of the DomainException class.
    /// </summary>
    public DomainException()
    {
    }

    /// <summary>
    /// Initializes a new instance of the DomainException class with a specified error message.
    /// </summary>
    /// <param name="message">The message that describes the error.</param>
    public DomainException(string message) : base(message)
    {
    }

    /// <summary>
    /// Initializes a new instance of the DomainException class with a specified error message 
    /// and a reference to the inner exception that is the cause of this exception.
    /// </summary>
    /// <param name="message">The error message that explains the reason for the exception.</param>
    /// <param name="innerException">The exception that is the cause of the current exception.</param>
    public DomainException(string message, Exception innerException) : base(message, innerException)
    {
    }
}
