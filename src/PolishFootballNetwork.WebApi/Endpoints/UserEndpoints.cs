using Microsoft.AspNetCore.Authorization;
using PolishFootballNetwork.Infrastructure.Authorization;
using PolishFootballNetwork.WebApi.Services;
using System.ComponentModel;
using System.Security.Claims;

namespace PolishFootballNetwork.WebApi.Endpoints;

/// <summary>
/// User management endpoints demonstrating role-based authorization.
/// </summary>
public static class UserEndpoints
{
    /// <summary>
    /// Maps user management endpoints to the specified route group.
    /// </summary>
    /// <param name="group">The route group builder.</param>
    /// <returns>The route group builder for chaining.</returns>
    public static RouteGroupBuilder MapUserEndpoints(this RouteGroupBuilder group)
    {
        // Endpoint accessible by any authenticated user
        group.MapGet("/profile", GetUserProfileAsync)
            .RequireAuthorization(AuthorizationPolicies.RequireUser)
            .WithName("GetUserProfile")
            .WithSummary("Get current user profile")
            .WithDescription("Returns the profile information of the currently authenticated user.")
            .Produces<UserProfileResponse>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status500InternalServerError)
            .WithTags("User Management")
            .WithOpenApi();

        // Endpoint accessible by moderators and above
        group.MapGet("/all", GetAllUsersAsync)
            .RequireAuthorization(AuthorizationPolicies.RequireModerator)
            .WithName("GetAllUsers")
            .WithSummary("Get all users (Moderator+)")
            .WithDescription("Returns a list of all users. Requires Moderator role or higher.")
            .Produces<UserListResponse>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden)
            .Produces(StatusCodes.Status500InternalServerError)
            .WithTags("User Management")
            .WithOpenApi();

        // Endpoint accessible by administrators and above
        group.MapPost("/{userId:int}/ban", BanUserAsync)
            .RequireAuthorization(AuthorizationPolicies.RequireAdministrator)
            .WithName("BanUser")
            .WithSummary("Ban a user (Administrator+)")
            .WithDescription("Bans a user account. Requires Administrator role or higher.")
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status500InternalServerError)
            .WithTags("User Management")
            .WithOpenApi();

        // Endpoint accessible by super admins only
        group.MapDelete("/{userId:int}", DeleteUserAsync)
            .RequireAuthorization(AuthorizationPolicies.RequireSuperAdmin)
            .WithName("DeleteUser")
            .WithSummary("Delete a user permanently (SuperAdmin only)")
            .WithDescription("Permanently deletes a user account. Requires SuperAdmin role.")
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status500InternalServerError)
            .WithTags("User Management")
            .WithOpenApi();

        return group;
    }

    /// <summary>
    /// Gets the current user's profile information.
    /// </summary>
    /// <param name="authorizationService">Authorization service for user context.</param>
    /// <param name="auditLogger">Audit logger for security events.</param>
    /// <param name="httpContext">HTTP context for request details.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>User profile information.</returns>
    private static async Task<IResult> GetUserProfileAsync(
        Infrastructure.Authorization.IAuthorizationService authorizationService,
        IAuditLogger auditLogger,
        HttpContext httpContext,
        CancellationToken cancellationToken)
    {
        try
        {
            var user = httpContext.User;
            var userId = authorizationService.GetUserId(user);
            var userRole = authorizationService.GetUserRole(user);

            if (!userId.HasValue || !userRole.HasValue)
            {
                await auditLogger.LogSecurityEventAsync(
                    "ProfileAccess",
                    $"Invalid user context for profile access",
                    httpContext.Connection.RemoteIpAddress?.ToString(),
                    httpContext.Request.Headers.UserAgent.ToString(),
                    userId,
                    success: false,
                    cancellationToken: cancellationToken);

                return Results.Unauthorized();
            }

            await auditLogger.LogSecurityEventAsync(
                "ProfileAccess",
                $"User {userId.Value} accessed their profile",
                httpContext.Connection.RemoteIpAddress?.ToString(),
                httpContext.Request.Headers.UserAgent.ToString(),
                userId.Value,
                success: true,
                cancellationToken: cancellationToken);

            var response = new UserProfileResponse
            {
                UserId = userId.Value,
                Role = userRole.Value.ToString(),
                Email = user.FindFirst("email")?.Value ?? "Unknown",
                LastLoginAt = DateTime.UtcNow // This would come from database in real implementation
            };

            return Results.Ok(response);
        }
        catch (Exception ex)
        {
            await auditLogger.LogSecurityEventAsync(
                "ProfileAccessError",
                $"Error accessing user profile: {ex.Message}",
                httpContext.Connection.RemoteIpAddress?.ToString(),
                httpContext.Request.Headers.UserAgent.ToString(),
                authorizationService.GetUserId(httpContext.User),
                success: false,
                cancellationToken: cancellationToken);

            return Results.StatusCode(StatusCodes.Status500InternalServerError);
        }
    }

    /// <summary>
    /// Gets all users (moderator+ only).
    /// </summary>
    /// <param name="authorizationService">Authorization service for user context.</param>
    /// <param name="auditLogger">Audit logger for security events.</param>
    /// <param name="httpContext">HTTP context for request details.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>List of all users.</returns>
    private static async Task<IResult> GetAllUsersAsync(
        Infrastructure.Authorization.IAuthorizationService authorizationService,
        IAuditLogger auditLogger,
        HttpContext httpContext,
        CancellationToken cancellationToken)
    {
        try
        {
            var user = httpContext.User;
            var userId = authorizationService.GetUserId(user);

            await auditLogger.LogSecurityEventAsync(
                "AdminAction",
                $"User {userId} accessed all users list",
                httpContext.Connection.RemoteIpAddress?.ToString(),
                httpContext.Request.Headers.UserAgent.ToString(),
                userId,
                success: true,
                cancellationToken: cancellationToken);

            // This would come from a user service in real implementation
            var response = new UserListResponse
            {
                Users = new[]
                {
                    new UserSummary { Id = 1, Email = "admin@example.com", Role = "SuperAdmin", IsActive = true },
                    new UserSummary { Id = 2, Email = "mod@example.com", Role = "Moderator", IsActive = true },
                    new UserSummary { Id = 3, Email = "user@example.com", Role = "User", IsActive = true }
                },
                TotalCount = 3
            };

            return Results.Ok(response);
        }
        catch (Exception ex)
        {
            await auditLogger.LogSecurityEventAsync(
                "AdminActionError",
                $"Error accessing users list: {ex.Message}",
                httpContext.Connection.RemoteIpAddress?.ToString(),
                httpContext.Request.Headers.UserAgent.ToString(),
                authorizationService.GetUserId(httpContext.User),
                success: false,
                cancellationToken: cancellationToken);

            return Results.StatusCode(StatusCodes.Status500InternalServerError);
        }
    }

    /// <summary>
    /// Bans a user (administrator+ only).
    /// </summary>
    /// <param name="userId">ID of the user to ban.</param>
    /// <param name="request">Ban request details.</param>
    /// <param name="authorizationService">Authorization service for user context.</param>
    /// <param name="auditLogger">Audit logger for security events.</param>
    /// <param name="httpContext">HTTP context for request details.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Result of the ban operation.</returns>
    private static async Task<IResult> BanUserAsync(
        [Description("The ID of the user to ban")] int userId,
        BanUserRequest request,
        Infrastructure.Authorization.IAuthorizationService authorizationService,
        IAuditLogger auditLogger,
        HttpContext httpContext,
        CancellationToken cancellationToken)
    {
        try
        {
            var currentUserId = authorizationService.GetUserId(httpContext.User);

            if (userId == currentUserId)
            {
                await auditLogger.LogSecurityEventAsync(
                    "AdminAction",
                    $"User {currentUserId} attempted to ban themselves",
                    httpContext.Connection.RemoteIpAddress?.ToString(),
                    httpContext.Request.Headers.UserAgent.ToString(),
                    currentUserId,
                    success: false,
                    cancellationToken: cancellationToken);

                return Results.BadRequest("Cannot ban yourself");
            }

            await auditLogger.LogSecurityEventAsync(
                "AdminAction",
                $"User {currentUserId} banned user {userId}. Reason: {request.Reason}",
                httpContext.Connection.RemoteIpAddress?.ToString(),
                httpContext.Request.Headers.UserAgent.ToString(),
                currentUserId,
                success: true,
                cancellationToken: cancellationToken);

            // In real implementation, this would update the user status in the database
            return Results.NoContent();
        }
        catch (Exception ex)
        {
            await auditLogger.LogSecurityEventAsync(
                "AdminActionError",
                $"Error banning user {userId}: {ex.Message}",
                httpContext.Connection.RemoteIpAddress?.ToString(),
                httpContext.Request.Headers.UserAgent.ToString(),
                authorizationService.GetUserId(httpContext.User),
                success: false,
                cancellationToken: cancellationToken);

            return Results.StatusCode(StatusCodes.Status500InternalServerError);
        }
    }

    /// <summary>
    /// Deletes a user permanently (super admin only).
    /// </summary>
    /// <param name="userId">ID of the user to delete.</param>
    /// <param name="authorizationService">Authorization service for user context.</param>
    /// <param name="auditLogger">Audit logger for security events.</param>
    /// <param name="httpContext">HTTP context for request details.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Result of the delete operation.</returns>
    private static async Task<IResult> DeleteUserAsync(
        [Description("The ID of the user to delete")] int userId,
        Infrastructure.Authorization.IAuthorizationService authorizationService,
        IAuditLogger auditLogger,
        HttpContext httpContext,
        CancellationToken cancellationToken)
    {
        try
        {
            var currentUserId = authorizationService.GetUserId(httpContext.User);

            if (userId == currentUserId)
            {
                await auditLogger.LogSecurityEventAsync(
                    "CriticalAdminAction",
                    $"SuperAdmin {currentUserId} attempted to delete themselves",
                    httpContext.Connection.RemoteIpAddress?.ToString(),
                    httpContext.Request.Headers.UserAgent.ToString(),
                    currentUserId,
                    success: false,
                    cancellationToken: cancellationToken);

                return Results.BadRequest("Cannot delete yourself");
            }

            await auditLogger.LogSecurityEventAsync(
                "CriticalAdminAction",
                $"SuperAdmin {currentUserId} permanently deleted user {userId}",
                httpContext.Connection.RemoteIpAddress?.ToString(),
                httpContext.Request.Headers.UserAgent.ToString(),
                currentUserId,
                success: true,
                cancellationToken: cancellationToken);

            // In real implementation, this would permanently delete the user from the database
            return Results.NoContent();
        }
        catch (Exception ex)
        {
            await auditLogger.LogSecurityEventAsync(
                "CriticalAdminActionError",
                $"Error deleting user {userId}: {ex.Message}",
                httpContext.Connection.RemoteIpAddress?.ToString(),
                httpContext.Request.Headers.UserAgent.ToString(),
                authorizationService.GetUserId(httpContext.User),
                success: false,
                cancellationToken: cancellationToken);

            return Results.StatusCode(StatusCodes.Status500InternalServerError);
        }
    }
}

/// <summary>
/// Response model for user profile information.
/// </summary>
public class UserProfileResponse
{
    /// <summary>
    /// Gets or sets the user ID.
    /// </summary>
    public int UserId { get; set; }

    /// <summary>
    /// Gets or sets the user's email address.
    /// </summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the user's role.
    /// </summary>
    public string Role { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the last login timestamp.
    /// </summary>
    public DateTime LastLoginAt { get; set; }
}

/// <summary>
/// Response model for user list.
/// </summary>
public class UserListResponse
{
    /// <summary>
    /// Gets or sets the list of user summaries.
    /// </summary>
    public UserSummary[] Users { get; set; } = Array.Empty<UserSummary>();

    /// <summary>
    /// Gets or sets the total count of users.
    /// </summary>
    public int TotalCount { get; set; }
}

/// <summary>
/// Summary information about a user.
/// </summary>
public class UserSummary
{
    /// <summary>
    /// Gets or sets the user ID.
    /// </summary>
    public int Id { get; set; }

    /// <summary>
    /// Gets or sets the user's email address.
    /// </summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the user's role.
    /// </summary>
    public string Role { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets whether the user account is active.
    /// </summary>
    public bool IsActive { get; set; }
}

/// <summary>
/// Request model for banning a user.
/// </summary>
public class BanUserRequest
{
    /// <summary>
    /// Gets or sets the reason for banning the user.
    /// </summary>
    public string Reason { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the duration of the ban in days (0 for permanent).
    /// </summary>
    public int DurationDays { get; set; }
}