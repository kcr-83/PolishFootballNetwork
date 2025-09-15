using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PolishFootballNetwork.Application.Features.Connections.DTOs.Admin;
using PolishFootballNetwork.Application.Features.Dashboard.DTOs.Admin;
using PolishFootballNetwork.Application.Common.Models;
using PolishFootballNetwork.Domain.Enums;

namespace PolishFootballNetwork.WebApi.Controllers.Admin;

/// <summary>
/// Admin controller for comprehensive connection management operations.
/// Provides CRUD operations, bulk updates, validation, and advanced connection management features.
/// </summary>
[ApiController]
[Route("api/admin/connections")]
[Authorize(Roles = "Admin")]
[Produces("application/json")]
public class AdminConnectionsController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ILogger<AdminConnectionsController> _logger;

    public AdminConnectionsController(IMediator mediator, ILogger<AdminConnectionsController> logger)
    {
        _mediator = mediator;
        _logger = logger;
    }

    /// <summary>
    /// Get paginated list of connections with admin-level details and filtering
    /// </summary>
    /// <param name="pageNumber">Page number (default: 1)</param>
    /// <param name="pageSize">Items per page (default: 10, max: 100)</param>
    /// <param name="searchTerm">Search in connection details or club names</param>
    /// <param name="type">Filter by connection type</param>
    /// <param name="status">Filter by connection status</param>
    /// <param name="dateFrom">Filter connections created after this date</param>
    /// <param name="dateTo">Filter connections created before this date</param>
    /// <param name="clubId">Filter by specific club</param>
    /// <param name="strength">Filter by connection strength (1-5)</param>
    /// <param name="sortBy">Sort field (CreatedAt, Strength, Type, Status)</param>
    /// <param name="sortDirection">Sort direction (Asc, Desc)</param>
    /// <returns>Paginated list of connections with admin details</returns>
    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<AdminConnectionDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<PagedResult<AdminConnectionDto>>> GetConnections(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? searchTerm = null,
        [FromQuery] ConnectionType? type = null,
        [FromQuery] ConnectionStatus? status = null,
        [FromQuery] DateTime? dateFrom = null,
        [FromQuery] DateTime? dateTo = null,
        [FromQuery] Guid? clubId = null,
        [FromQuery] int? strength = null,
        [FromQuery] string sortBy = "CreatedAt",
        [FromQuery] string sortDirection = "Desc")
    {
        try
        {
            if (pageSize > 100)
            {
                pageSize = 100;
            }

            if (strength.HasValue && (strength < 1 || strength > 5))
            {
                return BadRequest(new { message = "Strength must be between 1 and 5" });
            }

            var query = new GetAdminConnectionsQuery
            {
                PageNumber = pageNumber,
                PageSize = pageSize,
                SearchTerm = searchTerm,
                Type = type,
                Status = status,
                DateFrom = dateFrom,
                DateTo = dateTo,
                ClubId = clubId,
                Strength = strength,
                SortBy = sortBy,
                SortDirection = sortDirection
            };

            var result = await _mediator.Send(query);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid parameters for admin connections query");
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while retrieving admin connections");
            return StatusCode(500, new { message = "An error occurred while processing your request" });
        }
    }

    /// <summary>
    /// Get detailed information about a specific connection (admin view)
    /// </summary>
    /// <param name="id">Connection identifier</param>
    /// <returns>Detailed connection information with admin data</returns>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(AdminConnectionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<AdminConnectionDto>> GetConnectionById(Guid id)
    {
        try
        {
            var query = new GetAdminConnectionByIdQuery { ConnectionId = id };
            var result = await _mediator.Send(query);

            if (result == null)
            {
                return NotFound(new { message = $"Connection with ID {id} not found" });
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while retrieving connection {ConnectionId}", id);
            return StatusCode(500, new { message = "An error occurred while processing your request" });
        }
    }

    /// <summary>
    /// Create a new connection with comprehensive validation
    /// </summary>
    /// <param name="request">Connection creation data</param>
    /// <returns>Created connection with admin details</returns>
    [HttpPost]
    [ProducesResponseType(typeof(AdminConnectionDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<AdminConnectionDto>> CreateConnection([FromBody] CreateConnectionDto request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            // Validate that source and target clubs are different
            if (request.SourceClubId == request.TargetClubId)
            {
                return BadRequest(new { message = "Source and target clubs must be different" });
            }

            var command = new CreateAdminConnectionCommand
            {
                SourceClubId = request.SourceClubId,
                TargetClubId = request.TargetClubId,
                Type = request.Type,
                Status = request.Status,
                Strength = request.Strength,
                Description = request.Description,
                StartDate = request.StartDate,
                EndDate = request.EndDate,
                AdminNotes = request.AdminNotes,
                IsPublic = request.IsPublic
            };

            var result = await _mediator.Send(command);
            
            _logger.LogInformation(
                "Connection created successfully with ID {ConnectionId} between clubs {SourceClubId} and {TargetClubId} by admin user", 
                result.Id, result.SourceClubId, result.TargetClubId);
            
            return CreatedAtAction(
                nameof(GetConnectionById), 
                new { id = result.Id }, 
                result);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Connection creation failed - conflict or business rule violation");
            return Conflict(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid data provided for connection creation");
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while creating connection");
            return StatusCode(500, new { message = "An error occurred while processing your request" });
        }
    }

    /// <summary>
    /// Update an existing connection with comprehensive validation
    /// </summary>
    /// <param name="id">Connection identifier</param>
    /// <param name="request">Connection update data</param>
    /// <returns>Updated connection with admin details</returns>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(AdminConnectionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<AdminConnectionDto>> UpdateConnection(Guid id, [FromBody] UpdateConnectionDto request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var command = new UpdateAdminConnectionCommand
            {
                ConnectionId = id,
                Type = request.Type,
                Status = request.Status,
                Strength = request.Strength,
                Description = request.Description,
                StartDate = request.StartDate,
                EndDate = request.EndDate,
                AdminNotes = request.AdminNotes,
                IsPublic = request.IsPublic
            };

            var result = await _mediator.Send(command);

            if (result == null)
            {
                return NotFound(new { message = $"Connection with ID {id} not found" });
            }

            _logger.LogInformation("Connection {ConnectionId} updated successfully by admin user", id);
            
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Connection update failed - conflict or business rule violation");
            return Conflict(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid data provided for connection update");
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while updating connection {ConnectionId}", id);
            return StatusCode(500, new { message = "An error occurred while processing your request" });
        }
    }

    /// <summary>
    /// Delete a connection (admin operation)
    /// </summary>
    /// <param name="id">Connection identifier</param>
    /// <returns>Success confirmation</returns>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> DeleteConnection(Guid id)
    {
        try
        {
            var command = new DeleteAdminConnectionCommand { ConnectionId = id };
            var result = await _mediator.Send(command);

            if (!result)
            {
                return NotFound(new { message = $"Connection with ID {id} not found" });
            }

            _logger.LogInformation("Connection {ConnectionId} deleted successfully by admin user", id);
            
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Connection deletion failed - business rule violation");
            return Conflict(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while deleting connection {ConnectionId}", id);
            return StatusCode(500, new { message = "An error occurred while processing your request" });
        }
    }

    /// <summary>
    /// Perform bulk operations on multiple connections
    /// </summary>
    /// <param name="request">Bulk operation request</param>
    /// <returns>Bulk operation results</returns>
    [HttpPost("bulk")]
    [ProducesResponseType(typeof(BulkConnectionOperationResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<BulkConnectionOperationResultDto>> BulkOperation([FromBody] BulkConnectionOperationDto request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            if (request.ConnectionIds == null || !request.ConnectionIds.Any())
            {
                return BadRequest(new { message = "No connection IDs provided" });
            }

            if (request.ConnectionIds.Count() > 100)
            {
                return BadRequest(new { message = "Cannot process more than 100 connections at once" });
            }

            var command = new BulkConnectionOperationCommand
            {
                ConnectionIds = request.ConnectionIds,
                Operation = request.Operation,
                NewStatus = request.NewStatus,
                NewStrength = request.NewStrength,
                AdminNotes = request.AdminNotes
            };

            var result = await _mediator.Send(command);
            
            _logger.LogInformation(
                "Bulk operation {Operation} completed on {Count} connections by admin user", 
                request.Operation, 
                request.ConnectionIds.Count());
            
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid bulk operation request");
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred during bulk connection operation");
            return StatusCode(500, new { message = "An error occurred while processing your request" });
        }
    }

    /// <summary>
    /// Validate connection data and business rules
    /// </summary>
    /// <param name="request">Connection validation request</param>
    /// <returns>Validation results</returns>
    [HttpPost("validate")]
    [ProducesResponseType(typeof(ConnectionValidationDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ConnectionValidationDto>> ValidateConnection([FromBody] CreateConnectionDto request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var command = new ValidateConnectionCommand
            {
                SourceClubId = request.SourceClubId,
                TargetClubId = request.TargetClubId,
                Type = request.Type,
                StartDate = request.StartDate,
                EndDate = request.EndDate
            };

            var result = await _mediator.Send(command);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid data provided for connection validation");
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred during connection validation");
            return StatusCode(500, new { message = "An error occurred while processing your request" });
        }
    }

    /// <summary>
    /// Get audit log for a specific connection
    /// </summary>
    /// <param name="id">Connection identifier</param>
    /// <param name="pageNumber">Page number (default: 1)</param>
    /// <param name="pageSize">Items per page (default: 20, max: 100)</param>
    /// <returns>Paginated audit log entries</returns>
    [HttpGet("{id:guid}/audit")]
    [ProducesResponseType(typeof(PagedResult<ActivityLogDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<PagedResult<ActivityLogDto>>> GetConnectionAuditLog(
        Guid id,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20)
    {
        try
        {
            if (pageSize > 100)
            {
                pageSize = 100;
            }

            var query = new GetConnectionAuditLogQuery
            {
                ConnectionId = id,
                PageNumber = pageNumber,
                PageSize = pageSize
            };

            var result = await _mediator.Send(query);

            if (result.Items == null || !result.Items.Any())
            {
                // Check if connection exists
                var connectionQuery = new GetAdminConnectionByIdQuery { ConnectionId = id };
                var connection = await _mediator.Send(connectionQuery);
                
                if (connection == null)
                {
                    return NotFound(new { message = $"Connection with ID {id} not found" });
                }
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while retrieving audit log for connection {ConnectionId}", id);
            return StatusCode(500, new { message = "An error occurred while processing your request" });
        }
    }

    /// <summary>
    /// Get connections filtered by admin criteria
    /// </summary>
    /// <param name="filter">Admin connection filter criteria</param>
    /// <returns>Filtered connections with admin details</returns>
    [HttpPost("filter")]
    [ProducesResponseType(typeof(PagedResult<AdminConnectionDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<PagedResult<AdminConnectionDto>>> GetConnectionsByFilter([FromBody] AdminConnectionFilterDto filter)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            if (filter.PageSize > 100)
            {
                filter.PageSize = 100;
            }

            var query = new GetAdminConnectionsByFilterQuery
            {
                Filter = filter
            };

            var result = await _mediator.Send(query);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid filter parameters for admin connections");
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while retrieving filtered admin connections");
            return StatusCode(500, new { message = "An error occurred while processing your request" });
        }
    }

    /// <summary>
    /// Export connections data to CSV format
    /// </summary>
    /// <param name="filter">Export filter criteria</param>
    /// <returns>CSV file with connections data</returns>
    [HttpPost("export")]
    [ProducesResponseType(typeof(FileResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> ExportConnections([FromBody] AdminConnectionFilterDto filter)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var command = new ExportConnectionsCommand { Filter = filter };
            var result = await _mediator.Send(command);

            _logger.LogInformation("Connections export completed by admin user");

            return File(
                result.Data, 
                "text/csv", 
                $"connections_export_{DateTime.UtcNow:yyyyMMdd_HHmmss}.csv");
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid export parameters");
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred during connections export");
            return StatusCode(500, new { message = "An error occurred while processing your request" });
        }
    }

    /// <summary>
    /// Get connection statistics for admin dashboard
    /// </summary>
    /// <param name="dateFrom">Statistics from date</param>
    /// <param name="dateTo">Statistics to date</param>
    /// <returns>Connection statistics</returns>
    [HttpGet("statistics")]
    [ProducesResponseType(typeof(ConnectionStatisticsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ConnectionStatisticsDto>> GetConnectionStatistics(
        [FromQuery] DateTime? dateFrom = null,
        [FromQuery] DateTime? dateTo = null)
    {
        try
        {
            if (dateFrom.HasValue && dateTo.HasValue && dateFrom > dateTo)
            {
                return BadRequest(new { message = "Date from cannot be greater than date to" });
            }

            var query = new GetConnectionStatisticsQuery
            {
                DateFrom = dateFrom,
                DateTo = dateTo
            };

            var result = await _mediator.Send(query);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while retrieving connection statistics");
            return StatusCode(500, new { message = "An error occurred while processing your request" });
        }
    }
}

// Placeholder command and query classes - these would be implemented in the Application layer
public record GetAdminConnectionsQuery
{
    public int PageNumber { get; init; } = 1;
    public int PageSize { get; init; } = 10;
    public string? SearchTerm { get; init; }
    public ConnectionType? Type { get; init; }
    public ConnectionStatus? Status { get; init; }
    public DateTime? DateFrom { get; init; }
    public DateTime? DateTo { get; init; }
    public Guid? ClubId { get; init; }
    public int? Strength { get; init; }
    public string SortBy { get; init; } = "CreatedAt";
    public string SortDirection { get; init; } = "Desc";
}

public record GetAdminConnectionByIdQuery
{
    public Guid ConnectionId { get; init; }
}

public record CreateAdminConnectionCommand
{
    public Guid SourceClubId { get; init; }
    public Guid TargetClubId { get; init; }
    public ConnectionType Type { get; init; }
    public ConnectionStatus Status { get; init; }
    public int Strength { get; init; }
    public string? Description { get; init; }
    public DateTime? StartDate { get; init; }
    public DateTime? EndDate { get; init; }
    public string? AdminNotes { get; init; }
    public bool IsPublic { get; init; } = true;
}

public record UpdateAdminConnectionCommand
{
    public Guid ConnectionId { get; init; }
    public ConnectionType Type { get; init; }
    public ConnectionStatus Status { get; init; }
    public int Strength { get; init; }
    public string? Description { get; init; }
    public DateTime? StartDate { get; init; }
    public DateTime? EndDate { get; init; }
    public string? AdminNotes { get; init; }
    public bool IsPublic { get; init; }
}

public record DeleteAdminConnectionCommand
{
    public Guid ConnectionId { get; init; }
}

public record BulkConnectionOperationCommand
{
    public IEnumerable<Guid> ConnectionIds { get; init; } = Enumerable.Empty<Guid>();
    public BulkConnectionOperationType Operation { get; init; }
    public ConnectionStatus? NewStatus { get; init; }
    public int? NewStrength { get; init; }
    public string? AdminNotes { get; init; }
}

public record ValidateConnectionCommand
{
    public Guid SourceClubId { get; init; }
    public Guid TargetClubId { get; init; }
    public ConnectionType Type { get; init; }
    public DateTime? StartDate { get; init; }
    public DateTime? EndDate { get; init; }
}

public record GetConnectionAuditLogQuery
{
    public Guid ConnectionId { get; init; }
    public int PageNumber { get; init; } = 1;
    public int PageSize { get; init; } = 20;
}

public record GetAdminConnectionsByFilterQuery
{
    public AdminConnectionFilterDto Filter { get; init; } = new();
}

public record ExportConnectionsCommand
{
    public AdminConnectionFilterDto Filter { get; init; } = new();
}

public record GetConnectionStatisticsQuery
{
    public DateTime? DateFrom { get; init; }
    public DateTime? DateTo { get; init; }
}

public record ConnectionStatisticsDto
{
    public int TotalConnections { get; init; }
    public int ActiveConnections { get; init; }
    public int PendingConnections { get; init; }
    public int SuspendedConnections { get; init; }
    public Dictionary<ConnectionType, int> ConnectionsByType { get; init; } = new();
    public Dictionary<int, int> ConnectionsByStrength { get; init; } = new();
    public int NewConnectionsThisMonth { get; init; }
    public int ConnectionsModifiedThisMonth { get; init; }
}

public record ExportResult
{
    public byte[] Data { get; init; } = Array.Empty<byte>();
    public string FileName { get; init; } = string.Empty;
    public string ContentType { get; init; } = string.Empty;
}