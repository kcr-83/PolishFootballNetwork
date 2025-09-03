namespace PolishFootballNetwork.Domain.Exceptions;

/// <summary>
/// Exception thrown when a business rule validation fails in the domain layer.
/// </summary>
public class BusinessRuleValidationException : DomainException
{
    /// <summary>
    /// Gets the name of the business rule that was violated.
    /// </summary>
    public string? RuleName { get; }

    /// <summary>
    /// Initializes a new instance of the BusinessRuleValidationException class with a default message.
    /// </summary>
    public BusinessRuleValidationException() : base("A business rule validation failed.")
    {
    }

    /// <summary>
    /// Initializes a new instance of the BusinessRuleValidationException class with a specified error message.
    /// </summary>
    /// <param name="message">The message that describes the business rule violation.</param>
    public BusinessRuleValidationException(string message) : base(message)
    {
    }

    /// <summary>
    /// Initializes a new instance of the BusinessRuleValidationException class with a specified error message and rule name.
    /// </summary>
    /// <param name="message">The message that describes the business rule violation.</param>
    /// <param name="ruleName">The name of the business rule that was violated.</param>
    public BusinessRuleValidationException(string message, string ruleName) : base(message)
    {
        RuleName = ruleName;
    }

    /// <summary>
    /// Initializes a new instance of the BusinessRuleValidationException class with a specified error message 
    /// and a reference to the inner exception that is the cause of this exception.
    /// </summary>
    /// <param name="message">The error message that explains the reason for the exception.</param>
    /// <param name="innerException">The exception that is the cause of the current exception.</param>
    public BusinessRuleValidationException(string message, Exception innerException) : base(message, innerException)
    {
    }

    /// <summary>
    /// Initializes a new instance of the BusinessRuleValidationException class with a specified error message,
    /// rule name, and a reference to the inner exception that is the cause of this exception.
    /// </summary>
    /// <param name="message">The error message that explains the reason for the exception.</param>
    /// <param name="ruleName">The name of the business rule that was violated.</param>
    /// <param name="innerException">The exception that is the cause of the current exception.</param>
    public BusinessRuleValidationException(string message, string ruleName, Exception innerException) : base(message, innerException)
    {
        RuleName = ruleName;
    }
}
