using PolishFootballNetwork.Domain.Entities;
using PolishFootballNetwork.Domain.Enums;

namespace PolishFootballNetwork.Application.Features.Connections.Commands.CreateConnection;

/// <summary>
/// DTO for connection information.
/// </summary>
public class ConnectionDto
{
    /// <summary>
    /// Gets or sets the connection ID.
    /// </summary>
    public int Id { get; set; }

    /// <summary>
    /// Gets or sets the source club ID.
    /// </summary>
    public int SourceClubId { get; set; }

    /// <summary>
    /// Gets or sets the target club ID.
    /// </summary>
    public int TargetClubId { get; set; }

    /// <summary>
    /// Gets or sets the source club information.
    /// </summary>
    public ClubSummaryDto SourceClub { get; set; } = new();

    /// <summary>
    /// Gets or sets the target club information.
    /// </summary>
    public ClubSummaryDto TargetClub { get; set; } = new();

    /// <summary>
    /// Gets or sets the connection type.
    /// </summary>
    public ConnectionType Type { get; set; }

    /// <summary>
    /// Gets or sets the connection strength.
    /// </summary>
    public ConnectionStrength Strength { get; set; }

    /// <summary>
    /// Gets or sets the description of the connection.
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Gets or sets the start year of the connection.
    /// </summary>
    public int StartYear { get; set; }

    /// <summary>
    /// Gets or sets the end year of the connection.
    /// </summary>
    public int? EndYear { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether the connection is verified.
    /// </summary>
    public bool IsVerified { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether the connection is bidirectional.
    /// </summary>
    public bool IsBidirectional { get; set; }

    /// <summary>
    /// Gets or sets the connection creation date.
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Gets or sets the connection last modification date.
    /// </summary>
    public DateTime? ModifiedAt { get; set; }

    /// <summary>
    /// Creates a ConnectionDto from a domain Connection entity.
    /// </summary>
    /// <param name="connection">The domain connection entity.</param>
    /// <param name="sourceClub">The source club entity.</param>
    /// <param name="targetClub">The target club entity.</param>
    /// <returns>A ConnectionDto instance.</returns>
    public static ConnectionDto FromDomain(Connection connection, Club sourceClub, Club targetClub)
    {
        return new ConnectionDto
        {
            Id = connection.Id,
            SourceClubId = connection.SourceClubId,
            TargetClubId = connection.TargetClubId,
            SourceClub = ClubSummaryDto.FromDomain(sourceClub),
            TargetClub = ClubSummaryDto.FromDomain(targetClub),
            Type = connection.Type,
            Strength = connection.Strength,
            Description = connection.Description,
            StartYear = connection.ActivePeriod?.Start.Year ?? DateTime.UtcNow.Year,
            EndYear = connection.ActivePeriod?.End?.Year,
            IsVerified = true, // Connections are considered verified by default for now
            IsBidirectional = false, // This would need to be determined by business logic
            CreatedAt = connection.CreatedAt,
            ModifiedAt = connection.ModifiedAt
        };
    }
}

/// <summary>
/// DTO for club summary information.
/// </summary>
public class ClubSummaryDto
{
    /// <summary>
    /// Gets or sets the club ID.
    /// </summary>
    public int Id { get; set; }

    /// <summary>
    /// Gets or sets the club name.
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the club short name.
    /// </summary>
    public string? ShortName { get; set; }

    /// <summary>
    /// Gets or sets the league.
    /// </summary>
    public LeagueType League { get; set; }

    /// <summary>
    /// Gets or sets the city.
    /// </summary>
    public string City { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the logo path.
    /// </summary>
    public string? LogoPath { get; set; }

    /// <summary>
    /// Creates a ClubSummaryDto from a domain Club entity.
    /// </summary>
    /// <param name="club">The domain club entity.</param>
    /// <returns>A ClubSummaryDto instance.</returns>
    public static ClubSummaryDto FromDomain(Club club)
    {
        return new ClubSummaryDto
        {
            Id = club.Id,
            Name = club.Name,
            ShortName = club.ShortName,
            League = club.League,
            City = club.City,
            LogoPath = club.LogoPath
        };
    }
}

/// <summary>
/// DTO for connection summary information.
/// </summary>
public class ConnectionSummaryDto
{
    /// <summary>
    /// Gets or sets the connection ID.
    /// </summary>
    public int Id { get; set; }

    /// <summary>
    /// Gets or sets the related club information.
    /// </summary>
    public ClubSummaryDto RelatedClub { get; set; } = new();

    /// <summary>
    /// Gets or sets the connection type.
    /// </summary>
    public ConnectionType Type { get; set; }

    /// <summary>
    /// Gets or sets the connection strength.
    /// </summary>
    public ConnectionStrength Strength { get; set; }

    /// <summary>
    /// Gets or sets the start year.
    /// </summary>
    public int StartYear { get; set; }

    /// <summary>
    /// Gets or sets the end year.
    /// </summary>
    public int? EndYear { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether the connection is bidirectional.
    /// </summary>
    public bool IsBidirectional { get; set; }

    /// <summary>
    /// Creates a ConnectionSummaryDto from a domain Connection entity.
    /// </summary>
    /// <param name="connection">The domain connection entity.</param>
    /// <param name="currentClub">The current club (to determine which is the related club).</param>
    /// <param name="relatedClub">The related club entity.</param>
    /// <returns>A ConnectionSummaryDto instance.</returns>
    public static ConnectionSummaryDto FromDomain(Connection connection, Club currentClub, Club relatedClub)
    {
        return new ConnectionSummaryDto
        {
            Id = connection.Id,
            RelatedClub = ClubSummaryDto.FromDomain(relatedClub),
            Type = connection.Type,
            Strength = connection.Strength,
            StartYear = connection.ActivePeriod?.Start.Year ?? DateTime.UtcNow.Year,
            EndYear = connection.ActivePeriod?.End?.Year,
            IsBidirectional = false // This would need to be determined by business logic
        };
    }
}
