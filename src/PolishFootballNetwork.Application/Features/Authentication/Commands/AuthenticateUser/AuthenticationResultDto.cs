using PolishFootballNetwork.Domain.Entities;

namespace PolishFootballNetwork.Application.Features.Authentication.Commands.AuthenticateUser;

/// <summary>
/// DTO for authentication result.
/// </summary>
public class AuthenticationResultDto
{
    /// <summary>
    /// Gets or sets the JWT token.
    /// </summary>
    public string Token { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the token expiration time.
    /// </summary>
    public DateTime ExpiresAt { get; set; }

    /// <summary>
    /// Gets or sets the refresh token.
    /// </summary>
    public string? RefreshToken { get; set; }

    /// <summary>
    /// Gets or sets the authenticated user information.
    /// </summary>
    public UserDto User { get; set; } = new();
}

/// <summary>
/// DTO for user information.
/// </summary>
public class UserDto
{
    /// <summary>
    /// Gets or sets the user ID.
    /// </summary>
    public int Id { get; set; }

    /// <summary>
    /// Gets or sets the user email.
    /// </summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the user's first name.
    /// </summary>
    public string? FirstName { get; set; }

    /// <summary>
    /// Gets or sets the user's last name.
    /// </summary>
    public string? LastName { get; set; }

    /// <summary>
    /// Gets or sets the user's role.
    /// </summary>
    public string Role { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets a value indicating whether the user is active.
    /// </summary>
    public bool IsActive { get; set; }

    /// <summary>
    /// Gets or sets the user's last login time.
    /// </summary>
    public DateTime? LastLoginAt { get; set; }

    /// <summary>
    /// Gets or sets the user creation date.
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Creates a UserDto from a domain User entity.
    /// </summary>
    /// <param name="user">The domain user entity.</param>
    /// <returns>A UserDto instance.</returns>
    public static UserDto FromDomain(User user)
    {
        return new UserDto
        {
            Id = user.Id,
            Email = user.Email,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Role = user.Role.ToString(),
            IsActive = user.IsActive,
            LastLoginAt = user.LastLoginAt,
            CreatedAt = user.CreatedAt
        };
    }
}
