using Microsoft.AspNetCore.Authorization;
using PolishFootballNetwork.Domain.Enums;
using System.Security.Claims;

namespace PolishFootballNetwork.Infrastructure.Authorization;

/// <summary>
/// Authorization requirement that validates user role hierarchy.
/// </summary>
public class RoleRequirement : IAuthorizationRequirement
{
    /// <summary>
    /// Initializes a new instance of the <see cref="RoleRequirement"/> class.
    /// </summary>
    /// <param name="minimumRole">The minimum required role.</param>
    public RoleRequirement(UserRole minimumRole)
    {
        MinimumRole = minimumRole;
    }

    /// <summary>
    /// Gets the minimum required role.
    /// </summary>
    public UserRole MinimumRole { get; }
}

/// <summary>
/// Authorization handler for role-based requirements with hierarchy support.
/// </summary>
public class RoleAuthorizationHandler : AuthorizationHandler<RoleRequirement>
{
    /// <summary>
    /// Handles the authorization requirement.
    /// </summary>
    /// <param name="context">The authorization context.</param>
    /// <param name="requirement">The role requirement.</param>
    /// <returns>A task representing the authorization operation.</returns>
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        RoleRequirement requirement)
    {
        if (context.User?.Identity?.IsAuthenticated != true)
        {
            return Task.CompletedTask;
        }

        var roleClaim = context.User.FindFirst("role")?.Value;
        if (string.IsNullOrEmpty(roleClaim))
        {
            return Task.CompletedTask;
        }

        if (!Enum.TryParse<UserRole>(roleClaim, out var userRole))
        {
            return Task.CompletedTask;
        }

        // Check if user role meets the minimum requirement
        if (HasSufficientRole(userRole, requirement.MinimumRole))
        {
            context.Succeed(requirement);
        }

        return Task.CompletedTask;
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