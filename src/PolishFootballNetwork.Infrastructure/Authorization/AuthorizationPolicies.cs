using Microsoft.AspNetCore.Authorization;
using PolishFootballNetwork.Domain.Enums;

namespace PolishFootballNetwork.Infrastructure.Authorization;

/// <summary>
/// Policy names for role-based authorization.
/// </summary>
public static class AuthorizationPolicies
{
    /// <summary>
    /// Policy that requires any authenticated user.
    /// </summary>
    public const string RequireUser = "RequireUser";

    /// <summary>
    /// Policy that requires moderator role or higher.
    /// </summary>
    public const string RequireModerator = "RequireModerator";

    /// <summary>
    /// Policy that requires administrator role or higher.
    /// </summary>
    public const string RequireAdministrator = "RequireAdministrator";

    /// <summary>
    /// Policy that requires super admin role.
    /// </summary>
    public const string RequireSuperAdmin = "RequireSuperAdmin";

    /// <summary>
    /// Configures authorization policies for the application.
    /// </summary>
    /// <param name="options">Authorization options to configure.</param>
    public static void ConfigurePolicies(AuthorizationOptions options)
    {
        // Any authenticated user policy
        options.AddPolicy(RequireUser, policy =>
            policy.RequireAuthenticatedUser()
                  .RequireClaim("role"));

        // Moderator or higher policy
        options.AddPolicy(RequireModerator, policy =>
            policy.RequireAuthenticatedUser()
                  .RequireClaim("role", 
                      UserRole.Moderator.ToString(),
                      UserRole.Administrator.ToString(),
                      UserRole.SuperAdmin.ToString()));

        // Administrator or higher policy  
        options.AddPolicy(RequireAdministrator, policy =>
            policy.RequireAuthenticatedUser()
                  .RequireClaim("role",
                      UserRole.Administrator.ToString(),
                      UserRole.SuperAdmin.ToString()));

        // Super admin only policy
        options.AddPolicy(RequireSuperAdmin, policy =>
            policy.RequireAuthenticatedUser()
                  .RequireClaim("role", UserRole.SuperAdmin.ToString()));
    }
}