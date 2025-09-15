using FluentValidation;
using Microsoft.Extensions.Logging;
using PolishFootballNetwork.Application.Common.Interfaces;
using PolishFootballNetwork.Application.Common.Models;
using PolishFootballNetwork.Application.Features.Graph.Queries.GetGraphData;
using PolishFootballNetwork.Domain.Enums;
using PolishFootballNetwork.Domain.Repositories;

namespace PolishFootballNetwork.Application.Features.Graph.Queries.GetGraphData;

/// <summary>
/// Validator for GetGraphDataQuery.
/// </summary>
public class GetGraphDataQueryValidator : AbstractValidator<GetGraphDataQuery>
{
    public GetGraphDataQueryValidator()
    {
        RuleFor(x => x.MinReliabilityScore)
            .InclusiveBetween(0.0, 1.0)
            .WithMessage("Reliability score must be between 0 and 1.")
            .When(x => x.MinReliabilityScore.HasValue);

        RuleFor(x => x.IncludeLeagues)
            .Must(leagues => leagues == null || leagues.Length <= 10)
            .WithMessage("Cannot include more than 10 leagues.")
            .When(x => x.IncludeLeagues != null);
    }
}

/// <summary>
/// Handler for GetGraphDataQuery.
/// </summary>
public class GetGraphDataQueryHandler : IQueryHandler<GetGraphDataQuery, Result<GraphDataDto>>
{
    private readonly IClubRepository _clubRepository;
    private readonly IConnectionRepository _connectionRepository;
    private readonly ICacheService _cacheService;
    private readonly IValidator<GetGraphDataQuery> _validator;
    private readonly ILogger<GetGraphDataQueryHandler> _logger;

    private static readonly Dictionary<LeagueType, string> LeagueColors = new()
    {
        { LeagueType.Ekstraklasa, "#FF0000" },
        { LeagueType.Fortuna1Liga, "#0066CC" },
        { LeagueType.EuropeanClub, "#32CD32" },
    };

    private static readonly Dictionary<ConnectionType, string> ConnectionColors = new()
    {
        { ConnectionType.Cooperation, "#32CD32" },
        { ConnectionType.Rivalry, "#FF0000" },
        { ConnectionType.Friendship, "#0066CC" },
    };

    public GetGraphDataQueryHandler(
        IClubRepository clubRepository,
        IConnectionRepository connectionRepository,
        ICacheService cacheService,
        IValidator<GetGraphDataQuery> validator,
        ILogger<GetGraphDataQueryHandler> logger)
    {
        _clubRepository = clubRepository ?? throw new ArgumentNullException(nameof(clubRepository));
        _connectionRepository = connectionRepository ?? throw new ArgumentNullException(nameof(connectionRepository));
        _cacheService = cacheService ?? throw new ArgumentNullException(nameof(cacheService));
        _validator = validator ?? throw new ArgumentNullException(nameof(validator));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<Result<GraphDataDto>> Handle(GetGraphDataQuery request, CancellationToken cancellationToken)
    {
        try
        {
            _logger.LogInformation("Processing get graph data query with filters: VerifiedOnly={VerifiedOnly}, ActiveOnly={ActiveOnly}",
                request.VerifiedOnly, request.ActiveOnly);

            // Validate the query
            var validationResult = await _validator.ValidateAsync(request, cancellationToken);
            if (!validationResult.IsValid)
            {
                var errors = validationResult.Errors.Select(e => e.ErrorMessage).ToList();
                _logger.LogWarning("Validation failed for get graph data query: {Errors}", string.Join(", ", errors));
                return Result<GraphDataDto>.Failure(errors);
            }

            // Generate cache key
            var cacheKey = GenerateCacheKey(request);
            
            // Try to get from cache first
            var cachedResult = await _cacheService.GetAsync<GraphDataDto>(cacheKey, cancellationToken);
            if (cachedResult != null)
            {
                _logger.LogInformation("Returning cached graph data for key: {CacheKey}", cacheKey);
                return Result<GraphDataDto>.Success(cachedResult);
            }

            // Get clubs and connections
            var clubs = await GetFilteredClubs(request, cancellationToken);
            var connections = await GetFilteredConnections(request, cancellationToken);

            // Filter connections to only include those between filtered clubs
            var clubIds = clubs.Select(c => c.Id).ToHashSet();
            var filteredConnections = connections.Where(c => 
                clubIds.Contains(c.SourceClubId) && clubIds.Contains(c.TargetClubId)).ToList();

            // Calculate connection counts for node sizing
            var connectionCounts = CalculateConnectionCounts(filteredConnections, clubIds);

            // If not including isolated nodes, filter out clubs with no connections
            if (!request.IncludeIsolatedNodes)
            {
                clubs = clubs.Where(c => connectionCounts.ContainsKey(c.Id) && connectionCounts[c.Id] > 0).ToList();
            }

            // Create graph nodes
            var nodes = clubs.Select(club => new GraphNodeDto
            {
                Id = club.Id.ToString(),
                Label = club.Name,
                ShortName = club.ShortName,
                League = club.League.ToString(),
                City = club.City,
                LogoUrl = club.LogoPath,
                X = club.Position?.X,
                Y = club.Position?.Y,
                Color = GetLeagueColor(club.League),
                Size = CalculateNodeSize(connectionCounts.GetValueOrDefault(club.Id, 0)),
                ConnectionCount = connectionCounts.GetValueOrDefault(club.Id, 0),
                IsVerified = club.IsVerified,
                IsFeatured = club.IsFeatured
            }).ToList();

            // Create graph edges
            var edges = filteredConnections.Select(connection => new GraphEdgeDto
            {
                Id = connection.Id.ToString(),
                Source = connection.SourceClubId.ToString(),
                Target = connection.TargetClubId.ToString(),
                Type = connection.Type.ToString(),
                Strength = connection.Strength.ToString(),
                Label = connection.Description,
                Color = GetConnectionColor(connection.Type),
                Weight = GetConnectionWeight(connection.Strength),
                ReliabilityScore = 0.5, // Default reliability score
                IsVerified = true // Default to verified for now
            }).ToList();

            // Generate metadata
            var metadata = new GraphMetadataDto
            {
                TotalNodes = nodes.Count,
                TotalEdges = edges.Count,
                GeneratedAt = DateTime.UtcNow,
                LeagueDistribution = CalculateLeagueDistribution(clubs),
                ConnectionTypeDistribution = CalculateConnectionTypeDistribution(filteredConnections),
                AppliedFilters = GetAppliedFilters(request)
            };

            var result = new GraphDataDto
            {
                Nodes = nodes,
                Edges = edges,
                Metadata = metadata
            };

            // Cache the result for 10 minutes
            await _cacheService.SetAsync(cacheKey, result, TimeSpan.FromMinutes(10), cancellationToken);

            _logger.LogInformation("Generated graph data with {NodeCount} nodes and {EdgeCount} edges", 
                nodes.Count, edges.Count);

            return Result<GraphDataDto>.Success(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error during get graph data query processing");
            return Result<GraphDataDto>.Failure("An unexpected error occurred while generating graph data.");
        }
    }

    private async Task<IList<PolishFootballNetwork.Domain.Entities.Club>> GetFilteredClubs(
        GetGraphDataQuery request, 
        CancellationToken cancellationToken)
    {
        var clubs = await _clubRepository.GetAllAsync(cancellationToken);

        if (request.ActiveOnly)
        {
            clubs = clubs.Where(c => c.IsActive);
        }

        if (request.IncludeLeagues?.Any() == true)
        {
            var leagueFilter = request.IncludeLeagues.Select(l => Enum.Parse<LeagueType>(l, true)).ToList();
            clubs = clubs.Where(c => leagueFilter.Contains(c.League));
        }

        return clubs.ToList();
    }

    private async Task<IList<PolishFootballNetwork.Domain.Entities.Connection>> GetFilteredConnections(
        GetGraphDataQuery request, 
        CancellationToken cancellationToken)
    {
        var connections = await _connectionRepository.GetAllAsync(cancellationToken);

        if (request.MinReliabilityScore.HasValue)
        {
            // For now, we'll use a default reliability calculation
            // This could be enhanced with actual reliability scoring
            connections = connections.Where(c => 0.5 >= request.MinReliabilityScore.Value);
        }

        return connections.ToList();
    }

    private static Dictionary<Guid, int> CalculateConnectionCounts(
        IList<PolishFootballNetwork.Domain.Entities.Connection> connections, 
        HashSet<Guid> clubIds)
    {
        var counts = new Dictionary<Guid, int>();

        foreach (var connection in connections)
        {
            if (clubIds.Contains(connection.SourceClubId))
            {
                counts[connection.SourceClubId] = counts.GetValueOrDefault(connection.SourceClubId, 0) + 1;
            }
            
            if (clubIds.Contains(connection.TargetClubId))
            {
                counts[connection.TargetClubId] = counts.GetValueOrDefault(connection.TargetClubId, 0) + 1;
            }
        }

        return counts;
    }

    private static string GetLeagueColor(LeagueType league)
    {
        return LeagueColors.TryGetValue(league, out var color) ? color : "#808080";
    }

    private static string GetConnectionColor(ConnectionType type)
    {
        return ConnectionColors.TryGetValue(type, out var color) ? color : "#808080";
    }

    private static int GetConnectionWeight(ConnectionStrength strength)
    {
        return strength switch
        {
            ConnectionStrength.Weak => 1,
            ConnectionStrength.Medium => 2,
            ConnectionStrength.Strong => 3,
            ConnectionStrength.VeryStrong => 4,
            _ => 1
        };
    }

    private static int CalculateNodeSize(int connectionCount)
    {
        return Math.Min(20 + (connectionCount * 2), 100); // Min 20, max 100
    }

    private static Dictionary<string, int> CalculateLeagueDistribution(IList<PolishFootballNetwork.Domain.Entities.Club> clubs)
    {
        return clubs.GroupBy(c => c.League.ToString())
                   .ToDictionary(g => g.Key, g => g.Count());
    }

    private static Dictionary<string, int> CalculateConnectionTypeDistribution(IList<PolishFootballNetwork.Domain.Entities.Connection> connections)
    {
        return connections.GroupBy(c => c.Type.ToString())
                         .ToDictionary(g => g.Key, g => g.Count());
    }

    private static Dictionary<string, object> GetAppliedFilters(GetGraphDataQuery request)
    {
        var filters = new Dictionary<string, object>();

        if (request.VerifiedOnly)
            filters["VerifiedOnly"] = true;

        if (request.ActiveOnly)
            filters["ActiveOnly"] = true;

        if (request.MinReliabilityScore.HasValue)
            filters["MinReliabilityScore"] = request.MinReliabilityScore.Value;

        if (request.IncludeLeagues?.Any() == true)
            filters["IncludeLeagues"] = request.IncludeLeagues;

        if (!request.IncludeIsolatedNodes)
            filters["ExcludeIsolatedNodes"] = true;

        return filters;
    }

    private static string GenerateCacheKey(GetGraphDataQuery query)
    {
        var keyParts = new List<string> { "graph-data" };

        if (query.VerifiedOnly)
            keyParts.Add("verified");

        if (query.ActiveOnly)
            keyParts.Add("active");

        if (query.MinReliabilityScore.HasValue)
            keyParts.Add($"reliability-{query.MinReliabilityScore}");

        if (query.IncludeLeagues?.Any() == true)
            keyParts.Add($"leagues-{string.Join(",", query.IncludeLeagues.OrderBy(l => l))}");

        if (!query.IncludeIsolatedNodes)
            keyParts.Add("no-isolated");

        return string.Join(":", keyParts);
    }
}