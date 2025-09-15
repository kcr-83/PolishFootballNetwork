using FluentValidation;
using Microsoft.Extensions.Logging;
using PolishFootballNetwork.Application.Common.Interfaces;
using PolishFootballNetwork.Application.Common.Models;
using PolishFootballNetwork.Application.Features.Connections.Commands.CreateConnection;
using PolishFootballNetwork.Domain.Entities;
using PolishFootballNetwork.Domain.Exceptions;
using PolishFootballNetwork.Domain.Repositories;

namespace PolishFootballNetwork.Application.Features.Connections.Commands.CreateConnection;

/// <summary>
/// Validator for CreateConnectionCommand.
/// </summary>
public class CreateConnectionCommandValidator : AbstractValidator<CreateConnectionCommand>
{
    public CreateConnectionCommandValidator()
    {
        RuleFor(x => x.FromClubId)
            .NotEmpty()
            .WithMessage("Source club ID is required.");

        RuleFor(x => x.ToClubId)
            .NotEmpty()
            .WithMessage("Target club ID is required.");

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

        RuleFor(x => x)
            .Must(x => x.FromClubId != x.ToClubId)
            .WithMessage("Source and target clubs must be different.");
    }
}

/// <summary>
/// Handler for CreateConnectionCommand.
/// </summary>
public class CreateConnectionCommandHandler : ICommandHandler<CreateConnectionCommand, Result<ConnectionDto>>
{
    private readonly IConnectionRepository _connectionRepository;
    private readonly IClubRepository _clubRepository;
    private readonly IValidator<CreateConnectionCommand> _validator;
    private readonly ILogger<CreateConnectionCommandHandler> _logger;

    public CreateConnectionCommandHandler(
        IConnectionRepository connectionRepository,
        IClubRepository clubRepository,
        IValidator<CreateConnectionCommand> validator,
        ILogger<CreateConnectionCommandHandler> logger)
    {
        _connectionRepository = connectionRepository ?? throw new ArgumentNullException(nameof(connectionRepository));
        _clubRepository = clubRepository ?? throw new ArgumentNullException(nameof(clubRepository));
        _validator = validator ?? throw new ArgumentNullException(nameof(validator));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<Result<ConnectionDto>> Handle(CreateConnectionCommand request, CancellationToken cancellationToken)
    {
        try
        {
            _logger.LogInformation("Processing create connection request between clubs: {FromClubId} -> {ToClubId}", 
                request.FromClubId, request.ToClubId);

            // Validate the command
            var validationResult = await _validator.ValidateAsync(request, cancellationToken);
            if (!validationResult.IsValid)
            {
                var errors = validationResult.Errors.Select(e => e.ErrorMessage).ToList();
                _logger.LogWarning("Validation failed for create connection request: {Errors}", string.Join(", ", errors));
                return Result<ConnectionDto>.Failure(errors);
            }

            // Check if source club exists
            var sourceClub = await _clubRepository.GetByIdAsync(request.FromClubId, cancellationToken);
            if (sourceClub == null)
            {
                _logger.LogWarning("Connection creation failed - source club not found: {FromClubId}", request.FromClubId);
                return Result<ConnectionDto>.Failure($"Source club with ID '{request.FromClubId}' not found.");
            }

            // Check if target club exists
            var targetClub = await _clubRepository.GetByIdAsync(request.ToClubId, cancellationToken);
            if (targetClub == null)
            {
                _logger.LogWarning("Connection creation failed - target club not found: {ToClubId}", request.ToClubId);
                return Result<ConnectionDto>.Failure($"Target club with ID '{request.ToClubId}' not found.");
            }

            // Check if connection already exists between these clubs
            var existingConnection = await _connectionRepository.GetBetweenClubsAsync(
                request.FromClubId, request.ToClubId, cancellationToken);
            
            if (existingConnection != null)
            {
                _logger.LogWarning("Connection creation failed - connection already exists between clubs: {FromClubId} -> {ToClubId}", 
                    request.FromClubId, request.ToClubId);
                return Result<ConnectionDto>.Failure(
                    $"A connection already exists between '{sourceClub.Name}' and '{targetClub.Name}'.");
            }

            // Create the connection entity
            var dateRange = request.GetDateRange();
            var connection = new Connection(
                sourceClubId: request.FromClubId,
                targetClubId: request.ToClubId,
                type: request.ConnectionType,
                strength: request.Strength,
                activePeriod: dateRange
            );

            // Set optional properties
            if (!string.IsNullOrWhiteSpace(request.Description))
            {
                connection.UpdateDescription(request.Description);
            }

            if (!string.IsNullOrWhiteSpace(request.HistoricalContext))
            {
                connection.UpdateNotes(request.HistoricalContext);
            }

            // Save the connection
            await _connectionRepository.AddAsync(connection, cancellationToken);

            var result = ConnectionDto.FromDomain(connection, sourceClub, targetClub);

            _logger.LogInformation("Connection created successfully: {ConnectionId} between {SourceClub} -> {TargetClub}",
                connection.Id, sourceClub.Name, targetClub.Name);
            
            return Result<ConnectionDto>.Success(result);
        }
        catch (DomainException ex)
        {
            _logger.LogWarning(ex, "Domain validation error during connection creation between clubs: {FromClubId} -> {ToClubId}", 
                request.FromClubId, request.ToClubId);
            return Result<ConnectionDto>.Failure(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error during connection creation between clubs: {FromClubId} -> {ToClubId}", 
                request.FromClubId, request.ToClubId);
            return Result<ConnectionDto>.Failure("An unexpected error occurred while creating the connection.");
        }
    }
}
