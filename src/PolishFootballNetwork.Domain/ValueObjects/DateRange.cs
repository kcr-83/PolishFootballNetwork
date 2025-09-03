using PolishFootballNetwork.Domain.Exceptions;

namespace PolishFootballNetwork.Domain.ValueObjects;

/// <summary>
/// Represents a date range with start and end dates.
/// Used for connections that have specific time periods or historical contexts.
/// </summary>
public class DateRange : ValueObject
{
    /// <summary>
    /// Gets the start date of the range.
    /// </summary>
    public DateTime Start { get; private set; }

    /// <summary>
    /// Gets the end date of the range.
    /// </summary>
    public DateTime? End { get; private set; }

    /// <summary>
    /// Initializes a new instance of the DateRange class.
    /// </summary>
    /// <param name="start">The start date of the range.</param>
    /// <param name="end">The end date of the range (null for ongoing ranges).</param>
    /// <exception cref="DomainException">Thrown when the date range is invalid.</exception>
    public DateRange(DateTime start, DateTime? end = null)
    {
        ValidateDateRange(start, end);
        Start = start;
        End = end;
    }

    /// <summary>
    /// Creates a DateRange starting from the specified date with no end date (ongoing).
    /// </summary>
    /// <param name="start">The start date.</param>
    /// <returns>A new DateRange instance.</returns>
    public static DateRange StartingFrom(DateTime start) => new(start);

    /// <summary>
    /// Creates a DateRange with both start and end dates.
    /// </summary>
    /// <param name="start">The start date.</param>
    /// <param name="end">The end date.</param>
    /// <returns>A new DateRange instance.</returns>
    public static DateRange Between(DateTime start, DateTime end) => new(start, end);

    /// <summary>
    /// Creates a DateRange representing the current year.
    /// </summary>
    /// <returns>A DateRange for the current year.</returns>
    public static DateRange CurrentYear()
    {
        var year = DateTime.UtcNow.Year;
        var start = new DateTime(year, 1, 1);
        var end = new DateTime(year, 12, 31, 23, 59, 59);
        return new DateRange(start, end);
    }

    /// <summary>
    /// Gets the duration of the date range.
    /// </summary>
    /// <returns>The TimeSpan representing the duration, or null if the range is ongoing.</returns>
    public TimeSpan? Duration => End.HasValue ? End.Value - Start : null;

    /// <summary>
    /// Gets the number of days in the date range.
    /// </summary>
    /// <returns>The number of days, or null if the range is ongoing.</returns>
    public int? DaysCount => Duration?.Days;

    /// <summary>
    /// Checks if the date range is ongoing (no end date).
    /// </summary>
    /// <returns>True if the range has no end date, false otherwise.</returns>
    public bool IsOngoing => !End.HasValue;

    /// <summary>
    /// Checks if the date range has ended.
    /// </summary>
    /// <returns>True if the range has an end date in the past, false otherwise.</returns>
    public bool HasEnded => End.HasValue && End.Value < DateTime.UtcNow;

    /// <summary>
    /// Checks if the date range is currently active.
    /// </summary>
    /// <returns>True if the current date falls within the range, false otherwise.</returns>
    public bool IsActive
    {
        get
        {
            var now = DateTime.UtcNow;
            return Start <= now && (!End.HasValue || End.Value >= now);
        }
    }

    /// <summary>
    /// Checks if a specific date falls within this date range.
    /// </summary>
    /// <param name="date">The date to check.</param>
    /// <returns>True if the date is within the range, false otherwise.</returns>
    public bool Contains(DateTime date)
    {
        return date >= Start && (!End.HasValue || date <= End.Value);
    }

    /// <summary>
    /// Checks if this date range overlaps with another date range.
    /// </summary>
    /// <param name="other">The other date range to check.</param>
    /// <returns>True if the ranges overlap, false otherwise.</returns>
    /// <exception cref="ArgumentNullException">Thrown when other is null.</exception>
    public bool OverlapsWith(DateRange other)
    {
        ArgumentNullException.ThrowIfNull(other);

        // If this range is ongoing
        if (!End.HasValue)
            return !other.End.HasValue || other.End.Value >= Start;

        // If other range is ongoing
        if (!other.End.HasValue)
            return other.Start <= End.Value;

        // Both ranges have end dates
        return Start <= other.End.Value && other.Start <= End.Value;
    }

    /// <summary>
    /// Extends the end date of the range.
    /// </summary>
    /// <param name="newEnd">The new end date.</param>
    /// <returns>A new DateRange with the extended end date.</returns>
    /// <exception cref="DomainException">Thrown when the new end date is invalid.</exception>
    public DateRange ExtendTo(DateTime newEnd)
    {
        if (newEnd < Start)
            throw new DomainException("End date cannot be before start date.");

        return new DateRange(Start, newEnd);
    }

    /// <summary>
    /// Marks the range as ended on the specified date.
    /// </summary>
    /// <param name="endDate">The end date to set.</param>
    /// <returns>A new DateRange with the specified end date.</returns>
    /// <exception cref="DomainException">Thrown when the end date is invalid.</exception>
    public DateRange EndOn(DateTime endDate)
    {
        return ExtendTo(endDate);
    }

    /// <summary>
    /// Validates the date range parameters.
    /// </summary>
    /// <param name="start">The start date to validate.</param>
    /// <param name="end">The end date to validate.</param>
    /// <exception cref="DomainException">Thrown when the date range is invalid.</exception>
    private static void ValidateDateRange(DateTime start, DateTime? end)
    {
        if (start == default)
            throw new DomainException("Start date cannot be default value.");

        if (end.HasValue && end.Value < start)
            throw new DomainException("End date cannot be before start date.");

        // Reasonable bounds validation
        var minDate = new DateTime(1800, 1, 1);
        var maxDate = new DateTime(2100, 12, 31);

        if (start < minDate || start > maxDate)
            throw new DomainException($"Start date must be between {minDate:yyyy-MM-dd} and {maxDate:yyyy-MM-dd}.");

        if (end.HasValue && (end.Value < minDate || end.Value > maxDate))
            throw new DomainException($"End date must be between {minDate:yyyy-MM-dd} and {maxDate:yyyy-MM-dd}.");
    }

    /// <summary>
    /// Gets the equality components for value object comparison.
    /// </summary>
    /// <returns>The start and end dates for equality comparison.</returns>
    protected override IEnumerable<object> GetEqualityComponents()
    {
        yield return Start;
        yield return End ?? DateTime.MaxValue; // Use MaxValue for null end dates
    }

    /// <summary>
    /// Returns a string representation of the date range.
    /// </summary>
    /// <returns>A string in the format "Start - End" or "Start - Ongoing".</returns>
    public override string ToString()
    {
        var endStr = End?.ToString("yyyy-MM-dd") ?? "Ongoing";
        return $"{Start:yyyy-MM-dd} - {endStr}";
    }
}
