namespace PolishFootballNetwork.Domain.Events;

/// <summary>
/// Domain event raised when a club's information is updated.
/// </summary>
public class ClubUpdatedEvent : DomainEvent
{
    /// <summary>
    /// Gets the identifier of the updated club.
    /// </summary>
    public int ClubId { get; }

    /// <summary>
    /// Gets the updated name of the club.
    /// </summary>
    public string ClubName { get; }

    /// <summary>
    /// Gets the list of properties that were updated.
    /// </summary>
    public IReadOnlyList<string> UpdatedProperties { get; }

    /// <summary>
    /// Initializes a new instance of the ClubUpdatedEvent class.
    /// </summary>
    /// <param name="clubId">The identifier of the updated club.</param>
    /// <param name="clubName">The updated name of the club.</param>
    /// <param name="updatedProperties">The list of properties that were updated.</param>
    public ClubUpdatedEvent(int clubId, string clubName, IEnumerable<string> updatedProperties)
    {
        ClubId = clubId;
        ClubName = clubName;
        UpdatedProperties = updatedProperties.ToList().AsReadOnly();
    }
}
