namespace PolishFootballNetwork.Application.Features.Authentication.Queries.ValidateToken;

using PolishFootballNetwork.Application.Features.Authentication.Commands.AuthenticateUser;

/// <summary>
/// DTO for token validation result.
/// </summary>
public class TokenValidationResultDto
{
    /// <summary>
    /// Gets or sets a value indicating whether the token is valid.
    /// </summary>
    public bool IsValid { get; set; }

    /// <summary>
    /// Gets or sets the token expiration time.
    /// </summary>
    public DateTime? ExpiresAt { get; set; }

    /// <summary>
    /// Gets or sets the time remaining until token expiration.
    /// </summary>
    public TimeSpan? TimeUntilExpiration { get; set; }

    /// <summary>
    /// Gets or sets the user information if token is valid and user details are requested.
    /// </summary>
    public UserDto? User { get; set; }

    /// <summary>
    /// Gets or sets the validation error message if token is invalid.
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// Gets or sets the token type (e.g., Bearer).
    /// </summary>
    public string TokenType { get; set; } = "Bearer";

    /// <summary>
    /// Creates a successful token validation result.
    /// </summary>
    /// <param name="expiresAt">The token expiration time.</param>
    /// <param name="user">The user information.</param>
    /// <returns>A successful validation result.</returns>
    public static TokenValidationResultDto Success(DateTime expiresAt, UserDto? user = null)
    {
        return new TokenValidationResultDto
        {
            IsValid = true,
            ExpiresAt = expiresAt,
            TimeUntilExpiration = expiresAt - DateTime.UtcNow,
            User = user,
            TokenType = "Bearer"
        };
    }

    /// <summary>
    /// Creates a failed token validation result.
    /// </summary>
    /// <param name="errorMessage">The validation error message.</param>
    /// <returns>A failed validation result.</returns>
    public static TokenValidationResultDto Failure(string errorMessage)
    {
        return new TokenValidationResultDto
        {
            IsValid = false,
            ErrorMessage = errorMessage,
            TokenType = "Bearer"
        };
    }

    /// <summary>
    /// Gets a value indicating whether the token is expired.
    /// </summary>
    public bool IsExpired => this.ExpiresAt.HasValue && this.ExpiresAt.Value <= DateTime.UtcNow;

    /// <summary>
    /// Gets a value indicating whether the token will expire soon (within 5 minutes).
    /// </summary>
    public bool IsExpiringSoon => this.TimeUntilExpiration.HasValue && this.TimeUntilExpiration.Value <= TimeSpan.FromMinutes(5);
}