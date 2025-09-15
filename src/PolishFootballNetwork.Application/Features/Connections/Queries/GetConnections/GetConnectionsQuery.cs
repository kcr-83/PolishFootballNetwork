using PolishFootballNetwork.Application.Common.Interfaces;
using PolishFootballNetwork.Application.Common.Models;
using PolishFootballNetwork.Application.Features.Clubs.Queries.GetClubConnections;
using PolishFootballNetwork.Domain.Enums;

namespace PolishFootballNetwork.Application.Features.Connections.Queries.GetConnections;

/// <summary>
/// Query to get a paginated list of connections with filtering options.
/// </summary>
public class GetConnectionsQuery : IQuery<Result<PagedResult<ConnectionDetailDto>>>
{
    /// <summary>
    /// Gets or sets the page number (1-based).
    /// </summary>
    public int Page { get; set; } = 1;

    /// <summary>
    /// Gets or sets the page size.
    /// </summary>
    public int PageSize { get; set; } = 20;

    /// <summary>
    /// Gets or sets the connection type filter.
    /// </summary>
    public ConnectionType? ConnectionType { get; set; }

    /// <summary>
    /// Gets or sets the connection strength filter.
    /// </summary>
    public ConnectionStrength? Strength { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether to include only verified connections.
    /// </summary>
    public bool? IsVerified { get; set; }

    /// <summary>
    /// Gets or sets the club ID to filter connections for a specific club.
    /// </summary>
    public int? ClubId { get; set; }

    /// <summary>
    /// Gets or sets the minimum reliability score filter.
    /// </summary>
    public double? MinReliabilityScore { get; set; }

    /// <summary>
    /// Gets or sets the field to sort by.
    /// </summary>
    public string? SortBy { get; set; } = "CreatedAt";

    /// <summary>
    /// Gets or sets the sort direction.
    /// </summary>
    public string? SortDirection { get; set; } = "DESC";

    /// <summary>
    /// Gets a value indicating whether the sort direction is descending.
    /// </summary>
    public bool IsDescending => string.Equals(SortDirection, "DESC", StringComparison.OrdinalIgnoreCase);
}
