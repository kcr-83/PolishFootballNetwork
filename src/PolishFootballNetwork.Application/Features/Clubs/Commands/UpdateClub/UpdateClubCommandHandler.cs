using FluentValidation;
using Microsoft.Extensions.Logging;
using PolishFootballNetwork.Application.Common.Interfaces;
using PolishFootballNetwork.Application.Common.Models;
using PolishFootballNetwork.Application.Features.Clubs.Commands.UpdateClub;
using PolishFootballNetwork.Application.Features.Clubs.Queries.GetClubs;
using PolishFootballNetwork.Domain.Exceptions;
using PolishFootballNetwork.Domain.Repositories;

namespace PolishFootballNetwork.Application.Features.Clubs.Commands.UpdateClub;

/// <summary>
/// Validator for UpdateClubCommand.
/// </summary>
public class UpdateClubCommandValidator : AbstractValidator<UpdateClubCommand>
{
    public UpdateClubCommandValidator()
    {
        RuleFor(x => x.Id)
            .NotEmpty()
            .WithMessage("Club ID is required.");

        RuleFor(x => x.Name)
            .NotEmpty()
            .WithMessage("Club name is required.")
            .MinimumLength(2)
            .WithMessage("Club name must be at least 2 characters long.")
            .MaximumLength(100)
            .WithMessage("Club name must not exceed 100 characters.")
            .Matches(@"^[a-zA-Z0-9\s\-\.]+$")
            .WithMessage("Club name can only contain letters, numbers, spaces, hyphens, and dots.");

        RuleFor(x => x.ShortName)
            .NotEmpty()
            .WithMessage("Short name is required.")
            .MinimumLength(2)
            .WithMessage("Short name must be at least 2 characters long.")
            .MaximumLength(10)
            .WithMessage("Short name must not exceed 10 characters.")
            .Matches(@"^[a-zA-Z0-9]+$")
            .WithMessage("Short name can only contain letters and numbers.");

        RuleFor(x => x.League)
            .IsInEnum()
            .WithMessage("Invalid league specified.");

        RuleFor(x => x.FoundedYear)
            .GreaterThan(1850)
            .WithMessage("Founded year must be after 1850.")
            .LessThanOrEqualTo(DateTime.Now.Year)
            .WithMessage("Founded year cannot be in the future.");

        RuleFor(x => x.City)
            .NotEmpty()
            .WithMessage("City is required.")
            .MaximumLength(50)
            .WithMessage("City must not exceed 50 characters.");

        RuleFor(x => x.Stadium)
            .MaximumLength(100)
            .WithMessage("Stadium name must not exceed 100 characters.");

        RuleFor(x => x.Website)
            .Must(BeValidUrlOrEmpty)
            .WithMessage("Website must be a valid URL.");

        RuleFor(x => x.Description)
            .MaximumLength(1000)
            .WithMessage("Description must not exceed 1000 characters.");

        RuleFor(x => x.Latitude)
            .InclusiveBetween(-90.0, 90.0)
            .WithMessage("Latitude must be between -90 and 90 degrees.");

        RuleFor(x => x.Longitude)
            .InclusiveBetween(-180.0, 180.0)
            .WithMessage("Longitude must be between -180 and 180 degrees.");

        RuleFor(x => x.Colors)
            .Must(colors => colors == null || colors.Count <= 3)
            .WithMessage("A club can have at most 3 colors.")
            .Must(colors => colors == null || colors.All(IsValidHexColor))
            .WithMessage("All colors must be valid hex color codes.");
    }

    private static bool BeValidUrlOrEmpty(string? url)
    {
        if (string.IsNullOrWhiteSpace(url))
            return true;

        return Uri.TryCreate(url, UriKind.Absolute, out var result)
               && (result.Scheme == Uri.UriSchemeHttp || result.Scheme == Uri.UriSchemeHttps);
    }

    private static bool IsValidHexColor(string color)
    {
        if (string.IsNullOrWhiteSpace(color))
            return false;

        return System.Text.RegularExpressions.Regex.IsMatch(color, @"^#[0-9A-Fa-f]{6}$");
    }
}

/// <summary>
/// Handler for UpdateClubCommand.
/// </summary>
public class UpdateClubCommandHandler : ICommandHandler<UpdateClubCommand, Result<ClubDto>>
{
    private readonly IClubRepository _clubRepository;
    private readonly IValidator<UpdateClubCommand> _validator;
    private readonly ILogger<UpdateClubCommandHandler> _logger;

    public UpdateClubCommandHandler(
        IClubRepository clubRepository,
        IValidator<UpdateClubCommand> validator,
        ILogger<UpdateClubCommandHandler> logger)
    {
        _clubRepository = clubRepository ?? throw new ArgumentNullException(nameof(clubRepository));
        _validator = validator ?? throw new ArgumentNullException(nameof(validator));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<Result<ClubDto>> Handle(UpdateClubCommand request, CancellationToken cancellationToken)
    {
        try
        {
            _logger.LogInformation("Processing update club request for: {ClubId}", request.Id);

            // Validate the command
            var validationResult = await _validator.ValidateAsync(request, cancellationToken);
            if (!validationResult.IsValid)
            {
                var errors = validationResult.Errors.Select(e => e.ErrorMessage).ToList();
                _logger.LogWarning("Validation failed for update club request: {Errors}", string.Join(", ", errors));
                return Result<ClubDto>.Failure(errors);
            }

            // Get the existing club
            var club = await _clubRepository.GetByIdAsync(request.Id, cancellationToken);
            if (club == null)
            {
                _logger.LogWarning("Club update failed - club not found: {ClubId}", request.Id);
                return Result<ClubDto>.Failure($"Club with ID '{request.Id}' not found.");
            }

            // Check if another club with the same name already exists (excluding current club)
            var existingClub = await _clubRepository.GetByNameAsync(request.Name, cancellationToken);
            if (existingClub != null && existingClub.Id != request.Id)
            {
                _logger.LogWarning("Club update failed - club with name already exists: {ClubName}", request.Name);
                return Result<ClubDto>.Failure($"A club with the name '{request.Name}' already exists.");
            }

            // Check if another club with the same short name already exists (excluding current club)
            var existingShortName = await _clubRepository.GetByShortNameAsync(request.ShortName, cancellationToken);
            if (existingShortName != null && existingShortName.Id != request.Id)
            {
                _logger.LogWarning("Club update failed - club with short name already exists: {ShortName}", request.ShortName);
                return Result<ClubDto>.Failure($"A club with the short name '{request.ShortName}' already exists.");
            }

            // Update club properties
            club.UpdateName(request.Name);
            club.UpdateShortName(request.ShortName);
            club.UpdateLeague(request.League);
            club.UpdateFounded(request.FoundedYear);
            club.UpdateCity(request.City);
            
            if (request.GetPosition() != null)
            {
                club.UpdatePosition(request.GetPosition());
            }

            // Update optional properties
            if (!string.IsNullOrWhiteSpace(request.Stadium))
            {
                club.UpdateStadium(request.Stadium);
            }

            if (!string.IsNullOrWhiteSpace(request.Website))
            {
                club.UpdateWebsite(request.Website);
            }

            if (!string.IsNullOrWhiteSpace(request.Description))
            {
                club.UpdateDescription(request.Description);
            }

            if (!string.IsNullOrWhiteSpace(request.Colors))
            {
                club.UpdateColors(request.Colors);
            }

            // Update status flags
            if (request.IsVerified && !club.IsVerified)
            {
                club.Verify();
            }
            else if (!request.IsVerified && club.IsVerified)
            {
                club.Unverify();
            }

            if (request.IsFeatured && !club.IsFeatured)
            {
                club.Feature();
            }
            else if (!request.IsFeatured && club.IsFeatured)
            {
                club.Unfeature();
            }

            if (request.IsActive && !club.IsActive)
            {
                club.Activate();
            }
            else if (!request.IsActive && club.IsActive)
            {
                club.Deactivate();
            }

            // Save the updated club
            await _clubRepository.UpdateAsync(club, cancellationToken);

            var result = ClubDto.FromDomain(club);

            _logger.LogInformation("Club updated successfully: {ClubId} - {ClubName}", club.Id, club.Name);
            return Result<ClubDto>.Success(result);
        }
        catch (DomainException ex)
        {
            _logger.LogWarning(ex, "Domain validation error during club update: {ClubId}", request.Id);
            return Result<ClubDto>.Failure(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error during club update: {ClubId}", request.Id);
            return Result<ClubDto>.Failure("An unexpected error occurred while updating the club.");
        }
    }
}
