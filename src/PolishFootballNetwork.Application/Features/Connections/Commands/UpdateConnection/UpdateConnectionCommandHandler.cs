using FluentValidation;
using Microsoft.Extensions.Logging;
using PolishFootballNetwork.Application.Common.Interfaces;
using PolishFootballNetwork.Application.Common.Models;
using PolishFootballNetwork.Application.Features.Connections.Commands.CreateConnection;
using PolishFootballNetwork.Application.Features.Connections.Commands.UpdateConnection;
using PolishFootballNetwork.Domain.Exceptions;
using PolishFootballNetwork.Domain.Repositories;

namespace PolishFootballNetwork.Application.Features.Connections.Commands.UpdateConnection;

/// <summary>
/// Validator for UpdateConnectionCommand.
/// </summary>
public class UpdateConnectionCommandValidator : AbstractValidator<UpdateConnectionCommand>
{
    public UpdateConnectionCommandValidator()
    {
        RuleFor(x => x.Id)
            .NotEmpty()
            .WithMessage("Connection ID is required.");

        RuleFor(x => x.ConnectionType)
            .IsInEnum()
            .WithMessage("Invalid connection type specified.");

        RuleFor(x => x.Strength)
            .IsInEnum()
            .WithMessage("Invalid connection strength specified.");

        RuleFor(x => x.Description)
            .MaximumLength(500)
            .WithMessage("Description must not exceed 500 characters.");

        RuleFor(x => x.StartDate)
            .GreaterThan(new DateTime(1850, 1, 1))
            .WithMessage("Start date must be after 1850.")
            .LessThanOrEqualTo(DateTime.Now)
            .WithMessage("Start date cannot be in the future.")
            .When(x => x.StartDate.HasValue);

        RuleFor(x => x.EndDate)
            .GreaterThanOrEqualTo(x => x.StartDate)
            .WithMessage("End date must be greater than or equal to start date.")
            .LessThanOrEqualTo(DateTime.Now)
            .WithMessage("End date cannot be in the future.")
            .When(x => x.EndDate.HasValue);
    }
}

/// <summary>
/// Handler for UpdateConnectionCommand.
/// </summary>
public class UpdateConnectionCommandHandler : ICommandHandler<UpdateConnectionCommand, Result<ConnectionDto>>
{
    private readonly IConnectionRepository _connectionRepository;
    private readonly IClubRepository _clubRepository;
    private readonly IValidator<UpdateConnectionCommand> _validator;
    private readonly ILogger<UpdateConnectionCommandHandler> _logger;

    public UpdateConnectionCommandHandler(
        IConnectionRepository connectionRepository,
        IClubRepository clubRepository,
        IValidator<UpdateConnectionCommand> validator,
        ILogger<UpdateConnectionCommandHandler> logger)
    {
        _connectionRepository = connectionRepository ?? throw new ArgumentNullException(nameof(connectionRepository));
        _clubRepository = clubRepository ?? throw new ArgumentNullException(nameof(clubRepository));
        _validator = validator ?? throw new ArgumentNullException(nameof(validator));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<Result<ConnectionDto>> Handle(UpdateConnectionCommand request, CancellationToken cancellationToken)
    {
        try
        {
            _logger.LogInformation("Processing update connection request for: {ConnectionId}", request.Id);

            // Validate the command
            var validationResult = await _validator.ValidateAsync(request, cancellationToken);
            if (!validationResult.IsValid)
            {
                var errors = validationResult.Errors.Select(e => e.ErrorMessage).ToList();
                _logger.LogWarning("Validation failed for update connection request: {Errors}", string.Join(", ", errors));
                return Result<ConnectionDto>.Failure(errors);
            }

            // Get the existing connection
            var connection = await _connectionRepository.GetByIdAsync(request.Id, cancellationToken);
            if (connection == null)
            {
                _logger.LogWarning("Connection update failed - connection not found: {ConnectionId}", request.Id);
                return Result<ConnectionDto>.Failure($"Connection with ID '{request.Id}' not found.");
            }

            // Get source and target clubs for DTO creation
            var sourceClub = await _clubRepository.GetByIdAsync(connection.SourceClubId, cancellationToken);
            var targetClub = await _clubRepository.GetByIdAsync(connection.TargetClubId, cancellationToken);

            if (sourceClub == null || targetClub == null)
            {
                _logger.LogWarning("Connection update failed - source or target club not found for connection: {ConnectionId}", request.Id);
                return Result<ConnectionDto>.Failure("Source or target club not found for this connection.");
            }

            // Update connection properties
            connection.UpdateType(request.ConnectionType);
            connection.UpdateStrength(request.Strength);
            
            // Update active period
            var dateRange = request.GetDateRange();
            connection.UpdateActivePeriod(dateRange);

            // Update optional properties
            if (!string.IsNullOrWhiteSpace(request.Description))
            {
                connection.UpdateDescription(request.Description);
            }
            else
            {
                connection.UpdateDescription(null);
            }

            if (!string.IsNullOrWhiteSpace(request.HistoricalContext))
            {
                connection.UpdateNotes(request.HistoricalContext);
            }
            else
            {
                connection.UpdateNotes(null);
            }

            // Save the updated connection
            await _connectionRepository.UpdateAsync(connection, cancellationToken);

            var result = ConnectionDto.FromDomain(connection, sourceClub, targetClub);

            _logger.LogInformation("Connection updated successfully: {ConnectionId}", connection.Id);
            return Result<ConnectionDto>.Success(result);
        }
        catch (DomainException ex)
        {
            _logger.LogWarning(ex, "Domain validation error during connection update: {ConnectionId}", request.Id);
            return Result<ConnectionDto>.Failure(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error during connection update: {ConnectionId}", request.Id);
            return Result<ConnectionDto>.Failure("An unexpected error occurred while updating the connection.");
        }
    }
}
