namespace PolishFootballNetwork.Application.Features.Authentication.Queries.ValidateToken;

using PolishFootballNetwork.Application.Common.Interfaces;
using PolishFootballNetwork.Application.Common.Models;

/// <summary>
/// Query to validate a JWT token and return user information if valid.
/// </summary>
public class ValidateTokenQuery : IQuery<Result<TokenValidationResultDto>>
{
    /// <summary>
    /// Gets or sets the JWT token to validate.
    /// </summary>
    public string Token { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets a value indicating whether to include user details in the response.
    /// </summary>
    public bool IncludeUserDetails { get; set; } = true;

    /// <summary>
    /// Initializes a new instance of the <see cref="ValidateTokenQuery"/> class.
    /// </summary>
    /// <param name="token">The JWT token to validate.</param>
    /// <param name="includeUserDetails">Whether to include user details in the response.</param>
    public ValidateTokenQuery(string token, bool includeUserDetails = true)
    {
        this.Token = token;
        this.IncludeUserDetails = includeUserDetails;
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="ValidateTokenQuery"/> class.
    /// </summary>
    public ValidateTokenQuery()
    {
    }

    /// <summary>
    /// Validates the token query.
    /// </summary>
    /// <returns>True if the query is valid; otherwise, false.</returns>
    public bool IsValid()
    {
        return !string.IsNullOrWhiteSpace(this.Token);
    }
}