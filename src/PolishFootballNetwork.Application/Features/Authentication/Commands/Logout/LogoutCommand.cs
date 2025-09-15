using PolishFootballNetwork.Application.Common.Interfaces;
using PolishFootballNetwork.Application.Common.Models;

namespace PolishFootballNetwork.Application.Features.Authentication.Commands.Logout;

/// <summary>
/// Command to logout a user and invalidate their tokens.
/// </summary>
public class LogoutCommand : ICommand<Result<bool>>
{
    /// <summary>
    /// Gets or sets the user ID to logout.
    /// </summary>
    public int UserId { get; set; }

    /// <summary>
    /// Gets or sets the refresh token to invalidate.
    /// </summary>
    public string? RefreshToken { get; set; }

    /// <summary>
    /// Gets or sets the access token to invalidate.
    /// </summary>
    public string? AccessToken { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether to logout from all devices.
    /// </summary>
    public bool LogoutFromAllDevices { get; set; } = false;

    /// <summary>
    /// Initializes a new instance of the LogoutCommand class.
    /// </summary>
    /// <param name="userId">The user ID to logout.</param>
    /// <param name="refreshToken">The refresh token to invalidate.</param>
    /// <param name="accessToken">The access token to invalidate.</param>
    /// <param name="logoutFromAllDevices">Whether to logout from all devices.</param>
    public LogoutCommand(int userId, string? refreshToken = null, string? accessToken = null, bool logoutFromAllDevices = false)
    {
        UserId = userId;
        RefreshToken = refreshToken;
        AccessToken = accessToken;
        LogoutFromAllDevices = logoutFromAllDevices;
    }

    /// <summary>
    /// Initializes a new instance of the LogoutCommand class.
    /// </summary>
    public LogoutCommand()
    {
    }

    /// <summary>
    /// Validates the logout command.
    /// </summary>
    /// <returns>True if the command is valid; otherwise, false.</returns>
    public bool IsValid()
    {
        return UserId > 0;
    }
}