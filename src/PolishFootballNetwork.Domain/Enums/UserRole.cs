namespace PolishFootballNetwork.Domain.Enums;

/// <summary>
/// Represents the role of a user in the system.
/// </summary>
public enum UserRole
{
    /// <summary>
    /// Regular user with basic access to the system.
    /// </summary>
    User = 1,

    /// <summary>
    /// Moderator with additional content management capabilities.
    /// </summary>
    Moderator = 2,

    /// <summary>
    /// Administrator with advanced management capabilities.
    /// </summary>
    Administrator = 3,

    /// <summary>
    /// Super administrator with full system access.
    /// </summary>
    SuperAdmin = 4
}
