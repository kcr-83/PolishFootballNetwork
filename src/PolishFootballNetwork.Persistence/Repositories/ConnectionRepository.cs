using Microsoft.EntityFrameworkCore;
using PolishFootballNetwork.Domain.Entities;
using PolishFootballNetwork.Domain.Enums;
using PolishFootballNetwork.Domain.Repositories;

namespace PolishFootballNetwork.Persistence.Repositories;

/// <summary>
/// Repository implementation for managing Connection entities using Entity Framework Core.
/// Provides data access operations for club connections with efficient querying and filtering.
/// </summary>
public class ConnectionRepository : IConnectionRepository
{
    private readonly FootballNetworkDbContext _context;

    /// <summary>
    /// Initializes a new instance of the ConnectionRepository class.
    /// </summary>
    /// <param name="context">The database context.</param>
    public ConnectionRepository(FootballNetworkDbContext context)
    {
        _context = context ?? throw new ArgumentNullException(nameof(context));
    }

    /// <summary>
    /// Gets a connection by its unique identifier.
    /// </summary>
    /// <param name="id">The unique identifier of the connection.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The connection if found; otherwise, null.</returns>
    public async Task<Connection?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return await _context.Connections
            .AsNoTracking()
            .Include(c => c.SourceClub)
            .Include(c => c.TargetClub)
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
    }

    /// <summary>
    /// Gets all connections in the system.
    /// </summary>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of all connections.</returns>
    public async Task<IEnumerable<Connection>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Connections
            .AsNoTracking()
            .Include(c => c.SourceClub)
            .Include(c => c.TargetClub)
            .OrderBy(c => c.SourceClub.Name)
            .ThenBy(c => c.TargetClub.Name)
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Gets all connections for a specific club (both as source and target).
    /// </summary>
    /// <param name="clubId">The identifier of the club.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of connections involving the specified club.</returns>
    public async Task<IEnumerable<Connection>> GetByClubIdAsync(int clubId, CancellationToken cancellationToken = default)
    {
        return await _context.Connections
            .AsNoTracking()
            .Include(c => c.SourceClub)
            .Include(c => c.TargetClub)
            .Where(c => c.SourceClubId == clubId || c.TargetClubId == clubId)
            .OrderByDescending(c => c.Strength)
            .ThenBy(c => c.SourceClub.Name)
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Gets all outgoing connections from a specific club.
    /// </summary>
    /// <param name="sourceClubId">The identifier of the source club.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of outgoing connections from the specified club.</returns>
    public async Task<IEnumerable<Connection>> GetBySourceClubIdAsync(int sourceClubId, CancellationToken cancellationToken = default)
    {
        return await _context.Connections
            .AsNoTracking()
            .Include(c => c.SourceClub)
            .Include(c => c.TargetClub)
            .Where(c => c.SourceClubId == sourceClubId)
            .OrderByDescending(c => c.Strength)
            .ThenBy(c => c.TargetClub.Name)
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Gets all incoming connections to a specific club.
    /// </summary>
    /// <param name="targetClubId">The identifier of the target club.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of incoming connections to the specified club.</returns>
    public async Task<IEnumerable<Connection>> GetByTargetClubIdAsync(int targetClubId, CancellationToken cancellationToken = default)
    {
        return await _context.Connections
            .AsNoTracking()
            .Include(c => c.SourceClub)
            .Include(c => c.TargetClub)
            .Where(c => c.TargetClubId == targetClubId)
            .OrderByDescending(c => c.Strength)
            .ThenBy(c => c.SourceClub.Name)
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Gets connections by their type.
    /// </summary>
    /// <param name="connectionType">The type of connection to filter by.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of connections of the specified type.</returns>
    public async Task<IEnumerable<Connection>> GetByTypeAsync(ConnectionType connectionType, CancellationToken cancellationToken = default)
    {
        return await _context.Connections
            .AsNoTracking()
            .Include(c => c.SourceClub)
            .Include(c => c.TargetClub)
            .Where(c => c.Type == connectionType)
            .OrderByDescending(c => c.Strength)
            .ThenBy(c => c.SourceClub.Name)
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Gets connections by their strength.
    /// </summary>
    /// <param name="strength">The strength of connection to filter by.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of connections with the specified strength.</returns>
    public async Task<IEnumerable<Connection>> GetByStrengthAsync(ConnectionStrength strength, CancellationToken cancellationToken = default)
    {
        return await _context.Connections
            .AsNoTracking()
            .Include(c => c.SourceClub)
            .Include(c => c.TargetClub)
            .Where(c => c.Strength == strength)
            .OrderBy(c => c.SourceClub.Name)
            .ThenBy(c => c.TargetClub.Name)
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Gets connections that are currently active.
    /// </summary>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of currently active connections.</returns>
    public async Task<IEnumerable<Connection>> GetActiveConnectionsAsync(CancellationToken cancellationToken = default)
    {
        var currentYear = DateTime.Now.Year;
        
        return await _context.Connections
            .AsNoTracking()
            .Include(c => c.SourceClub)
            .Include(c => c.TargetClub)
            .Where(c => c.ActivePeriod.Start <= currentYear && 
                       (c.ActivePeriod.End == null || c.ActivePeriod.End >= currentYear))
            .OrderByDescending(c => c.Strength)
            .ThenBy(c => c.SourceClub.Name)
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Gets connections that were active at a specific date.
    /// </summary>
    /// <param name="date">The date to check for active connections.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of connections that were active at the specified date.</returns>
    public async Task<IEnumerable<Connection>> GetConnectionsActiveAtAsync(DateTime date, CancellationToken cancellationToken = default)
    {
        var year = date.Year;
        
        return await _context.Connections
            .AsNoTracking()
            .Include(c => c.SourceClub)
            .Include(c => c.TargetClub)
            .Where(c => c.ActivePeriod.Start <= year && 
                       (c.ActivePeriod.End == null || c.ActivePeriod.End >= year))
            .OrderByDescending(c => c.Strength)
            .ThenBy(c => c.SourceClub.Name)
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Gets the direct connection between two specific clubs.
    /// </summary>
    /// <param name="sourceClubId">The identifier of the source club.</param>
    /// <param name="targetClubId">The identifier of the target club.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The connection between the clubs if it exists; otherwise, null.</returns>
    public async Task<Connection?> GetConnectionBetweenClubsAsync(int sourceClubId, int targetClubId, CancellationToken cancellationToken = default)
    {
        return await _context.Connections
            .AsNoTracking()
            .Include(c => c.SourceClub)
            .Include(c => c.TargetClub)
            .FirstOrDefaultAsync(c => c.SourceClubId == sourceClubId && c.TargetClubId == targetClubId, cancellationToken);
    }

    /// <summary>
    /// Gets all connections between two specific clubs (in both directions).
    /// </summary>
    /// <param name="clubId1">The identifier of the first club.</param>
    /// <param name="clubId2">The identifier of the second club.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of connections between the two clubs.</returns>
    public async Task<IEnumerable<Connection>> GetAllConnectionsBetweenClubsAsync(int clubId1, int clubId2, CancellationToken cancellationToken = default)
    {
        return await _context.Connections
            .AsNoTracking()
            .Include(c => c.SourceClub)
            .Include(c => c.TargetClub)
            .Where(c => (c.SourceClubId == clubId1 && c.TargetClubId == clubId2) ||
                       (c.SourceClubId == clubId2 && c.TargetClubId == clubId1))
            .OrderByDescending(c => c.Strength)
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Checks if a connection exists between two clubs.
    /// </summary>
    /// <param name="sourceClubId">The identifier of the source club.</param>
    /// <param name="targetClubId">The identifier of the target club.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>True if a connection exists; otherwise, false.</returns>
    public async Task<bool> ExistsAsync(int sourceClubId, int targetClubId, CancellationToken cancellationToken = default)
    {
        return await _context.Connections
            .AsNoTracking()
            .AnyAsync(c => c.SourceClubId == sourceClubId && c.TargetClubId == targetClubId, cancellationToken);
    }

    /// <summary>
    /// Gets connections with their related club entities loaded.
    /// </summary>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of connections with their related clubs.</returns>
    public async Task<IEnumerable<Connection>> GetConnectionsWithClubsAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Connections
            .AsNoTracking()
            .Include(c => c.SourceClub)
            .Include(c => c.TargetClub)
            .OrderByDescending(c => c.Strength)
            .ThenBy(c => c.SourceClub.Name)
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Gets the strongest connections for a specific club.
    /// </summary>
    /// <param name="clubId">The identifier of the club.</param>
    /// <param name="limit">The maximum number of connections to return.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of the strongest connections for the club.</returns>
    public async Task<IEnumerable<Connection>> GetStrongestConnectionsForClubAsync(int clubId, int limit, CancellationToken cancellationToken = default)
    {
        if (limit <= 0)
        {
            limit = 10;
        }

        return await _context.Connections
            .AsNoTracking()
            .Include(c => c.SourceClub)
            .Include(c => c.TargetClub)
            .Where(c => c.SourceClubId == clubId || c.TargetClubId == clubId)
            .OrderByDescending(c => c.Strength)
            .Take(limit)
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Adds a new connection to the repository.
    /// </summary>
    /// <param name="connection">The connection to add.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    public async Task AddAsync(Connection connection, CancellationToken cancellationToken = default)
    {
        if (connection == null)
        {
            throw new ArgumentNullException(nameof(connection));
        }

        await _context.Connections.AddAsync(connection, cancellationToken);
    }

    /// <summary>
    /// Updates an existing connection in the repository.
    /// </summary>
    /// <param name="connection">The connection to update.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    public async Task UpdateAsync(Connection connection, CancellationToken cancellationToken = default)
    {
        if (connection == null)
        {
            throw new ArgumentNullException(nameof(connection));
        }

        _context.Connections.Update(connection);
        await Task.CompletedTask;
    }

    /// <summary>
    /// Removes a connection from the repository.
    /// </summary>
    /// <param name="connection">The connection to remove.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    public async Task RemoveAsync(Connection connection, CancellationToken cancellationToken = default)
    {
        if (connection == null)
        {
            throw new ArgumentNullException(nameof(connection));
        }

        _context.Connections.Remove(connection);
        await Task.CompletedTask;
    }

    /// <summary>
    /// Gets the first connection found between two specific clubs (convenience method).
    /// </summary>
    /// <param name="clubId1">The identifier of the first club.</param>
    /// <param name="clubId2">The identifier of the second club.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The first connection between the clubs if it exists; otherwise, null.</returns>
    public async Task<Connection?> GetBetweenClubsAsync(int clubId1, int clubId2, CancellationToken cancellationToken = default)
    {
        return await _context.Connections
            .AsNoTracking()
            .Include(c => c.SourceClub)
            .Include(c => c.TargetClub)
            .FirstOrDefaultAsync(c => 
                (c.SourceClubId == clubId1 && c.TargetClubId == clubId2) ||
                (c.SourceClubId == clubId2 && c.TargetClubId == clubId1), 
                cancellationToken);
    }

    /// <summary>
    /// Deletes a connection from the repository by ID.
    /// </summary>
    /// <param name="id">The ID of the connection to delete.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    public async Task DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var connection = await _context.Connections.FindAsync(new object[] { id }, cancellationToken);
        if (connection != null)
        {
            _context.Connections.Remove(connection);
        }
    }

    /// <summary>
    /// Gets the total count of connections in the repository.
    /// </summary>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The total number of connections.</returns>
    public async Task<int> GetCountAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Connections.CountAsync(cancellationToken);
    }

    /// <summary>
    /// Gets a paginated list of connections.
    /// </summary>
    /// <param name="pageNumber">The page number (1-based).</param>
    /// <param name="pageSize">The number of items per page.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A paginated collection of connections.</returns>
    public async Task<IEnumerable<Connection>> GetPagedAsync(int pageNumber, int pageSize, CancellationToken cancellationToken = default)
    {
        if (pageNumber < 1)
        {
            pageNumber = 1;
        }

        if (pageSize < 1)
        {
            pageSize = 10;
        }

        return await _context.Connections
            .AsNoTracking()
            .Include(c => c.SourceClub)
            .Include(c => c.TargetClub)
            .OrderByDescending(c => c.Strength)
            .ThenBy(c => c.SourceClub.Name)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);
    }
}