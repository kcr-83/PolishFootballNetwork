namespace PolishFootballNetwork.Domain.Enums;

/// <summary>
/// Represents the strength or intensity of a connection between clubs.
/// </summary>
public enum ConnectionStrength
{
    /// <summary>
    /// A minor or casual connection with limited significance.
    /// </summary>
    Weak = 1,

    /// <summary>
    /// A moderate connection with some historical or competitive significance.
    /// </summary>
    Medium = 2,

    /// <summary>
    /// A strong, significant connection with major historical, cultural, or competitive importance.
    /// </summary>
    Strong = 3,

    /// <summary>
    /// An extremely strong connection with exceptional historical, cultural, or competitive significance.
    /// </summary>
    VeryStrong = 4
}
