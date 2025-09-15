using PolishFootballNetwork.Domain.Entities;
using PolishFootballNetwork.Domain.Enums;

namespace PolishFootballNetwork.Domain.Repositories;

/// <summary>
/// Repository interface for managing Connection entities.
/// Defines the contract for data access operations related to club connections.
/// </summary>
public interface IConnectionRepository
{
    /// <summary>
    /// Gets a connection by its unique identifier.
    /// </summary>
    /// <param name="id">The unique identifier of the connection.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The connection if found; otherwise, null.</returns>
    Task<Connection?> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets all connections in the system.
    /// </summary>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of all connections.</returns>
    Task<IEnumerable<Connection>> GetAllAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets all connections for a specific club (both as source and target).
    /// </summary>
    /// <param name="clubId">The identifier of the club.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of connections involving the specified club.</returns>
    Task<IEnumerable<Connection>> GetByClubIdAsync(int clubId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets all outgoing connections from a specific club.
    /// </summary>
    /// <param name="sourceClubId">The identifier of the source club.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of outgoing connections from the specified club.</returns>
    Task<IEnumerable<Connection>> GetBySourceClubIdAsync(int sourceClubId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets all incoming connections to a specific club.
    /// </summary>
    /// <param name="targetClubId">The identifier of the target club.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of incoming connections to the specified club.</returns>
    Task<IEnumerable<Connection>> GetByTargetClubIdAsync(int targetClubId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets connections by their type.
    /// </summary>
    /// <param name="connectionType">The type of connection to filter by.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of connections of the specified type.</returns>
    Task<IEnumerable<Connection>> GetByTypeAsync(ConnectionType connectionType, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets connections by their strength.
    /// </summary>
    /// <param name="strength">The strength of connection to filter by.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of connections with the specified strength.</returns>
    Task<IEnumerable<Connection>> GetByStrengthAsync(ConnectionStrength strength, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets connections that are currently active.
    /// </summary>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of currently active connections.</returns>
    Task<IEnumerable<Connection>> GetActiveConnectionsAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets connections that were active at a specific date.
    /// </summary>
    /// <param name="date">The date to check for active connections.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of connections that were active at the specified date.</returns>
    Task<IEnumerable<Connection>> GetConnectionsActiveAtAsync(DateTime date, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the direct connection between two specific clubs.
    /// </summary>
    /// <param name="sourceClubId">The identifier of the source club.</param>
    /// <param name="targetClubId">The identifier of the target club.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The connection between the clubs if it exists; otherwise, null.</returns>
    Task<Connection?> GetConnectionBetweenClubsAsync(int sourceClubId, int targetClubId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets all connections between two specific clubs (in both directions).
    /// </summary>
    /// <param name="clubId1">The identifier of the first club.</param>
    /// <param name="clubId2">The identifier of the second club.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of connections between the two clubs.</returns>
    Task<IEnumerable<Connection>> GetAllConnectionsBetweenClubsAsync(int clubId1, int clubId2, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the first connection found between two specific clubs (convenience method).
    /// </summary>
    /// <param name="clubId1">The identifier of the first club.</param>
    /// <param name="clubId2">The identifier of the second club.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The first connection between the clubs if it exists; otherwise, null.</returns>
    Task<Connection?> GetBetweenClubsAsync(int clubId1, int clubId2, CancellationToken cancellationToken = default);

    /// <summary>
    /// Checks if a connection exists between two clubs.
    /// </summary>
    /// <param name="sourceClubId">The identifier of the source club.</param>
    /// <param name="targetClubId">The identifier of the target club.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>True if a connection exists; otherwise, false.</returns>
    Task<bool> ExistsAsync(int sourceClubId, int targetClubId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets connections with their related club entities loaded.
    /// </summary>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of connections with their related clubs.</returns>
    Task<IEnumerable<Connection>> GetConnectionsWithClubsAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the strongest connections for a specific club.
    /// </summary>
    /// <param name="clubId">The identifier of the club.</param>
    /// <param name="limit">The maximum number of connections to return.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of the strongest connections for the club.</returns>
    Task<IEnumerable<Connection>> GetStrongestConnectionsForClubAsync(int clubId, int limit, CancellationToken cancellationToken = default);

    /// <summary>
    /// Adds a new connection to the repository.
    /// </summary>
    /// <param name="connection">The connection to add.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    Task AddAsync(Connection connection, CancellationToken cancellationToken = default);

    /// <summary>
    /// Updates an existing connection in the repository.
    /// </summary>
    /// <param name="connection">The connection to update.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    Task UpdateAsync(Connection connection, CancellationToken cancellationToken = default);

    /// <summary>
    /// Removes a connection from the repository.
    /// </summary>
    /// <param name="connection">The connection to remove.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    Task RemoveAsync(Connection connection, CancellationToken cancellationToken = default);

    /// <summary>
    /// Deletes a connection from the repository by ID.
    /// </summary>
    /// <param name="id">The ID of the connection to delete.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    Task DeleteAsync(int id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the total count of connections in the repository.
    /// </summary>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The total number of connections.</returns>
    Task<int> GetCountAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets a paginated list of connections.
    /// </summary>
    /// <param name="pageNumber">The page number (1-based).</param>
    /// <param name="pageSize">The number of items per page.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A paginated collection of connections.</returns>
    Task<IEnumerable<Connection>> GetPagedAsync(int pageNumber, int pageSize, CancellationToken cancellationToken = default);
}
