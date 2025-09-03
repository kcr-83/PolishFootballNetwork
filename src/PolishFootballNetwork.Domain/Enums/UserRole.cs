namespace PolishFootballNetwork.Domain.Enums;

/// <summary>
/// Represents the role of a user in the system.
/// </summary>
public enum UserRole
{
    /// <summary>
    /// Standard administrator with basic management capabilities.
    /// </summary>
    Admin = 1,

    /// <summary>
    /// Super administrator with full system access and advanced management capabilities.
    /// </summary>
    SuperAdmin = 2
}
