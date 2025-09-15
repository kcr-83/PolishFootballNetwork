using FluentValidation;
using Microsoft.Extensions.Logging;
using PolishFootballNetwork.Application.Common.Interfaces;
using PolishFootballNetwork.Application.Common.Models;
using PolishFootballNetwork.Application.Features.Clubs.Queries.GetClubConnections;
using PolishFootballNetwork.Application.Features.Connections.Commands.CreateConnection;
using PolishFootballNetwork.Application.Features.Connections.Queries.GetConnections;
using PolishFootballNetwork.Domain.Repositories;

namespace PolishFootballNetwork.Application.Features.Connections.Queries.GetConnections;

/// <summary>
/// Validator for GetConnectionsQuery.
/// </summary>
public class GetConnectionsQueryValidator : AbstractValidator<GetConnectionsQuery>
{
    public GetConnectionsQueryValidator()
    {
        RuleFor(x => x.Page)
            .GreaterThan(0)
            .WithMessage("Page number must be greater than 0.");

        RuleFor(x => x.PageSize)
            .InclusiveBetween(1, 100)
            .WithMessage("Page size must be between 1 and 100.");

        RuleFor(x => x.MinReliabilityScore)
            .InclusiveBetween(0.0, 1.0)
            .WithMessage("Reliability score must be between 0 and 1.")
            .When(x => x.MinReliabilityScore.HasValue);

        RuleFor(x => x.SortBy)
            .Must(BeValidSortField)
            .WithMessage("Invalid sort field. Valid values are: Type, Strength, CreatedAt, ReliabilityScore.")
            .When(x => !string.IsNullOrWhiteSpace(x.SortBy));
    }

    private static bool BeValidSortField(string? sortBy)
    {
        if (string.IsNullOrWhiteSpace(sortBy))
            return true;

        var validSortFields = new[] { "Type", "Strength", "CreatedAt", "ReliabilityScore" };
        return validSortFields.Contains(sortBy, StringComparer.OrdinalIgnoreCase);
    }
}

/// <summary>
/// Handler for GetConnectionsQuery.
/// </summary>
public class GetConnectionsQueryHandler : IQueryHandler<GetConnectionsQuery, Result<PagedResult<ConnectionDetailDto>>>
{
    private readonly IConnectionRepository _connectionRepository;
    private readonly IClubRepository _clubRepository;
    private readonly ICacheService _cacheService;
    private readonly IValidator<GetConnectionsQuery> _validator;
    private readonly ILogger<GetConnectionsQueryHandler> _logger;

    public GetConnectionsQueryHandler(
        IConnectionRepository connectionRepository,
        IClubRepository clubRepository,
        ICacheService cacheService,
        IValidator<GetConnectionsQuery> validator,
        ILogger<GetConnectionsQueryHandler> logger)
    {
        _connectionRepository = connectionRepository ?? throw new ArgumentNullException(nameof(connectionRepository));
        _clubRepository = clubRepository ?? throw new ArgumentNullException(nameof(clubRepository));
        _cacheService = cacheService ?? throw new ArgumentNullException(nameof(cacheService));
        _validator = validator ?? throw new ArgumentNullException(nameof(validator));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<Result<PagedResult<ConnectionDetailDto>>> Handle(GetConnectionsQuery request, CancellationToken cancellationToken)
    {
        try
        {
            _logger.LogInformation("Processing get connections query with filters: Type={ConnectionType}, Strength={Strength}, ClubId={ClubId}",
                request.ConnectionType, request.Strength, request.ClubId);

            // Validate the query
            var validationResult = await _validator.ValidateAsync(request, cancellationToken);
            if (!validationResult.IsValid)
            {
                var errors = validationResult.Errors.Select(e => e.ErrorMessage).ToList();
                _logger.LogWarning("Validation failed for get connections query: {Errors}", string.Join(", ", errors));
                return Result<PagedResult<ConnectionDetailDto>>.Failure(errors);
            }

            // Generate cache key
            var cacheKey = GenerateCacheKey(request);
            
            // Try to get from cache first
            var cachedResult = await _cacheService.GetAsync<PagedResult<ConnectionDetailDto>>(cacheKey, cancellationToken);
            if (cachedResult != null)
            {
                _logger.LogInformation("Returning cached connections result for key: {CacheKey}", cacheKey);
                return Result<PagedResult<ConnectionDetailDto>>.Success(cachedResult);
            }

            // Get connections from repository based on filters
            var connections = await GetFilteredConnections(request, cancellationToken);

            // Convert to DTOs
            var connectionDtos = new List<ConnectionDetailDto>();
            foreach (var connection in connections)
            {
                var sourceClub = await _clubRepository.GetByIdAsync(connection.SourceClubId, cancellationToken);
                var targetClub = await _clubRepository.GetByIdAsync(connection.TargetClubId, cancellationToken);

                if (sourceClub != null && targetClub != null)
                {
                    var dto = ConnectionDetailDto.FromDomain(connection, sourceClub, targetClub);
                    connectionDtos.Add(dto);
                }
            }

            // Apply sorting
            connectionDtos = ApplySorting(connectionDtos, request);

            // Apply pagination
            var totalCount = connectionDtos.Count;
            var pagedConnections = connectionDtos
                .Skip((request.Page - 1) * request.PageSize)
                .Take(request.PageSize)
                .ToList();

            var result = new PagedResult<ConnectionDetailDto>
            {
                Items = pagedConnections,
                TotalCount = totalCount,
                PageNumber = request.Page,
                PageSize = request.PageSize,
                TotalPages = (int)Math.Ceiling(totalCount / (double)request.PageSize)
            };

            // Cache the result for 5 minutes
            await _cacheService.SetAsync(cacheKey, result, TimeSpan.FromMinutes(5), cancellationToken);

            _logger.LogInformation("Retrieved {Count} connections for page {Page}", pagedConnections.Count, request.Page);

            return Result<PagedResult<ConnectionDetailDto>>.Success(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error during get connections query processing");
            return Result<PagedResult<ConnectionDetailDto>>.Failure("An unexpected error occurred while retrieving connections.");
        }
    }

    private async Task<IEnumerable<PolishFootballNetwork.Domain.Entities.Connection>> GetFilteredConnections(
        GetConnectionsQuery request, 
        CancellationToken cancellationToken)
    {
        // Start with all connections or filter by club
        var connections = request.ClubId.HasValue
            ? await _connectionRepository.GetByClubIdAsync(request.ClubId.Value, cancellationToken)
            : await _connectionRepository.GetAllAsync(cancellationToken);

        // Apply additional filters
        if (request.ConnectionType.HasValue)
        {
            connections = connections.Where(c => c.Type == request.ConnectionType.Value);
        }

        if (request.Strength.HasValue)
        {
            connections = connections.Where(c => c.Strength == request.Strength.Value);
        }

        return connections;
    }

    private static List<ConnectionDetailDto> ApplySorting(List<ConnectionDetailDto> connections, GetConnectionsQuery request)
    {
        if (string.IsNullOrWhiteSpace(request.SortBy))
        {
            return request.IsDescending 
                ? connections.OrderByDescending(c => c.CreatedAt).ToList()
                : connections.OrderBy(c => c.CreatedAt).ToList();
        }

        return request.SortBy.ToLowerInvariant() switch
        {
            "type" => request.IsDescending
                ? connections.OrderByDescending(c => c.Type).ToList()
                : connections.OrderBy(c => c.Type).ToList(),
            "strength" => request.IsDescending
                ? connections.OrderByDescending(c => c.Strength).ToList()
                : connections.OrderBy(c => c.Strength).ToList(),
            "reliabilityscore" => request.IsDescending
                ? connections.OrderByDescending(c => c.ReliabilityScore).ToList()
                : connections.OrderBy(c => c.ReliabilityScore).ToList(),
            _ => request.IsDescending
                ? connections.OrderByDescending(c => c.CreatedAt).ToList()
                : connections.OrderBy(c => c.CreatedAt).ToList()
        };
    }

    private static string GenerateCacheKey(GetConnectionsQuery query)
    {
        var keyParts = new List<string>
        {
            "connections",
            $"page-{query.Page}",
            $"size-{query.PageSize}",
        };

        if (query.ConnectionType.HasValue)
        {
            keyParts.Add($"type-{query.ConnectionType}");
        }

        if (query.Strength.HasValue)
        {
            keyParts.Add($"strength-{query.Strength}");
        }

        if (query.IsVerified.HasValue)
        {
            keyParts.Add($"verified-{query.IsVerified}");
        }

        if (query.ClubId.HasValue)
        {
            keyParts.Add($"club-{query.ClubId}");
        }

        if (query.MinReliabilityScore.HasValue)
        {
            keyParts.Add($"reliability-{query.MinReliabilityScore}");
        }

        if (!string.IsNullOrWhiteSpace(query.SortBy))
        {
            keyParts.Add($"sort-{query.SortBy.ToLowerInvariant()}-{query.SortDirection?.ToLowerInvariant()}");
        }

        return string.Join(":", keyParts);
    }
}
