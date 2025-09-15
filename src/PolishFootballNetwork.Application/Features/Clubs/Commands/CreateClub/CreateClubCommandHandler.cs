using FluentValidation;
using Microsoft.Extensions.Logging;
using PolishFootballNetwork.Application.Common.Interfaces;
using PolishFootballNetwork.Application.Common.Models;
using PolishFootballNetwork.Application.Features.Clubs.Commands.CreateClub;
using PolishFootballNetwork.Application.Features.Clubs.Queries.GetClubs;
using PolishFootballNetwork.Domain.Entities;
using PolishFootballNetwork.Domain.Exceptions;
using PolishFootballNetwork.Domain.Repositories;
using PolishFootballNetwork.Domain.ValueObjects;

namespace PolishFootballNetwork.Application.Features.Clubs.Commands.CreateClub;

/// <summary>
/// Validator for CreateClubCommand.
/// </summary>
public class CreateClubCommandValidator : AbstractValidator<CreateClubCommand>
{
    public CreateClubCommandValidator()
    {
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
/// Handler for CreateClubCommand.
/// </summary>
public class CreateClubCommandHandler : ICommandHandler<CreateClubCommand, Result<ClubDto>>
{
    private readonly IClubRepository _clubRepository;
    private readonly IValidator<CreateClubCommand> _validator;
    private readonly ILogger<CreateClubCommandHandler> _logger;

    public CreateClubCommandHandler(
        IClubRepository clubRepository,
        IValidator<CreateClubCommand> validator,
        ILogger<CreateClubCommandHandler> logger)
    {
        _clubRepository = clubRepository ?? throw new ArgumentNullException(nameof(clubRepository));
        _validator = validator ?? throw new ArgumentNullException(nameof(validator));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<Result<ClubDto>> Handle(CreateClubCommand request, CancellationToken cancellationToken)
    {
        try
        {
            _logger.LogInformation("Processing create club request for: {ClubName}", request.Name);

            // Validate the command
            var validationResult = await _validator.ValidateAsync(request, cancellationToken);
            if (!validationResult.IsValid)
            {
                var errors = validationResult.Errors.Select(e => e.ErrorMessage).ToList();
                _logger.LogWarning("Validation failed for create club request: {Errors}", string.Join(", ", errors));
                return Result<ClubDto>.Failure(errors);
            }

            // Check if club with the same name already exists
            var existingClub = await _clubRepository.GetByNameAsync(request.Name, cancellationToken);
            if (existingClub != null)
            {
                _logger.LogWarning("Club creation failed - club with name already exists: {ClubName}", request.Name);
                return Result<ClubDto>.Failure($"A club with the name '{request.Name}' already exists.");
            }

            // Check if club with the same short name already exists
            if (!string.IsNullOrWhiteSpace(request.ShortName))
            {
                var existingShortName = await _clubRepository.GetByShortNameAsync(request.ShortName, cancellationToken);
                if (existingShortName != null)
                {
                    _logger.LogWarning("Club creation failed - club with short name already exists: {ShortName}", request.ShortName);
                    return Result<ClubDto>.Failure($"A club with the short name '{request.ShortName}' already exists.");
                }
            }

            // Create the club entity
            var slug = request.Slug ?? request.Name.ToLowerInvariant().Replace(" ", "-");
            var country = request.Country ?? "Poland"; // Default to Poland
            var position = request.GetPosition() ?? Point2D.Origin(); // Use origin if no position provided

            var club = new Club(
                name: request.Name,
                slug: slug,
                league: request.League,
                country: country,
                city: request.City,
                position: position
            );

            // Set optional properties
            if (request.Founded.HasValue)
            {
                club.UpdateFounded(request.Founded.Value);
            }

            if (!string.IsNullOrWhiteSpace(request.ShortName))
            {
                club.UpdateShortName(request.ShortName);
            }

            if (!string.IsNullOrWhiteSpace(request.Stadium))
            {
                club.UpdateStadium(request.Stadium);
            }

            if (!string.IsNullOrWhiteSpace(request.Website))
            {
                club.UpdateWebsite(request.Website);
            }

            if (!string.IsNullOrWhiteSpace(request.Colors))
            {
                club.UpdateColors(request.Colors);
            }

            if (!string.IsNullOrWhiteSpace(request.Description))
            {
                club.UpdateDescription(request.Description);
            }

            if (!string.IsNullOrWhiteSpace(request.Nickname))
            {
                club.UpdateNickname(request.Nickname);
            }

            if (!string.IsNullOrWhiteSpace(request.Motto))
            {
                club.UpdateMotto(request.Motto);
            }

            if (!string.IsNullOrWhiteSpace(request.Region))
            {
                club.UpdateRegion(request.Region);
            }

            if (!string.IsNullOrWhiteSpace(request.Metadata))
            {
                club.UpdateMetadata(request.Metadata);
            }

            if (request.IsVerified)
            {
                club.Verify();
            }

            if (request.IsFeatured)
            {
                club.Feature();
            }

            if (!request.IsActive)
            {
                club.Deactivate();
            }

            // Save the club
            await _clubRepository.AddAsync(club, cancellationToken);

            var result = ClubDto.FromDomain(club);

            _logger.LogInformation("Club created successfully: {ClubId} - {ClubName}", club.Id, club.Name);
            return Result<ClubDto>.Success(result);
        }
        catch (DomainException ex)
        {
            _logger.LogWarning(ex, "Domain validation error during club creation: {ClubName}", request.Name);
            return Result<ClubDto>.Failure(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error during club creation: {ClubName}", request.Name);
            return Result<ClubDto>.Failure("An unexpected error occurred while creating the club.");
        }
    }
}
