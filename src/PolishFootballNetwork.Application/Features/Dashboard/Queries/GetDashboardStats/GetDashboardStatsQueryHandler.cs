using FluentValidation;
using Microsoft.Extensions.Logging;
using PolishFootballNetwork.Application.Common.Interfaces;
using PolishFootballNetwork.Application.Common.Models;
using PolishFootballNetwork.Application.Features.Dashboard.Queries.GetDashboardStats;
using PolishFootballNetwork.Domain.Repositories;

namespace PolishFootballNetwork.Application.Features.Dashboard.Queries.GetDashboardStats;

/// <summary>
/// Validator for GetDashboardStatsQuery.
/// </summary>
public class GetDashboardStatsQueryValidator : AbstractValidator<GetDashboardStatsQuery>
{
    public GetDashboardStatsQueryValidator()
    {
        RuleFor(x => x.StartDate)
            .LessThanOrEqualTo(x => x.EndDate)
            .WithMessage("Start date must be before or equal to end date.")
            .When(x => x.StartDate.HasValue && x.EndDate.HasValue);

        RuleFor(x => x.EndDate)
            .LessThanOrEqualTo(DateTime.UtcNow)
            .WithMessage("End date cannot be in the future.")
            .When(x => x.EndDate.HasValue);
    }
}

/// <summary>
/// Handler for GetDashboardStatsQuery.
/// </summary>
public class GetDashboardStatsQueryHandler : IQueryHandler<GetDashboardStatsQuery, Result<DashboardStatsDto>>
{
    private readonly IClubRepository _clubRepository;
    private readonly IConnectionRepository _connectionRepository;
    private readonly ICacheService _cacheService;
    private readonly IValidator<GetDashboardStatsQuery> _validator;
    private readonly ILogger<GetDashboardStatsQueryHandler> _logger;

    public GetDashboardStatsQueryHandler(
        IClubRepository clubRepository,
        IConnectionRepository connectionRepository,
        ICacheService cacheService,
        IValidator<GetDashboardStatsQuery> validator,
        ILogger<GetDashboardStatsQueryHandler> logger)
    {
        _clubRepository = clubRepository ?? throw new ArgumentNullException(nameof(clubRepository));
        _connectionRepository = connectionRepository ?? throw new ArgumentNullException(nameof(connectionRepository));
        _cacheService = cacheService ?? throw new ArgumentNullException(nameof(cacheService));
        _validator = validator ?? throw new ArgumentNullException(nameof(validator));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<Result<DashboardStatsDto>> Handle(GetDashboardStatsQuery request, CancellationToken cancellationToken)
    {
        try
        {
            _logger.LogInformation("Processing get dashboard stats query");

            // Validate the query
            var validationResult = await _validator.ValidateAsync(request, cancellationToken);
            if (!validationResult.IsValid)
            {
                var errors = validationResult.Errors.Select(e => e.ErrorMessage).ToList();
                _logger.LogWarning("Validation failed for get dashboard stats query: {Errors}", string.Join(", ", errors));
                return Result<DashboardStatsDto>.Failure(errors);
            }

            // Generate cache key
            var cacheKey = GenerateCacheKey(request);
            
            // Try to get from cache first
            var cachedResult = await _cacheService.GetAsync<DashboardStatsDto>(cacheKey, cancellationToken);
            if (cachedResult != null)
            {
                _logger.LogInformation("Returning cached dashboard stats");
                return Result<DashboardStatsDto>.Success(cachedResult);
            }

            // Get all data
            var clubs = await _clubRepository.GetAllAsync(cancellationToken);
            var connections = await _connectionRepository.GetAllAsync(cancellationToken);

            // Apply date filtering if specified
            if (request.StartDate.HasValue || request.EndDate.HasValue)
            {
                clubs = ApplyDateFilter(clubs, request.StartDate, request.EndDate);
                connections = ApplyDateFilter(connections, request.StartDate, request.EndDate);
            }

            var clubsList = clubs.ToList();
            var connectionsList = connections.ToList();

            // Calculate basic stats
            var stats = new DashboardStatsDto
            {
                TotalClubs = clubsList.Count,
                ActiveClubs = clubsList.Count(c => c.IsActive),
                VerifiedClubs = clubsList.Count(c => c.IsVerified),
                FeaturedClubs = clubsList.Count(c => c.IsFeatured),
                TotalConnections = connectionsList.Count,
                VerifiedConnections = connectionsList.Count, // Assuming all connections are verified for now
                ConnectionsRequiringVerification = 0, // No unverified connections for now
                TotalUsers = 1, // Default placeholder
                ActiveUsers = 1, // Default placeholder
                TotalFiles = clubsList.Count(c => !string.IsNullOrEmpty(c.LogoPath)),
                TotalFileSize = 0, // Would need file service to calculate actual size
                GeneratedAt = DateTime.UtcNow
            };

            // Add detailed breakdowns if requested
            if (request.IncludeDetails)
            {
                stats.ClubsByLeague = clubsList.GroupBy(c => c.League.ToString())
                                               .ToDictionary(g => g.Key, g => g.Count());

                stats.ConnectionsByType = connectionsList.GroupBy(c => c.Type.ToString())
                                                        .ToDictionary(g => g.Key, g => g.Count());

                stats.ConnectionsByStrength = connectionsList.GroupBy(c => c.Strength.ToString())
                                                           .ToDictionary(g => g.Key, g => g.Count());

                stats.RecentActivity = CalculateRecentActivity(clubsList, connectionsList);
                stats.SystemHealth = GetSystemHealth();
            }

            // Cache the result for 5 minutes
            await _cacheService.SetAsync(cacheKey, stats, TimeSpan.FromMinutes(5), cancellationToken);

            _logger.LogInformation("Generated dashboard stats: {TotalClubs} clubs, {TotalConnections} connections", 
                stats.TotalClubs, stats.TotalConnections);

            return Result<DashboardStatsDto>.Success(stats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error during get dashboard stats query processing");
            return Result<DashboardStatsDto>.Failure("An unexpected error occurred while retrieving dashboard statistics.");
        }
    }

    private static IEnumerable<PolishFootballNetwork.Domain.Entities.Club> ApplyDateFilter(
        IEnumerable<PolishFootballNetwork.Domain.Entities.Club> clubs, 
        DateTime? startDate, 
        DateTime? endDate)
    {
        var filtered = clubs;

        if (startDate.HasValue)
        {
            filtered = filtered.Where(c => c.CreatedAt >= startDate.Value);
        }

        if (endDate.HasValue)
        {
            filtered = filtered.Where(c => c.CreatedAt <= endDate.Value);
        }

        return filtered;
    }

    private static IEnumerable<PolishFootballNetwork.Domain.Entities.Connection> ApplyDateFilter(
        IEnumerable<PolishFootballNetwork.Domain.Entities.Connection> connections, 
        DateTime? startDate, 
        DateTime? endDate)
    {
        var filtered = connections;

        if (startDate.HasValue)
        {
            filtered = filtered.Where(c => c.CreatedAt >= startDate.Value);
        }

        if (endDate.HasValue)
        {
            filtered = filtered.Where(c => c.CreatedAt <= endDate.Value);
        }

        return filtered;
    }

    private static RecentActivityDto CalculateRecentActivity(
        IList<PolishFootballNetwork.Domain.Entities.Club> clubs,
        IList<PolishFootballNetwork.Domain.Entities.Connection> connections)
    {
        var thirtyDaysAgo = DateTime.UtcNow.AddDays(-30);

        return new RecentActivityDto
        {
            ClubsCreatedLast30Days = clubs.Count(c => c.CreatedAt >= thirtyDaysAgo),
            ConnectionsCreatedLast30Days = connections.Count(c => c.CreatedAt >= thirtyDaysAgo),
            UsersRegisteredLast30Days = 0, // Would need user repository
            FilesUploadedLast30Days = clubs.Count(c => !string.IsNullOrEmpty(c.LogoPath) && c.ModifiedAt >= thirtyDaysAgo),
            LastLoginAt = null, // Would need user activity tracking
            LastDataModificationAt = GetLastModificationTime(clubs, connections)
        };
    }

    private static DateTime? GetLastModificationTime(
        IList<PolishFootballNetwork.Domain.Entities.Club> clubs,
        IList<PolishFootballNetwork.Domain.Entities.Connection> connections)
    {
        var lastClubMod = clubs.Where(c => c.ModifiedAt.HasValue).Max(c => c.ModifiedAt);
        var lastConnectionMod = connections.Where(c => c.ModifiedAt.HasValue).Max(c => c.ModifiedAt);

        if (lastClubMod.HasValue && lastConnectionMod.HasValue)
        {
            return lastClubMod > lastConnectionMod ? lastClubMod : lastConnectionMod;
        }

        return lastClubMod ?? lastConnectionMod;
    }

    private static SystemHealthDto GetSystemHealth()
    {
        return new SystemHealthDto
        {
            DatabaseHealth = "Healthy",
            FileSystemHealth = "Healthy",
            CacheHealth = "Healthy",
            OverallStatus = "Healthy",
            ServerTime = DateTime.UtcNow,
            Uptime = TimeSpan.FromHours(1), // Placeholder
            Warnings = Array.Empty<string>()
        };
    }

    private static string GenerateCacheKey(GetDashboardStatsQuery query)
    {
        var keyParts = new List<string> { "dashboard-stats" };

        if (query.StartDate.HasValue)
            keyParts.Add($"start-{query.StartDate.Value:yyyyMMdd}");

        if (query.EndDate.HasValue)
            keyParts.Add($"end-{query.EndDate.Value:yyyyMMdd}");

        if (query.IncludeDetails)
            keyParts.Add("detailed");

        return string.Join(":", keyParts);
    }
}