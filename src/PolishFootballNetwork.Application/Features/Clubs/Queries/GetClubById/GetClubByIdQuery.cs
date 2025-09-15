using PolishFootballNetwork.Application.Common.Interfaces;
using PolishFootballNetwork.Application.Common.Models;
using PolishFootballNetwork.Application.Features.Clubs.Queries.GetClubs;

namespace PolishFootballNetwork.Application.Features.Clubs.Queries.GetClubById;

/// <summary>
/// Query to get a club by its ID.
/// </summary>
public class GetClubByIdQuery : IQuery<Result<ClubDetailDto>>
{
    /// <summary>
    /// Gets or sets the club ID.
    /// </summary>
    public int Id { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether to include connections.
    /// </summary>
    public bool IncludeConnections { get; set; } = false;

    /// <summary>
    /// Initializes a new instance of the GetClubByIdQuery class.
    /// </summary>
    /// <param name="id">The club ID.</param>
    /// <param name="includeConnections">Whether to include connections.</param>
    public GetClubByIdQuery(int id, bool includeConnections = false)
    {
        Id = id;
        IncludeConnections = includeConnections;
    }

    /// <summary>
    /// Initializes a new instance of the GetClubByIdQuery class.
    /// </summary>
    public GetClubByIdQuery()
    {
    }
}
