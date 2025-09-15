using FluentValidation;
using Microsoft.Extensions.Logging;
using PolishFootballNetwork.Application.Common.Interfaces;
using PolishFootballNetwork.Application.Common.Models;
using PolishFootballNetwork.Application.Features.Connections.Commands.DeleteConnection;
using PolishFootballNetwork.Domain.Exceptions;
using PolishFootballNetwork.Domain.Repositories;

namespace PolishFootballNetwork.Application.Features.Connections.Commands.DeleteConnection;

/// <summary>
/// Validator for DeleteConnectionCommand.
/// </summary>
public class DeleteConnectionCommandValidator : AbstractValidator<DeleteConnectionCommand>
{
    public DeleteConnectionCommandValidator()
    {
        RuleFor(x => x.Id)
            .NotEmpty()
            .WithMessage("Connection ID is required.");
    }
}

/// <summary>
/// Handler for DeleteConnectionCommand.
/// </summary>
public class DeleteConnectionCommandHandler : ICommandHandler<DeleteConnectionCommand, Result>
{
    private readonly IConnectionRepository _connectionRepository;
    private readonly IValidator<DeleteConnectionCommand> _validator;
    private readonly ILogger<DeleteConnectionCommandHandler> _logger;

    public DeleteConnectionCommandHandler(
        IConnectionRepository connectionRepository,
        IValidator<DeleteConnectionCommand> validator,
        ILogger<DeleteConnectionCommandHandler> logger)
    {
        _connectionRepository = connectionRepository ?? throw new ArgumentNullException(nameof(connectionRepository));
        _validator = validator ?? throw new ArgumentNullException(nameof(validator));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<Result> Handle(DeleteConnectionCommand request, CancellationToken cancellationToken)
    {
        try
        {
            _logger.LogInformation("Processing delete connection request for: {ConnectionId}", request.Id);

            // Validate the command
            var validationResult = await _validator.ValidateAsync(request, cancellationToken);
            if (!validationResult.IsValid)
            {
                var errors = validationResult.Errors.Select(e => e.ErrorMessage).ToList();
                _logger.LogWarning("Validation failed for delete connection request: {Errors}", string.Join(", ", errors));
                return Result.Failure(errors);
            }

            // Get the existing connection
            var connection = await _connectionRepository.GetByIdAsync(request.Id, cancellationToken);
            if (connection == null)
            {
                _logger.LogWarning("Connection deletion failed - connection not found: {ConnectionId}", request.Id);
                return Result.Failure($"Connection with ID '{request.Id}' not found.");
            }

            // Delete the connection
            await _connectionRepository.RemoveAsync(connection, cancellationToken);

            _logger.LogInformation("Connection deleted successfully: {ConnectionId}", request.Id);
            return Result.Success();
        }
        catch (DomainException ex)
        {
            _logger.LogWarning(ex, "Domain validation error during connection deletion: {ConnectionId}", request.Id);
            return Result.Failure(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error during connection deletion: {ConnectionId}", request.Id);
            return Result.Failure("An unexpected error occurred while deleting the connection.");
        }
    }
}
