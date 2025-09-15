namespace PolishFootballNetwork.Application.Features.Clubs.DTOs;

using PolishFootballNetwork.Domain.Enums;

/// <summary>
/// Lightweight club DTO optimized for public API responses.
/// </summary>
public class PublicClubDto
{
    /// <summary>
    /// Club identifier.
    /// </summary>
    public int Id { get; init; }

    /// <summary>
    /// Club name.
    /// </summary>
    public string Name { get; init; } = string.Empty;

    /// <summary>
    /// Short name or abbreviation.
    /// </summary>
    public string ShortName { get; init; } = string.Empty;

    /// <summary>
    /// URL-friendly slug.
    /// </summary>
    public string Slug { get; init; } = string.Empty;

    /// <summary>
    /// League classification.
    /// </summary>
    public LeagueType League { get; init; }

    /// <summary>
    /// Country.
    /// </summary>
    public string Country { get; init; } = string.Empty;

    /// <summary>
    /// City.
    /// </summary>
    public string City { get; init; } = string.Empty;

    /// <summary>
    /// Logo file path.
    /// </summary>
    public string? LogoPath { get; init; }

    /// <summary>
    /// Graph position coordinates.
    /// </summary>
    public PositionDto Position { get; init; } = new();

    /// <summary>
    /// Number of connections this club has.
    /// </summary>
    public int ConnectionsCount { get; init; }
}
