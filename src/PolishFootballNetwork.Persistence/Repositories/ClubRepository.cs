using Microsoft.EntityFrameworkCore;
using PolishFootballNetwork.Domain.Entities;
using PolishFootballNetwork.Domain.Enums;
using PolishFootballNetwork.Domain.Repositories;

namespace PolishFootballNetwork.Persistence.Repositories;

/// <summary>
/// Repository implementation for managing Club entities using Entity Framework Core.
/// Provides data access operations for football clubs with efficient querying and filtering.
/// </summary>
public class ClubRepository : IClubRepository
{
    private readonly FootballNetworkDbContext _context;

    /// <summary>
    /// Initializes a new instance of the ClubRepository class.
    /// </summary>
    /// <param name="context">The database context.</param>
    public ClubRepository(FootballNetworkDbContext context)
    {
        _context = context ?? throw new ArgumentNullException(nameof(context));
    }

    /// <summary>
    /// Gets a club by its unique identifier.
    /// </summary>
    /// <param name="id">The unique identifier of the club.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The club if found; otherwise, null.</returns>
    public async Task<Club?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return await _context.Clubs
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
    }

    /// <summary>
    /// Gets all clubs in the system.
    /// </summary>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of all clubs.</returns>
    public async Task<IEnumerable<Club>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Clubs
            .AsNoTracking()
            .OrderBy(c => c.Name)
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Gets clubs by their league type.
    /// </summary>
    /// <param name="league">The league type to filter by.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of clubs in the specified league.</returns>
    public async Task<IEnumerable<Club>> GetByLeagueAsync(LeagueType league, CancellationToken cancellationToken = default)
    {
        return await _context.Clubs
            .AsNoTracking()
            .Where(c => c.League == league)
            .OrderBy(c => c.Name)
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Gets clubs by their city.
    /// </summary>
    /// <param name="city">The city to filter by.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of clubs in the specified city.</returns>
    public async Task<IEnumerable<Club>> GetByCityAsync(string city, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(city))
        {
            return Enumerable.Empty<Club>();
        }

        return await _context.Clubs
            .AsNoTracking()
            .Where(c => EF.Functions.ILike(c.City, city))
            .OrderBy(c => c.Name)
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Searches for clubs by name (case-insensitive partial match).
    /// </summary>
    /// <param name="nameSearchTerm">The search term to match against club names.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of clubs matching the search term.</returns>
    public async Task<IEnumerable<Club>> SearchByNameAsync(string nameSearchTerm, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(nameSearchTerm))
        {
            return Enumerable.Empty<Club>();
        }

        return await _context.Clubs
            .AsNoTracking()
            .Where(c => EF.Functions.ILike(c.Name, $"%{nameSearchTerm}%"))
            .OrderBy(c => c.Name)
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Gets clubs within a specified geographic area.
    /// </summary>
    /// <param name="centerX">The X coordinate of the center point.</param>
    /// <param name="centerY">The Y coordinate of the center point.</param>
    /// <param name="radius">The radius around the center point.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of clubs within the specified area.</returns>
    public async Task<IEnumerable<Club>> GetClubsInAreaAsync(double centerX, double centerY, double radius, CancellationToken cancellationToken = default)
    {
        // Use PostgreSQL's built-in distance function for efficient spatial querying
        return await _context.Clubs
            .AsNoTracking()
            .Where(c => c.Location != null &&
                Math.Sqrt(Math.Pow(c.Location.X - centerX, 2) + Math.Pow(c.Location.Y - centerY, 2)) <= radius)
            .OrderBy(c => c.Name)
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Gets clubs with their connections loaded.
    /// </summary>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of clubs with their connections.</returns>
    public async Task<IEnumerable<Club>> GetClubsWithConnectionsAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Clubs
            .AsNoTracking()
            .Include(c => c.SourceConnections)
            .Include(c => c.TargetConnections)
            .OrderBy(c => c.Name)
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Checks if a club with the specified name already exists.
    /// </summary>
    /// <param name="name">The name to check for uniqueness.</param>
    /// <param name="excludeId">Optional ID to exclude from the check (for updates).</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>True if a club with the name exists; otherwise, false.</returns>
    public async Task<bool> ExistsWithNameAsync(string name, int? excludeId = null, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            return false;
        }

        var query = _context.Clubs.AsNoTracking()
            .Where(c => EF.Functions.ILike(c.Name, name));

        if (excludeId.HasValue)
        {
            query = query.Where(c => c.Id != excludeId.Value);
        }

        return await query.AnyAsync(cancellationToken);
    }

    /// <summary>
    /// Adds a new club to the repository.
    /// </summary>
    /// <param name="club">The club to add.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    public async Task AddAsync(Club club, CancellationToken cancellationToken = default)
    {
        if (club == null)
        {
            throw new ArgumentNullException(nameof(club));
        }

        await _context.Clubs.AddAsync(club, cancellationToken);
    }

    /// <summary>
    /// Updates an existing club in the repository.
    /// </summary>
    /// <param name="club">The club to update.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    public async Task UpdateAsync(Club club, CancellationToken cancellationToken = default)
    {
        if (club == null)
        {
            throw new ArgumentNullException(nameof(club));
        }

        _context.Clubs.Update(club);
        await Task.CompletedTask;
    }

    /// <summary>
    /// Removes a club from the repository.
    /// </summary>
    /// <param name="club">The club to remove.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    public async Task RemoveAsync(Club club, CancellationToken cancellationToken = default)
    {
        if (club == null)
        {
            throw new ArgumentNullException(nameof(club));
        }

        _context.Clubs.Remove(club);
        await Task.CompletedTask;
    }

    /// <summary>
    /// Gets a club by its exact name.
    /// </summary>
    /// <param name="name">The exact name of the club.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The club if found; otherwise, null.</returns>
    public async Task<Club?> GetByNameAsync(string name, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            return null;
        }

        return await _context.Clubs
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Name == name, cancellationToken);
    }

    /// <summary>
    /// Gets a club by its exact short name.
    /// </summary>
    /// <param name="shortName">The exact short name of the club.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The club if found; otherwise, null.</returns>
    public async Task<Club?> GetByShortNameAsync(string shortName, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(shortName))
        {
            return null;
        }

        return await _context.Clubs
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.ShortName == shortName, cancellationToken);
    }

    /// <summary>
    /// Deletes a club from the repository by ID.
    /// </summary>
    /// <param name="id">The ID of the club to delete.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    public async Task DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var club = await _context.Clubs.FindAsync(new object[] { id }, cancellationToken);
        if (club != null)
        {
            _context.Clubs.Remove(club);
        }
    }

    /// <summary>
    /// Gets the total count of clubs in the repository.
    /// </summary>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The total number of clubs.</returns>
    public async Task<int> GetCountAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Clubs.CountAsync(cancellationToken);
    }

    /// <summary>
    /// Gets a paginated list of clubs.
    /// </summary>
    /// <param name="pageNumber">The page number (1-based).</param>
    /// <param name="pageSize">The number of items per page.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A paginated collection of clubs.</returns>
    public async Task<IEnumerable<Club>> GetPagedAsync(int pageNumber, int pageSize, CancellationToken cancellationToken = default)
    {
        if (pageNumber < 1)
        {
            pageNumber = 1;
        }

        if (pageSize < 1)
        {
            pageSize = 10;
        }

        return await _context.Clubs
            .AsNoTracking()
            .OrderBy(c => c.Name)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Gets a paginated list of clubs with filtering.
    /// </summary>
    /// <param name="pageNumber">The page number (1-based).</param>
    /// <param name="pageSize">The number of items per page.</param>
    /// <param name="searchTerm">Optional search term to filter by club name.</param>
    /// <param name="league">Optional league filter.</param>
    /// <param name="city">Optional city filter.</param>
    /// <param name="isActive">Optional active status filter.</param>
    /// <param name="isVerified">Optional verified status filter.</param>
    /// <param name="isFeatured">Optional featured status filter.</param>
    /// <param name="foundedYearFrom">Optional minimum founded year filter.</param>
    /// <param name="foundedYearTo">Optional maximum founded year filter.</param>
    /// <param name="sortBy">Field to sort by.</param>
    /// <param name="sortDescending">Whether to sort in descending order.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A paginated result with clubs and total count.</returns>
    public async Task<(IEnumerable<Club> Items, int TotalCount)> GetPagedWithFilterAsync(
        int pageNumber, 
        int pageSize, 
        string? searchTerm = null,
        LeagueType? league = null,
        string? city = null,
        bool? isActive = null,
        bool? isVerified = null,
        bool? isFeatured = null,
        int? foundedYearFrom = null,
        int? foundedYearTo = null,
        string sortBy = "Name",
        bool sortDescending = false,
        CancellationToken cancellationToken = default)
    {
        if (pageNumber < 1)
        {
            pageNumber = 1;
        }

        if (pageSize < 1)
        {
            pageSize = 10;
        }

        var query = _context.Clubs.AsNoTracking().AsQueryable();

        // Apply filters
        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            query = query.Where(c => EF.Functions.ILike(c.Name, $"%{searchTerm}%"));
        }

        if (league.HasValue)
        {
            query = query.Where(c => c.League == league.Value);
        }

        if (!string.IsNullOrWhiteSpace(city))
        {
            query = query.Where(c => EF.Functions.ILike(c.City, city));
        }

        if (isActive.HasValue)
        {
            query = query.Where(c => c.IsActive == isActive.Value);
        }

        if (isVerified.HasValue)
        {
            query = query.Where(c => c.IsVerified == isVerified.Value);
        }

        if (isFeatured.HasValue)
        {
            query = query.Where(c => c.IsFeatured == isFeatured.Value);
        }

        if (foundedYearFrom.HasValue)
        {
            query = query.Where(c => c.Founded >= foundedYearFrom.Value);
        }

        if (foundedYearTo.HasValue)
        {
            query = query.Where(c => c.Founded <= foundedYearTo.Value);
        }

        // Get total count before applying pagination
        var totalCount = await query.CountAsync(cancellationToken);

        // Apply sorting
        query = ApplySorting(query, sortBy, sortDescending);

        // Apply pagination
        var items = await query
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }

    /// <summary>
    /// Applies sorting to the club query based on the specified criteria.
    /// </summary>
    /// <param name="query">The query to sort.</param>
    /// <param name="sortBy">The field to sort by.</param>
    /// <param name="sortDescending">Whether to sort in descending order.</param>
    /// <returns>The sorted query.</returns>
    private static IQueryable<Club> ApplySorting(IQueryable<Club> query, string sortBy, bool sortDescending)
    {
        return sortBy.ToLowerInvariant() switch
        {
            "name" => sortDescending ? query.OrderByDescending(c => c.Name) : query.OrderBy(c => c.Name),
            "city" => sortDescending ? query.OrderByDescending(c => c.City) : query.OrderBy(c => c.City),
            "league" => sortDescending ? query.OrderByDescending(c => c.League) : query.OrderBy(c => c.League),
            "foundedyear" => sortDescending ? query.OrderByDescending(c => c.Founded) : query.OrderBy(c => c.Founded),
            "createdat" => sortDescending ? query.OrderByDescending(c => c.CreatedAt) : query.OrderBy(c => c.CreatedAt),
            "modifiedat" => sortDescending ? query.OrderByDescending(c => c.ModifiedAt) : query.OrderBy(c => c.ModifiedAt),
            _ => sortDescending ? query.OrderByDescending(c => c.Name) : query.OrderBy(c => c.Name)
        };
    }
}