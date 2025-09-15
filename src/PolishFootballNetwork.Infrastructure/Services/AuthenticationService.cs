using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using PolishFootballNetwork.Application.Common.Interfaces;
using PolishFootballNetwork.Application.Common.Models;
using PolishFootballNetwork.Domain.Entities;
using PolishFootballNetwork.Domain.Repositories;
using PolishFootballNetwork.Infrastructure.Configuration;
using System.Collections.Concurrent;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace PolishFootballNetwork.Infrastructure.Services;

/// <summary>
/// Represents refresh token information stored in memory.
/// </summary>
internal class RefreshTokenInfo
{
    public int UserId { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool IsRevoked { get; set; }
}

/// <summary>
/// Authentication service that handles JWT token operations and password management.
/// </summary>
public class AuthenticationService : IAuthenticationService
{
    private readonly JwtOptions jwtOptions;
    private readonly ILogger<AuthenticationService> logger;
    private readonly IUserRepository userRepository;
    private readonly TokenValidationParameters tokenValidationParameters;
    private static readonly ConcurrentDictionary<string, RefreshTokenInfo> RefreshTokens = new();

    /// <summary>
    /// Initializes a new instance of the <see cref="AuthenticationService"/> class.
    /// </summary>
    /// <param name="jwtOptions">JWT configuration options.</param>
    /// <param name="logger">Logger instance.</param>
    /// <param name="userRepository">User repository for refresh token validation.</param>
    public AuthenticationService(
        IOptions<JwtOptions> jwtOptions,
        ILogger<AuthenticationService> logger,
        IUserRepository userRepository)
    {
        this.jwtOptions = jwtOptions.Value;
        this.logger = logger;
        this.userRepository = userRepository;

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
        claims.Add(new Claim(ClaimTypes.Role, user.Role.ToString()));

        var expiresAt = DateTime.UtcNow.Add(this.jwtOptions.AccessTokenExpiration);
        
        var token = new JwtSecurityToken(
            issuer: this.jwtOptions.Issuer,
            audience: this.jwtOptions.Audience,
            claims: claims,
            expires: expiresAt,
            signingCredentials: credentials);

        var tokenValue = new JwtSecurityTokenHandler().WriteToken(token);
        var refreshToken = GenerateRefreshToken();

        // Store refresh token with expiration
        RefreshTokens[refreshToken] = new RefreshTokenInfo
        {
            UserId = user.Id,
            ExpiresAt = DateTime.UtcNow.Add(this.jwtOptions.RefreshTokenExpiration),
            CreatedAt = DateTime.UtcNow,
            IsRevoked = false
        };

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
    public async Task<Application.Common.Models.TokenValidationResult> ValidateTokenAsync(string token)
    {
        await Task.CompletedTask; // Make async for future extensibility

        ArgumentException.ThrowIfNullOrWhiteSpace(token);

        try
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            
            var principal = tokenHandler.ValidateToken(token, this.tokenValidationParameters, out var validatedToken);

            if (validatedToken is not JwtSecurityToken jwtToken)
            {
                return Application.Common.Models.TokenValidationResult.Failure("Invalid token format");
            }

            var userIdClaim = principal.FindFirst(ClaimTypes.NameIdentifier);
            var emailClaim = principal.FindFirst(ClaimTypes.Email);
            var roleClaims = principal.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList();

            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var userId))
            {
                return Application.Common.Models.TokenValidationResult.Failure("Invalid user ID in token");
            }

            var email = emailClaim?.Value ?? string.Empty;
            var expiresAt = jwtToken.ValidTo;

            this.logger.LogDebug("Token validated successfully for user: {UserId}", userId);

            return Application.Common.Models.TokenValidationResult.Success(userId, email, roleClaims, expiresAt);
        }
        catch (SecurityTokenExpiredException)
        {
            this.logger.LogWarning("Token validation failed: Token expired");
            return Application.Common.Models.TokenValidationResult.Failure("Token expired");
        }
        catch (SecurityTokenInvalidSignatureException)
        {
            this.logger.LogWarning("Token validation failed: Invalid signature");
            return Application.Common.Models.TokenValidationResult.Failure("Invalid token signature");
        }
        catch (SecurityTokenException ex)
        {
            this.logger.LogWarning(ex, "Token validation failed: {Message}", ex.Message);
            return Application.Common.Models.TokenValidationResult.Failure($"Token validation failed: {ex.Message}");
        }
        catch (Exception ex)
        {
            this.logger.LogError(ex, "Unexpected error during token validation");
            return Application.Common.Models.TokenValidationResult.Failure("Token validation failed");
        }
    }

    /// <summary>
    /// Refreshes a JWT token.
    /// </summary>
    /// <param name="refreshToken">The refresh token.</param>
    /// <returns>The new JWT token.</returns>
    public async Task<JwtToken> RefreshTokenAsync(string refreshToken)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(refreshToken);

        try
        {
            // Validate refresh token exists and is not expired
            if (!RefreshTokens.TryGetValue(refreshToken, out var tokenInfo))
            {
                this.logger.LogWarning("Refresh token not found: {RefreshToken}", refreshToken);
                throw new SecurityTokenException("Invalid refresh token");
            }

            if (tokenInfo.IsRevoked)
            {
                this.logger.LogWarning("Refresh token is revoked: {RefreshToken}", refreshToken);
                throw new SecurityTokenException("Refresh token has been revoked");
            }

            if (tokenInfo.ExpiresAt <= DateTime.UtcNow)
            {
                this.logger.LogWarning("Refresh token is expired: {RefreshToken}", refreshToken);

                // Remove expired token
                RefreshTokens.TryRemove(refreshToken, out _);
                throw new SecurityTokenException("Refresh token has expired");
            }

            // Get user from repository
            var user = await this.userRepository.GetByIdAsync(tokenInfo.UserId);
            if (user == null || !user.IsActive)
            {
                this.logger.LogWarning(
                    "User not found or inactive for refresh token: {UserId}",
                    tokenInfo.UserId);

                // Revoke token if user is not found or inactive
                tokenInfo.IsRevoked = true;
                throw new SecurityTokenException("User not found or inactive");
            }

            // Remove old refresh token
            RefreshTokens.TryRemove(refreshToken, out _);

            // Generate new token pair
            var newTokenResult = await this.GenerateTokenAsync(user);

            this.logger.LogInformation("Token refreshed successfully for user: {UserId}", user.Id);
            return newTokenResult;
        }
        catch (Exception ex) when (ex is not SecurityTokenException)
        {
            this.logger.LogError(ex, "Unexpected error during token refresh");
            throw new SecurityTokenException("Token refresh failed", ex);
        }
    }

    /// <summary>
    /// Revokes a refresh token.
    /// </summary>
    /// <param name="refreshToken">The refresh token to revoke.</param>
    /// <returns>True if the token was revoked successfully; otherwise, false.</returns>
    public async Task<bool> RevokeRefreshTokenAsync(string refreshToken)
    {
        await Task.CompletedTask; // Make async for future extensibility

        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            return false;
        }

        if (RefreshTokens.TryGetValue(refreshToken, out var tokenInfo))
        {
            tokenInfo.IsRevoked = true;
            this.logger.LogInformation("Refresh token revoked: {RefreshToken}", refreshToken);
            return true;
        }

        return false;
    }

    /// <summary>
    /// Revokes all refresh tokens for a specific user.
    /// </summary>
    /// <param name="userId">The user ID whose tokens should be revoked.</param>
    /// <returns>The number of tokens revoked.</returns>
    public async Task<int> RevokeAllUserTokensAsync(int userId)
    {
        await Task.CompletedTask; // Make async for future extensibility

        var revokedCount = 0;
        var tokensToRevoke = RefreshTokens
            .Where(kvp => kvp.Value.UserId == userId && !kvp.Value.IsRevoked)
            .ToList();

        foreach (var token in tokensToRevoke)
        {
            token.Value.IsRevoked = true;
            revokedCount++;
        }

        if (revokedCount > 0)
        {
            this.logger.LogInformation(
                "Revoked {Count} refresh tokens for user: {UserId}",
                revokedCount,
                userId);
        }

        return revokedCount;
    }

    /// <summary>
    /// Generates a secure refresh token.
    /// </summary>
    /// <returns>A cryptographically secure refresh token.</returns>
    private static string GenerateRefreshToken()
    {
        var randomBytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        return Convert.ToBase64String(randomBytes);
    }
}
