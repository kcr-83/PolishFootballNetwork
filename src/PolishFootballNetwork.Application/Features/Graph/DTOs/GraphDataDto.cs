namespace PolishFootballNetwork.Application.Features.Graph.DTOs;

using PolishFootballNetwork.Domain.Enums;

/// <summary>
/// Complete graph data optimized for visualization.
/// </summary>
public sealed class GraphDataDto
{
    /// <summary>
    /// All nodes (clubs) in the graph.
    /// </summary>
    public IReadOnlyList<GraphNodeDto> Nodes { get; init; } = Array.Empty<GraphNodeDto>();

    /// <summary>
    /// All edges (connections) in the graph.
    /// </summary>
    public IReadOnlyList<GraphEdgeDto> Edges { get; init; } = Array.Empty<GraphEdgeDto>();

    /// <summary>
    /// Graph metadata and statistics.
    /// </summary>
    public GraphMetadataDto Metadata { get; init; } = new();
}

/// <summary>
/// Graph node representing a club.
/// </summary>
public sealed class GraphNodeDto
{
    /// <summary>
    /// Node identifier (club ID).
    /// </summary>
    public string Id { get; init; } = string.Empty;

    /// <summary>
    /// Node label (club name).
    /// </summary>
    public string Label { get; init; } = string.Empty;

    /// <summary>
    /// Short name for compact display.
    /// </summary>
    public string ShortName { get; init; } = string.Empty;

    /// <summary>
    /// League classification for styling.
    /// </summary>
    public LeagueType League { get; init; }

    /// <summary>
    /// City for grouping.
    /// </summary>
    public string City { get; init; } = string.Empty;

    /// <summary>
    /// Logo URL for node background.
    /// </summary>
    public string? LogoUrl { get; init; }

    /// <summary>
    /// Position in graph.
    /// </summary>
    public GraphPositionDto Position { get; init; } = new();

    /// <summary>
    /// Node size based on connection count.
    /// </summary>
    public int Size { get; init; }

    /// <summary>
    /// Additional node data for visualization.
    /// </summary>
    public Dictionary<string, object> Data { get; init; } = new();
}

/// <summary>
/// Graph edge representing a connection.
/// </summary>
public sealed class GraphEdgeDto
{
    /// <summary>
    /// Edge identifier.
    /// </summary>
    public string Id { get; init; } = string.Empty;

    /// <summary>
    /// Source node ID.
    /// </summary>
    public string Source { get; init; } = string.Empty;

    /// <summary>
    /// Target node ID.
    /// </summary>
    public string Target { get; init; } = string.Empty;

    /// <summary>
    /// Edge label.
    /// </summary>
    public string Label { get; init; } = string.Empty;

    /// <summary>
    /// Connection type for styling.
    /// </summary>
    public ConnectionType Type { get; init; }

    /// <summary>
    /// Connection strength for edge thickness.
    /// </summary>
    public ConnectionStrength Strength { get; init; }

    /// <summary>
    /// Additional edge data.
    /// </summary>
    public Dictionary<string, object> Data { get; init; } = new();
}

/// <summary>
/// Position coordinates for graph layout.
/// </summary>
public sealed class GraphPositionDto
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

/// <summary>
/// Graph metadata and statistics.
/// </summary>
public sealed class GraphMetadataDto
{
    /// <summary>
    /// Total number of clubs.
    /// </summary>
    public int ClubCount { get; init; }

    /// <summary>
    /// Total number of connections.
    /// </summary>
    public int ConnectionCount { get; init; }

    /// <summary>
    /// Breakdown by league.
    /// </summary>
    public Dictionary<LeagueType, int> LeagueDistribution { get; init; } = new();

    /// <summary>
    /// Breakdown by connection type.
    /// </summary>
    public Dictionary<ConnectionType, int> ConnectionTypeDistribution { get; init; } = new();

    /// <summary>
    /// Last updated timestamp.
    /// </summary>
    public DateTime LastUpdated { get; init; }

    /// <summary>
    /// Data version for cache invalidation.
    /// </summary>
    public string Version { get; init; } = string.Empty;
}