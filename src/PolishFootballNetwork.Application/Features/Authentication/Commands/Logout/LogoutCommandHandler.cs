using Microsoft.Extensions.Logging;
using PolishFootballNetwork.Application.Common.Interfaces;
using PolishFootballNetwork.Application.Common.Models;

namespace PolishFootballNetwork.Application.Features.Authentication.Commands.Logout;

/// <summary>
/// Handler for logout command.
/// </summary>
public class LogoutCommandHandler : ICommandHandler<LogoutCommand, Result<bool>>
{
    private readonly IAuthenticationService authenticationService;
    private readonly ILogger<LogoutCommandHandler> logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="LogoutCommandHandler"/> class.
    /// </summary>
    /// <param name="authenticationService">The authentication service.</param>
    /// <param name="logger">The logger.</param>
    public LogoutCommandHandler(
        IAuthenticationService authenticationService,
        ILogger<LogoutCommandHandler> logger)
    {
        this.authenticationService = authenticationService ?? throw new ArgumentNullException(nameof(authenticationService));
        this.logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Handles the logout command.
    /// </summary>
    /// <param name="command">The logout command.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>True if logout was successful; otherwise, false.</returns>
    public async Task<Result<bool>> Handle(LogoutCommand command, CancellationToken cancellationToken = default)
    {
        try
        {
            this.logger.LogInformation("Processing logout request");

            var result = await this.authenticationService.RevokeRefreshTokenAsync(command.RefreshToken ?? string.Empty);

            if (result)
            {
                this.logger.LogInformation("User logged out successfully");
                return Result<bool>.Success(true);
            }
            else
            {
                this.logger.LogWarning("Logout attempt with invalid or already revoked token");
                return Result<bool>.Success(false);
            }
        }
        catch (Exception ex)
        {
            this.logger.LogError(ex, "Unexpected error during logout");
            return Result<bool>.Failure("Logout failed");
        }
    }
}