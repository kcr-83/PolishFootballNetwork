using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using PolishFootballNetwork.Application.Common.Interfaces;
using PolishFootballNetwork.Application.Common.Models;
using PolishFootballNetwork.Domain.Entities;
using PolishFootballNetwork.Infrastructure.Configuration;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace PolishFootballNetwork.Infrastructure.Services;

/// <summary>
/// Authentication service that handles JWT token operations and password management.
/// </summary>
public class AuthenticationService : IAuthenticationService
{
    private readonly JwtOptions jwtOptions;
    private readonly ILogger<AuthenticationService> logger;
    private readonly TokenValidationParameters tokenValidationParameters;

    /// <summary>
    /// Initializes a new instance of the <see cref="AuthenticationService"/> class.
    /// </summary>
    /// <param name="jwtOptions">JWT configuration options.</param>
    /// <param name="logger">Logger instance.</param>
    public AuthenticationService(IOptions<JwtOptions> jwtOptions, ILogger<AuthenticationService> logger)
    {
        this.jwtOptions = jwtOptions.Value;
        this.logger = logger;

        this.tokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = this.jwtOptions.Issuer,
            ValidateAudience = true,
            ValidAudience = this.jwtOptions.Audience,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(this.jwtOptions.SecretKey)),
            ClockSkew = TimeSpan.Zero
        };
    }

    /// <summary>
    /// Generates a JWT token for the specified user.
    /// </summary>
    /// <param name="user">The user to generate the token for.</param>
    /// <returns>The generated token.</returns>
    public async Task<JwtToken> GenerateTokenAsync(User user)
    {
        await Task.CompletedTask; // Make async for future extensibility

        ArgumentNullException.ThrowIfNull(user);

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(this.jwtOptions.SecretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Name, user.Username),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new(JwtRegisteredClaimNames.Iat, 
                new DateTimeOffset(DateTime.UtcNow).ToUnixTimeSeconds().ToString(), 
                ClaimValueTypes.Integer64)
        };

        // Add role claims if user has roles
        if (!string.IsNullOrEmpty(user.Role))
        {
            claims.Add(new Claim(ClaimTypes.Role, user.Role));
        }

        var expiresAt = DateTime.UtcNow.Add(this.jwtOptions.AccessTokenExpiration);
        
        var token = new JwtSecurityToken(
            issuer: this.jwtOptions.Issuer,
            audience: this.jwtOptions.Audience,
            claims: claims,
            expires: expiresAt,
            signingCredentials: credentials);

        var tokenValue = new JwtSecurityTokenHandler().WriteToken(token);
        var refreshToken = this.GenerateRefreshToken();

        this.logger.LogInformation("JWT token generated for user: {UserId}", user.Id);

        return new JwtToken
        {
            Value = tokenValue,
            ExpiresAt = expiresAt,
            RefreshToken = refreshToken,
            TokenType = "Bearer"
        };
    }

    /// <summary>
    /// Verifies a password against a hash.
    /// </summary>
    /// <param name="password">The plain text password.</param>
    /// <param name="passwordHash">The hashed password.</param>
    /// <returns>True if the password is valid.</returns>
    public async Task<bool> VerifyPasswordAsync(string password, string passwordHash)
    {
        await Task.CompletedTask; // Make async for future extensibility

        ArgumentException.ThrowIfNullOrWhiteSpace(password);
        ArgumentException.ThrowIfNullOrWhiteSpace(passwordHash);

        try
        {
            return BCrypt.Net.BCrypt.Verify(password, passwordHash);
        }
        catch (Exception ex)
        {
            this.logger.LogError(ex, "Error verifying password");
            return false;
        }
    }

    /// <summary>
    /// Hashes a password.
    /// </summary>
    /// <param name="password">The plain text password.</param>
    /// <returns>The hashed password.</returns>
    public async Task<string> HashPasswordAsync(string password)
    {
        await Task.CompletedTask; // Make async for future extensibility

        ArgumentException.ThrowIfNullOrWhiteSpace(password);

        try
        {
            return BCrypt.Net.BCrypt.HashPassword(password, BCrypt.Net.BCrypt.GenerateSalt(12));
        }
        catch (Exception ex)
        {
            this.logger.LogError(ex, "Error hashing password");
            throw;
        }
    }

    /// <summary>
    /// Validates a JWT token.
    /// </summary>
    /// <param name="token">The JWT token to validate.</param>
    /// <returns>The token validation result.</returns>
    public async Task<TokenValidationResult> ValidateTokenAsync(string token)
    {
        await Task.CompletedTask; // Make async for future extensibility

        ArgumentException.ThrowIfNullOrWhiteSpace(token);

        try
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            
            var principal = tokenHandler.ValidateToken(token, this.tokenValidationParameters, out var validatedToken);

            if (validatedToken is not JwtSecurityToken jwtToken)
            {
                return TokenValidationResult.Failure("Invalid token format");
            }

            var userIdClaim = principal.FindFirst(ClaimTypes.NameIdentifier);
            var emailClaim = principal.FindFirst(ClaimTypes.Email);
            var roleClaims = principal.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList();

            if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
            {
                return TokenValidationResult.Failure("Invalid user ID in token");
            }

            var email = emailClaim?.Value ?? string.Empty;
            var expiresAt = jwtToken.ValidTo;

            this.logger.LogDebug("Token validated successfully for user: {UserId}", userId);

            return TokenValidationResult.Success(userId, email, roleClaims, expiresAt);
        }
        catch (SecurityTokenExpiredException)
        {
            this.logger.LogWarning("Token validation failed: Token expired");
            return TokenValidationResult.Failure("Token expired");
        }
        catch (SecurityTokenInvalidSignatureException)
        {
            this.logger.LogWarning("Token validation failed: Invalid signature");
            return TokenValidationResult.Failure("Invalid token signature");
        }
        catch (SecurityTokenException ex)
        {
            this.logger.LogWarning(ex, "Token validation failed: {Message}", ex.Message);
            return TokenValidationResult.Failure($"Token validation failed: {ex.Message}");
        }
        catch (Exception ex)
        {
            this.logger.LogError(ex, "Unexpected error during token validation");
            return TokenValidationResult.Failure("Token validation failed");
        }
    }

    /// <summary>
    /// Refreshes a JWT token.
    /// </summary>
    /// <param name="refreshToken">The refresh token.</param>
    /// <returns>The new JWT token.</returns>
    public async Task<JwtToken> RefreshTokenAsync(string refreshToken)
    {
        await Task.CompletedTask; // Make async for future extensibility

        ArgumentException.ThrowIfNullOrWhiteSpace(refreshToken);

        // NOTE: In a real implementation, you would:
        // 1. Validate the refresh token against stored refresh tokens in the database
        // 2. Check if the refresh token is not expired or revoked
        // 3. Get the associated user from the refresh token
        // 4. Generate a new access token for that user

        // For now, throwing NotImplementedException as this requires database integration
        // which should be implemented when integrating with the user repository
        throw new NotImplementedException(
            "Refresh token functionality requires database integration to validate and store refresh tokens. " +
            "This should be implemented when integrating with the user repository and refresh token storage.");
    }

    private string GenerateRefreshToken()
    {
        var randomBytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        return Convert.ToBase64String(randomBytes);
    }
}