using FluentValidation;
using Microsoft.Extensions.Logging;
using PolishFootballNetwork.Application.Common.Interfaces;
using PolishFootballNetwork.Application.Common.Models;
using PolishFootballNetwork.Application.Features.Clubs.Queries.GetClubById;
using PolishFootballNetwork.Domain.Repositories;

namespace PolishFootballNetwork.Application.Features.Clubs.Queries.GetClubById;

/// <summary>
/// Validator for GetClubByIdQuery.
/// </summary>
public class GetClubByIdQueryValidator : AbstractValidator<GetClubByIdQuery>
{
    public GetClubByIdQueryValidator()
    {
        RuleFor(x => x.Id)
            .NotEmpty()
            .WithMessage("Club ID is required.");
    }
}

/// <summary>
/// Handler for GetClubByIdQuery.
/// </summary>
public class GetClubByIdQueryHandler : IQueryHandler<GetClubByIdQuery, Result<ClubDetailDto>>
{
    private readonly IClubRepository _clubRepository;
    private readonly IConnectionRepository _connectionRepository;
    private readonly ICacheService _cacheService;
    private readonly IValidator<GetClubByIdQuery> _validator;
    private readonly ILogger<GetClubByIdQueryHandler> _logger;

    public GetClubByIdQueryHandler(
        IClubRepository clubRepository,
        IConnectionRepository connectionRepository,
        ICacheService cacheService,
        IValidator<GetClubByIdQuery> validator,
        ILogger<GetClubByIdQueryHandler> logger)
    {
        _clubRepository = clubRepository ?? throw new ArgumentNullException(nameof(clubRepository));
        _connectionRepository = connectionRepository ?? throw new ArgumentNullException(nameof(connectionRepository));
        _cacheService = cacheService ?? throw new ArgumentNullException(nameof(cacheService));
        _validator = validator ?? throw new ArgumentNullException(nameof(validator));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<Result<ClubDetailDto>> Handle(GetClubByIdQuery request, CancellationToken cancellationToken)
    {
        try
        {
            _logger.LogInformation("Processing get club by ID query: {ClubId}", request.Id);

            // Validate the query
            var validationResult = await _validator.ValidateAsync(request, cancellationToken);
            if (!validationResult.IsValid)
            {
                var errors = validationResult.Errors.Select(e => e.ErrorMessage).ToList();
                _logger.LogWarning("Validation failed for get club by ID query: {Errors}", string.Join(", ", errors));
                return Result<ClubDetailDto>.Failure(errors);
            }

            // Generate cache key
            var cacheKey = $"club-detail:{request.Id}";
            
            // Try to get from cache first
            var cachedResult = await _cacheService.GetAsync<ClubDetailDto>(cacheKey, cancellationToken);
            if (cachedResult != null)
            {
                _logger.LogInformation("Returning cached club detail for ID: {ClubId}", request.Id);
                return Result<ClubDetailDto>.Success(cachedResult);
            }

            // Get club from repository
            var club = await _clubRepository.GetByIdAsync(request.Id, cancellationToken);
            if (club == null)
            {
                _logger.LogWarning("Club not found: {ClubId}", request.Id);
                return Result<ClubDetailDto>.Failure($"Club with ID '{request.Id}' not found.");
            }

            // Get club connections if requested
            var connections = request.IncludeConnections 
                ? await _connectionRepository.GetByClubIdAsync(request.Id, cancellationToken)
                : Enumerable.Empty<PolishFootballNetwork.Domain.Entities.Connection>();

            // Get related clubs for connections
            var connectionDtos = new List<ConnectionSummaryDto>();
            if (request.IncludeConnections && connections.Any())
            {
                foreach (var connection in connections)
                {
                    var relatedClubId = connection.SourceClubId == request.Id 
                        ? connection.TargetClubId 
                        : connection.SourceClubId;
                    
                    var relatedClub = await _clubRepository.GetByIdAsync(relatedClubId, cancellationToken);
                    if (relatedClub != null)
                    {
                        connectionDtos.Add(ConnectionSummaryDto.FromDomain(connection, club, relatedClub));
                    }
                }
            }

            // Convert to DTO
            var result = ClubDetailDto.FromDomain(club, connectionDtos);

            // Cache the result for 10 minutes
            await _cacheService.SetAsync(cacheKey, result, TimeSpan.FromMinutes(10), cancellationToken);

            _logger.LogInformation("Retrieved club detail: {ClubId} - {ClubName}", club.Id, club.Name);

            return Result<ClubDetailDto>.Success(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error during get club by ID query processing: {ClubId}", request.Id);
            return Result<ClubDetailDto>.Failure("An unexpected error occurred while retrieving the club.");
        }
    }
}
