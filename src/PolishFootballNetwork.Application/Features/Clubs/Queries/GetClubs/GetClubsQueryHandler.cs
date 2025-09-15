using FluentValidation;
using Microsoft.Extensions.Logging;
using PolishFootballNetwork.Application.Common.Interfaces;
using PolishFootballNetwork.Application.Common.Models;
using PolishFootballNetwork.Application.Features.Clubs.Queries.GetClubs;
using PolishFootballNetwork.Domain.Enums;
using PolishFootballNetwork.Domain.Repositories;

namespace PolishFootballNetwork.Application.Features.Clubs.Queries.GetClubs;

/// <summary>
/// Validator for GetClubsQuery.
/// </summary>
public class GetClubsQueryValidator : AbstractValidator<GetClubsQuery>
{
    public GetClubsQueryValidator()
    {
        RuleFor(x => x.Page)
            .GreaterThan(0)
            .WithMessage("Page number must be greater than 0.");

        RuleFor(x => x.PageSize)
            .InclusiveBetween(1, 100)
            .WithMessage("Page size must be between 1 and 100.");

        RuleFor(x => x.SearchTerm)
            .MaximumLength(100)
            .WithMessage("Search term must not exceed 100 characters.");

        RuleFor(x => x.SortBy)
            .Must(BeValidSortField)
            .WithMessage("Invalid sort field. Valid values are: Name, ShortName, League, FoundedYear, City, CreatedAt.")
            .When(x => !string.IsNullOrWhiteSpace(x.SortBy));
    }

    private static bool BeValidSortField(string? sortBy)
    {
        if (string.IsNullOrWhiteSpace(sortBy))
            return true;

        var validSortFields = new[] { "Name", "ShortName", "League", "FoundedYear", "City", "CreatedAt" };
        return validSortFields.Contains(sortBy, StringComparer.OrdinalIgnoreCase);
    }
}

/// <summary>
/// Handler for GetClubsQuery.
/// </summary>
public class GetClubsQueryHandler : IQueryHandler<GetClubsQuery, Result<PagedResult<ClubDto>>>
{
    private readonly IClubRepository _clubRepository;
    private readonly ICacheService _cacheService;
    private readonly IValidator<GetClubsQuery> _validator;
    private readonly ILogger<GetClubsQueryHandler> _logger;

    public GetClubsQueryHandler(
        IClubRepository clubRepository,
        ICacheService cacheService,
        IValidator<GetClubsQuery> validator,
        ILogger<GetClubsQueryHandler> logger)
    {
        _clubRepository = clubRepository ?? throw new ArgumentNullException(nameof(clubRepository));
        _cacheService = cacheService ?? throw new ArgumentNullException(nameof(cacheService));
        _validator = validator ?? throw new ArgumentNullException(nameof(validator));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<Result<PagedResult<ClubDto>>> Handle(GetClubsQuery request, CancellationToken cancellationToken)
    {
        try
        {
            _logger.LogInformation("Processing get clubs query with filters: League={League}, IsActive={IsActive}, IsVerified={IsVerified}",
                request.League, request.IsActive, request.IsVerified);

            // Validate the query
            var validationResult = await _validator.ValidateAsync(request, cancellationToken);
            if (!validationResult.IsValid)
            {
                var errors = validationResult.Errors.Select(e => e.ErrorMessage).ToList();
                _logger.LogWarning("Validation failed for get clubs query: {Errors}", string.Join(", ", errors));
                return Result<PagedResult<ClubDto>>.Failure(errors);
            }

            // Generate cache key
            var cacheKey = GenerateCacheKey(request);
            
            // Try to get from cache first
            var cachedResult = await _cacheService.GetAsync<PagedResult<ClubDto>>(cacheKey, cancellationToken);
            if (cachedResult != null)
            {
                _logger.LogInformation("Returning cached clubs result for key: {CacheKey}", cacheKey);
                return Result<PagedResult<ClubDto>>.Success(cachedResult);
            }

            // Build filter criteria
            var sortDescending = string.Equals(request.SortDirection, "DESC", StringComparison.OrdinalIgnoreCase);

            // Get clubs from repository
            var (clubs, totalCount) = await _clubRepository.GetPagedWithFilterAsync(
                pageNumber: request.Page,
                pageSize: request.PageSize,
                searchTerm: request.SearchTerm,
                league: request.League,
                city: request.City,
                isActive: request.IsActive,
                isVerified: request.IsVerified,
                isFeatured: request.IsFeatured,
                foundedYearFrom: request.FoundedYearFrom,
                foundedYearTo: request.FoundedYearTo,
                sortBy: request.SortBy ?? "Name",
                sortDescending: sortDescending,
                cancellationToken: cancellationToken);

            // Convert to DTOs
            var clubDtos = clubs.Select(ClubDto.FromDomain).ToList();

            var result = PagedResult<ClubDto>.Create(
                items: clubDtos,
                page: request.Page,
                pageSize: request.PageSize,
                totalCount: totalCount);

            // Cache the result for 5 minutes
            await _cacheService.SetAsync(cacheKey, result, TimeSpan.FromMinutes(5), cancellationToken);

            _logger.LogInformation("Retrieved {ClubCount} clubs from {TotalCount} total clubs", 
                result.Items.Count, result.TotalCount);

            return Result<PagedResult<ClubDto>>.Success(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error during get clubs query processing");
            return Result<PagedResult<ClubDto>>.Failure("An unexpected error occurred while retrieving clubs.");
        }
    }

    private static string GenerateCacheKey(GetClubsQuery query)
    {
        var keyParts = new List<string>
        {
            "clubs",
            $"page-{query.Page}",
            $"size-{query.PageSize}",
        };

        if (!string.IsNullOrWhiteSpace(query.SearchTerm))
        {
            keyParts.Add($"search-{query.SearchTerm.ToLowerInvariant()}");
        }

        if (query.League.HasValue)
        {
            keyParts.Add($"league-{query.League}");
        }

        if (!string.IsNullOrWhiteSpace(query.City))
        {
            keyParts.Add($"city-{query.City.ToLowerInvariant()}");
        }

        if (query.IsActive.HasValue)
        {
            keyParts.Add($"active-{query.IsActive}");
        }

        if (query.IsVerified.HasValue)
        {
            keyParts.Add($"verified-{query.IsVerified}");
        }

        if (query.IsFeatured.HasValue)
        {
            keyParts.Add($"featured-{query.IsFeatured}");
        }

        if (query.FoundedYearFrom.HasValue)
        {
            keyParts.Add($"from-{query.FoundedYearFrom}");
        }

        if (query.FoundedYearTo.HasValue)
        {
            keyParts.Add($"to-{query.FoundedYearTo}");
        }

        if (!string.IsNullOrWhiteSpace(query.SortBy))
        {
            keyParts.Add($"sort-{query.SortBy.ToLowerInvariant()}-{query.SortDirection?.ToLowerInvariant()}");
        }

        return string.Join(":", keyParts);
    }
}
