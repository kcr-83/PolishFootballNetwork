using PolishFootballNetwork.Application.Common.Interfaces;
using PolishFootballNetwork.Application.Common.Models;
using PolishFootballNetwork.Application.Features.Clubs.Queries.GetClubById;
using PolishFootballNetwork.Application.Features.Connections.Commands.CreateConnection;

namespace PolishFootballNetwork.Application.Features.Clubs.Queries.GetClubConnections;

/// <summary>
/// Query to get connections for a specific club.
/// </summary>
public class GetClubConnectionsQuery : IQuery<Result<PagedResult<ConnectionDetailDto>>>
{
    /// <summary>
    /// Gets or sets the club ID.
    /// </summary>
    public Guid ClubId { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether to include only verified connections.
    /// </summary>
    public bool VerifiedOnly { get; set; } = false;

    /// <summary>
    /// Gets or sets the page number (1-based).
    /// </summary>
    public int Page { get; set; } = 1;

    /// <summary>
    /// Gets or sets the page size.
    /// </summary>
    public int PageSize { get; set; } = 20;

    /// <summary>
    /// Initializes a new instance of the GetClubConnectionsQuery class.
    /// </summary>
    /// <param name="clubId">The club ID.</param>
    /// <param name="verifiedOnly">Whether to include only verified connections.</param>
    public GetClubConnectionsQuery(Guid clubId, bool verifiedOnly = false)
    {
        ClubId = clubId;
        VerifiedOnly = verifiedOnly;
    }

    /// <summary>
    /// Initializes a new instance of the GetClubConnectionsQuery class.
    /// </summary>
    public GetClubConnectionsQuery()
    {
    }
}

/// <summary>
/// DTO for detailed connection information.
/// </summary>
public class ConnectionDetailDto : ConnectionSummaryDto
{
    /// <summary>
    /// Gets or sets the description.
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Gets or sets the historical context.
    /// </summary>
    public string? HistoricalContext { get; set; }

    /// <summary>
    /// Gets or sets the start date.
    /// </summary>
    public DateTime? StartDate { get; set; }

    /// <summary>
    /// Gets or sets the end date.
    /// </summary>
    public DateTime? EndDate { get; set; }

    /// <summary>
    /// Gets or sets the reliability score.
    /// </summary>
    public double ReliabilityScore { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether verification is required.
    /// </summary>
    public bool RequiresVerification { get; set; }

    /// <summary>
    /// Gets or sets the creation date.
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Gets or sets the last modification date.
    /// </summary>
    public DateTime? ModifiedAt { get; set; }

    /// <summary>
    /// Creates a ConnectionDetailDto from a domain Connection entity.
    /// </summary>
    /// <param name="connection">The domain connection entity.</param>
    /// <param name="sourceClub">The source club entity.</param>
    /// <param name="targetClub">The target club entity.</param>
    /// <returns>A ConnectionDetailDto instance.</returns>
    public static new ConnectionDetailDto FromDomain(PolishFootballNetwork.Domain.Entities.Connection connection, PolishFootballNetwork.Domain.Entities.Club sourceClub, PolishFootballNetwork.Domain.Entities.Club targetClub)
    {
        return new ConnectionDetailDto
        {
            Id = connection.Id,
            RelatedClub = PolishFootballNetwork.Application.Features.Connections.Commands.CreateConnection.ClubSummaryDto.FromDomain(targetClub),
            Type = connection.Type,
            Strength = connection.Strength,
            StartYear = connection.ActivePeriod?.Start.Year ?? DateTime.UtcNow.Year,
            EndYear = connection.ActivePeriod?.End?.Year,
            IsBidirectional = false, // This would need to be determined by business logic
            Description = connection.Description,
            HistoricalContext = connection.Notes,
            StartDate = connection.ActivePeriod?.Start,
            EndDate = connection.ActivePeriod?.End,
            ReliabilityScore = 0.5, // Default reliability score
            RequiresVerification = true, // Default to requiring verification
            CreatedAt = connection.CreatedAt,
            ModifiedAt = connection.ModifiedAt
        };
    }
}
