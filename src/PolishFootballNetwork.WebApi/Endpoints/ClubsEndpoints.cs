namespace PolishFootballNetwork.WebApi.Endpoints;

using System.ComponentModel;
using Microsoft.AspNetCore.Mvc;
using PolishFootballNetwork.Application.Common.Interfaces;
using PolishFootballNetwork.Application.Common.Models;
using PolishFootballNetwork.Application.Features.Clubs.DTOs;
using PolishFootballNetwork.Application.Features.Clubs.Queries.GetClubs;
using PolishFootballNetwork.Application.Features.Clubs.Queries.GetClubById;
using PolishFootballNetwork.Domain.Enums;

/// <summary>
/// Public API endpoints for club data.
/// </summary>
public static class ClubsEndpoints
{
    /// <summary>
    /// Maps club endpoints to the route group.
    /// </summary>
    /// <param name="group">The route group builder.</param>
    /// <returns>The configured route group.</returns>
    public static RouteGroupBuilder MapClubsEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/", GetClubs)
            .WithName("GetClubs")
            .WithTags("Clubs")
            .WithSummary("Get paginated list of clubs")
            .WithDescription("Retrieves a paginated list of clubs with optional filtering by league, country, and city")
            .Produces<ApiResponse<IReadOnlyList<PublicClubDto>>>(StatusCodes.Status200OK)
            .Produces<ApiResponse<object>>(StatusCodes.Status400BadRequest)
            .Produces<ApiResponse<object>>(StatusCodes.Status500InternalServerError)
            .CacheOutput("clubs-list");

        group.MapGet("/{id:int}", GetClubById)
            .WithName("GetClubById")
            .WithTags("Clubs")
            .WithSummary("Get detailed club information")
            .WithDescription("Retrieves detailed information about a specific club including its connections")
            .Produces<ApiResponse<PublicClubDetailDto>>(StatusCodes.Status200OK)
            .Produces<ApiResponse<object>>(StatusCodes.Status404NotFound)
            .Produces<ApiResponse<object>>(StatusCodes.Status500InternalServerError)
            .CacheOutput("club-detail");

        group.MapGet("/search", SearchClubs)
            .WithName("SearchClubs")
            .WithTags("Clubs")
            .WithSummary("Search clubs by name")
            .WithDescription("Searches clubs by name with fuzzy matching and returns matching results")
            .Produces<ApiResponse<ClubSearchResultDto>>(StatusCodes.Status200OK)
            .Produces<ApiResponse<object>>(StatusCodes.Status400BadRequest)
            .Produces<ApiResponse<object>>(StatusCodes.Status500InternalServerError)
            .CacheOutput("club-search");

        return group;
    }

    /// <summary>
    /// Gets a paginated list of clubs with optional filtering.
    /// </summary>
    /// <param name="mediator">The mediator instance.</param>
    /// <param name="league">Filter by league.</param>
    /// <param name="country">Filter by country.</param>
    /// <param name="city">Filter by city.</param>
    /// <param name="page">Page number (1-based).</param>
    /// <param name="pageSize">Number of items per page.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Paginated list of clubs.</returns>
    private static async Task<IResult> GetClubs(
        IMediator mediator,
        [Description("Filter by league type")] LeagueType? league = null,
        [Description("Filter by country")] string? country = null,
        [Description("Filter by city")] string? city = null,
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

            var query = new GetClubsQuery
            {
                League = league,
                Country = country,
                City = city,
                Page = page,
                PageSize = pageSize
            };

            var result = await mediator.Send(query, cancellationToken);
            stopwatch.Stop();

            if (!result.IsSuccess)
            {
                var performance = PerformanceMetrics.Create(stopwatch.ElapsedMilliseconds);
                return Results.BadRequest(ApiResponseExtensions.CreateSuccessWithPerformance(
                    (object?)null, performance, result.Error));
            }

            var clubs = result.Value!.Clubs.Select(MapToPublicClubDto).ToList();
            var pagination = PaginationMetadata.Create(page, pageSize, result.Value.TotalCount);
            var performanceMetrics = PerformanceMetrics.Create(
                stopwatch.ElapsedMilliseconds, 
                queryCount: 1, 
                cacheHit: false);

            var response = ApiResponseExtensions.CreatePaginatedSuccess(
                (IReadOnlyList<PublicClubDto>)clubs, 
                pagination, 
                performanceMetrics);

            return Results.Ok(response);
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            var performance = PerformanceMetrics.Create(stopwatch.ElapsedMilliseconds);
            return Results.Problem(
                title: "Internal Server Error",
                detail: "An error occurred while processing the request",
                statusCode: 500);
        }
    }

    /// <summary>
    /// Gets detailed information about a specific club.
    /// </summary>
    /// <param name="mediator">The mediator instance.</param>
    /// <param name="id">Club identifier.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Detailed club information.</returns>
    private static async Task<IResult> GetClubById(
        IMediator mediator,
        [Description("Club identifier")] int id,
        CancellationToken cancellationToken = default)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();

        try
        {
            var query = new GetClubByIdQuery { Id = id };
            var result = await mediator.Send(query, cancellationToken);
            stopwatch.Stop();

            if (!result.IsSuccess)
            {
                var performance = PerformanceMetrics.Create(stopwatch.ElapsedMilliseconds);
                
                if (result.Error?.Contains("not found", StringComparison.OrdinalIgnoreCase) == true)
                {
                    return Results.NotFound(ApiResponse<object>.ErrorResponse("Club not found"));
                }

                return Results.BadRequest(ApiResponse<object>.ErrorResponse(result.Error ?? "Failed to retrieve club"));
            }

            var clubDetail = MapToPublicClubDetailDto(result.Value!);
            var performanceMetrics = PerformanceMetrics.Create(
                stopwatch.ElapsedMilliseconds, 
                queryCount: 2, // Club + connections query
                cacheHit: false);

            var response = ApiResponseExtensions.CreateSuccessWithPerformance(
                clubDetail, 
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
    /// Searches clubs by name with fuzzy matching.
    /// </summary>
    /// <param name="mediator">The mediator instance.</param>
    /// <param name="q">Search query.</param>
    /// <param name="limit">Maximum number of results.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Search results.</returns>
    private static async Task<IResult> SearchClubs(
        IMediator mediator,
        [Description("Search query")] string q,
        [Description("Maximum number of results (max 50)")] int limit = 10,
        CancellationToken cancellationToken = default)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();

        try
        {
            // Validate parameters
            if (string.IsNullOrWhiteSpace(q))
            {
                return Results.BadRequest(ApiResponse<object>.ErrorResponse("Search query cannot be empty"));
            }

            if (q.Length < 2)
            {
                return Results.BadRequest(ApiResponse<object>.ErrorResponse("Search query must be at least 2 characters"));
            }

            if (limit < 1 || limit > 50)
            {
                return Results.BadRequest(ApiResponse<object>.ErrorResponse("Limit must be between 1 and 50"));
            }

            // For now, use the GetClubs query with name filter
            // In a real implementation, you'd have a dedicated search query
            var query = new GetClubsQuery
            {
                SearchTerm = q,
                Page = 1,
                PageSize = limit
            };

            var result = await mediator.Send(query, cancellationToken);
            stopwatch.Stop();

            if (!result.IsSuccess)
            {
                var performance = PerformanceMetrics.Create(stopwatch.ElapsedMilliseconds);
                return Results.BadRequest(ApiResponse<object>.ErrorResponse(result.Error ?? "Search failed"));
            }

            var clubs = result.Value!.Clubs.Select(MapToPublicClubDto).ToList();
            var searchResult = new ClubSearchResultDto
            {
                Clubs = clubs,
                Query = q,
                TotalMatches = result.Value.TotalCount
            };

            var performanceMetrics = PerformanceMetrics.Create(
                stopwatch.ElapsedMilliseconds, 
                queryCount: 1, 
                cacheHit: false);

            var response = ApiResponseExtensions.CreateSuccessWithPerformance(
                searchResult, 
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
    /// Maps a club entity to a public club DTO.
    /// </summary>
    /// <param name="club">The club entity.</param>
    /// <returns>Public club DTO.</returns>
    private static PublicClubDto MapToPublicClubDto(ClubDto club)
    {
        return new PublicClubDto
        {
            Id = club.Id,
            Name = club.Name,
            ShortName = club.ShortName,
            Slug = club.Slug,
            League = club.League,
            Country = club.Country,
            City = club.City,
            LogoPath = club.LogoPath,
            Position = new PositionDto
            {
                X = club.Position?.X ?? 0,
                Y = club.Position?.Y ?? 0
            },
            ConnectionsCount = 0 // This would need to be calculated or included in the query
        };
    }

    /// <summary>
    /// Maps a club detail result to a public club detail DTO.
    /// </summary>
    /// <param name="clubDetail">The club detail result.</param>
    /// <returns>Public club detail DTO.</returns>
    private static PublicClubDetailDto MapToPublicClubDetailDto(ClubDetailDto clubDetail)
    {
        return new PublicClubDetailDto
        {
            Id = clubDetail.Id,
            Name = clubDetail.Name,
            ShortName = clubDetail.ShortName,
            Slug = clubDetail.Slug,
            League = clubDetail.League,
            Country = clubDetail.Country,
            City = clubDetail.City,
            LogoPath = clubDetail.LogoPath,
            Position = new PositionDto
            {
                X = clubDetail.Position?.X ?? 0,
                Y = clubDetail.Position?.Y ?? 0
            },
            ConnectionsCount = clubDetail.Connections?.Count ?? 0,
            Founded = clubDetail.Founded,
            Stadium = clubDetail.Stadium,
            Website = clubDetail.Website,
            Colors = clubDetail.Colors,
            Description = clubDetail.Description,
            Nickname = clubDetail.Nickname,
            Region = clubDetail.Region,
            Connections = clubDetail.Connections?.Select(c => new PublicConnectionDto
            {
                Id = c.Id,
                FromClubId = c.FromClubId,
                ToClubId = c.ToClubId,
                FromClubName = c.FromClubName,
                ToClubName = c.ToClubName,
                ConnectionType = c.ConnectionType,
                Strength = c.Strength,
                Title = c.Title,
                Description = c.Description
            }).ToList() ?? Array.Empty<PublicConnectionDto>()
        };
    }
}