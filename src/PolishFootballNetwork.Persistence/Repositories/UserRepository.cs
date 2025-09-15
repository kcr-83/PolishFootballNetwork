using Microsoft.EntityFrameworkCore;
using PolishFootballNetwork.Domain.Entities;
using PolishFootballNetwork.Domain.Enums;
using PolishFootballNetwork.Domain.Repositories;

namespace PolishFootballNetwork.Persistence.Repositories;

/// <summary>
/// Repository implementation for managing User entities using Entity Framework Core.
/// Provides data access operations for system users with secure authentication features.
/// </summary>
public class UserRepository : IUserRepository
{
    private readonly FootballNetworkDbContext _context;

    /// <summary>
    /// Initializes a new instance of the UserRepository class.
    /// </summary>
    /// <param name="context">The database context.</param>
    public UserRepository(FootballNetworkDbContext context)
    {
        _context = context ?? throw new ArgumentNullException(nameof(context));
    }

    /// <summary>
    /// Gets a user by their unique identifier.
    /// </summary>
    /// <param name="id">The unique identifier of the user.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The user if found; otherwise, null.</returns>
    public async Task<User?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
    }

    /// <summary>
    /// Gets a user by their username.
    /// </summary>
    /// <param name="username">The username of the user.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The user if found; otherwise, null.</returns>
    public async Task<User?> GetByUsernameAsync(string username, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(username))
        {
            return null;
        }

        return await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => EF.Functions.ILike(u.Username, username), cancellationToken);
    }

    /// <summary>
    /// Gets a user by their email address.
    /// </summary>
    /// <param name="email">The email address of the user.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The user if found; otherwise, null.</returns>
    public async Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            return null;
        }

        return await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => EF.Functions.ILike(u.Email, email), cancellationToken);
    }

    /// <summary>
    /// Gets all users in the system.
    /// </summary>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of all users.</returns>
    public async Task<IEnumerable<User>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Users
            .AsNoTracking()
            .OrderBy(u => u.Username)
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Gets users by their role.
    /// </summary>
    /// <param name="role">The user role to filter by.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of users with the specified role.</returns>
    public async Task<IEnumerable<User>> GetByRoleAsync(UserRole role, CancellationToken cancellationToken = default)
    {
        return await _context.Users
            .AsNoTracking()
            .Where(u => u.Role == role)
            .OrderBy(u => u.Username)
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Gets all active users.
    /// </summary>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of active users.</returns>
    public async Task<IEnumerable<User>> GetActiveUsersAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Users
            .AsNoTracking()
            .Where(u => u.IsActive)
            .OrderBy(u => u.Username)
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Gets all inactive users.
    /// </summary>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of inactive users.</returns>
    public async Task<IEnumerable<User>> GetInactiveUsersAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Users
            .AsNoTracking()
            .Where(u => !u.IsActive)
            .OrderBy(u => u.Username)
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Gets users who have verified their email address.
    /// </summary>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of users with verified email addresses.</returns>
    public async Task<IEnumerable<User>> GetVerifiedUsersAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Users
            .AsNoTracking()
            .Where(u => u.IsEmailVerified)
            .OrderBy(u => u.Username)
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Gets users who have not verified their email address.
    /// </summary>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of users with unverified email addresses.</returns>
    public async Task<IEnumerable<User>> GetUnverifiedUsersAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Users
            .AsNoTracking()
            .Where(u => !u.IsEmailVerified)
            .OrderBy(u => u.Username)
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Searches for users by name (first name, last name, or full name).
    /// </summary>
    /// <param name="nameSearchTerm">The search term to match against user names.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of users matching the search term.</returns>
    public async Task<IEnumerable<User>> SearchByNameAsync(string nameSearchTerm, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(nameSearchTerm))
        {
            return Enumerable.Empty<User>();
        }

        return await _context.Users
            .AsNoTracking()
            .Where(u => EF.Functions.ILike(u.FirstName, $"%{nameSearchTerm}%") ||
                       EF.Functions.ILike(u.LastName, $"%{nameSearchTerm}%") ||
                       EF.Functions.ILike($"{u.FirstName} {u.LastName}", $"%{nameSearchTerm}%"))
            .OrderBy(u => u.FirstName)
            .ThenBy(u => u.LastName)
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Gets users who logged in within the specified time period.
    /// </summary>
    /// <param name="since">The start date of the time period.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of users who logged in since the specified date.</returns>
    public async Task<IEnumerable<User>> GetRecentlyActiveUsersAsync(DateTime since, CancellationToken cancellationToken = default)
    {
        return await _context.Users
            .AsNoTracking()
            .Where(u => u.LastLoginAt.HasValue && u.LastLoginAt.Value >= since)
            .OrderByDescending(u => u.LastLoginAt)
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Gets users who have not logged in since the specified date.
    /// </summary>
    /// <param name="since">The cutoff date for inactivity.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of users who have been inactive since the specified date.</returns>
    public async Task<IEnumerable<User>> GetInactiveUsersSinceAsync(DateTime since, CancellationToken cancellationToken = default)
    {
        return await _context.Users
            .AsNoTracking()
            .Where(u => !u.LastLoginAt.HasValue || u.LastLoginAt.Value < since)
            .OrderBy(u => u.LastLoginAt)
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Gets users with their uploaded files loaded.
    /// </summary>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of users with their uploaded files.</returns>
    public async Task<IEnumerable<User>> GetUsersWithFilesAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Users
            .AsNoTracking()
            .Include(u => u.UploadedFiles)
            .OrderBy(u => u.Username)
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Checks if a user with the specified username already exists.
    /// </summary>
    /// <param name="username">The username to check for uniqueness.</param>
    /// <param name="excludeId">Optional ID to exclude from the check (for updates).</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>True if a user with the username exists; otherwise, false.</returns>
    public async Task<bool> ExistsWithUsernameAsync(string username, int? excludeId = null, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(username))
        {
            return false;
        }

        var query = _context.Users.AsNoTracking()
            .Where(u => EF.Functions.ILike(u.Username, username));

        if (excludeId.HasValue)
        {
            query = query.Where(u => u.Id != excludeId.Value);
        }

        return await query.AnyAsync(cancellationToken);
    }

    /// <summary>
    /// Checks if a user with the specified email already exists.
    /// </summary>
    /// <param name="email">The email to check for uniqueness.</param>
    /// <param name="excludeId">Optional ID to exclude from the check (for updates).</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>True if a user with the email exists; otherwise, false.</returns>
    public async Task<bool> ExistsWithEmailAsync(string email, int? excludeId = null, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            return false;
        }

        var query = _context.Users.AsNoTracking()
            .Where(u => EF.Functions.ILike(u.Email, email));

        if (excludeId.HasValue)
        {
            query = query.Where(u => u.Id != excludeId.Value);
        }

        return await query.AnyAsync(cancellationToken);
    }

    /// <summary>
    /// Adds a new user to the repository.
    /// </summary>
    /// <param name="user">The user to add.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    public async Task AddAsync(User user, CancellationToken cancellationToken = default)
    {
        if (user == null)
        {
            throw new ArgumentNullException(nameof(user));
        }

        await _context.Users.AddAsync(user, cancellationToken);
    }

    /// <summary>
    /// Updates an existing user in the repository.
    /// </summary>
    /// <param name="user">The user to update.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    public async Task UpdateAsync(User user, CancellationToken cancellationToken = default)
    {
        if (user == null)
        {
            throw new ArgumentNullException(nameof(user));
        }

        _context.Users.Update(user);
        await Task.CompletedTask;
    }

    /// <summary>
    /// Removes a user from the repository.
    /// </summary>
    /// <param name="user">The user to remove.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    public async Task RemoveAsync(User user, CancellationToken cancellationToken = default)
    {
        if (user == null)
        {
            throw new ArgumentNullException(nameof(user));
        }

        _context.Users.Remove(user);
        await Task.CompletedTask;
    }

    /// <summary>
    /// Gets the total count of users in the repository.
    /// </summary>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The total number of users.</returns>
    public async Task<int> GetCountAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Users.CountAsync(cancellationToken);
    }

    /// <summary>
    /// Gets the count of users by role.
    /// </summary>
    /// <param name="role">The user role to count.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The number of users with the specified role.</returns>
    public async Task<int> GetCountByRoleAsync(UserRole role, CancellationToken cancellationToken = default)
    {
        return await _context.Users
            .Where(u => u.Role == role)
            .CountAsync(cancellationToken);
    }

    /// <summary>
    /// Gets a paginated list of users.
    /// </summary>
    /// <param name="pageNumber">The page number (1-based).</param>
    /// <param name="pageSize">The number of items per page.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A paginated collection of users.</returns>
    public async Task<IEnumerable<User>> GetPagedAsync(int pageNumber, int pageSize, CancellationToken cancellationToken = default)
    {
        if (pageNumber < 1)
        {
            pageNumber = 1;
        }

        if (pageSize < 1)
        {
            pageSize = 10;
        }

        return await _context.Users
            .AsNoTracking()
            .OrderBy(u => u.Username)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);
    }
}