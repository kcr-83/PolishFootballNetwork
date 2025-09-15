using FluentValidation;
using Microsoft.Extensions.Logging;
using PolishFootballNetwork.Application.Common.Interfaces;
using PolishFootballNetwork.Application.Common.Models;
using PolishFootballNetwork.Application.Features.Clubs.Commands.UploadLogo;
using PolishFootballNetwork.Domain.Exceptions;
using PolishFootballNetwork.Domain.Repositories;

namespace PolishFootballNetwork.Application.Features.Clubs.Commands.UploadLogo;

/// <summary>
/// Validator for UploadLogoCommand.
/// </summary>
public class UploadLogoCommandValidator : AbstractValidator<UploadLogoCommand>
{
    private readonly IReadOnlyList<string> _allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
    private const int MaxFileSizeBytes = 5 * 1024 * 1024; // 5MB

    public UploadLogoCommandValidator()
    {
        RuleFor(x => x.ClubId)
            .NotEmpty()
            .WithMessage("Club ID is required.");

        RuleFor(x => x.FileName)
            .NotEmpty()
            .WithMessage("File name is required.")
            .Must(HaveValidExtension)
            .WithMessage($"File must have one of the following extensions: {string.Join(", ", _allowedExtensions)}");

        RuleFor(x => x.ContentType)
            .NotEmpty()
            .WithMessage("Content type is required.")
            .Must(BeValidImageContentType)
            .WithMessage("Content type must be a valid image type.");

        RuleFor(x => x.Content)
            .NotEmpty()
            .WithMessage("File content is required.")
            .Must(content => content.Length <= MaxFileSizeBytes)
            .WithMessage($"File size must not exceed {MaxFileSizeBytes / (1024 * 1024)}MB.");
    }

    private bool HaveValidExtension(string fileName)
    {
        if (string.IsNullOrWhiteSpace(fileName))
            return false;

        var extension = Path.GetExtension(fileName).ToLowerInvariant();
        return _allowedExtensions.Contains(extension);
    }

    private static bool BeValidImageContentType(string contentType)
    {
        if (string.IsNullOrWhiteSpace(contentType))
            return false;

        var validContentTypes = new[]
        {
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/gif",
            "image/webp"
        };

        return validContentTypes.Contains(contentType.ToLowerInvariant());
    }
}

/// <summary>
/// Handler for UploadLogoCommand.
/// </summary>
public class UploadLogoCommandHandler : ICommandHandler<UploadLogoCommand, Result<FileUploadResultDto>>
{
    private readonly IClubRepository _clubRepository;
    private readonly IFileService _fileService;
    private readonly IValidator<UploadLogoCommand> _validator;
    private readonly ILogger<UploadLogoCommandHandler> _logger;

    public UploadLogoCommandHandler(
        IClubRepository clubRepository,
        IFileService fileService,
        IValidator<UploadLogoCommand> validator,
        ILogger<UploadLogoCommandHandler> logger)
    {
        _clubRepository = clubRepository ?? throw new ArgumentNullException(nameof(clubRepository));
        _fileService = fileService ?? throw new ArgumentNullException(nameof(fileService));
        _validator = validator ?? throw new ArgumentNullException(nameof(validator));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<Result<FileUploadResultDto>> Handle(UploadLogoCommand request, CancellationToken cancellationToken)
    {
        try
        {
            _logger.LogInformation("Processing logo upload for club: {ClubId}", request.ClubId);

            // Validate the command
            var validationResult = await _validator.ValidateAsync(request, cancellationToken);
            if (!validationResult.IsValid)
            {
                var errors = validationResult.Errors.Select(e => e.ErrorMessage).ToList();
                _logger.LogWarning("Validation failed for logo upload: {Errors}", string.Join(", ", errors));
                return Result<FileUploadResultDto>.Failure(errors);
            }

            // Check if club exists
            var club = await _clubRepository.GetByIdAsync(request.ClubId, cancellationToken);
            if (club == null)
            {
                _logger.LogWarning("Logo upload failed - club not found: {ClubId}", request.ClubId);
                return Result<FileUploadResultDto>.Failure($"Club with ID '{request.ClubId}' not found.");
            }

            // Delete existing logo if it exists
            if (!string.IsNullOrWhiteSpace(club.LogoPath))
            {
                try
                {
                    await _fileService.DeleteFileAsync(club.LogoPath, cancellationToken);
                    _logger.LogInformation("Deleted existing logo for club: {ClubId}", request.ClubId);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to delete existing logo for club: {ClubId}", request.ClubId);
                    // Continue with upload even if deletion fails
                }
            }

            // Generate file path for the logo
            var extension = Path.GetExtension(request.FileName);
            var fileName = $"logo_{request.ClubId}_{Guid.NewGuid()}{extension}";
            var filePath = Path.Combine("clubs", "logos", fileName);

            // Upload the new logo
            var uploadResult = await _fileService.UploadFileAsync(
                filePath,
                request.Content,
                request.ContentType,
                cancellationToken);

            if (!uploadResult.IsSuccess)
            {
                _logger.LogWarning("File upload failed for club logo: {ClubId}", request.ClubId);
                return Result<FileUploadResultDto>.Failure("Failed to upload logo file.");
            }

            // Update club with new logo URL
            club.UpdateLogoPath(uploadResult.FileUrl);
            await _clubRepository.UpdateAsync(club, cancellationToken);

            var result = new FileUploadResultDto
            {
                FileName = fileName,
                OriginalFileName = request.FileName,
                FileUrl = uploadResult.FileUrl,
                FilePath = filePath,
                ContentType = request.ContentType,
                Size = request.Content.Length,
                UploadedAt = DateTime.UtcNow
            };

            _logger.LogInformation("Logo uploaded successfully for club: {ClubId}, URL: {LogoUrl}", 
                request.ClubId, uploadResult.FileUrl);
            
            return Result<FileUploadResultDto>.Success(result);
        }
        catch (DomainException ex)
        {
            _logger.LogWarning(ex, "Domain validation error during logo upload: {ClubId}", request.ClubId);
            return Result<FileUploadResultDto>.Failure(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error during logo upload: {ClubId}", request.ClubId);
            return Result<FileUploadResultDto>.Failure("An unexpected error occurred while uploading the logo.");
        }
    }
}
