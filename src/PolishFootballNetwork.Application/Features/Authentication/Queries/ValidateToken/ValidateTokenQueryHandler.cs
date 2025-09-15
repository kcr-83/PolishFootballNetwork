using Microsoft.Extensions.Logging;
using PolishFootballNetwork.Application.Common.Interfaces;
using PolishFootballNetwork.Application.Common.Models;

namespace PolishFootballNetwork.Application.Features.Authentication.Queries.ValidateToken;

/// <summary>
/// Handler for validate token query.
/// </summary>
public class ValidateTokenQueryHandler : IQueryHandler<ValidateTokenQuery, Result<TokenValidationResultDto>>
{
    private readonly IAuthenticationService authenticationService;
    private readonly ILogger<ValidateTokenQueryHandler> logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="ValidateTokenQueryHandler"/> class.
    /// </summary>
    /// <param name="authenticationService">The authentication service.</param>
    /// <param name="logger">The logger.</param>
    public ValidateTokenQueryHandler(
        IAuthenticationService authenticationService,
        ILogger<ValidateTokenQueryHandler> logger)
    {
        this.authenticationService = authenticationService ?? throw new ArgumentNullException(nameof(authenticationService));
        this.logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Handles the validate token query.
    /// </summary>
    /// <param name="query">The validate token query.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The token validation result.</returns>
    public async Task<Result<TokenValidationResultDto>> Handle(ValidateTokenQuery query, CancellationToken cancellationToken = default)
    {
        try
        {
            this.logger.LogDebug("Processing token validation request");

            var validationResult = await this.authenticationService.ValidateTokenAsync(query.Token);

            if (validationResult.IsValid)
            {
                this.logger.LogDebug("Token validation successful for user: {UserId}", validationResult.UserId);
            }
            else
            {
                this.logger.LogDebug("Token validation failed: {Message}", validationResult.ErrorMessage);
            }

            var result = new TokenValidationResultDto
            {
                IsValid = validationResult.IsValid,
                ExpiresAt = validationResult.ExpiresAt,
                ErrorMessage = validationResult.ErrorMessage,
                User = validationResult.IsValid && validationResult.UserId.HasValue
                    ? new UserDto { Id = validationResult.UserId.Value, Email = validationResult.UserEmail ?? string.Empty }
                    : null,
            };

            return Result<TokenValidationResultDto>.Success(result);
        }
        catch (Exception ex)
        {
            this.logger.LogError(ex, "Unexpected error during token validation");

            var errorResult = new TokenValidationResultDto
            {
                IsValid = false,
                ErrorMessage = "Token validation failed due to an internal error",
            };

            return Result<TokenValidationResultDto>.Success(errorResult);
        }
    }
}