using PolishFootballNetwork.Domain.Common;
using PolishFootballNetwork.Domain.Enums;
using PolishFootballNetwork.Domain.Events;
using PolishFootballNetwork.Domain.Exceptions;
using PolishFootballNetwork.Domain.ValueObjects;

namespace PolishFootballNetwork.Domain.Entities;

/// <summary>
/// Represents a connection between two football clubs in the network.
/// Defines the relationship type, strength, and temporal aspects of the connection.
/// </summary>
public class Connection : Entity
{
    /// <summary>
    /// Gets the identifier of the source club in the connection.
    /// </summary>
    public int SourceClubId { get; private set; }

    /// <summary>
    /// Gets the identifier of the target club in the connection.
    /// </summary>
    public int TargetClubId { get; private set; }

    /// <summary>
    /// Gets the type of connection between the clubs.
    /// </summary>
    public ConnectionType Type { get; private set; }

    /// <summary>
    /// Gets the strength of the connection.
    /// </summary>
    public ConnectionStrength Strength { get; private set; }

    /// <summary>
    /// Gets the date range during which this connection is active.
    /// </summary>
    public DateRange? ActivePeriod { get; private set; }

    /// <summary>
    /// Gets or sets the description of the connection.
    /// </summary>
    public string? Description { get; private set; }

    /// <summary>
    /// Gets or sets additional notes about the connection.
    /// </summary>
    public string? Notes { get; private set; }

    /// <summary>
    /// Gets the source club navigation property.
    /// </summary>
    public Club? SourceClub { get; private set; }

    /// <summary>
    /// Gets the target club navigation property.
    /// </summary>
    public Club? TargetClub { get; private set; }

    /// <summary>
    /// Initializes a new instance of the Connection class. Used by EF Core.
    /// </summary>
    private Connection() : base()
    {
    }

    /// <summary>
    /// Initializes a new instance of the Connection class with the specified parameters.
    /// </summary>
    /// <param name="sourceClubId">The identifier of the source club.</param>
    /// <param name="targetClubId">The identifier of the target club.</param>
    /// <param name="type">The type of connection.</param>
    /// <param name="strength">The strength of the connection.</param>
    /// <param name="activePeriod">The date range during which this connection is active.</param>
    /// <exception cref="BusinessRuleValidationException">Thrown when validation fails.</exception>
    public Connection(int sourceClubId, int targetClubId, ConnectionType type, 
        ConnectionStrength strength, DateRange? activePeriod = null)
    {
        ValidateClubIds(sourceClubId, targetClubId);
        
        SourceClubId = sourceClubId;
        TargetClubId = targetClubId;
        Type = type;
        Strength = strength;
        ActivePeriod = activePeriod;

        AddDomainEvent(new ConnectionEstablishedEvent(Id, SourceClubId, TargetClubId, Type, Strength));
    }

    /// <summary>
    /// Updates the type of the connection.
    /// </summary>
    /// <param name="type">The new connection type.</param>
    public void UpdateType(ConnectionType type)
    {
        if (Type != type)
        {
            Type = type;
            UpdateModifiedAt();
        }
    }

    /// <summary>
    /// Updates the strength of the connection.
    /// </summary>
    /// <param name="strength">The new connection strength.</param>
    public void UpdateStrength(ConnectionStrength strength)
    {
        if (Strength != strength)
        {
            Strength = strength;
            UpdateModifiedAt();
        }
    }

    /// <summary>
    /// Updates the active period of the connection.
    /// </summary>
    /// <param name="activePeriod">The new active period for the connection.</param>
    public void UpdateActivePeriod(DateRange? activePeriod)
    {
        bool hasChanged = (ActivePeriod == null && activePeriod != null) ||
                         (ActivePeriod != null && activePeriod == null) ||
                         (ActivePeriod != null && activePeriod != null && !ActivePeriod.Equals(activePeriod));

        if (hasChanged)
        {
            ActivePeriod = activePeriod;
            UpdateModifiedAt();
        }
    }

    /// <summary>
    /// Updates the description of the connection.
    /// </summary>
    /// <param name="description">The new description for the connection.</param>
    public void UpdateDescription(string? description)
    {
        if (Description != description)
        {
            Description = description;
            UpdateModifiedAt();
        }
    }

    /// <summary>
    /// Updates the notes about the connection.
    /// </summary>
    /// <param name="notes">The new notes for the connection.</param>
    public void UpdateNotes(string? notes)
    {
        if (Notes != notes)
        {
            Notes = notes;
            UpdateModifiedAt();
        }
    }

    /// <summary>
    /// Determines if the connection is currently active based on the active period.
    /// </summary>
    /// <returns>true if the connection is active; otherwise, false.</returns>
    public bool IsActive()
    {
        return IsActiveAt(DateTime.UtcNow);
    }

    /// <summary>
    /// Determines if the connection was active at the specified date.
    /// </summary>
    /// <param name="date">The date to check for activity.</param>
    /// <returns>true if the connection was active at the specified date; otherwise, false.</returns>
    public bool IsActiveAt(DateTime date)
    {
        if (ActivePeriod == null)
            return true; // No period specified means always active

        return ActivePeriod.Contains(date);
    }

    /// <summary>
    /// Gets the duration of the connection if an active period is specified.
    /// </summary>
    /// <returns>The duration of the connection, or null if no active period is specified.</returns>
    public TimeSpan? GetDuration()
    {
        return ActivePeriod?.GetDuration();
    }

    /// <summary>
    /// Determines if this connection overlaps with another connection's active period.
    /// </summary>
    /// <param name="other">The other connection to check for overlap.</param>
    /// <returns>true if the connections overlap; otherwise, false.</returns>
    /// <exception cref="ArgumentNullException">Thrown when other connection is null.</exception>
    public bool OverlapsWith(Connection other)
    {
        if (other == null)
            throw new ArgumentNullException(nameof(other));

        // If either connection has no active period, they don't overlap in a temporal sense
        if (ActivePeriod == null || other.ActivePeriod == null)
            return false;

        return ActivePeriod.OverlapsWith(other.ActivePeriod);
    }

    /// <summary>
    /// Determines if this connection involves the specified club (as either source or target).
    /// </summary>
    /// <param name="clubId">The identifier of the club to check.</param>
    /// <returns>true if the connection involves the specified club; otherwise, false.</returns>
    public bool InvolvesClub(int clubId)
    {
        return SourceClubId == clubId || TargetClubId == clubId;
    }

    /// <summary>
    /// Gets the identifier of the other club in the connection (relative to the specified club).
    /// </summary>
    /// <param name="clubId">The identifier of the reference club.</param>
    /// <returns>The identifier of the other club in the connection.</returns>
    /// <exception cref="BusinessRuleValidationException">Thrown when the specified club is not part of this connection.</exception>
    public int GetOtherClubId(int clubId)
    {
        if (SourceClubId == clubId)
            return TargetClubId;

        if (TargetClubId == clubId)
            return SourceClubId;

        throw new BusinessRuleValidationException($"Club {clubId} is not part of this connection.", nameof(clubId));
    }

    /// <summary>
    /// Determines if this connection represents a bidirectional relationship.
    /// </summary>
    /// <returns>true if the connection is bidirectional based on its type; otherwise, false.</returns>
    public bool IsBidirectional()
    {
        return Type switch
        {
            ConnectionType.Partnership => true,
            ConnectionType.Rivalry => true,
            ConnectionType.Friendship => true,
            ConnectionType.PlayerTransfer => false,
            ConnectionType.CoachTransfer => false,
            ConnectionType.LoanAgreement => false,
            _ => false
        };
    }

    private static void ValidateClubIds(int sourceClubId, int targetClubId)
    {
        if (sourceClubId <= 0)
            throw new BusinessRuleValidationException("Source club ID must be positive.", nameof(sourceClubId));

        if (targetClubId <= 0)
            throw new BusinessRuleValidationException("Target club ID must be positive.", nameof(targetClubId));

        if (sourceClubId == targetClubId)
            throw new BusinessRuleValidationException("Source and target clubs cannot be the same.", nameof(targetClubId));
    }
}
