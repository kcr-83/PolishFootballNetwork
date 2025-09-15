using PolishFootballNetwork.Application.Common.Interfaces;
using PolishFootballNetwork.Application.Common.Models;
using PolishFootballNetwork.Domain.Enums;
using PolishFootballNetwork.Domain.ValueObjects;

namespace PolishFootballNetwork.Application.Features.Connections.Commands.CreateConnection;

/// <summary>
/// Command to create a new connection between clubs.
/// </summary>
public class CreateConnectionCommand : ICommand<Result<ConnectionDto>>
{
    /// <summary>
    /// Gets or sets the ID of the source club.
    /// </summary>
    public int FromClubId { get; set; }

    /// <summary>
    /// Gets or sets the ID of the target club.
    /// </summary>
    public int ToClubId { get; set; }

    /// <summary>
    /// Gets or sets the type of connection.
    /// </summary>
    public ConnectionType ConnectionType { get; set; }

    /// <summary>
    /// Gets or sets the strength of the connection.
    /// </summary>
    public ConnectionStrength Strength { get; set; }

    /// <summary>
    /// Gets or sets the title of the connection.
    /// </summary>
    public string? Title { get; set; }

    /// <summary>
    /// Gets or sets the description of the connection.
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Gets or sets the historical context of the connection.
    /// </summary>
    public string? HistoricalContext { get; set; }

    /// <summary>
    /// Gets or sets the start date of the connection.
    /// </summary>
    public DateTime? StartDate { get; set; }

    /// <summary>
    /// Gets or sets the end date of the connection.
    /// </summary>
    public DateTime? EndDate { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether the connection is verified.
    /// </summary>
    public bool IsVerified { get; set; } = false;

    /// <summary>
    /// Gets or sets a value indicating whether the connection requires verification.
    /// </summary>
    public bool RequiresVerification { get; set; } = true;

    /// <summary>
    /// Gets or sets the reliability score of the connection.
    /// </summary>
    public double ReliabilityScore { get; set; } = 0.5;

    /// <summary>
    /// Gets the date range value object from start and end dates.
    /// </summary>
    /// <returns>The date range if dates are provided, otherwise null.</returns>
    public DateRange? GetDateRange()
    {
        if (StartDate.HasValue)
        {
            return new DateRange(StartDate.Value, EndDate);
        }
        return null;
    }
}
