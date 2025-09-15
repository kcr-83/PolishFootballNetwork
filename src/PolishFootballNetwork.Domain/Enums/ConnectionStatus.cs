namespace PolishFootballNetwork.Domain.Enums;

/// <summary>
/// Represents the current status of a connection between football clubs.
/// </summary>
public enum ConnectionStatus
{
    /// <summary>
    /// The connection is currently active and relevant.
    /// </summary>
    Active = 1,

    /// <summary>
    /// The connection is temporarily suspended or on hold.
    /// </summary>
    Suspended = 2,

    /// <summary>
    /// The connection has been terminated or ended.
    /// </summary>
    Terminated = 3,

    /// <summary>
    /// The connection is pending approval or verification.
    /// </summary>
    Pending = 4,

    /// <summary>
    /// The connection has been archived for historical purposes.
    /// </summary>
    Archived = 5
}