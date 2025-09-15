using PolishFootballNetwork.Application.Common.Interfaces;
using PolishFootballNetwork.Application.Common.Models;

namespace PolishFootballNetwork.Application.Features.Connections.Commands.DeleteConnection;

/// <summary>
/// Command to delete a connection between clubs.
/// </summary>
public class DeleteConnectionCommand : ICommand<Result>
{
    /// <summary>
    /// Gets or sets the ID of the connection to delete.
    /// </summary>
    public int Id { get; set; }

    /// <summary>
    /// Initializes a new instance of the DeleteConnectionCommand class.
    /// </summary>
    /// <param name="id">The ID of the connection to delete.</param>
    public DeleteConnectionCommand(int id)
    {
        Id = id;
    }

    /// <summary>
    /// Initializes a new instance of the DeleteConnectionCommand class.
    /// </summary>
    public DeleteConnectionCommand()
    {
    }
}
