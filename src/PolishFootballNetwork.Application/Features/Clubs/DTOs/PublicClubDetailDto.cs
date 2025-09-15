namespace PolishFootballNetwork.Application.Features.Clubs.DTOs;

using PolishFootballNetwork.Application.Features.Connections.DTOs;

/// <summary>
/// Detailed club DTO for individual club requests.
/// </summary>
public sealed class PublicClubDetailDto : PublicClubDto
{
    /// <summary>
    /// Founded year.
    /// </summary>
    public int? Founded { get; init; }

    /// <summary>
    /// Stadium name.
    /// </summary>
    public string? Stadium { get; init; }

    /// <summary>
    /// Official website URL.
    /// </summary>
    public string? Website { get; init; }

    /// <summary>
    /// Club colors (primary, secondary).
    /// </summary>
    public string? Colors { get; init; }

    /// <summary>
    /// Club description.
    /// </summary>
    public string? Description { get; init; }

    /// <summary>
    /// Club nickname.
    /// </summary>
    public string? Nickname { get; init; }

    /// <summary>
    /// Region within country.
    /// </summary>
    public string? Region { get; init; }

    /// <summary>
    /// Direct connections to this club.
    /// </summary>
    public IReadOnlyList<PublicConnectionDto> Connections { get; init; } = Array.Empty<PublicConnectionDto>();
}