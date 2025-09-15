namespace PolishFootballNetwork.Application.Features.Clubs.DTOs;

/// <summary>
/// Position coordinates for graph visualization.
/// </summary>
public sealed class PositionDto
{
    /// <summary>
    /// X coordinate.
    /// </summary>
    public double X { get; init; }

    /// <summary>
    /// Y coordinate.
    /// </summary>
    public double Y { get; init; }
}