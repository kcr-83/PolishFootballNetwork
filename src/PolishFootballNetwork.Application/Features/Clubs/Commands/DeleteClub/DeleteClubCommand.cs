using PolishFootballNetwork.Application.Common.Interfaces;
using PolishFootballNetwork.Application.Common.Models;

namespace PolishFootballNetwork.Application.Features.Clubs.Commands.DeleteClub;

/// <summary>
/// Command to delete a club.
/// </summary>
public class DeleteClubCommand : ICommand<Result>
{
    /// <summary>
    /// Gets or sets the ID of the club to delete.
    /// </summary>
    public int Id { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether to perform a hard delete.
    /// If false, the club will be soft deleted (marked as inactive).
    /// </summary>
    public bool HardDelete { get; set; } = false;

    /// <summary>
    /// Gets or sets a value indicating whether to force delete (alias for HardDelete).
    /// </summary>
    public bool ForceDelete
    {
        get => HardDelete;
        set => HardDelete = value;
    }

    /// <summary>
    /// Initializes a new instance of the DeleteClubCommand class.
    /// </summary>
    /// <param name="id">The ID of the club to delete.</param>
    /// <param name="hardDelete">Whether to perform a hard delete.</param>
    public DeleteClubCommand(int id, bool hardDelete = false)
    {
        Id = id;
        HardDelete = hardDelete;
    }

    /// <summary>
    /// Initializes a new instance of the DeleteClubCommand class.
    /// </summary>
    public DeleteClubCommand()
    {
    }
}
