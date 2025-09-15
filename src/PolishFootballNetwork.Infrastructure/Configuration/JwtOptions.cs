namespace PolishFootballNetwork.Infrastructure.Configuration;

/// <summary>
/// Configuration options for JWT authentication.
/// </summary>
public class JwtOptions
{
    /// <summary>
    /// Configuration section name in appsettings.json.
    /// </summary>
    public const string SectionName = "Jwt";

    /// <summary>
    /// Gets or sets the JWT secret key used for signing tokens.
    /// </summary>
    public string SecretKey { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the token issuer.
    /// </summary>
    public string Issuer { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the token audience.
    /// </summary>
    public string Audience { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the access token expiration time.
    /// </summary>
    public TimeSpan AccessTokenExpiration { get; set; } = TimeSpan.FromHours(1);

    /// <summary>
    /// Gets or sets the refresh token expiration time.
    /// </summary>
    public TimeSpan RefreshTokenExpiration { get; set; } = TimeSpan.FromDays(7);

    /// <summary>
    /// Gets or sets a value indicating whether to require HTTPS for JWT operations.
    /// </summary>
    public bool RequireHttps { get; set; } = true;

    /// <summary>
    /// Gets or sets a value indicating whether to save the token in the authentication properties.
    /// </summary>
    public bool SaveToken { get; set; } = true;
}