using Microsoft.Extensions.Logging;
using PolishFootballNetwork.Application.Common.Interfaces;
using PolishFootballNetwork.Application.Common.Models;
using PolishFootballNetwork.Application.Features.Authentication.Commands.AuthenticateUser;

namespace PolishFootballNetwork.Application.Features.Authentication.Commands.RefreshToken;

using PolishFootballNetwork.Application.Common.Interfaces;
using PolishFootballNetwork.Application.Common.Models;

/// <summary>
/// Handler for refresh token command.
/// </summary>
public class RefreshTokenCommandHandler : ICommandHandler<RefreshTokenCommand, Result<AuthenticationResultDto>>
{
    private readonly IAuthenticationService authenticationService;
    private readonly ILogger<RefreshTokenCommandHandler> logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="RefreshTokenCommandHandler"/> class.
    /// </summary>
    /// <param name="authenticationService">The authentication service.</param>
    /// <param name="logger">The logger.</param>
    public RefreshTokenCommandHandler(
        IAuthenticationService authenticationService,
        ILogger<RefreshTokenCommandHandler> logger)
    {
        this.authenticationService = authenticationService ?? throw new ArgumentNullException(nameof(authenticationService));
        this.logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Handles the refresh token command.
    /// </summary>
    /// <param name="command">The refresh token command.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The new JWT token pair.</returns>
    public async Task<Result<AuthenticationResultDto>> Handle(RefreshTokenCommand command, CancellationToken cancellationToken = default)
    {
        try
        {
            this.logger.LogInformation("Processing refresh token request");

            var newToken = await this.authenticationService.RefreshTokenAsync(command.RefreshToken);

            var result = new AuthenticationResultDto
            {
                Token = newToken.Value,
                RefreshToken = newToken.RefreshToken,
                ExpiresAt = newToken.ExpiresAt,
                User = new UserDto(), // TODO: Get user information from token
            };

            this.logger.LogInformation("Token refreshed successfully");
            return Result<AuthenticationResultDto>.Success(result);
        }
        catch (Exception ex)
        {
            this.logger.LogError(ex, "Token refresh failed: {Message}", ex.Message);
            return Result<AuthenticationResultDto>.Failure("Invalid or expired refresh token");
        }
    }
}