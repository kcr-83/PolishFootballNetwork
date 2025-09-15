using FluentValidation;
using Microsoft.Extensions.Logging;
using PolishFootballNetwork.Application.Common.Interfaces;
using PolishFootballNetwork.Application.Common.Models;
using PolishFootballNetwork.Application.Features.Authentication.Commands.AuthenticateUser;
using PolishFootballNetwork.Domain.Exceptions;
using PolishFootballNetwork.Domain.Repositories;

namespace PolishFootballNetwork.Application.Features.Authentication.Commands.AuthenticateUser;

/// <summary>
/// Validator for AuthenticateUserCommand.
/// </summary>
public class AuthenticateUserCommandValidator : AbstractValidator<AuthenticateUserCommand>
{
    public AuthenticateUserCommandValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty()
            .WithMessage("Email is required.")
            .EmailAddress()
            .WithMessage("Email must be a valid email address.")
            .MaximumLength(255)
            .WithMessage("Email must not exceed 255 characters.");

        RuleFor(x => x.Password)
            .NotEmpty()
            .WithMessage("Password is required.")
            .MinimumLength(6)
            .WithMessage("Password must be at least 6 characters long.")
            .MaximumLength(100)
            .WithMessage("Password must not exceed 100 characters.");
    }
}

/// <summary>
/// Handler for AuthenticateUserCommand.
/// </summary>
public class AuthenticateUserCommandHandler : ICommandHandler<AuthenticateUserCommand, Result<AuthenticationResultDto>>
{
    private readonly IUserRepository _userRepository;
    private readonly IAuthenticationService _authenticationService;
    private readonly IValidator<AuthenticateUserCommand> _validator;
    private readonly ILogger<AuthenticateUserCommandHandler> _logger;

    public AuthenticateUserCommandHandler(
        IUserRepository userRepository,
        IAuthenticationService authenticationService,
        IValidator<AuthenticateUserCommand> validator,
        ILogger<AuthenticateUserCommandHandler> logger)
    {
        _userRepository = userRepository ?? throw new ArgumentNullException(nameof(userRepository));
        _authenticationService = authenticationService ?? throw new ArgumentNullException(nameof(authenticationService));
        _validator = validator ?? throw new ArgumentNullException(nameof(validator));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<Result<AuthenticationResultDto>> Handle(AuthenticateUserCommand request, CancellationToken cancellationToken)
    {
        try
        {
            _logger.LogInformation("Processing authentication request for email: {Email}", request.Email);

            // Validate the command
            var validationResult = await _validator.ValidateAsync(request, cancellationToken);
            if (!validationResult.IsValid)
            {
                var errors = validationResult.Errors.Select(e => e.ErrorMessage).ToList();
                _logger.LogWarning("Validation failed for authentication request: {Errors}", string.Join(", ", errors));
                return Result<AuthenticationResultDto>.Failure(errors);
            }

            // Check if user exists
            var user = await _userRepository.GetByEmailAsync(request.Email, cancellationToken);
            if (user == null)
            {
                _logger.LogWarning("Authentication failed - user not found: {Email}", request.Email);
                return Result<AuthenticationResultDto>.Failure("Invalid email or password.");
            }

            // Verify password
            var isPasswordValid = await _authenticationService.VerifyPasswordAsync(request.Password, user.PasswordHash);
            if (!isPasswordValid)
            {
                _logger.LogWarning("Authentication failed - invalid password for user: {Email}", request.Email);
                return Result<AuthenticationResultDto>.Failure("Invalid email or password.");
            }

            // Check if user is active
            if (!user.IsActive)
            {
                _logger.LogWarning("Authentication failed - user account is inactive: {Email}", request.Email);
                return Result<AuthenticationResultDto>.Failure("Your account has been deactivated. Please contact support.");
            }

            // Generate JWT token
            var token = await _authenticationService.GenerateTokenAsync(user);

            // Update last login time
            user.UpdateLastLoginTime();
            await _userRepository.UpdateAsync(user, cancellationToken);

            var result = new AuthenticationResultDto
            {
                Token = token.Value,
                ExpiresAt = token.ExpiresAt,
                User = UserDto.FromDomain(user)
            };

            _logger.LogInformation("Authentication successful for user: {Email}", request.Email);
            return Result<AuthenticationResultDto>.Success(result);
        }
        catch (DomainException ex)
        {
            _logger.LogWarning(ex, "Domain validation error during authentication for email: {Email}", request.Email);
            return Result<AuthenticationResultDto>.Failure(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error during authentication for email: {Email}", request.Email);
            return Result<AuthenticationResultDto>.Failure("An unexpected error occurred during authentication.");
        }
    }
}
