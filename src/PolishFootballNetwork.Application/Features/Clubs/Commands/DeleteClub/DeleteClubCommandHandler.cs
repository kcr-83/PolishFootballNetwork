using FluentValidation;
using Microsoft.Extensions.Logging;
using PolishFootballNetwork.Application.Common.Interfaces;
using PolishFootballNetwork.Application.Common.Models;
using PolishFootballNetwork.Application.Features.Clubs.Commands.DeleteClub;
using PolishFootballNetwork.Domain.Exceptions;
using PolishFootballNetwork.Domain.Repositories;

namespace PolishFootballNetwork.Application.Features.Clubs.Commands.DeleteClub;

/// <summary>
/// Validator for DeleteClubCommand.
/// </summary>
public class DeleteClubCommandValidator : AbstractValidator<DeleteClubCommand>
{
    public DeleteClubCommandValidator()
    {
        RuleFor(x => x.Id)
            .NotEmpty()
            .WithMessage("Club ID is required.");
    }
}

/// <summary>
/// Handler for DeleteClubCommand.
/// </summary>
public class DeleteClubCommandHandler : ICommandHandler<DeleteClubCommand, Result>
{
    private readonly IClubRepository _clubRepository;
    private readonly IConnectionRepository _connectionRepository;
    private readonly IFileService _fileService;
    private readonly IValidator<DeleteClubCommand> _validator;
    private readonly ILogger<DeleteClubCommandHandler> _logger;

    public DeleteClubCommandHandler(
        IClubRepository clubRepository,
        IConnectionRepository connectionRepository,
        IFileService fileService,
        IValidator<DeleteClubCommand> validator,
        ILogger<DeleteClubCommandHandler> logger)
    {
        _clubRepository = clubRepository ?? throw new ArgumentNullException(nameof(clubRepository));
        _connectionRepository = connectionRepository ?? throw new ArgumentNullException(nameof(connectionRepository));
        _fileService = fileService ?? throw new ArgumentNullException(nameof(fileService));
        _validator = validator ?? throw new ArgumentNullException(nameof(validator));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<Result> Handle(DeleteClubCommand request, CancellationToken cancellationToken)
    {
        try
        {
            _logger.LogInformation("Processing delete club request for: {ClubId}", request.Id);

            // Validate the command
            var validationResult = await _validator.ValidateAsync(request, cancellationToken);
            if (!validationResult.IsValid)
            {
                var errors = validationResult.Errors.Select(e => e.ErrorMessage).ToList();
                _logger.LogWarning("Validation failed for delete club request: {Errors}", string.Join(", ", errors));
                return Result.Failure(errors);
            }

            // Get the existing club
            var club = await _clubRepository.GetByIdAsync(request.Id, cancellationToken);
            if (club == null)
            {
                _logger.LogWarning("Club deletion failed - club not found: {ClubId}", request.Id);
                return Result.Failure($"Club with ID '{request.Id}' not found.");
            }

            // Check for existing connections
            var connections = await _connectionRepository.GetByClubIdAsync(request.Id, cancellationToken);
            
            if (request.ForceDelete)
            {
                // Delete all connections involving this club
                if (connections.Any())
                {
                    _logger.LogInformation("Force deleting {ConnectionCount} connections for club: {ClubId}", 
                        connections.Count(), request.Id);
                    
                    foreach (var connection in connections)
                    {
                        await _connectionRepository.DeleteAsync(connection.Id, cancellationToken);
                    }
                }
            }
            else if (connections.Any())
            {
                // Prevent deletion if connections exist and force delete is not requested
                _logger.LogWarning("Club deletion failed - club has existing connections: {ClubId}", request.Id);
                return Result.Failure(
                    $"Cannot delete club '{club.Name}' because it has {connections.Count()} existing connections. " +
                    "Use force delete to remove all connections and delete the club.");
            }

            // Delete associated files (logos, etc.)
            if (!string.IsNullOrWhiteSpace(club.LogoUrl))
            {
                try
                {
                    await _fileService.DeleteFileAsync(club.LogoUrl, cancellationToken);
                    _logger.LogInformation("Deleted logo file for club: {ClubId}", request.Id);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to delete logo file for club: {ClubId}", request.Id);
                    // Continue with club deletion even if file deletion fails
                }
            }

            // Delete the club
            await _clubRepository.DeleteAsync(request.Id, cancellationToken);

            _logger.LogInformation("Club deleted successfully: {ClubId} - {ClubName}", request.Id, club.Name);
            return Result.Success();
        }
        catch (DomainException ex)
        {
            _logger.LogWarning(ex, "Domain validation error during club deletion: {ClubId}", request.Id);
            return Result.Failure(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error during club deletion: {ClubId}", request.Id);
            return Result.Failure("An unexpected error occurred while deleting the club.");
        }
    }
}
