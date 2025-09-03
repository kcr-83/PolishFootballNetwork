namespace PolishFootballNetwork.Domain.Enums;

/// <summary>
/// Represents the type of connection between football clubs.
/// </summary>
public enum ConnectionType
{
    /// <summary>
    /// Clubs that have a formal or informal alliance, partnership, or cooperation.
    /// </summary>
    Alliance = 1,

    /// <summary>
    /// Clubs that have a strong competitive rivalry, often historical or regional.
    /// </summary>
    Rivalry = 2,

    /// <summary>
    /// Clubs that maintain friendly relationships, mutual respect, or supportive connections.
    /// </summary>
    Friendship = 3
}
