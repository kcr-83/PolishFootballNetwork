using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PolishFootballNetwork.Application.Features.Dashboard.DTOs.Admin;
using PolishFootballNetwork.Application.Common.Models;
using PolishFootballNetwork.Domain.Enums;

namespace PolishFootballNetwork.WebApi.Controllers.Admin;

/// <summary>
/// Admin audit logging controller for comprehensive audit trail management and monitoring.
/// Provides access to system audit logs, activity tracking, entity change history, and compliance reporting.
/// </summary>
[ApiController]
[Route("api/admin/audit")]
[Authorize(Roles = "Admin")]
[Produces("application/json")]
public class AdminAuditController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ILogger<AdminAuditController> _logger;

    public AdminAuditController(IMediator mediator, ILogger<AdminAuditController> logger)
    {
        _mediator = mediator;
        _logger = logger;
    }

    /// <summary>
    /// Get comprehensive audit log with advanced filtering options
    /// </summary>
    /// <param name="pageNumber">Page number (default: 1)</param>
    /// <param name="pageSize">Items per page (default: 50, max: 200)</param>
    /// <param name="dateFrom">Filter logs from this date</param>
    /// <param name="dateTo">Filter logs to this date</param>
    /// <param name="userId">Filter by specific user</param>
    /// <param name="entityType">Filter by entity type (Club, Connection, User, etc.)</param>
    /// <param name="entityId">Filter by specific entity ID</param>
    /// <param name="actionType">Filter by action type (Create, Update, Delete, etc.)</param>
    /// <param name="severity">Filter by log severity (Info, Warning, Error, Critical)</param>
    /// <param name="ipAddress">Filter by IP address</param>
    /// <param name="userAgent">Filter by user agent</param>
    /// <param name="searchTerm">Search in log message or details</param>
    /// <param name="sortBy">Sort field (Timestamp, User, Action, Entity)</param>
    /// <param name="sortDirection">Sort direction (Asc, Desc)</param>
    /// <returns>Paginated audit log entries</returns>
    [HttpGet("logs")]
    [ProducesResponseType(typeof(PagedResult<AuditLogDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<PagedResult<AuditLogDto>>> GetAuditLogs(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] DateTime? dateFrom = null,
        [FromQuery] DateTime? dateTo = null,
        [FromQuery] Guid? userId = null,
        [FromQuery] string? entityType = null,
        [FromQuery] Guid? entityId = null,
        [FromQuery] AuditActionType? actionType = null,
        [FromQuery] LogSeverity? severity = null,
        [FromQuery] string? ipAddress = null,
        [FromQuery] string? userAgent = null,
        [FromQuery] string? searchTerm = null,
        [FromQuery] string sortBy = "Timestamp",
        [FromQuery] string sortDirection = "Desc")
    {
        try
        {
            if (pageSize > 200)
            {
                pageSize = 200;
            }

            if (dateFrom.HasValue && dateTo.HasValue && dateFrom > dateTo)
            {
                return BadRequest(new { message = "Date from cannot be greater than date to" });
            }

            var query = new GetAuditLogsQuery
            {
                PageNumber = pageNumber,
                PageSize = pageSize,
                DateFrom = dateFrom,
                DateTo = dateTo,
                UserId = userId,
                EntityType = entityType,
                EntityId = entityId,
                ActionType = actionType,
                Severity = severity,
                IpAddress = ipAddress,
                UserAgent = userAgent,
                SearchTerm = searchTerm,
                SortBy = sortBy,
                SortDirection = sortDirection
            };

            var result = await _mediator.Send(query);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid parameters for audit logs query");
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while retrieving audit logs");
            return StatusCode(500, new { message = "An error occurred while processing your request" });
        }
    }

    /// <summary>
    /// Get detailed audit log entry by ID
    /// </summary>
    /// <param name="id">Audit log entry identifier</param>
    /// <returns>Detailed audit log entry</returns>
    [HttpGet("logs/{id:guid}")]
    [ProducesResponseType(typeof(DetailedAuditLogDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<DetailedAuditLogDto>> GetAuditLogById(Guid id)
    {
        try
        {
            var query = new GetAuditLogByIdQuery { AuditLogId = id };
            var result = await _mediator.Send(query);

            if (result == null)
            {
                return NotFound(new { message = $"Audit log entry with ID {id} not found" });
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while retrieving audit log {AuditLogId}", id);
            return StatusCode(500, new { message = "An error occurred while processing your request" });
        }
    }

    /// <summary>
    /// Get entity change history for a specific entity
    /// </summary>
    /// <param name="entityType">Entity type (Club, Connection, User, etc.)</param>
    /// <param name="entityId">Entity identifier</param>
    /// <param name="pageNumber">Page number (default: 1)</param>
    /// <param name="pageSize">Items per page (default: 20, max: 100)</param>
    /// <param name="dateFrom">Filter changes from this date</param>
    /// <param name="dateTo">Filter changes to this date</param>
    /// <param name="changeType">Filter by change type (Create, Update, Delete, StatusChange)</param>
    /// <returns>Paginated entity change history</returns>
    [HttpGet("entities/{entityType}/{entityId:guid}/history")]
    [ProducesResponseType(typeof(PagedResult<EntityChangeHistoryDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<PagedResult<EntityChangeHistoryDto>>> GetEntityChangeHistory(
        string entityType,
        Guid entityId,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] DateTime? dateFrom = null,
        [FromQuery] DateTime? dateTo = null,
        [FromQuery] ChangeType? changeType = null)
    {
        try
        {
            if (pageSize > 100)
            {
                pageSize = 100;
            }

            var validEntityTypes = new[] { "Club", "Connection", "User", "File", "Event" };
            if (!validEntityTypes.Contains(entityType, StringComparer.OrdinalIgnoreCase))
            {
                return BadRequest(new { 
                    message = $"Invalid entity type. Valid types: {string.Join(", ", validEntityTypes)}" 
                });
            }

            if (dateFrom.HasValue && dateTo.HasValue && dateFrom > dateTo)
            {
                return BadRequest(new { message = "Date from cannot be greater than date to" });
            }

            var query = new GetEntityChangeHistoryQuery
            {
                EntityType = entityType,
                EntityId = entityId,
                PageNumber = pageNumber,
                PageSize = pageSize,
                DateFrom = dateFrom,
                DateTo = dateTo,
                ChangeType = changeType
            };

            var result = await _mediator.Send(query);

            if (result.Items == null || !result.Items.Any())
            {
                // Check if entity exists
                var entityQuery = new CheckEntityExistsQuery 
                { 
                    EntityType = entityType, 
                    EntityId = entityId 
                };
                var entityExists = await _mediator.Send(entityQuery);
                
                if (!entityExists)
                {
                    return NotFound(new { message = $"{entityType} with ID {entityId} not found" });
                }
            }

            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid parameters for entity change history");
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while retrieving change history for {EntityType} {EntityId}", entityType, entityId);
            return StatusCode(500, new { message = "An error occurred while processing your request" });
        }
    }

    /// <summary>
    /// Get user activity timeline for a specific user
    /// </summary>
    /// <param name="userId">User identifier</param>
    /// <param name="pageNumber">Page number (default: 1)</param>
    /// <param name="pageSize">Items per page (default: 30, max: 100)</param>
    /// <param name="dateFrom">Filter activities from this date</param>
    /// <param name="dateTo">Filter activities to this date</param>
    /// <param name="activityCategory">Filter by activity category</param>
    /// <returns>Paginated user activity timeline</returns>
    [HttpGet("users/{userId:guid}/timeline")]
    [ProducesResponseType(typeof(PagedResult<UserActivityDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<PagedResult<UserActivityDto>>> GetUserActivityTimeline(
        Guid userId,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 30,
        [FromQuery] DateTime? dateFrom = null,
        [FromQuery] DateTime? dateTo = null,
        [FromQuery] string? activityCategory = null)
    {
        try
        {
            if (pageSize > 100)
            {
                pageSize = 100;
            }

            if (dateFrom.HasValue && dateTo.HasValue && dateFrom > dateTo)
            {
                return BadRequest(new { message = "Date from cannot be greater than date to" });
            }

            var query = new GetUserActivityTimelineQuery
            {
                UserId = userId,
                PageNumber = pageNumber,
                PageSize = pageSize,
                DateFrom = dateFrom,
                DateTo = dateTo,
                ActivityCategory = activityCategory
            };

            var result = await _mediator.Send(query);

            if (result.Items == null || !result.Items.Any())
            {
                // Check if user exists
                var userQuery = new CheckEntityExistsQuery 
                { 
                    EntityType = "User", 
                    EntityId = userId 
                };
                var userExists = await _mediator.Send(userQuery);
                
                if (!userExists)
                {
                    return NotFound(new { message = $"User with ID {userId} not found" });
                }
            }

            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid parameters for user activity timeline");
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while retrieving activity timeline for user {UserId}", userId);
            return StatusCode(500, new { message = "An error occurred while processing your request" });
        }
    }

    /// <summary>
    /// Get security events and authentication audit logs
    /// </summary>
    /// <param name="pageNumber">Page number (default: 1)</param>
    /// <param name="pageSize">Items per page (default: 25, max: 100)</param>
    /// <param name="dateFrom">Filter events from this date</param>
    /// <param name="dateTo">Filter events to this date</param>
    /// <param name="eventType">Filter by security event type</param>
    /// <param name="severity">Filter by event severity</param>
    /// <param name="ipAddress">Filter by IP address</param>
    /// <param name="userId">Filter by user ID</param>
    /// <returns>Paginated security events</returns>
    [HttpGet("security")]
    [ProducesResponseType(typeof(PagedResult<SecurityEventDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<PagedResult<SecurityEventDto>>> GetSecurityEvents(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 25,
        [FromQuery] DateTime? dateFrom = null,
        [FromQuery] DateTime? dateTo = null,
        [FromQuery] SecurityEventType? eventType = null,
        [FromQuery] LogSeverity? severity = null,
        [FromQuery] string? ipAddress = null,
        [FromQuery] Guid? userId = null)
    {
        try
        {
            if (pageSize > 100)
            {
                pageSize = 100;
            }

            if (dateFrom.HasValue && dateTo.HasValue && dateFrom > dateTo)
            {
                return BadRequest(new { message = "Date from cannot be greater than date to" });
            }

            var query = new GetSecurityEventsQuery
            {
                PageNumber = pageNumber,
                PageSize = pageSize,
                DateFrom = dateFrom,
                DateTo = dateTo,
                EventType = eventType,
                Severity = severity,
                IpAddress = ipAddress,
                UserId = userId
            };

            var result = await _mediator.Send(query);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid parameters for security events query");
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while retrieving security events");
            return StatusCode(500, new { message = "An error occurred while processing your request" });
        }
    }

    /// <summary>
    /// Get audit statistics and compliance metrics
    /// </summary>
    /// <param name="dateRange">Time range for statistics</param>
    /// <param name="dateFrom">Custom date range start (for Custom dateRange)</param>
    /// <param name="dateTo">Custom date range end (for Custom dateRange)</param>
    /// <returns>Comprehensive audit statistics</returns>
    [HttpGet("statistics")]
    [ProducesResponseType(typeof(AuditStatisticsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<AuditStatisticsDto>> GetAuditStatistics(
        [FromQuery] DateRangeType dateRange = DateRangeType.Last30Days,
        [FromQuery] DateTime? dateFrom = null,
        [FromQuery] DateTime? dateTo = null)
    {
        try
        {
            if (dateRange == DateRangeType.Custom)
            {
                if (!dateFrom.HasValue || !dateTo.HasValue)
                {
                    return BadRequest(new { message = "Custom date range requires both dateFrom and dateTo parameters" });
                }

                if (dateFrom > dateTo)
                {
                    return BadRequest(new { message = "Date from cannot be greater than date to" });
                }
            }

            var query = new GetAuditStatisticsQuery
            {
                DateRange = dateRange,
                DateFrom = dateFrom,
                DateTo = dateTo
            };

            var result = await _mediator.Send(query);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid parameters for audit statistics");
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while retrieving audit statistics");
            return StatusCode(500, new { message = "An error occurred while processing your request" });
        }
    }

    /// <summary>
    /// Export audit logs to various formats for compliance reporting
    /// </summary>
    /// <param name="request">Export configuration</param>
    /// <returns>Audit export file</returns>
    [HttpPost("export")]
    [ProducesResponseType(typeof(FileResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> ExportAuditLogs([FromBody] AuditExportRequestDto request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var command = new ExportAuditLogsCommand
            {
                DateFrom = request.DateFrom,
                DateTo = request.DateTo,
                EntityTypes = request.EntityTypes,
                ActionTypes = request.ActionTypes,
                UserIds = request.UserIds,
                Format = request.Format,
                IncludeDetails = request.IncludeDetails,
                ExportedBy = User.Identity?.Name ?? "Admin"
            };

            var result = await _mediator.Send(command);
            
            _logger.LogInformation("Audit logs export completed by admin user");

            var fileName = $"audit_logs_{DateTime.UtcNow:yyyyMMdd_HHmmss}.{request.Format.ToLowerInvariant()}";
            var contentType = request.Format.ToUpperInvariant() switch
            {
                "CSV" => "text/csv",
                "JSON" => "application/json",
                "XML" => "application/xml",
                _ => "application/octet-stream"
            };

            return File(result.Data, contentType, fileName);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid audit export parameters");
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred during audit logs export");
            return StatusCode(500, new { message = "An error occurred while processing your request" });
        }
    }

    /// <summary>
    /// Create manual audit log entry for administrative actions
    /// </summary>
    /// <param name="request">Manual audit log entry data</param>
    /// <returns>Created audit log entry</returns>
    [HttpPost("logs")]
    [ProducesResponseType(typeof(AuditLogDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<AuditLogDto>> CreateManualAuditLog([FromBody] CreateManualAuditLogDto request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var command = new CreateManualAuditLogCommand
            {
                EntityType = request.EntityType,
                EntityId = request.EntityId,
                ActionType = request.ActionType,
                Description = request.Description,
                Details = request.Details,
                Severity = request.Severity,
                CreatedBy = User.Identity?.Name ?? "Admin",
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers["User-Agent"].ToString()
            };

            var result = await _mediator.Send(command);
            
            _logger.LogInformation("Manual audit log entry created with ID {AuditLogId}", result.Id);
            
            return CreatedAtAction(
                nameof(GetAuditLogById), 
                new { id = result.Id }, 
                result);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid manual audit log data");
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while creating manual audit log");
            return StatusCode(500, new { message = "An error occurred while processing your request" });
        }
    }

    /// <summary>
    /// Get data retention and archival status
    /// </summary>
    /// <returns>Data retention policies and archival status</returns>
    [HttpGet("retention")]
    [ProducesResponseType(typeof(DataRetentionStatusDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<DataRetentionStatusDto>> GetDataRetentionStatus()
    {
        try
        {
            var query = new GetDataRetentionStatusQuery();
            var result = await _mediator.Send(query);
            
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while retrieving data retention status");
            return StatusCode(500, new { message = "An error occurred while processing your request" });
        }
    }

    /// <summary>
    /// Initiate audit log archival process
    /// </summary>
    /// <param name="request">Archival configuration</param>
    /// <returns>Archival job information</returns>
    [HttpPost("archive")]
    [ProducesResponseType(typeof(ArchivalJobDto), StatusCodes.Status202Accepted)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ArchivalJobDto>> InitiateArchival([FromBody] ArchivalRequestDto request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            if (request.ArchiveDate >= DateTime.UtcNow.AddDays(-30))
            {
                return BadRequest(new { message = "Can only archive logs older than 30 days" });
            }

            var command = new InitiateArchivalCommand
            {
                ArchiveDate = request.ArchiveDate,
                EntityTypes = request.EntityTypes,
                ArchiveFormat = request.ArchiveFormat,
                DeleteAfterArchive = request.DeleteAfterArchive,
                InitiatedBy = User.Identity?.Name ?? "Admin"
            };

            var result = await _mediator.Send(command);
            
            _logger.LogInformation("Audit log archival job {JobId} initiated by admin user", result.JobId);
            
            return Accepted(result);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid archival request parameters");
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while initiating archival");
            return StatusCode(500, new { message = "An error occurred while processing your request" });
        }
    }
}

// Placeholder command and query classes - these would be implemented in the Application layer
public record GetAuditLogsQuery
{
    public int PageNumber { get; init; } = 1;
    public int PageSize { get; init; } = 50;
    public DateTime? DateFrom { get; init; }
    public DateTime? DateTo { get; init; }
    public Guid? UserId { get; init; }
    public string? EntityType { get; init; }
    public Guid? EntityId { get; init; }
    public AuditActionType? ActionType { get; init; }
    public LogSeverity? Severity { get; init; }
    public string? IpAddress { get; init; }
    public string? UserAgent { get; init; }
    public string? SearchTerm { get; init; }
    public string SortBy { get; init; } = "Timestamp";
    public string SortDirection { get; init; } = "Desc";
}

public record GetAuditLogByIdQuery
{
    public Guid AuditLogId { get; init; }
}

public record GetEntityChangeHistoryQuery
{
    public string EntityType { get; init; } = string.Empty;
    public Guid EntityId { get; init; }
    public int PageNumber { get; init; } = 1;
    public int PageSize { get; init; } = 20;
    public DateTime? DateFrom { get; init; }
    public DateTime? DateTo { get; init; }
    public ChangeType? ChangeType { get; init; }
}

public record GetUserActivityTimelineQuery
{
    public Guid UserId { get; init; }
    public int PageNumber { get; init; } = 1;
    public int PageSize { get; init; } = 30;
    public DateTime? DateFrom { get; init; }
    public DateTime? DateTo { get; init; }
    public string? ActivityCategory { get; init; }
}

public record GetSecurityEventsQuery
{
    public int PageNumber { get; init; } = 1;
    public int PageSize { get; init; } = 25;
    public DateTime? DateFrom { get; init; }
    public DateTime? DateTo { get; init; }
    public SecurityEventType? EventType { get; init; }
    public LogSeverity? Severity { get; init; }
    public string? IpAddress { get; init; }
    public Guid? UserId { get; init; }
}

public record GetAuditStatisticsQuery
{
    public DateRangeType DateRange { get; init; } = DateRangeType.Last30Days;
    public DateTime? DateFrom { get; init; }
    public DateTime? DateTo { get; init; }
}

public record CheckEntityExistsQuery
{
    public string EntityType { get; init; } = string.Empty;
    public Guid EntityId { get; init; }
}

public record ExportAuditLogsCommand
{
    public DateTime? DateFrom { get; init; }
    public DateTime? DateTo { get; init; }
    public IEnumerable<string> EntityTypes { get; init; } = Enumerable.Empty<string>();
    public IEnumerable<AuditActionType> ActionTypes { get; init; } = Enumerable.Empty<AuditActionType>();
    public IEnumerable<Guid> UserIds { get; init; } = Enumerable.Empty<Guid>();
    public string Format { get; init; } = "CSV";
    public bool IncludeDetails { get; init; } = true;
    public string ExportedBy { get; init; } = string.Empty;
}

public record CreateManualAuditLogCommand
{
    public string? EntityType { get; init; }
    public Guid? EntityId { get; init; }
    public AuditActionType ActionType { get; init; }
    public string Description { get; init; } = string.Empty;
    public string? Details { get; init; }
    public LogSeverity Severity { get; init; } = LogSeverity.Info;
    public string CreatedBy { get; init; } = string.Empty;
    public string? IpAddress { get; init; }
    public string? UserAgent { get; init; }
}

public record GetDataRetentionStatusQuery;

public record InitiateArchivalCommand
{
    public DateTime ArchiveDate { get; init; }
    public IEnumerable<string> EntityTypes { get; init; } = Enumerable.Empty<string>();
    public string ArchiveFormat { get; init; } = "ZIP";
    public bool DeleteAfterArchive { get; init; } = false;
    public string InitiatedBy { get; init; } = string.Empty;
}

// Enums for audit functionality
public enum AuditActionType
{
    Create,
    Read,
    Update,
    Delete,
    Login,
    Logout,
    PasswordChange,
    RoleChange,
    StatusChange,
    Upload,
    Download,
    Export,
    Import,
    Archive,
    Restore,
    AdminAction
}

public enum LogSeverity
{
    Debug,
    Info,
    Warning,
    Error,
    Critical
}

public enum ChangeType
{
    Create,
    Update,
    Delete,
    StatusChange,
    MetadataChange
}

public enum SecurityEventType
{
    Login,
    Logout,
    FailedLogin,
    PasswordChange,
    RoleChange,
    AccountLockout,
    SuspiciousActivity,
    DataBreach,
    UnauthorizedAccess
}

// DTOs for audit requests
public record AuditExportRequestDto
{
    public DateTime? DateFrom { get; init; }
    public DateTime? DateTo { get; init; }
    public IEnumerable<string> EntityTypes { get; init; } = Enumerable.Empty<string>();
    public IEnumerable<AuditActionType> ActionTypes { get; init; } = Enumerable.Empty<AuditActionType>();
    public IEnumerable<Guid> UserIds { get; init; } = Enumerable.Empty<Guid>();
    public string Format { get; init; } = "CSV";
    public bool IncludeDetails { get; init; } = true;
}

public record CreateManualAuditLogDto
{
    public string? EntityType { get; init; }
    public Guid? EntityId { get; init; }
    public AuditActionType ActionType { get; init; }
    public string Description { get; init; } = string.Empty;
    public string? Details { get; init; }
    public LogSeverity Severity { get; init; } = LogSeverity.Info;
}

public record ArchivalRequestDto
{
    public DateTime ArchiveDate { get; init; }
    public IEnumerable<string> EntityTypes { get; init; } = Enumerable.Empty<string>();
    public string ArchiveFormat { get; init; } = "ZIP";
    public bool DeleteAfterArchive { get; init; } = false;
}

public record ArchivalJobDto
{
    public Guid JobId { get; init; }
    public string Status { get; init; } = string.Empty;
    public DateTime CreatedAt { get; init; }
    public DateTime ArchiveDate { get; init; }
    public string? DownloadUrl { get; init; }
}