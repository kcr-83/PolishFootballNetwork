namespace PolishFootballNetwork.WebApi.Endpoints;

using System.ComponentModel;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using PolishFootballNetwork.Application.Common.Interfaces;
using PolishFootballNetwork.Application.Common.Models;
using PolishFootballNetwork.Application.Features.Graph.DTOs;
using PolishFootballNetwork.Application.Features.Graph.Queries.GetGraphData;
using PolishFootballNetwork.Domain.Enums;

/// <summary>
/// Public API endpoints for graph visualization data.
/// </summary>
public static class GraphEndpoints
{
    private const string GRAPH_CACHE_KEY = "graph-data-v1";
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(5);

    /// <summary>
    /// Maps graph endpoints to the route group.
    /// </summary>
    /// <param name="group">The route group builder.</param>
    /// <returns>The configured route group.</returns>
    public static RouteGroupBuilder MapGraphEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/graph-data", GetGraphData)
            .WithName("GetGraphData")
            .WithTags("Graph")
            .WithSummary("Get complete graph visualization data")
            .WithDescription("Retrieves optimized graph data with all clubs and connections for visualization. Aggressively cached for 5 minutes.")
            .Produces<ApiResponse<GraphDataDto>>(StatusCodes.Status200OK)
            .Produces<ApiResponse<object>>(StatusCodes.Status500InternalServerError)
            .CacheOutput("graph-data");

        return group;
    }

    /// <summary>
    /// Gets complete graph data optimized for visualization.
    /// </summary>
    /// <param name="mediator">The mediator instance.</param>
    /// <param name="cache">Memory cache instance.</param>
    /// <param name="includeInactive">Include inactive clubs and connections (admin only).</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Complete graph data.</returns>
    private static async Task<IResult> GetGraphData(
        IMediator mediator,
        IMemoryCache cache,
        [Description("Include inactive items (admin only)")] bool includeInactive = false,
        CancellationToken cancellationToken = default)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        var cacheKey = $"{GRAPH_CACHE_KEY}-{includeInactive}";

        try
        {
            // Try to get from cache first
            if (cache.TryGetValue(cacheKey, out GraphDataDto? cachedData))
            {
                stopwatch.Stop();
                var cachedPerformance = PerformanceMetrics.Create(
                    stopwatch.ElapsedMilliseconds,
                    queryCount: 0,
                    cacheHit: true,
                    compressed: true);

                var cachedResponse = ApiResponseExtensions.CreateSuccessWithPerformance(
                    cachedData!,
                    cachedPerformance);

                return Results.Ok(cachedResponse);
            }

            // Cache miss - fetch from database
            var query = new GetGraphDataQuery
            {
                IncludeInactive = includeInactive,
                OptimizeForVisualization = true
            };

            var result = await mediator.Send(query, cancellationToken);
            stopwatch.Stop();

            if (!result.IsSuccess)
            {
                var performance = PerformanceMetrics.Create(stopwatch.ElapsedMilliseconds);
                return Results.BadRequest(ApiResponse<object>.ErrorResponse(
                    result.Error ?? "Failed to retrieve graph data"));
            }

            var graphData = MapToGraphDataDto(result.Value!);

            // Cache the result
            var cacheOptions = new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = CacheDuration,
                SlidingExpiration = TimeSpan.FromMinutes(2),
                Priority = CacheItemPriority.High
            };

            cache.Set(cacheKey, graphData, cacheOptions);

            var performanceMetrics = PerformanceMetrics.Create(
                stopwatch.ElapsedMilliseconds,
                queryCount: 2, // Clubs + connections query
                cacheHit: false,
                compressed: true);

            var response = ApiResponseExtensions.CreateSuccessWithPerformance(
                graphData,
                performanceMetrics);

            return Results.Ok(response);
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            return Results.Problem(
                title: "Internal Server Error",
                detail: "An error occurred while processing the request",
                statusCode: 500);
        }
    }

    /// <summary>
    /// Maps graph query result to optimized graph data DTO.
    /// </summary>
    /// <param name="graphQueryResult">The graph query result.</param>
    /// <returns>Optimized graph data DTO.</returns>
    private static GraphDataDto MapToGraphDataDto(GraphDataQueryResult graphQueryResult)
    {
        // Map clubs to graph nodes
        var nodes = graphQueryResult.Clubs.Select(club => new GraphNodeDto
        {
            Id = club.Id.ToString(),
            Label = club.Name,
            ShortName = club.ShortName,
            League = club.League,
            City = club.City,
            LogoUrl = !string.IsNullOrEmpty(club.LogoPath) ? $"/api/files/{club.LogoPath}" : null,
            Position = new GraphPositionDto
            {
                X = club.Position?.X ?? 0,
                Y = club.Position?.Y ?? 0
            },
            Size = CalculateNodeSize(club.ConnectionsCount),
            Data = new Dictionary<string, object>
            {
                ["country"] = club.Country,
                ["league"] = club.League.ToString(),
                ["city"] = club.City,
                ["connectionsCount"] = club.ConnectionsCount,
                ["slug"] = club.Slug
            }
        }).ToList();

        // Map connections to graph edges
        var edges = graphQueryResult.Connections.Select(connection => new GraphEdgeDto
        {
            Id = connection.Id.ToString(),
            Source = connection.FromClubId.ToString(),
            Target = connection.ToClubId.ToString(),
            Label = connection.Title,
            Type = connection.ConnectionType,
            Strength = connection.Strength,
            Data = new Dictionary<string, object>
            {
                ["type"] = connection.ConnectionType.ToString(),
                ["strength"] = connection.Strength.ToString(),
                ["description"] = connection.Description ?? string.Empty,
                ["title"] = connection.Title
            }
        }).ToList();

        // Calculate metadata
        var leagueDistribution = nodes
            .GroupBy(n => n.League)
            .ToDictionary(g => g.Key, g => g.Count());

        var connectionTypeDistribution = edges
            .GroupBy(e => e.Type)
            .ToDictionary(g => g.Key, g => g.Count());

        var metadata = new GraphMetadataDto
        {
            ClubCount = nodes.Count,
            ConnectionCount = edges.Count,
            LeagueDistribution = leagueDistribution,
            ConnectionTypeDistribution = connectionTypeDistribution,
            LastUpdated = DateTime.UtcNow,
            Version = GenerateDataVersion(nodes.Count, edges.Count)
        };

        return new GraphDataDto
        {
            Nodes = nodes,
            Edges = edges,
            Metadata = metadata
        };
    }

    /// <summary>
    /// Calculates node size based on connection count.
    /// </summary>
    /// <param name="connectionsCount">Number of connections.</param>
    /// <returns>Node size for visualization.</returns>
    private static int CalculateNodeSize(int connectionsCount)
    {
        // Base size of 20, with additional size based on connections
        // Maximum size of 80 for highly connected nodes
        const int baseSize = 20;
        const int maxSize = 80;
        const int sizeIncrement = 5;

        var calculatedSize = baseSize + (connectionsCount * sizeIncrement);
        return Math.Min(calculatedSize, maxSize);
    }

    /// <summary>
    /// Generates a data version string for cache invalidation.
    /// </summary>
    /// <param name="clubCount">Number of clubs.</param>
    /// <param name="connectionCount">Number of connections.</param>
    /// <returns>Version string.</returns>
    private static string GenerateDataVersion(int clubCount, int connectionCount)
    {
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        return $"{clubCount}-{connectionCount}-{timestamp}";
    }
}