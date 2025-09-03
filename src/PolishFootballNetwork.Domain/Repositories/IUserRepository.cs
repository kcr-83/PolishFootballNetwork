using PolishFootballNetwork.Domain.Entities;
using PolishFootballNetwork.Domain.Enums;

namespace PolishFootballNetwork.Domain.Repositories;

/// <summary>
/// Repository interface for managing User entities.
/// Defines the contract for data access operations related to system users.
/// </summary>
public interface IUserRepository
{
    /// <summary>
    /// Gets a user by their unique identifier.
    /// </summary>
    /// <param name="id">The unique identifier of the user.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The user if found; otherwise, null.</returns>
    Task<User?> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets a user by their username.
    /// </summary>
    /// <param name="username">The username of the user.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The user if found; otherwise, null.</returns>
    Task<User?> GetByUsernameAsync(string username, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets a user by their email address.
    /// </summary>
    /// <param name="email">The email address of the user.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The user if found; otherwise, null.</returns>
    Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets all users in the system.
    /// </summary>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of all users.</returns>
    Task<IEnumerable<User>> GetAllAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets users by their role.
    /// </summary>
    /// <param name="role">The user role to filter by.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of users with the specified role.</returns>
    Task<IEnumerable<User>> GetByRoleAsync(UserRole role, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets all active users.
    /// </summary>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of active users.</returns>
    Task<IEnumerable<User>> GetActiveUsersAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets all inactive users.
    /// </summary>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of inactive users.</returns>
    Task<IEnumerable<User>> GetInactiveUsersAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets users who have verified their email address.
    /// </summary>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of users with verified email addresses.</returns>
    Task<IEnumerable<User>> GetVerifiedUsersAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets users who have not verified their email address.
    /// </summary>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of users with unverified email addresses.</returns>
    Task<IEnumerable<User>> GetUnverifiedUsersAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Searches for users by name (first name, last name, or full name).
    /// </summary>
    /// <param name="nameSearchTerm">The search term to match against user names.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of users matching the search term.</returns>
    Task<IEnumerable<User>> SearchByNameAsync(string nameSearchTerm, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets users who logged in within the specified time period.
    /// </summary>
    /// <param name="since">The start date of the time period.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of users who logged in since the specified date.</returns>
    Task<IEnumerable<User>> GetRecentlyActiveUsersAsync(DateTime since, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets users who have not logged in since the specified date.
    /// </summary>
    /// <param name="since">The cutoff date for inactivity.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of users who have been inactive since the specified date.</returns>
    Task<IEnumerable<User>> GetInactiveUsersSinceAsync(DateTime since, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets users with their uploaded files loaded.
    /// </summary>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of users with their uploaded files.</returns>
    Task<IEnumerable<User>> GetUsersWithFilesAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Checks if a user with the specified username already exists.
    /// </summary>
    /// <param name="username">The username to check for uniqueness.</param>
    /// <param name="excludeId">Optional ID to exclude from the check (for updates).</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>True if a user with the username exists; otherwise, false.</returns>
    Task<bool> ExistsWithUsernameAsync(string username, int? excludeId = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Checks if a user with the specified email already exists.
    /// </summary>
    /// <param name="email">The email to check for uniqueness.</param>
    /// <param name="excludeId">Optional ID to exclude from the check (for updates).</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>True if a user with the email exists; otherwise, false.</returns>
    Task<bool> ExistsWithEmailAsync(string email, int? excludeId = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Adds a new user to the repository.
    /// </summary>
    /// <param name="user">The user to add.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    Task AddAsync(User user, CancellationToken cancellationToken = default);

    /// <summary>
    /// Updates an existing user in the repository.
    /// </summary>
    /// <param name="user">The user to update.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    Task UpdateAsync(User user, CancellationToken cancellationToken = default);

    /// <summary>
    /// Removes a user from the repository.
    /// </summary>
    /// <param name="user">The user to remove.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    Task RemoveAsync(User user, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the total count of users in the repository.
    /// </summary>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The total number of users.</returns>
    Task<int> GetCountAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the count of users by role.
    /// </summary>
    /// <param name="role">The user role to count.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The number of users with the specified role.</returns>
    Task<int> GetCountByRoleAsync(UserRole role, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets a paginated list of users.
    /// </summary>
    /// <param name="pageNumber">The page number (1-based).</param>
    /// <param name="pageSize">The number of items per page.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A paginated collection of users.</returns>
    Task<IEnumerable<User>> GetPagedAsync(int pageNumber, int pageSize, CancellationToken cancellationToken = default);
}
