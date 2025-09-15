using PolishFootballNetwork.Domain.Entities;
using PolishFootballNetwork.Domain.Enums;
using PolishFootballNetwork.Application.Features.Connections.Commands.CreateConnection;

namespace PolishFootballNetwork.Application.Features.Clubs.Queries.GetClubById;

/// <summary>
/// DTO for detailed club information.
/// </summary>
public class ClubDetailDto
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
    /// Gets or sets the short name.
    /// </summary>
    public string? ShortName { get; set; }

    /// <summary>
    /// Gets or sets the slug.
    /// </summary>
    public string Slug { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the league.
    /// </summary>
    public LeagueType League { get; set; }

    /// <summary>
    /// Gets or sets the country.
    /// </summary>
    public string Country { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the city.
    /// </summary>
    public string City { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the region.
    /// </summary>
    public string? Region { get; set; }

    /// <summary>
    /// Gets or sets the logo path.
    /// </summary>
    public string? LogoPath { get; set; }

    /// <summary>
    /// Gets or sets the X position.
    /// </summary>
    public double X { get; set; }

    /// <summary>
    /// Gets or sets the Y position.
    /// </summary>
    public double Y { get; set; }

    /// <summary>
    /// Gets or sets the founded year.
    /// </summary>
    public int? Founded { get; set; }

    /// <summary>
    /// Gets or sets the stadium.
    /// </summary>
    public string? Stadium { get; set; }

    /// <summary>
    /// Gets or sets the website.
    /// </summary>
    public string? Website { get; set; }

    /// <summary>
    /// Gets or sets the colors.
    /// </summary>
    public string? Colors { get; set; }

    /// <summary>
    /// Gets or sets the description.
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Gets or sets the nickname.
    /// </summary>
    public string? Nickname { get; set; }

    /// <summary>
    /// Gets or sets the motto.
    /// </summary>
    public string? Motto { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether the club is active.
    /// </summary>
    public bool IsActive { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether the club is verified.
    /// </summary>
    public bool IsVerified { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether the club is featured.
    /// </summary>
    public bool IsFeatured { get; set; }

    /// <summary>
    /// Gets or sets the creation date.
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Gets or sets the last modification date.
    /// </summary>
    public DateTime? ModifiedAt { get; set; }

    /// <summary>
    /// Gets or sets the club connections.
    /// </summary>
    public IReadOnlyList<ConnectionSummaryDto> Connections { get; set; } = Array.Empty<ConnectionSummaryDto>();

    /// <summary>
    /// Creates a ClubDetailDto from a domain Club entity.
    /// </summary>
    /// <param name="club">The domain club entity.</param>
    /// <param name="connections">The club connections.</param>
    /// <returns>A ClubDetailDto instance.</returns>
    public static ClubDetailDto FromDomain(Club club, IEnumerable<ConnectionSummaryDto> connections)
    {
        return new ClubDetailDto
        {
            Id = club.Id,
            Name = club.Name,
            ShortName = club.ShortName,
            Slug = club.Slug,
            League = club.League,
            Country = club.Country,
            City = club.City,
            Region = club.Region,
            LogoPath = club.LogoPath,
            X = club.Position.X,
            Y = club.Position.Y,
            Founded = club.Founded,
            Stadium = club.Stadium,
            Website = club.Website,
            Colors = club.Colors,
            Description = club.Description,
            Nickname = club.Nickname,
            Motto = club.Motto,
            IsActive = club.IsActive,
            IsVerified = club.IsVerified,
            IsFeatured = club.IsFeatured,
            CreatedAt = club.CreatedAt,
            ModifiedAt = club.ModifiedAt,
            Connections = connections.ToList()
        };
    }
}
