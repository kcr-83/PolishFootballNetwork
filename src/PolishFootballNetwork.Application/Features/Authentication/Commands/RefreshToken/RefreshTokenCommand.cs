using PolishFootballNetwork.Application.Common.Interfaces;
using PolishFootballNetwork.Application.Common.Models;
using PolishFootballNetwork.Application.Features.Authentication.Commands.AuthenticateUser;

namespace PolishFootballNetwork.Application.Features.Authentication.Commands.RefreshToken;

/// <summary>
/// Command to refresh an expired JWT token using a valid refresh token.
/// </summary>
public class RefreshTokenCommand : ICommand<Result<AuthenticationResultDto>>
{
    /// <summary>
    /// Gets or sets the refresh token.
    /// </summary>
    public string RefreshToken { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the expired or soon-to-expire access token.
    /// </summary>
    public string AccessToken { get; set; } = string.Empty;

    /// <summary>
    /// Initializes a new instance of the RefreshTokenCommand class.
    /// </summary>
    /// <param name="refreshToken">The refresh token.</param>
    /// <param name="accessToken">The access token.</param>
    public RefreshTokenCommand(string refreshToken, string accessToken)
    {
        RefreshToken = refreshToken;
        AccessToken = accessToken;
    }

    /// <summary>
    /// Initializes a new instance of the RefreshTokenCommand class.
    /// </summary>
    public RefreshTokenCommand()
    {
    }

    /// <summary>
    /// Validates the refresh token command.
    /// </summary>
    /// <returns>True if the command is valid; otherwise, false.</returns>
    public bool IsValid()
    {
        return !string.IsNullOrWhiteSpace(RefreshToken) && 
               !string.IsNullOrWhiteSpace(AccessToken);
    }
}