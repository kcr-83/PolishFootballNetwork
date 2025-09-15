using FluentValidation;
using Microsoft.Extensions.Logging;
using PolishFootballNetwork.Application.Common.Interfaces;
using PolishFootballNetwork.Application.Common.Models;
using PolishFootballNetwork.Application.Features.Clubs.Queries.GetClubConnections;
using PolishFootballNetwork.Application.Features.Connections.Commands.CreateConnection;
using PolishFootballNetwork.Domain.Repositories;

namespace PolishFootballNetwork.Application.Features.Clubs.Queries.GetClubConnections;

/// <summary>
/// Validator for GetClubConnectionsQuery.
/// </summary>
public class GetClubConnectionsQueryValidator : AbstractValidator<GetClubConnectionsQuery>
{
    public GetClubConnectionsQueryValidator()
    {
        RuleFor(x => x.ClubId)
            .NotEmpty()
            .WithMessage("Club ID is required.");

        RuleFor(x => x.Page)
            .GreaterThan(0)
            .WithMessage("Page number must be greater than 0.");

        RuleFor(x => x.PageSize)
            .InclusiveBetween(1, 100)
            .WithMessage("Page size must be between 1 and 100.");
    }
}

/// <summary>
/// Handler for GetClubConnectionsQuery.
/// </summary>
public class GetClubConnectionsQueryHandler : IQueryHandler<GetClubConnectionsQuery, Result<PagedResult<ConnectionDetailDto>>>
{
    private readonly IConnectionRepository _connectionRepository;
    private readonly IClubRepository _clubRepository;
    private readonly ICacheService _cacheService;
    private readonly IValidator<GetClubConnectionsQuery> _validator;
    private readonly ILogger<GetClubConnectionsQueryHandler> _logger;

    public GetClubConnectionsQueryHandler(
        IConnectionRepository connectionRepository,
        IClubRepository clubRepository,
        ICacheService cacheService,
        IValidator<GetClubConnectionsQuery> validator,
        ILogger<GetClubConnectionsQueryHandler> logger)
    {
        _connectionRepository = connectionRepository ?? throw new ArgumentNullException(nameof(connectionRepository));
        _clubRepository = clubRepository ?? throw new ArgumentNullException(nameof(clubRepository));
        _cacheService = cacheService ?? throw new ArgumentNullException(nameof(cacheService));
        _validator = validator ?? throw new ArgumentNullException(nameof(validator));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<Result<PagedResult<ConnectionDetailDto>>> Handle(GetClubConnectionsQuery request, CancellationToken cancellationToken)
    {
        try
        {
            _logger.LogInformation("Processing get club connections query for club: {ClubId}", request.ClubId);

            // Validate the query
            var validationResult = await _validator.ValidateAsync(request, cancellationToken);
            if (!validationResult.IsValid)
            {
                var errors = validationResult.Errors.Select(e => e.ErrorMessage).ToList();
                _logger.LogWarning("Validation failed for get club connections query: {Errors}", string.Join(", ", errors));
                return Result<PagedResult<ConnectionDetailDto>>.Failure(errors);
            }

            // Check if club exists
            var club = await _clubRepository.GetByIdAsync(request.ClubId, cancellationToken);
            if (club == null)
            {
                _logger.LogWarning("Club not found: {ClubId}", request.ClubId);
                return Result<PagedResult<ConnectionDetailDto>>.Failure($"Club with ID '{request.ClubId}' not found.");
            }

            // Generate cache key
            var cacheKey = $"club-connections:{request.ClubId}:page-{request.Page}:size-{request.PageSize}";
            
            // Try to get from cache first
            var cachedResult = await _cacheService.GetAsync<PagedResult<ConnectionDetailDto>>(cacheKey, cancellationToken);
            if (cachedResult != null)
            {
                _logger.LogInformation("Returning cached club connections for club: {ClubId}", request.ClubId);
                return Result<PagedResult<ConnectionDetailDto>>.Success(cachedResult);
            }

            // Get connections from repository
            var connections = await _connectionRepository.GetByClubIdAsync(request.ClubId, cancellationToken);

            // Convert to DTOs
            var connectionDtos = new List<ConnectionDetailDto>();
            foreach (var connection in connections)
            {
                var relatedClubId = connection.SourceClubId == request.ClubId 
                    ? connection.TargetClubId 
                    : connection.SourceClubId;
                
                var relatedClub = await _clubRepository.GetByIdAsync(relatedClubId, cancellationToken);
                if (relatedClub != null)
                {
                    var dto = ConnectionDetailDto.FromDomain(connection, club, relatedClub);
                    connectionDtos.Add(dto);
                }
            }

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

            _logger.LogInformation("Retrieved {Count} connections for club {ClubId}", pagedConnections.Count, request.ClubId);

            return Result<PagedResult<ConnectionDetailDto>>.Success(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error during get club connections query processing for club: {ClubId}", request.ClubId);
            return Result<PagedResult<ConnectionDetailDto>>.Failure("An unexpected error occurred while retrieving club connections.");
        }
    }
}