using PolishFootballNetwork.Application.Common.Interfaces;
using PolishFootballNetwork.Application.Common.Models;
using PolishFootballNetwork.Application.Features.Clubs.Queries.GetClubs;
using PolishFootballNetwork.Domain.Enums;
using PolishFootballNetwork.Domain.ValueObjects;

namespace PolishFootballNetwork.Application.Features.Clubs.Commands.CreateClub;

/// <summary>
/// Command to create a new club.
/// </summary>
public class CreateClubCommand : ICommand<Result<ClubDto>>
{
    /// <summary>
    /// Gets or sets the name of the club.
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the short name of the club.
    /// </summary>
    public string? ShortName { get; set; }

    /// <summary>
    /// Gets or sets the slug for the club.
    /// </summary>
    public string? Slug { get; set; }

    /// <summary>
    /// Gets or sets the league of the club.
    /// </summary>
    public LeagueType League { get; set; }

    /// <summary>
    /// Gets or sets the country of the club.
    /// </summary>
    public string? Country { get; set; }

    /// <summary>
    /// Gets or sets the city of the club.
    /// </summary>
    public string City { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the region of the club.
    /// </summary>
    public string? Region { get; set; }

    /// <summary>
    /// Gets or sets the X coordinate of the club's position.
    /// </summary>
    public double? X { get; set; }

    /// <summary>
    /// Gets or sets the Y coordinate of the club's position.
    /// </summary>
    public double? Y { get; set; }

    /// <summary>
    /// Gets or sets the year the club was founded.
    /// </summary>
    public int? Founded { get; set; }

    /// <summary>
    /// Gets or sets the stadium name.
    /// </summary>
    public string? Stadium { get; set; }

    /// <summary>
    /// Gets or sets the website URL.
    /// </summary>
    public string? Website { get; set; }

    /// <summary>
    /// Gets or sets the club colors.
    /// </summary>
    public string? Colors { get; set; }

    /// <summary>
    /// Gets or sets the description of the club.
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Gets or sets the nickname of the club.
    /// </summary>
    public string? Nickname { get; set; }

    /// <summary>
    /// Gets or sets the motto of the club.
    /// </summary>
    public string? Motto { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether the club is active.
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Gets or sets a value indicating whether the club is verified.
    /// </summary>
    public bool IsVerified { get; set; } = false;

    /// <summary>
    /// Gets or sets a value indicating whether the club is featured.
    /// </summary>
    public bool IsFeatured { get; set; } = false;

    /// <summary>
    /// Gets or sets additional metadata as JSON.
    /// </summary>
    public string? Metadata { get; set; }

    /// <summary>
    /// Gets the position value object from coordinates.
    /// </summary>
    /// <returns>The position if coordinates are provided, otherwise null.</returns>
    public Point2D? GetPosition()
    {
        if (X.HasValue && Y.HasValue)
        {
            return Point2D.Create(X.Value, Y.Value);
        }
        return null;
    }
}
