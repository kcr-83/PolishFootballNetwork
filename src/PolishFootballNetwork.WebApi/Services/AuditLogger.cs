namespace PolishFootballNetwork.WebApi.Services;

/// <summary>
/// Service for audit logging of security events.
/// </summary>
public interface IAuditLogger
{
    /// <summary>
    /// Logs a successful login event.
    /// </summary>
    /// <param name="userId">User ID.</param>
    /// <param name="email">User email.</param>
    /// <param name="ipAddress">Client IP address.</param>
    /// <param name="userAgent">User agent.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    Task LogSuccessfulLoginAsync(int userId, string email, string ipAddress, string? userAgent);

    /// <summary>
    /// Logs a failed login attempt.
    /// </summary>
    /// <param name="email">Attempted email.</param>
    /// <param name="ipAddress">Client IP address.</param>
    /// <param name="userAgent">User agent.</param>
    /// <param name="reason">Failure reason.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    Task LogFailedLoginAsync(string email, string ipAddress, string? userAgent, string reason);

    /// <summary>
    /// Logs a token refresh event.
    /// </summary>
    /// <param name="userId">User ID.</param>
    /// <param name="ipAddress">Client IP address.</param>
    /// <param name="userAgent">User agent.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    Task LogTokenRefreshAsync(int userId, string ipAddress, string? userAgent);

    /// <summary>
    /// Logs a logout event.
    /// </summary>
    /// <param name="userId">User ID.</param>
    /// <param name="ipAddress">Client IP address.</param>
    /// <param name="userAgent">User agent.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    Task LogLogoutAsync(int userId, string ipAddress, string? userAgent);

    /// <summary>
    /// Logs a suspicious activity event.
    /// </summary>
    /// <param name="description">Description of the suspicious activity.</param>
    /// <param name="ipAddress">Client IP address.</param>
    /// <param name="userAgent">User agent.</param>
    /// <param name="additionalData">Additional data.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    Task LogSuspiciousActivityAsync(string description, string ipAddress, string? userAgent, object? additionalData = null);
}

/// <summary>
/// Implementation of audit logging service.
/// </summary>
public class AuditLogger : IAuditLogger
{
    private readonly ILogger<AuditLogger> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="AuditLogger"/> class.
    /// </summary>
    /// <param name="logger">Logger instance.</param>
    public AuditLogger(ILogger<AuditLogger> logger)
    {
        _logger = logger;
    }

    /// <inheritdoc/>
    public Task LogSuccessfulLoginAsync(int userId, string email, string ipAddress, string? userAgent)
    {
        _logger.LogInformation("AUDIT: Successful login - UserId: {UserId}, Email: {Email}, IP: {IPAddress}, UserAgent: {UserAgent}",
            userId, email, ipAddress, userAgent);
        return Task.CompletedTask;
    }

    /// <inheritdoc/>
    public Task LogFailedLoginAsync(string email, string ipAddress, string? userAgent, string reason)
    {
        _logger.LogWarning("AUDIT: Failed login - Email: {Email}, IP: {IPAddress}, UserAgent: {UserAgent}, Reason: {Reason}",
            email, ipAddress, userAgent, reason);
        return Task.CompletedTask;
    }

    /// <inheritdoc/>
    public Task LogTokenRefreshAsync(int userId, string ipAddress, string? userAgent)
    {
        _logger.LogInformation("AUDIT: Token refresh - UserId: {UserId}, IP: {IPAddress}, UserAgent: {UserAgent}",
            userId, ipAddress, userAgent);
        return Task.CompletedTask;
    }

    /// <inheritdoc/>
    public Task LogLogoutAsync(int userId, string ipAddress, string? userAgent)
    {
        _logger.LogInformation("AUDIT: Logout - UserId: {UserId}, IP: {IPAddress}, UserAgent: {UserAgent}",
            userId, ipAddress, userAgent);
        return Task.CompletedTask;
    }

    /// <inheritdoc/>
    public Task LogSuspiciousActivityAsync(string description, string ipAddress, string? userAgent, object? additionalData = null)
    {
        _logger.LogWarning("AUDIT: Suspicious activity - Description: {Description}, IP: {IPAddress}, UserAgent: {UserAgent}, Data: {AdditionalData}",
            description, ipAddress, userAgent, additionalData);
        return Task.CompletedTask;
    }
}