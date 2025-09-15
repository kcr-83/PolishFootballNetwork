using PolishFootballNetwork.Application.Common.Interfaces;
using PolishFootballNetwork.Application.Common.Models;

namespace PolishFootballNetwork.Application.Features.Graph.Queries.GetGraphData;

/// <summary>
/// Query to get graph data for visualization.
/// </summary>
public class GetGraphDataQuery : IQuery<Result<GraphDataDto>>
{
    /// <summary>
    /// Gets or sets a value indicating whether to include only verified connections.
    /// </summary>
    public bool VerifiedOnly { get; set; } = false;

    /// <summary>
    /// Gets or sets a value indicating whether to include only active clubs.
    /// </summary>
    public bool ActiveOnly { get; set; } = true;

    /// <summary>
    /// Gets or sets the minimum reliability score for connections.
    /// </summary>
    public double? MinReliabilityScore { get; set; }

    /// <summary>
    /// Gets or sets the leagues to include.
    /// </summary>
    public string[]? IncludeLeagues { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether to include isolated nodes (clubs without connections).
    /// </summary>
    public bool IncludeIsolatedNodes { get; set; } = true;
}

/// <summary>
/// DTO for graph data visualization.
/// </summary>
public class GraphDataDto
{
    /// <summary>
    /// Gets or sets the nodes (clubs) in the graph.
    /// </summary>
    public IReadOnlyList<GraphNodeDto> Nodes { get; set; } = Array.Empty<GraphNodeDto>();

    /// <summary>
    /// Gets or sets the edges (connections) in the graph.
    /// </summary>
    public IReadOnlyList<GraphEdgeDto> Edges { get; set; } = Array.Empty<GraphEdgeDto>();

    /// <summary>
    /// Gets or sets the graph metadata.
    /// </summary>
    public GraphMetadataDto Metadata { get; set; } = new();
}

/// <summary>
/// DTO for graph nodes (clubs).
/// </summary>
public class GraphNodeDto
{
    /// <summary>
    /// Gets or sets the node ID.
    /// </summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the node label (club name).
    /// </summary>
    public string Label { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the short name.
    /// </summary>
    public string? ShortName { get; set; }

    /// <summary>
    /// Gets or sets the league.
    /// </summary>
    public string League { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the city.
    /// </summary>
    public string City { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the logo URL.
    /// </summary>
    public string? LogoUrl { get; set; }

    /// <summary>
    /// Gets or sets the X position.
    /// </summary>
    public double? X { get; set; }

    /// <summary>
    /// Gets or sets the Y position.
    /// </summary>
    public double? Y { get; set; }

    /// <summary>
    /// Gets or sets the node color based on league.
    /// </summary>
    public string Color { get; set; } = "#000000";

    /// <summary>
    /// Gets or sets the node size based on connection count.
    /// </summary>
    public int Size { get; set; } = 20;

    /// <summary>
    /// Gets or sets the connection count.
    /// </summary>
    public int ConnectionCount { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether the club is verified.
    /// </summary>
    public bool IsVerified { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether the club is featured.
    /// </summary>
    public bool IsFeatured { get; set; }
}

/// <summary>
/// DTO for graph edges (connections).
/// </summary>
public class GraphEdgeDto
{
    /// <summary>
    /// Gets or sets the edge ID.
    /// </summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the source node ID.
    /// </summary>
    public string Source { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the target node ID.
    /// </summary>
    public string Target { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the connection type.
    /// </summary>
    public string Type { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the connection strength.
    /// </summary>
    public string Strength { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the edge label (connection title).
    /// </summary>
    public string? Label { get; set; }

    /// <summary>
    /// Gets or sets the edge color based on connection type.
    /// </summary>
    public string Color { get; set; } = "#999999";

    /// <summary>
    /// Gets or sets the edge weight based on strength.
    /// </summary>
    public int Weight { get; set; } = 1;

    /// <summary>
    /// Gets or sets the reliability score.
    /// </summary>
    public double ReliabilityScore { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether the connection is verified.
    /// </summary>
    public bool IsVerified { get; set; }
}

/// <summary>
/// DTO for graph metadata.
/// </summary>
public class GraphMetadataDto
{
    /// <summary>
    /// Gets or sets the total number of nodes.
    /// </summary>
    public int TotalNodes { get; set; }

    /// <summary>
    /// Gets or sets the total number of edges.
    /// </summary>
    public int TotalEdges { get; set; }

    /// <summary>
    /// Gets or sets the data generation timestamp.
    /// </summary>
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Gets or sets the league distribution.
    /// </summary>
    public Dictionary<string, int> LeagueDistribution { get; set; } = new();

    /// <summary>
    /// Gets or sets the connection type distribution.
    /// </summary>
    public Dictionary<string, int> ConnectionTypeDistribution { get; set; } = new();

    /// <summary>
    /// Gets or sets the filter criteria applied.
    /// </summary>
    public Dictionary<string, object> AppliedFilters { get; set; } = new();
}
