using PolishFootballNetwork.Domain.Common;
using PolishFootballNetwork.Domain.Enums;
using PolishFootballNetwork.Domain.Events;
using PolishFootballNetwork.Domain.Exceptions;
using PolishFootballNetwork.Domain.ValueObjects;

namespace PolishFootballNetwork.Domain.Entities;

/// <summary>
/// Represents a football club in the Polish football network.
/// Contains information about the club's identity, location, league participation, and visual representation.
/// </summary>
public class Club : Entity
{
    private readonly List<Connection> _connections = new();

    /// <summary>
    /// Gets the name of the club.
    /// </summary>
    public string Name { get; private set; }

    /// <summary>
    /// Gets the city where the club is located.
    /// </summary>
    public string City { get; private set; }

    /// <summary>
    /// Gets the league type in which the club participates.
    /// </summary>
    public LeagueType League { get; private set; }

    /// <summary>
    /// Gets the position of the club on the visualization map.
    /// </summary>
    public Point2D Position { get; private set; }

    /// <summary>
    /// Gets or sets the description of the club.
    /// </summary>
    public string? Description { get; private set; }

    /// <summary>
    /// Gets or sets the URL of the club's logo image.
    /// </summary>
    public string? LogoUrl { get; private set; }

    /// <summary>
    /// Gets or sets the club's official website URL.
    /// </summary>
    public string? Website { get; private set; }

    /// <summary>
    /// Gets or sets the year when the club was founded.
    /// </summary>
    public int? FoundedYear { get; private set; }

    /// <summary>
    /// Gets or sets the name of the club's home stadium.
    /// </summary>
    public string? Stadium { get; private set; }

    /// <summary>
    /// Gets a read-only collection of connections from this club to other clubs.
    /// </summary>
    public IReadOnlyCollection<Connection> Connections => _connections.AsReadOnly();

    /// <summary>
    /// Initializes a new instance of the Club class. Used by EF Core.
    /// </summary>
    private Club() : base()
    {
        Name = string.Empty;
        City = string.Empty;
        Position = Point2D.Zero;
    }

    /// <summary>
    /// Initializes a new instance of the Club class with the specified parameters.
    /// </summary>
    /// <param name="name">The name of the club.</param>
    /// <param name="city">The city where the club is located.</param>
    /// <param name="league">The league type in which the club participates.</param>
    /// <param name="position">The position of the club on the visualization map.</param>
    /// <exception cref="BusinessRuleValidationException">Thrown when validation fails.</exception>
    public Club(string name, string city, LeagueType league, Point2D position)
    {
        SetName(name);
        SetCity(city);
        League = league;
        Position = position ?? throw new ArgumentNullException(nameof(position));
        
        AddDomainEvent(new ClubCreatedEvent(Id, Name, League.ToString()));
    }

    /// <summary>
    /// Updates the club's name.
    /// </summary>
    /// <param name="name">The new name for the club.</param>
    /// <exception cref="BusinessRuleValidationException">Thrown when the name is invalid.</exception>
    public void UpdateName(string name)
    {
        string oldName = Name;
        SetName(name);
        
        if (oldName != Name)
        {
            UpdateModifiedAt();
            AddDomainEvent(new ClubUpdatedEvent(Id, Name, new[] { nameof(Name) }));
        }
    }

    /// <summary>
    /// Updates the club's city.
    /// </summary>
    /// <param name="city">The new city for the club.</param>
    /// <exception cref="BusinessRuleValidationException">Thrown when the city is invalid.</exception>
    public void UpdateCity(string city)
    {
        string oldCity = City;
        SetCity(city);
        
        if (oldCity != City)
        {
            UpdateModifiedAt();
            AddDomainEvent(new ClubUpdatedEvent(Id, Name, new[] { nameof(City) }));
        }
    }

    /// <summary>
    /// Updates the club's league.
    /// </summary>
    /// <param name="league">The new league for the club.</param>
    public void UpdateLeague(LeagueType league)
    {
        if (League != league)
        {
            League = league;
            UpdateModifiedAt();
            AddDomainEvent(new ClubUpdatedEvent(Id, Name, new[] { nameof(League) }));
        }
    }

    /// <summary>
    /// Updates the club's position on the visualization map.
    /// </summary>
    /// <param name="position">The new position for the club.</param>
    /// <exception cref="ArgumentNullException">Thrown when position is null.</exception>
    public void UpdatePosition(Point2D position)
    {
        if (position == null)
            throw new ArgumentNullException(nameof(position));

        if (!Position.Equals(position))
        {
            Position = position;
            UpdateModifiedAt();
            AddDomainEvent(new ClubUpdatedEvent(Id, Name, new[] { nameof(Position) }));
        }
    }

    /// <summary>
    /// Updates the club's description.
    /// </summary>
    /// <param name="description">The new description for the club.</param>
    public void UpdateDescription(string? description)
    {
        if (Description != description)
        {
            Description = description;
            UpdateModifiedAt();
            AddDomainEvent(new ClubUpdatedEvent(Id, Name, new[] { nameof(Description) }));
        }
    }

    /// <summary>
    /// Updates the club's logo URL.
    /// </summary>
    /// <param name="logoUrl">The new logo URL for the club.</param>
    public void UpdateLogoUrl(string? logoUrl)
    {
        if (LogoUrl != logoUrl)
        {
            LogoUrl = logoUrl;
            UpdateModifiedAt();
            AddDomainEvent(new ClubUpdatedEvent(Id, Name, new[] { nameof(LogoUrl) }));
        }
    }

    /// <summary>
    /// Updates the club's website URL.
    /// </summary>
    /// <param name="website">The new website URL for the club.</param>
    public void UpdateWebsite(string? website)
    {
        if (Website != website)
        {
            Website = website;
            UpdateModifiedAt();
            AddDomainEvent(new ClubUpdatedEvent(Id, Name, new[] { nameof(Website) }));
        }
    }

    /// <summary>
    /// Updates the year when the club was founded.
    /// </summary>
    /// <param name="foundedYear">The year when the club was founded.</param>
    /// <exception cref="BusinessRuleValidationException">Thrown when the founded year is invalid.</exception>
    public void UpdateFoundedYear(int? foundedYear)
    {
        if (foundedYear.HasValue && (foundedYear.Value < 1800 || foundedYear.Value > DateTime.UtcNow.Year))
        {
            throw new BusinessRuleValidationException(
                $"Founded year must be between 1800 and {DateTime.UtcNow.Year}.", 
                nameof(FoundedYear));
        }

        if (FoundedYear != foundedYear)
        {
            FoundedYear = foundedYear;
            UpdateModifiedAt();
            AddDomainEvent(new ClubUpdatedEvent(Id, Name, new[] { nameof(FoundedYear) }));
        }
    }

    /// <summary>
    /// Updates the club's home stadium name.
    /// </summary>
    /// <param name="stadium">The new stadium name for the club.</param>
    public void UpdateStadium(string? stadium)
    {
        if (Stadium != stadium)
        {
            Stadium = stadium;
            UpdateModifiedAt();
            AddDomainEvent(new ClubUpdatedEvent(Id, Name, new[] { nameof(Stadium) }));
        }
    }

    /// <summary>
    /// Adds a connection from this club to another club.
    /// </summary>
    /// <param name="connection">The connection to add.</param>
    /// <exception cref="ArgumentNullException">Thrown when connection is null.</exception>
    /// <exception cref="BusinessRuleValidationException">Thrown when the connection is invalid.</exception>
    internal void AddConnection(Connection connection)
    {
        if (connection == null)
            throw new ArgumentNullException(nameof(connection));

        if (connection.SourceClubId != Id)
            throw new BusinessRuleValidationException("Connection source club must match this club.", nameof(Connection));

        if (_connections.Any(c => c.TargetClubId == connection.TargetClubId))
            throw new BusinessRuleValidationException($"Connection to club {connection.TargetClubId} already exists.", nameof(Connection));

        _connections.Add(connection);
    }

    /// <summary>
    /// Removes a connection from this club.
    /// </summary>
    /// <param name="connection">The connection to remove.</param>
    /// <exception cref="ArgumentNullException">Thrown when connection is null.</exception>
    internal void RemoveConnection(Connection connection)
    {
        if (connection == null)
            throw new ArgumentNullException(nameof(connection));

        _connections.Remove(connection);
    }

    /// <summary>
    /// Calculates the distance to another club based on their positions.
    /// </summary>
    /// <param name="other">The other club to calculate distance to.</param>
    /// <returns>The distance between the two clubs.</returns>
    /// <exception cref="ArgumentNullException">Thrown when other club is null.</exception>
    public double CalculateDistanceTo(Club other)
    {
        if (other == null)
            throw new ArgumentNullException(nameof(other));

        return Position.DistanceTo(other.Position);
    }

    /// <summary>
    /// Determines if this club has a connection to the specified club.
    /// </summary>
    /// <param name="targetClubId">The identifier of the target club.</param>
    /// <returns>true if a connection exists; otherwise, false.</returns>
    public bool HasConnectionTo(int targetClubId)
    {
        return _connections.Any(c => c.TargetClubId == targetClubId);
    }

    /// <summary>
    /// Gets the connection to the specified club, if it exists.
    /// </summary>
    /// <param name="targetClubId">The identifier of the target club.</param>
    /// <returns>The connection to the target club, or null if no connection exists.</returns>
    public Connection? GetConnectionTo(int targetClubId)
    {
        return _connections.FirstOrDefault(c => c.TargetClubId == targetClubId);
    }

    private void SetName(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new BusinessRuleValidationException("Club name cannot be empty.", nameof(Name));

        if (name.Length > 100)
            throw new BusinessRuleValidationException("Club name cannot exceed 100 characters.", nameof(Name));

        Name = name.Trim();
    }

    private void SetCity(string city)
    {
        if (string.IsNullOrWhiteSpace(city))
            throw new BusinessRuleValidationException("Club city cannot be empty.", nameof(City));

        if (city.Length > 50)
            throw new BusinessRuleValidationException("Club city cannot exceed 50 characters.", nameof(City));

        City = city.Trim();
    }
}
