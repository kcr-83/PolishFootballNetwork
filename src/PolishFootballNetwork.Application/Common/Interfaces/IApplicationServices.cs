using PolishFootballNetwork.Application.Common.Models;
using PolishFootballNetwork.Domain.Entities;

namespace PolishFootballNetwork.Application.Common.Interfaces;

/// <summary>
/// Service for file operations.
/// </summary>
public interface IFileService
{
    /// <summary>
    /// Uploads a file to the storage system.
    /// </summary>
    /// <param name="filePath">The relative path where the file should be stored.</param>
    /// <param name="content">The file content as a byte array.</param>
    /// <param name="contentType">The MIME type of the file.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The file upload result.</returns>
    Task<FileUploadResult> UploadFileAsync(string filePath, byte[] content, string contentType, CancellationToken cancellationToken = default);

    /// <summary>
    /// Deletes a file from the storage system.
    /// </summary>
    /// <param name="fileUrl">The URL or path of the file to delete.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>A task representing the delete operation.</returns>
    Task DeleteFileAsync(string fileUrl, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the file information.
    /// </summary>
    /// <param name="fileUrl">The URL or path of the file.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The file information or null if not found.</returns>
    Task<Models.FileInfo?> GetFileInfoAsync(string fileUrl, CancellationToken cancellationToken = default);

    /// <summary>
    /// Validates if the file type is allowed.
    /// </summary>
    /// <param name="fileName">The file name.</param>
    /// <param name="contentType">The MIME type.</param>
    /// <param name="allowedTypes">The allowed file types.</param>
    /// <returns>True if the file type is allowed.</returns>
    bool IsFileTypeAllowed(string fileName, string contentType, IReadOnlyList<string> allowedTypes);

    /// <summary>
    /// Gets the file size limit for a specific file type.
    /// </summary>
    /// <param name="fileType">The file type category.</param>
    /// <returns>The maximum file size in bytes.</returns>
    long GetMaxFileSize(FileType fileType);
}

/// <summary>
/// Service for authentication operations.
/// </summary>
public interface IAuthenticationService
{
    /// <summary>
    /// Generates a JWT token for the specified user.
    /// </summary>
    /// <param name="user">The user to generate the token for.</param>
    /// <returns>The generated token.</returns>
    Task<JwtToken> GenerateTokenAsync(User user);

    /// <summary>
    /// Verifies a password against a hash.
    /// </summary>
    /// <param name="password">The plain text password.</param>
    /// <param name="passwordHash">The hashed password.</param>
    /// <returns>True if the password is valid.</returns>
    Task<bool> VerifyPasswordAsync(string password, string passwordHash);

    /// <summary>
    /// Hashes a password.
    /// </summary>
    /// <param name="password">The plain text password.</param>
    /// <returns>The hashed password.</returns>
    Task<string> HashPasswordAsync(string password);

    /// <summary>
    /// Validates a JWT token.
    /// </summary>
    /// <param name="token">The JWT token to validate.</param>
    /// <returns>The token validation result.</returns>
    Task<TokenValidationResult> ValidateTokenAsync(string token);

    /// <summary>
    /// Refreshes a JWT token.
    /// </summary>
    /// <param name="refreshToken">The refresh token.</param>
    /// <returns>The new JWT token.</returns>
    Task<JwtToken> RefreshTokenAsync(string refreshToken);
}

/// <summary>
/// Service for caching operations.
/// </summary>
public interface ICacheService
{
    /// <summary>
    /// Gets a value from the cache.
    /// </summary>
    /// <typeparam name="T">The type of the cached value.</typeparam>
    /// <param name="key">The cache key.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The cached value or default if not found.</returns>
    Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default);

    /// <summary>
    /// Sets a value in the cache.
    /// </summary>
    /// <typeparam name="T">The type of the value to cache.</typeparam>
    /// <param name="key">The cache key.</param>
    /// <param name="value">The value to cache.</param>
    /// <param name="expiration">The cache expiration time.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>A task representing the set operation.</returns>
    Task SetAsync<T>(string key, T value, TimeSpan? expiration = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Removes a value from the cache.
    /// </summary>
    /// <param name="key">The cache key.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>A task representing the remove operation.</returns>
    Task RemoveAsync(string key, CancellationToken cancellationToken = default);

    /// <summary>
    /// Removes all values with keys matching the pattern.
    /// </summary>
    /// <param name="pattern">The pattern to match cache keys.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>A task representing the remove operation.</returns>
    Task RemoveByPatternAsync(string pattern, CancellationToken cancellationToken = default);

    /// <summary>
    /// Checks if a key exists in the cache.
    /// </summary>
    /// <param name="key">The cache key.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>True if the key exists.</returns>
    Task<bool> ExistsAsync(string key, CancellationToken cancellationToken = default);
}
