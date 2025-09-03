namespace PolishFootballNetwork.Domain.ValueObjects;

/// <summary>
/// Base class for value objects following DDD principles.
/// Value objects are immutable and equality is based on their properties.
/// </summary>
public abstract class ValueObject
{
    /// <summary>
    /// Gets the atomic values that make up this value object.
    /// </summary>
    /// <returns>Collection of atomic values for equality comparison.</returns>
    protected abstract IEnumerable<object> GetEqualityComponents();

    /// <summary>
    /// Determines whether the specified object is equal to the current object.
    /// </summary>
    /// <param name="obj">The object to compare with the current object.</param>
    /// <returns>true if the specified object is equal to the current object; otherwise, false.</returns>
    public override bool Equals(object? obj)
    {
        if (obj == null || obj.GetType() != GetType())
        {
            return false;
        }

        var other = (ValueObject)obj;

        return GetEqualityComponents().SequenceEqual(other.GetEqualityComponents());
    }

    /// <summary>
    /// Serves as the default hash function.
    /// </summary>
    /// <returns>A hash code for the current object.</returns>
    public override int GetHashCode()
    {
        return GetEqualityComponents()
            .Select(x => x?.GetHashCode() ?? 0)
            .Aggregate((x, y) => x ^ y);
    }

    /// <summary>
    /// Determines whether two value objects are equal.
    /// </summary>
    /// <param name="left">The first value object to compare.</param>
    /// <param name="right">The second value object to compare.</param>
    /// <returns>true if the value objects are equal; otherwise, false.</returns>
    public static bool operator ==(ValueObject left, ValueObject right)
    {
        return EqualOperator(left, right);
    }

    /// <summary>
    /// Determines whether two value objects are not equal.
    /// </summary>
    /// <param name="left">The first value object to compare.</param>
    /// <param name="right">The second value object to compare.</param>
    /// <returns>true if the value objects are not equal; otherwise, false.</returns>
    public static bool operator !=(ValueObject left, ValueObject right)
    {
        return NotEqualOperator(left, right);
    }

    /// <summary>
    /// Helper method for equality comparison.
    /// </summary>
    protected static bool EqualOperator(ValueObject left, ValueObject right)
    {
        if (ReferenceEquals(left, null) ^ ReferenceEquals(right, null))
        {
            return false;
        }
        return ReferenceEquals(left, null) || left.Equals(right);
    }

    /// <summary>
    /// Helper method for inequality comparison.
    /// </summary>
    protected static bool NotEqualOperator(ValueObject left, ValueObject right)
    {
        return !(EqualOperator(left, right));
    }
}
