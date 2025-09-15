using PolishFootballNetwork.Application.Common.Interfaces;
using PolishFootballNetwork.Application.Common.Models;
using PolishFootballNetwork.Domain.Entities;
using PolishFootballNetwork.Domain.Enums;

namespace PolishFootballNetwork.Application.Features.Clubs.Queries.GetClubs;

/// <summary>
/// Query to get a paginated list of clubs with filtering options.
/// </summary>
public class GetClubsQuery : IQuery<Result<PagedResult<ClubDto>>>
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
    /// Gets or sets the search term for filtering clubs by name.
    /// </summary>
    public string? SearchTerm { get; set; }

    /// <summary>
    /// Gets or sets the league filter.
    /// </summary>
    public LeagueType? League { get; set; }

    /// <summary>
    /// Gets or sets the country filter.
    /// </summary>
    public string? Country { get; set; }

    /// <summary>
    /// Gets or sets the city filter.
    /// </summary>
    public string? City { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether to include only active clubs.
    /// </summary>
    public bool? IsActive { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether to include only verified clubs.
    /// </summary>
    public bool? IsVerified { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether to include only featured clubs.
    /// </summary>
    public bool? IsFeatured { get; set; }

    /// <summary>
    /// Gets or sets the field to sort by.
    /// </summary>
    public string? SortBy { get; set; } = "Name";

    /// <summary>
    /// Gets or sets the sort direction.
    /// </summary>
    public string? SortDirection { get; set; } = "ASC";

    /// <summary>
    /// Gets or sets the minimum founded year for filtering.
    /// </summary>
    public int? FoundedYearFrom { get; set; }

    /// <summary>
    /// Gets or sets the maximum founded year for filtering.
    /// </summary>
    public int? FoundedYearTo { get; set; }

    /// <summary>
    /// Gets a value indicating whether the sort direction is descending.
    /// </summary>
    public bool IsDescending => string.Equals(SortDirection, "DESC", StringComparison.OrdinalIgnoreCase);
}

/// <summary>
/// DTO for club information.
/// </summary>
public class ClubDto
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
    /// Gets or sets the number of connections.
    /// </summary>
    public int ConnectionCount { get; set; }

    /// <summary>
    /// Creates a ClubDto from a domain Club entity.
    /// </summary>
    /// <param name="club">The domain club entity.</param>
    /// <param name="connectionCount">Optional connection count.</param>
    /// <returns>A ClubDto instance.</returns>
    public static ClubDto FromDomain(Club club, int? connectionCount = null)
    {
        return new ClubDto
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
            ConnectionCount = connectionCount ?? 0,
        };
    }

    /// <summary>
    /// Creates a list of ClubDto from domain Club entities.
    /// </summary>
    /// <param name="clubs">The domain club entities.</param>
    /// <returns>A list of ClubDto instances.</returns>
    public static IReadOnlyList<ClubDto> FromDomain(IEnumerable<Club> clubs)
    {
        return clubs.Select(club => FromDomain(club)).ToList();
    }
}
