using Microsoft.AspNetCore.Authorization;
using PolishFootballNetwork.Domain.Enums;
using System.Security.Claims;

namespace PolishFootballNetwork.Infrastructure.Authorization;

/// <summary>
/// Interface for authorization services.
/// </summary>
public interface IAuthorizationService
{
    /// <summary>
    /// Checks if the current user has the specified role or higher.
    /// </summary>
    /// <param name="user">The user claims principal.</param>
    /// <param name="minimumRole">The minimum required role.</param>
    /// <returns>True if the user has sufficient permissions, otherwise false.</returns>
    bool HasRole(ClaimsPrincipal user, UserRole minimumRole);

    /// <summary>
    /// Gets the current user's role.
    /// </summary>
    /// <param name="user">The user claims principal.</param>
    /// <returns>The user's role, or null if not authenticated or role not found.</returns>
    UserRole? GetUserRole(ClaimsPrincipal user);

    /// <summary>
    /// Gets the current user's ID.
    /// </summary>
    /// <param name="user">The user claims principal.</param>
    /// <returns>The user's ID, or null if not authenticated or ID not found.</returns>
    int? GetUserId(ClaimsPrincipal user);

    /// <summary>
    /// Checks if the user can access a resource they own.
    /// </summary>
    /// <param name="user">The user claims principal.</param>
    /// <param name="resourceOwnerId">The ID of the resource owner.</param>
    /// <param name="minimumRoleForAllAccess">Minimum role required to access any resource (bypass ownership check).</param>
    /// <returns>True if the user can access the resource, otherwise false.</returns>
    bool CanAccessResource(ClaimsPrincipal user, int resourceOwnerId, UserRole minimumRoleForAllAccess = UserRole.Moderator);
}

/// <summary>
/// Service for checking user authorization and permissions.
/// </summary>
public class AuthorizationService : IAuthorizationService
{
    /// <summary>
    /// Checks if the current user has the specified role or higher.
    /// </summary>
    /// <param name="user">The user claims principal.</param>
    /// <param name="minimumRole">The minimum required role.</param>
    /// <returns>True if the user has sufficient permissions, otherwise false.</returns>
    public bool HasRole(ClaimsPrincipal user, UserRole minimumRole)
    {
        var userRole = GetUserRole(user);
        if (!userRole.HasValue)
        {
            return false;
        }

        return HasSufficientRole(userRole.Value, minimumRole);
    }

    /// <summary>
    /// Gets the current user's role.
    /// </summary>
    /// <param name="user">The user claims principal.</param>
    /// <returns>The user's role, or null if not authenticated or role not found.</returns>
    public UserRole? GetUserRole(ClaimsPrincipal user)
    {
        if (user?.Identity?.IsAuthenticated != true)
        {
            return null;
        }

        var roleClaim = user.FindFirst("role")?.Value;
        if (string.IsNullOrEmpty(roleClaim))
        {
            return null;
        }

        return Enum.TryParse<UserRole>(roleClaim, out var role) ? role : null;
    }

    /// <summary>
    /// Gets the current user's ID.
    /// </summary>
    /// <param name="user">The user claims principal.</param>
    /// <returns>The user's ID, or null if not authenticated or ID not found.</returns>
    public int? GetUserId(ClaimsPrincipal user)
    {
        if (user?.Identity?.IsAuthenticated != true)
        {
            return null;
        }

        var userIdClaim = user.FindFirst("sub")?.Value ?? user.FindFirst("userId")?.Value;
        if (string.IsNullOrEmpty(userIdClaim))
        {
            return null;
        }

        return int.TryParse(userIdClaim, out var userId) ? userId : null;
    }

    /// <summary>
    /// Checks if the user can access a resource they own.
    /// </summary>
    /// <param name="user">The user claims principal.</param>
    /// <param name="resourceOwnerId">The ID of the resource owner.</param>
    /// <param name="minimumRoleForAllAccess">Minimum role required to access any resource (bypass ownership check).</param>
    /// <returns>True if the user can access the resource, otherwise false.</returns>
    public bool CanAccessResource(ClaimsPrincipal user, int resourceOwnerId, UserRole minimumRoleForAllAccess = UserRole.Moderator)
    {
        var userId = GetUserId(user);
        if (!userId.HasValue)
        {
            return false;
        }

        // User can access their own resources
        if (userId.Value == resourceOwnerId)
        {
            return true;
        }

        // Higher-privileged users can access any resource
        return HasRole(user, minimumRoleForAllAccess);
    }

    /// <summary>
    /// Determines if the user role meets the minimum role requirement.
    /// </summary>
    /// <param name="userRole">The user's role.</param>
    /// <param name="minimumRole">The minimum required role.</param>
    /// <returns>True if the user role is sufficient, otherwise false.</returns>
    private static bool HasSufficientRole(UserRole userRole, UserRole minimumRole)
    {
        // Role hierarchy: User < Moderator < Administrator < SuperAdmin
        var roleHierarchy = new Dictionary<UserRole, int>
        {
            { UserRole.User, 1 },
            { UserRole.Moderator, 2 },
            { UserRole.Administrator, 3 },
            { UserRole.SuperAdmin, 4 }
        };

        return roleHierarchy.GetValueOrDefault(userRole, 0) >= 
               roleHierarchy.GetValueOrDefault(minimumRole, int.MaxValue);
    }
}