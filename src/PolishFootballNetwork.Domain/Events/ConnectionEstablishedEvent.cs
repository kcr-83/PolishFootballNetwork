using PolishFootballNetwork.Domain.Enums;

namespace PolishFootballNetwork.Domain.Events;

/// <summary>
/// Domain event raised when a connection between two clubs is established.
/// </summary>
public class ConnectionEstablishedEvent : DomainEvent
{
    /// <summary>
    /// Gets the identifier of the connection.
    /// </summary>
    public int ConnectionId { get; }

    /// <summary>
    /// Gets the identifier of the source club.
    /// </summary>
    public int SourceClubId { get; }

    /// <summary>
    /// Gets the identifier of the target club.
    /// </summary>
    public int TargetClubId { get; }

    /// <summary>
    /// Gets the type of connection established.
    /// </summary>
    public ConnectionType ConnectionType { get; }

    /// <summary>
    /// Gets the strength of the connection.
    /// </summary>
    public ConnectionStrength ConnectionStrength { get; }

    /// <summary>
    /// Initializes a new instance of the ConnectionEstablishedEvent class.
    /// </summary>
    /// <param name="connectionId">The identifier of the connection.</param>
    /// <param name="sourceClubId">The identifier of the source club.</param>
    /// <param name="targetClubId">The identifier of the target club.</param>
    /// <param name="connectionType">The type of connection established.</param>
    /// <param name="connectionStrength">The strength of the connection.</param>
    public ConnectionEstablishedEvent(int connectionId, int sourceClubId, int targetClubId, 
        ConnectionType connectionType, ConnectionStrength connectionStrength)
    {
        ConnectionId = connectionId;
        SourceClubId = sourceClubId;
        TargetClubId = targetClubId;
        ConnectionType = connectionType;
        ConnectionStrength = connectionStrength;
    }
}
