using PolishFootballNetwork.Application.Common.Interfaces;
using PolishFootballNetwork.Application.Common.Models;

namespace PolishFootballNetwork.Application.Features.Authentication.Commands.AuthenticateUser;

/// <summary>
/// Command to authenticate a user.
/// </summary>
public class AuthenticateUserCommand : ICommand<Result<AuthenticationResultDto>>
{
    /// <summary>
    /// Gets or sets the username or email.
    /// </summary>
    public string Username { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the password.
    /// </summary>
    public string Password { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the email.
    /// </summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets a value indicating whether to remember the user.
    /// </summary>
    public bool RememberMe { get; set; } = false;

    /// <summary>
    /// Initializes a new instance of the AuthenticateUserCommand class.
    /// </summary>
    /// <param name="username">The username or email.</param>
    /// <param name="password">The password.</param>
    /// <param name="rememberMe">Whether to remember the user.</param>
    public AuthenticateUserCommand(string username, string password, bool rememberMe = false)
    {
        Username = username;
        Password = password;
        RememberMe = rememberMe;
    }

    /// <summary>
    /// Initializes a new instance of the AuthenticateUserCommand class.
    /// </summary>
    public AuthenticateUserCommand()
    {
    }
}

/// <summary>
/// Result of user authentication.
/// </summary>
public class AuthenticationResult
{
    /// <summary>
    /// Gets or sets the access token.
    /// </summary>
    public string AccessToken { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the refresh token.
    /// </summary>
    public string RefreshToken { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the token type (typically "Bearer").
    /// </summary>
    public string TokenType { get; set; } = "Bearer";

    /// <summary>
    /// Gets or sets the token expiration time in seconds.
    /// </summary>
    public int ExpiresIn { get; set; }

    /// <summary>
    /// Gets or sets the user ID.
    /// </summary>
    public int UserId { get; set; }

    /// <summary>
    /// Gets or sets the username.
    /// </summary>
    public string Username { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the user's email.
    /// </summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the user's role.
    /// </summary>
    public string Role { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the user's full name.
    /// </summary>
    public string FullName { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the avatar URL.
    /// </summary>
    public string? AvatarUrl { get; set; }
}
