using PolishFootballNetwork.Domain.Entities;
using PolishFootballNetwork.Domain.Enums;

namespace PolishFootballNetwork.Domain.Repositories;

/// <summary>
/// Repository interface for managing Club entities.
/// Defines the contract for data access operations related to football clubs.
/// </summary>
public interface IClubRepository
{
    /// <summary>
    /// Gets a club by its unique identifier.
    /// </summary>
    /// <param name="id">The unique identifier of the club.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The club if found; otherwise, null.</returns>
    Task<Club?> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets all clubs in the system.
    /// </summary>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of all clubs.</returns>
    Task<IEnumerable<Club>> GetAllAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets clubs by their league type.
    /// </summary>
    /// <param name="league">The league type to filter by.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of clubs in the specified league.</returns>
    Task<IEnumerable<Club>> GetByLeagueAsync(Enums.LeagueType league, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets clubs by their city.
    /// </summary>
    /// <param name="city">The city to filter by.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of clubs in the specified city.</returns>
    Task<IEnumerable<Club>> GetByCityAsync(string city, CancellationToken cancellationToken = default);

    /// <summary>
    /// Searches for clubs by name (case-insensitive partial match).
    /// </summary>
    /// <param name="nameSearchTerm">The search term to match against club names.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of clubs matching the search term.</returns>
    Task<IEnumerable<Club>> SearchByNameAsync(string nameSearchTerm, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets clubs within a specified geographic area.
    /// </summary>
    /// <param name="centerX">The X coordinate of the center point.</param>
    /// <param name="centerY">The Y coordinate of the center point.</param>
    /// <param name="radius">The radius around the center point.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of clubs within the specified area.</returns>
    Task<IEnumerable<Club>> GetClubsInAreaAsync(double centerX, double centerY, double radius, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets clubs with their connections loaded.
    /// </summary>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of clubs with their connections.</returns>
    Task<IEnumerable<Club>> GetClubsWithConnectionsAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Checks if a club with the specified name already exists.
    /// </summary>
    /// <param name="name">The name to check for uniqueness.</param>
    /// <param name="excludeId">Optional ID to exclude from the check (for updates).</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>True if a club with the name exists; otherwise, false.</returns>
    Task<bool> ExistsWithNameAsync(string name, int? excludeId = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Adds a new club to the repository.
    /// </summary>
    /// <param name="club">The club to add.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    Task AddAsync(Club club, CancellationToken cancellationToken = default);

    /// <summary>
    /// Updates an existing club in the repository.
    /// </summary>
    /// <param name="club">The club to update.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    Task UpdateAsync(Club club, CancellationToken cancellationToken = default);

    /// <summary>
    /// Removes a club from the repository.
    /// </summary>
    /// <param name="club">The club to remove.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    Task RemoveAsync(Club club, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the total count of clubs in the repository.
    /// </summary>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The total number of clubs.</returns>
    Task<int> GetCountAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets a paginated list of clubs.
    /// </summary>
    /// <param name="pageNumber">The page number (1-based).</param>
    /// <param name="pageSize">The number of items per page.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A paginated collection of clubs.</returns>
    Task<IEnumerable<Club>> GetPagedAsync(int pageNumber, int pageSize, CancellationToken cancellationToken = default);

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
    Task<(IEnumerable<Club> Items, int TotalCount)> GetPagedWithFilterAsync(
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
        CancellationToken cancellationToken = default);
}
