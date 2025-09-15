using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PolishFootballNetwork.Application.Common.Interfaces;
using PolishFootballNetwork.Application.Features.Authentication.Commands.Login;
using PolishFootballNetwork.Application.Features.Authentication.Commands.Logout;
using PolishFootballNetwork.Application.Features.Authentication.Commands.RefreshToken;
using PolishFootballNetwork.Application.Features.Authentication.Queries.ValidateToken;
using PolishFootballNetwork.WebApi.Services;
using System.ComponentModel;

namespace PolishFootballNetwork.WebApi.Endpoints;

/// <summary>
/// Authentication endpoints for the Polish Football Network API.
/// </summary>
public static class AuthEndpoints
{
    /// <summary>
    /// Maps authentication endpoints to the specified route group.
    /// </summary>
    /// <param name="group">The route group builder.</param>
    /// <returns>The route group builder for chaining.</returns>
    public static RouteGroupBuilder MapAuthEndpoints(this RouteGroupBuilder group)
    {
        group.MapPost("/login", LoginAsync)
            .WithName("Login")
            .WithSummary("Authenticate user and return access token")
            .WithDescription("Authenticates a user with email and password, returning an access token and refresh token.")
            .Produces<LoginResponse>(StatusCodes.Status200OK)
            .Produces<ValidationProblemDetails>(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status429TooManyRequests)
            .Produces(StatusCodes.Status500InternalServerError)
            .WithTags("Authentication")
            .WithOpenApi();

        group.MapPost("/refresh", RefreshTokenAsync)
            .WithName("RefreshToken")
            .WithSummary("Refresh access token using refresh token")
            .WithDescription("Refreshes an expired access token using a valid refresh token.")
            .Produces<RefreshTokenResponse>(StatusCodes.Status200OK)
            .Produces<ValidationProblemDetails>(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status429TooManyRequests)
            .Produces(StatusCodes.Status500InternalServerError)
            .WithTags("Authentication")
            .WithOpenApi();

        group.MapPost("/logout", LogoutAsync)
            .RequireAuthorization()
            .WithName("Logout")
            .WithSummary("Logout user and revoke tokens")
            .WithDescription("Logs out the authenticated user and revokes their refresh tokens.")
            .Produces(StatusCodes.Status200OK)
            .Produces<ValidationProblemDetails>(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status500InternalServerError)
            .WithTags("Authentication")
            .WithOpenApi();

        group.MapGet("/validate", ValidateTokenAsync)
            .RequireAuthorization()
            .WithName("ValidateToken")
            .WithSummary("Validate current access token")
            .WithDescription("Validates the current access token and returns user information.")
            .Produces<ValidateTokenResponse>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status500InternalServerError)
            .WithTags("Authentication")
            .WithOpenApi();

        return group;
    }

    /// <summary>
    /// Handles user login requests.
    /// </summary>
    /// <param name="mediator">Mediator instance.</param>
    /// <param name="auditLogger">Audit logger instance.</param>
    /// <param name="request">Login request.</param>
    /// <param name="context">HTTP context.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Login response or error.</returns>
    private static async Task<IResult> LoginAsync(
        IMediator mediator,
        IAuditLogger auditLogger,
        [FromBody] LoginRequest request,
        HttpContext context,
        CancellationToken cancellationToken)
    {
        try
        {
            var command = new LoginCommand
            {
                Email = request.Email,
                Password = request.Password
            };

            var result = await mediator.Send(command, cancellationToken);

            var clientIp = GetClientIpAddress(context);
            var userAgent = context.Request.Headers.UserAgent.FirstOrDefault();

            if (result.IsSuccess && result.Data != null)
            {
                await auditLogger.LogSuccessfulLoginAsync(
                    result.Data.UserId,
                    request.Email,
                    clientIp,
                    userAgent);

                return Results.Ok(new LoginResponse
                {
                    AccessToken = result.Data.AccessToken,
                    RefreshToken = result.Data.RefreshToken,
                    ExpiresIn = result.Data.ExpiresIn,
                    TokenType = "Bearer",
                    UserId = result.Data.UserId,
                    Email = result.Data.Email,
                    Roles = result.Data.Roles
                });
            }

            await auditLogger.LogFailedLoginAsync(
                request.Email,
                clientIp,
                userAgent,
                result.Message ?? "Invalid credentials");

            return Results.Problem(
                statusCode: StatusCodes.Status401Unauthorized,
                title: "Authentication Failed",
                detail: result.Message ?? "Invalid email or password.");
        }
        catch (Exception ex)
        {
            var clientIp = GetClientIpAddress(context);
            var userAgent = context.Request.Headers.UserAgent.FirstOrDefault();

            await auditLogger.LogFailedLoginAsync(
                request.Email,
                clientIp,
                userAgent,
                $"Exception: {ex.Message}");

            return Results.Problem(
                statusCode: StatusCodes.Status500InternalServerError,
                title: "Login Error",
                detail: "An error occurred during login. Please try again.");
        }
    }

    /// <summary>
    /// Handles token refresh requests.
    /// </summary>
    /// <param name="mediator">Mediator instance.</param>
    /// <param name="auditLogger">Audit logger instance.</param>
    /// <param name="request">Refresh token request.</param>
    /// <param name="context">HTTP context.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>New access token or error.</returns>
    private static async Task<IResult> RefreshTokenAsync(
        IMediator mediator,
        IAuditLogger auditLogger,
        [FromBody] RefreshTokenRequest request,
        HttpContext context,
        CancellationToken cancellationToken)
    {
        try
        {
            var command = new RefreshTokenCommand
            {
                RefreshToken = request.RefreshToken
            };

            var result = await mediator.Send(command, cancellationToken);

            var clientIp = GetClientIpAddress(context);
            var userAgent = context.Request.Headers.UserAgent.FirstOrDefault();

            if (result.IsSuccess && result.Data != null)
            {
                await auditLogger.LogTokenRefreshAsync(
                    result.Data.UserId,
                    clientIp,
                    userAgent);

                return Results.Ok(new RefreshTokenResponse
                {
                    AccessToken = result.Data.AccessToken,
                    RefreshToken = result.Data.RefreshToken,
                    ExpiresIn = result.Data.ExpiresIn,
                    TokenType = "Bearer"
                });
            }

            await auditLogger.LogSuspiciousActivityAsync(
                "Failed token refresh attempt",
                clientIp,
                userAgent,
                new { RefreshToken = request.RefreshToken[..Math.Min(10, request.RefreshToken.Length)] + "..." });

            return Results.Problem(
                statusCode: StatusCodes.Status401Unauthorized,
                title: "Token Refresh Failed",
                detail: result.Message ?? "Invalid or expired refresh token.");
        }
        catch (Exception ex)
        {
            var clientIp = GetClientIpAddress(context);
            var userAgent = context.Request.Headers.UserAgent.FirstOrDefault();

            await auditLogger.LogSuspiciousActivityAsync(
                "Token refresh error",
                clientIp,
                userAgent,
                new { Exception = ex.Message });

            return Results.Problem(
                statusCode: StatusCodes.Status500InternalServerError,
                title: "Token Refresh Error",
                detail: "An error occurred during token refresh. Please try again.");
        }
    }

    /// <summary>
    /// Handles user logout requests.
    /// </summary>
    /// <param name="mediator">Mediator instance.</param>
    /// <param name="auditLogger">Audit logger instance.</param>
    /// <param name="request">Logout request.</param>
    /// <param name="context">HTTP context.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Success or error response.</returns>
    private static async Task<IResult> LogoutAsync(
        IMediator mediator,
        IAuditLogger auditLogger,
        [FromBody] LogoutRequest request,
        HttpContext context,
        CancellationToken cancellationToken)
    {
        try
        {
            var command = new LogoutCommand
            {
                RefreshToken = request.RefreshToken
            };

            var result = await mediator.Send(command, cancellationToken);

            var clientIp = GetClientIpAddress(context);
            var userAgent = context.Request.Headers.UserAgent.FirstOrDefault();

            // Extract user ID from token if available
            var userIdClaim = context.User?.FindFirst("sub")?.Value;
            if (int.TryParse(userIdClaim, out var userId))
            {
                await auditLogger.LogLogoutAsync(userId, clientIp, userAgent);
            }

            if (result.IsSuccess)
            {
                return Results.Ok(new { message = "Logged out successfully" });
            }

            return Results.Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "Logout Failed",
                detail: result.Message ?? "Failed to logout. Please try again.");
        }
        catch (Exception ex)
        {
            var clientIp = GetClientIpAddress(context);
            var userAgent = context.Request.Headers.UserAgent.FirstOrDefault();

            await auditLogger.LogSuspiciousActivityAsync(
                "Logout error",
                clientIp,
                userAgent,
                new { Exception = ex.Message });

            return Results.Problem(
                statusCode: StatusCodes.Status500InternalServerError,
                title: "Logout Error",
                detail: "An error occurred during logout. Please try again.");
        }
    }

    /// <summary>
    /// Handles token validation requests.
    /// </summary>
    /// <param name="mediator">Mediator instance.</param>
    /// <param name="context">HTTP context.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Token validation response or error.</returns>
    private static async Task<IResult> ValidateTokenAsync(
        IMediator mediator,
        HttpContext context,
        CancellationToken cancellationToken)
    {
        try
        {
            var authHeader = context.Request.Headers.Authorization.FirstOrDefault();
            if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer "))
            {
                return Results.Problem(
                    statusCode: StatusCodes.Status401Unauthorized,
                    title: "Missing Token",
                    detail: "Authorization header with Bearer token is required.");
            }

            var token = authHeader["Bearer ".Length..].Trim();
            var query = new ValidateTokenQuery { Token = token };

            var result = await mediator.Send(query, cancellationToken);

            if (result.IsSuccess && result.Data != null)
            {
                return Results.Ok(new ValidateTokenResponse
                {
                    IsValid = true,
                    UserId = result.Data.UserId,
                    Email = result.Data.Email,
                    Roles = result.Data.Roles,
                    ExpiresAt = result.Data.ExpiresAt
                });
            }

            return Results.Problem(
                statusCode: StatusCodes.Status401Unauthorized,
                title: "Invalid Token",
                detail: result.Message ?? "The provided token is invalid or expired.");
        }
        catch (Exception)
        {
            return Results.Problem(
                statusCode: StatusCodes.Status500InternalServerError,
                title: "Token Validation Error",
                detail: "An error occurred during token validation. Please try again.");
        }
    }

    /// <summary>
    /// Gets the client IP address from the HTTP context.
    /// </summary>
    /// <param name="context">HTTP context.</param>
    /// <returns>Client IP address.</returns>
    private static string GetClientIpAddress(HttpContext context)
    {
        var clientIp = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (string.IsNullOrEmpty(clientIp))
        {
            clientIp = context.Request.Headers["X-Real-IP"].FirstOrDefault();
        }
        if (string.IsNullOrEmpty(clientIp))
        {
            clientIp = context.Connection.RemoteIpAddress?.ToString();
        }

        return clientIp ?? "unknown";
    }
}

/// <summary>
/// Login request model.
/// </summary>
public class LoginRequest
{
    /// <summary>
    /// User email address.
    /// </summary>
    [Description("User email address")]
    public required string Email { get; set; }

    /// <summary>
    /// User password.
    /// </summary>
    [Description("User password")]
    public required string Password { get; set; }
}

/// <summary>
/// Login response model.
/// </summary>
public class LoginResponse
{
    /// <summary>
    /// Access token.
    /// </summary>
    public required string AccessToken { get; set; }

    /// <summary>
    /// Refresh token.
    /// </summary>
    public required string RefreshToken { get; set; }

    /// <summary>
    /// Token expiration time in seconds.
    /// </summary>
    public required int ExpiresIn { get; set; }

    /// <summary>
    /// Token type (Bearer).
    /// </summary>
    public required string TokenType { get; set; }

    /// <summary>
    /// User ID.
    /// </summary>
    public required int UserId { get; set; }

    /// <summary>
    /// User email.
    /// </summary>
    public required string Email { get; set; }

    /// <summary>
    /// User roles.
    /// </summary>
    public required List<string> Roles { get; set; }
}

/// <summary>
/// Refresh token request model.
/// </summary>
public class RefreshTokenRequest
{
    /// <summary>
    /// Refresh token.
    /// </summary>
    [Description("Refresh token to exchange for new access token")]
    public required string RefreshToken { get; set; }
}

/// <summary>
/// Refresh token response model.
/// </summary>
public class RefreshTokenResponse
{
    /// <summary>
    /// New access token.
    /// </summary>
    public required string AccessToken { get; set; }

    /// <summary>
    /// New refresh token.
    /// </summary>
    public required string RefreshToken { get; set; }

    /// <summary>
    /// Token expiration time in seconds.
    /// </summary>
    public required int ExpiresIn { get; set; }

    /// <summary>
    /// Token type (Bearer).
    /// </summary>
    public required string TokenType { get; set; }
}

/// <summary>
/// Logout request model.
/// </summary>
public class LogoutRequest
{
    /// <summary>
    /// Refresh token to revoke.
    /// </summary>
    [Description("Refresh token to revoke during logout")]
    public required string RefreshToken { get; set; }
}

/// <summary>
/// Token validation response model.
/// </summary>
public class ValidateTokenResponse
{
    /// <summary>
    /// Whether the token is valid.
    /// </summary>
    public required bool IsValid { get; set; }

    /// <summary>
    /// User ID.
    /// </summary>
    public required int UserId { get; set; }

    /// <summary>
    /// User email.
    /// </summary>
    public required string Email { get; set; }

    /// <summary>
    /// User roles.
    /// </summary>
    public required List<string> Roles { get; set; }

    /// <summary>
    /// Token expiration time.
    /// </summary>
    public required DateTime ExpiresAt { get; set; }
}