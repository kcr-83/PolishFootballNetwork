using PolishFootballNetwork.Domain.Exceptions;

namespace PolishFootballNetwork.Domain.ValueObjects;

/// <summary>
/// Represents a monetary amount with currency.
/// This value object is prepared for future use when financial features are added.
/// </summary>
public class Money : ValueObject
{
    /// <summary>
    /// Gets the monetary amount.
    /// </summary>
    public decimal Amount { get; private set; }

    /// <summary>
    /// Gets the currency code (ISO 4217 format).
    /// </summary>
    public string Currency { get; private set; }

    /// <summary>
    /// Initializes a new instance of the Money class.
    /// </summary>
    /// <param name="amount">The monetary amount.</param>
    /// <param name="currency">The currency code (ISO 4217 format).</param>
    /// <exception cref="DomainException">Thrown when amount or currency is invalid.</exception>
    public Money(decimal amount, string currency)
    {
        ValidateAmount(amount);
        ValidateCurrency(currency);
        
        Amount = amount;
        Currency = currency.ToUpperInvariant();
    }

    /// <summary>
    /// Creates a Money instance with zero amount.
    /// </summary>
    /// <param name="currency">The currency code.</param>
    /// <returns>A Money instance with zero amount.</returns>
    public static Money Zero(string currency) => new(0, currency);

    /// <summary>
    /// Creates a Money instance.
    /// </summary>
    /// <param name="amount">The monetary amount.</param>
    /// <param name="currency">The currency code.</param>
    /// <returns>A new Money instance.</returns>
    public static Money Create(decimal amount, string currency) => new(amount, currency);

    /// <summary>
    /// Adds two Money instances. Both must have the same currency.
    /// </summary>
    /// <param name="other">The Money instance to add.</param>
    /// <returns>A new Money instance with the sum.</returns>
    /// <exception cref="ArgumentNullException">Thrown when other is null.</exception>
    /// <exception cref="DomainException">Thrown when currencies don't match.</exception>
    public Money Add(Money other)
    {
        ArgumentNullException.ThrowIfNull(other);
        ValidateSameCurrency(other);
        
        return new Money(Amount + other.Amount, Currency);
    }

    /// <summary>
    /// Subtracts another Money instance from this one. Both must have the same currency.
    /// </summary>
    /// <param name="other">The Money instance to subtract.</param>
    /// <returns>A new Money instance with the difference.</returns>
    /// <exception cref="ArgumentNullException">Thrown when other is null.</exception>
    /// <exception cref="DomainException">Thrown when currencies don't match.</exception>
    public Money Subtract(Money other)
    {
        ArgumentNullException.ThrowIfNull(other);
        ValidateSameCurrency(other);
        
        return new Money(Amount - other.Amount, Currency);
    }

    /// <summary>
    /// Multiplies the Money amount by a factor.
    /// </summary>
    /// <param name="factor">The multiplication factor.</param>
    /// <returns>A new Money instance with the multiplied amount.</returns>
    /// <exception cref="DomainException">Thrown when factor is invalid.</exception>
    public Money Multiply(decimal factor)
    {
        if (factor < 0)
            throw new DomainException("Multiplication factor cannot be negative.");
            
        return new Money(Amount * factor, Currency);
    }

    /// <summary>
    /// Checks if this Money instance has the same currency as another.
    /// </summary>
    /// <param name="other">The other Money instance to compare.</param>
    /// <returns>True if currencies match, false otherwise.</returns>
    public bool HasSameCurrency(Money other)
    {
        return other != null && Currency.Equals(other.Currency, StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>
    /// Checks if the amount is zero.
    /// </summary>
    /// <returns>True if amount is zero, false otherwise.</returns>
    public bool IsZero() => Amount == 0;

    /// <summary>
    /// Checks if the amount is positive.
    /// </summary>
    /// <returns>True if amount is greater than zero, false otherwise.</returns>
    public bool IsPositive() => Amount > 0;

    /// <summary>
    /// Checks if the amount is negative.
    /// </summary>
    /// <returns>True if amount is less than zero, false otherwise.</returns>
    public bool IsNegative() => Amount < 0;

    /// <summary>
    /// Validates the monetary amount.
    /// </summary>
    /// <param name="amount">The amount to validate.</param>
    /// <exception cref="DomainException">Thrown when amount is invalid.</exception>
    private static void ValidateAmount(decimal amount)
    {
        // Allow negative amounts for cases like refunds or debts
        // You can add specific business rules here if needed
    }

    /// <summary>
    /// Validates the currency code.
    /// </summary>
    /// <param name="currency">The currency to validate.</param>
    /// <exception cref="DomainException">Thrown when currency is invalid.</exception>
    private static void ValidateCurrency(string currency)
    {
        if (string.IsNullOrWhiteSpace(currency))
            throw new DomainException("Currency cannot be null or empty.");

        if (currency.Length != 3)
            throw new DomainException("Currency must be a 3-character ISO 4217 code.");

        if (!currency.All(char.IsLetter))
            throw new DomainException("Currency must contain only letters.");

        // Common currencies validation (extend as needed)
        var validCurrencies = new HashSet<string> { "USD", "EUR", "PLN", "GBP", "JPY", "CAD", "AUD", "CHF" };
        if (!validCurrencies.Contains(currency.ToUpperInvariant()))
            throw new DomainException($"Currency '{currency}' is not supported.");
    }

    /// <summary>
    /// Validates that two Money instances have the same currency.
    /// </summary>
    /// <param name="other">The other Money instance to compare.</param>
    /// <exception cref="DomainException">Thrown when currencies don't match.</exception>
    private void ValidateSameCurrency(Money other)
    {
        if (!HasSameCurrency(other))
            throw new DomainException($"Cannot perform operation on different currencies: {Currency} and {other.Currency}.");
    }

    /// <summary>
    /// Gets the equality components for value object comparison.
    /// </summary>
    /// <returns>The amount and currency for equality comparison.</returns>
    protected override IEnumerable<object> GetEqualityComponents()
    {
        yield return Amount;
        yield return Currency;
    }

    /// <summary>
    /// Returns a string representation of the money.
    /// </summary>
    /// <returns>A string in the format "Amount Currency".</returns>
    public override string ToString()
    {
        return $"{Amount:F2} {Currency}";
    }
}
