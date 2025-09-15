namespace PolishFootballNetwork.Application.Features.Connections.DTOs;

using PolishFootballNetwork.Domain.Enums;

/// <summary>
/// Lightweight connection DTO optimized for public API responses.
/// </summary>
public sealed class PublicConnectionDto
{
    /// <summary>
    /// Connection identifier.
    /// </summary>
    public int Id { get; init; }

    /// <summary>
    /// Source club ID.
    /// </summary>
    public int FromClubId { get; init; }

    /// <summary>
    /// Target club ID.
    /// </summary>
    public int ToClubId { get; init; }

    /// <summary>
    /// Source club name.
    /// </summary>
    public string FromClubName { get; init; } = string.Empty;

    /// <summary>
    /// Target club name.
    /// </summary>
    public string ToClubName { get; init; } = string.Empty;

    /// <summary>
    /// Type of connection.
    /// </summary>
    public ConnectionType ConnectionType { get; init; }

    /// <summary>
    /// Strength of the connection.
    /// </summary>
    public ConnectionStrength Strength { get; init; }

    /// <summary>
    /// Connection title or name.
    /// </summary>
    public string Title { get; init; } = string.Empty;

    /// <summary>
    /// Brief description of the connection.
    /// </summary>
    public string? Description { get; init; }
}

/// <summary>
/// Connection filters for public API endpoints.
/// </summary>
public sealed class ConnectionFiltersDto
{
    /// <summary>
    /// Filter by connection type.
    /// </summary>
    public ConnectionType? Type { get; init; }

    /// <summary>
    /// Filter by connection strength.
    /// </summary>
    public ConnectionStrength? Strength { get; init; }

    /// <summary>
    /// Filter by club ID (either source or target).
    /// </summary>
    public int? ClubId { get; init; }

    /// <summary>
    /// Page number for pagination.
    /// </summary>
    public int Page { get; init; } = 1;

    /// <summary>
    /// Page size for pagination.
    /// </summary>
    public int PageSize { get; init; } = 20;
}