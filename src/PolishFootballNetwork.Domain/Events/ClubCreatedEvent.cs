namespace PolishFootballNetwork.Domain.Events;

/// <summary>
/// Domain event raised when a new club is created in the system.
/// </summary>
public class ClubCreatedEvent : DomainEvent
{
    /// <summary>
    /// Gets the identifier of the created club.
    /// </summary>
    public int ClubId { get; }

    /// <summary>
    /// Gets the name of the created club.
    /// </summary>
    public string ClubName { get; }

    /// <summary>
    /// Gets the league type of the created club.
    /// </summary>
    public string LeagueType { get; }

    /// <summary>
    /// Initializes a new instance of the ClubCreatedEvent class.
    /// </summary>
    /// <param name="clubId">The identifier of the created club.</param>
    /// <param name="clubName">The name of the created club.</param>
    /// <param name="leagueType">The league type of the created club.</param>
    public ClubCreatedEvent(int clubId, string clubName, string leagueType)
    {
        ClubId = clubId;
        ClubName = clubName;
        LeagueType = leagueType;
    }
}
