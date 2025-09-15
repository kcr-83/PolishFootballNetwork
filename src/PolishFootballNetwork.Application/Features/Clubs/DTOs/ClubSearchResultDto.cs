namespace PolishFootballNetwork.Application.Features.Clubs.DTOs;

/// <summary>
/// Search result for club search endpoint.
/// </summary>
public sealed class ClubSearchResultDto
{
    /// <summary>
    /// Matching clubs.
    /// </summary>
    public IReadOnlyList<PublicClubDto> Clubs { get; init; } = Array.Empty<PublicClubDto>();

    /// <summary>
    /// Search query that was executed.
    /// </summary>
    public string Query { get; init; } = string.Empty;

    /// <summary>
    /// Number of total matches found.
    /// </summary>
    public int TotalMatches { get; init; }
}