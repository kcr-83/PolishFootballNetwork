namespace PolishFootballNetwork.WebApi.Endpoints;

using System.ComponentModel;
using Microsoft.AspNetCore.Mvc;
using PolishFootballNetwork.Application.Common.Interfaces;
using PolishFootballNetwork.Application.Common.Models;
using PolishFootballNetwork.Application.Features.Connections.DTOs;
using PolishFootballNetwork.Application.Features.Connections.Queries.GetConnections;
using PolishFootballNetwork.Domain.Enums;

/// <summary>
/// Public API endpoints for connection data.
/// </summary>
public static class ConnectionsEndpoints
{
    /// <summary>
    /// Maps connection endpoints to the route group.
    /// </summary>
    /// <param name="group">The route group builder.</param>
    /// <returns>The configured route group.</returns>
    public static RouteGroupBuilder MapConnectionsEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/", GetConnections)
            .WithName("GetConnections")
            .WithTags("Connections")
            .WithSummary("Get paginated list of connections")
            .WithDescription("Retrieves a paginated list of all active connections with optional filtering")
            .Produces<ApiResponse<IReadOnlyList<PublicConnectionDto>>>(StatusCodes.Status200OK)
            .Produces<ApiResponse<object>>(StatusCodes.Status400BadRequest)
            .Produces<ApiResponse<object>>(StatusCodes.Status500InternalServerError)
            .CacheOutput("connections-list");

        group.MapGet("/by-club/{clubId:int}", GetConnectionsByClub)
            .WithName("GetConnectionsByClub")
            .WithTags("Connections")
            .WithSummary("Get connections for a specific club")
            .WithDescription("Retrieves all connections where the specified club is either source or target")
            .Produces<ApiResponse<IReadOnlyList<PublicConnectionDto>>>(StatusCodes.Status200OK)
            .Produces<ApiResponse<object>>(StatusCodes.Status404NotFound)
            .Produces<ApiResponse<object>>(StatusCodes.Status500InternalServerError)
            .CacheOutput("club-connections");

        return group;
    }

    /// <summary>
    /// Gets a paginated list of connections with optional filtering.
    /// </summary>
    /// <param name="mediator">The mediator instance.</param>
    /// <param name="type">Filter by connection type.</param>
    /// <param name="strength">Filter by connection strength.</param>
    /// <param name="page">Page number (1-based).</param>
    /// <param name="pageSize">Number of items per page.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Paginated list of connections.</returns>
    private static async Task<IResult> GetConnections(
        IMediator mediator,
        [Description("Filter by connection type")] ConnectionType? type = null,
        [Description("Filter by connection strength")] ConnectionStrength? strength = null,
        [Description("Page number (1-based)")] int page = 1,
        [Description("Number of items per page (max 100)")] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();

        try
        {
            // Validate parameters
            if (page < 1)
            {
                return Results.BadRequest(ApiResponse<object>.ErrorResponse("Page number must be greater than 0"));
            }

            if (pageSize < 1 || pageSize > 100)
            {
                return Results.BadRequest(ApiResponse<object>.ErrorResponse("Page size must be between 1 and 100"));
            }

            var query = new GetConnectionsQuery
            {
                ConnectionType = type,
                Strength = strength,
                Page = page,
                PageSize = pageSize,
                IncludeInactive = false // Public API only shows active connections
            };

            var result = await mediator.Send(query, cancellationToken);
            stopwatch.Stop();

            if (!result.IsSuccess)
            {
                var performance = PerformanceMetrics.Create(stopwatch.ElapsedMilliseconds);
                return Results.BadRequest(ApiResponse<object>.ErrorResponse(result.Error ?? "Failed to retrieve connections"));
            }

            var connections = result.Value!.Connections.Select(MapToPublicConnectionDto).ToList();
            var pagination = PaginationMetadata.Create(page, pageSize, result.Value.TotalCount);
            var performanceMetrics = PerformanceMetrics.Create(
                stopwatch.ElapsedMilliseconds,
                queryCount: 1,
                cacheHit: false);

            var response = ApiResponseExtensions.CreatePaginatedSuccess(
                (IReadOnlyList<PublicConnectionDto>)connections,
                pagination,
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
    /// Gets all connections for a specific club.
    /// </summary>
    /// <param name="mediator">The mediator instance.</param>
    /// <param name="clubId">Club identifier.</param>
    /// <param name="type">Filter by connection type.</param>
    /// <param name="strength">Filter by connection strength.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>List of connections for the club.</returns>
    private static async Task<IResult> GetConnectionsByClub(
        IMediator mediator,
        [Description("Club identifier")] int clubId,
        [Description("Filter by connection type")] ConnectionType? type = null,
        [Description("Filter by connection strength")] ConnectionStrength? strength = null,
        CancellationToken cancellationToken = default)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();

        try
        {
            if (clubId <= 0)
            {
                return Results.BadRequest(ApiResponse<object>.ErrorResponse("Club ID must be greater than 0"));
            }

            var query = new GetConnectionsQuery
            {
                ClubId = clubId,
                ConnectionType = type,
                Strength = strength,
                Page = 1,
                PageSize = 1000, // Get all connections for the club
                IncludeInactive = false
            };

            var result = await mediator.Send(query, cancellationToken);
            stopwatch.Stop();

            if (!result.IsSuccess)
            {
                var performance = PerformanceMetrics.Create(stopwatch.ElapsedMilliseconds);
                
                if (result.Error?.Contains("not found", StringComparison.OrdinalIgnoreCase) == true)
                {
                    return Results.NotFound(ApiResponse<object>.ErrorResponse("Club not found"));
                }

                return Results.BadRequest(ApiResponse<object>.ErrorResponse(result.Error ?? "Failed to retrieve connections"));
            }

            var connections = result.Value!.Connections.Select(MapToPublicConnectionDto).ToList();
            var performanceMetrics = PerformanceMetrics.Create(
                stopwatch.ElapsedMilliseconds,
                queryCount: 1,
                cacheHit: false);

            var response = ApiResponseExtensions.CreateSuccessWithPerformance(
                (IReadOnlyList<PublicConnectionDto>)connections,
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
    /// Maps a connection entity to a public connection DTO.
    /// </summary>
    /// <param name="connection">The connection entity.</param>
    /// <returns>Public connection DTO.</returns>
    private static PublicConnectionDto MapToPublicConnectionDto(ConnectionDto connection)
    {
        return new PublicConnectionDto
        {
            Id = connection.Id,
            FromClubId = connection.FromClubId,
            ToClubId = connection.ToClubId,
            FromClubName = connection.FromClubName,
            ToClubName = connection.ToClubName,
            ConnectionType = connection.ConnectionType,
            Strength = connection.Strength,
            Title = connection.Title,
            Description = connection.Description
        };
    }
}