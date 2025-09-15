using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PolishFootballNetwork.Application.Features.Dashboard.DTOs.Admin;
using PolishFootballNetwork.Application.Common.Models;
using PolishFootballNetwork.Domain.Enums;

namespace PolishFootballNetwork.WebApi.Controllers.Admin;

/// <summary>
/// Admin dashboard controller providing comprehensive system monitoring, statistics, and management insights.
/// Offers health monitoring, activity tracking, system analytics, and administrative tools.
/// </summary>
[ApiController]
[Route("api/admin/dashboard")]
[Authorize(Roles = "Admin")]
[Produces("application/json")]
public class AdminDashboardController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ILogger<AdminDashboardController> _logger;

    public AdminDashboardController(IMediator mediator, ILogger<AdminDashboardController> logger)
    {
        _mediator = mediator;
        _logger = logger;
    }

    /// <summary>
    /// Get comprehensive dashboard overview with key system metrics
    /// </summary>
    /// <returns>Dashboard overview with statistics and key metrics</returns>
    [HttpGet("overview")]
    [ProducesResponseType(typeof(DashboardOverviewDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<DashboardOverviewDto>> GetDashboardOverview()
    {
        try
        {
            var query = new GetDashboardOverviewQuery();
            var result = await _mediator.Send(query);
            
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while retrieving dashboard overview");
            return StatusCode(500, new { message = "An error occurred while processing your request" });
        }
    }

    /// <summary>
    /// Get system health status and monitoring information
    /// </summary>
    /// <returns>Comprehensive system health information</returns>
    [HttpGet("health")]
    [ProducesResponseType(typeof(SystemHealthDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<SystemHealthDto>> GetSystemHealth()
    {
        try
        {
            var query = new GetSystemHealthQuery();
            var result = await _mediator.Send(query);
            
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while retrieving system health");
            return StatusCode(500, new { message = "An error occurred while processing your request" });
        }
    }

    /// <summary>
    /// Get recent system activity and admin operations log
    /// </summary>
    /// <param name="pageNumber">Page number (default: 1)</param>
    /// <param name="pageSize">Items per page (default: 20, max: 100)</param>
    /// <param name="activityType">Filter by activity type</param>
    /// <param name="dateFrom">Filter activities from this date</param>
    /// <param name="dateTo">Filter activities to this date</param>
    /// <param name="userId">Filter by specific user</param>
    /// <param name="entityType">Filter by entity type (Club, Connection, User)</param>
    /// <returns>Paginated activity log</returns>
    [HttpGet("activities")]
    [ProducesResponseType(typeof(PagedResult<ActivityLogDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<PagedResult<ActivityLogDto>>> GetRecentActivities(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] ActivityType? activityType = null,
        [FromQuery] DateTime? dateFrom = null,
        [FromQuery] DateTime? dateTo = null,
        [FromQuery] Guid? userId = null,
        [FromQuery] string? entityType = null)
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

            var query = new GetRecentActivitiesQuery
            {
                PageNumber = pageNumber,
                PageSize = pageSize,
                ActivityType = activityType,
                DateFrom = dateFrom,
                DateTo = dateTo,
                UserId = userId,
                EntityType = entityType
            };

            var result = await _mediator.Send(query);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid parameters for activities query");
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while retrieving recent activities");
            return StatusCode(500, new { message = "An error occurred while processing your request" });
        }
    }

    /// <summary>
    /// Get detailed system statistics for administrative analysis
    /// </summary>
    /// <param name="dateRange">Time range for statistics (Last7Days, Last30Days, Last90Days, Custom)</param>
    /// <param name="dateFrom">Custom date range start (for Custom dateRange)</param>
    /// <param name="dateTo">Custom date range end (for Custom dateRange)</param>
    /// <returns>Comprehensive system statistics</returns>
    [HttpGet("statistics")]
    [ProducesResponseType(typeof(SystemStatisticsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<SystemStatisticsDto>> GetSystemStatistics(
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

            var query = new GetSystemStatisticsQuery
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
            _logger.LogWarning(ex, "Invalid parameters for statistics query");
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while retrieving system statistics");
            return StatusCode(500, new { message = "An error occurred while processing your request" });
        }
    }

    /// <summary>
    /// Get user management insights and statistics
    /// </summary>
    /// <param name="includeInactive">Include inactive users in results</param>
    /// <param name="roleFilter">Filter by specific role</param>
    /// <returns>User management statistics</returns>
    [HttpGet("users")]
    [ProducesResponseType(typeof(UserStatisticsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<UserStatisticsDto>> GetUserStatistics(
        [FromQuery] bool includeInactive = false,
        [FromQuery] string? roleFilter = null)
    {
        try
        {
            var query = new GetUserStatisticsQuery
            {
                IncludeInactive = includeInactive,
                RoleFilter = roleFilter
            };

            var result = await _mediator.Send(query);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while retrieving user statistics");
            return StatusCode(500, new { message = "An error occurred while processing your request" });
        }
    }

    /// <summary>
    /// Get content moderation insights and pending actions
    /// </summary>
    /// <returns>Content moderation statistics and pending items</returns>
    [HttpGet("moderation")]
    [ProducesResponseType(typeof(ModerationStatisticsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ModerationStatisticsDto>> GetModerationStatistics()
    {
        try
        {
            var query = new GetModerationStatisticsQuery();
            var result = await _mediator.Send(query);
            
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while retrieving moderation statistics");
            return StatusCode(500, new { message = "An error occurred while processing your request" });
        }
    }

    /// <summary>
    /// Get performance metrics and system resource usage
    /// </summary>
    /// <param name="timeSpan">Time span for performance data (Hour, Day, Week)</param>
    /// <returns>Performance metrics and resource usage data</returns>
    [HttpGet("performance")]
    [ProducesResponseType(typeof(PerformanceMetricsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<PerformanceMetricsDto>> GetPerformanceMetrics(
        [FromQuery] PerformanceTimeSpan timeSpan = PerformanceTimeSpan.Day)
    {
        try
        {
            var query = new GetPerformanceMetricsQuery
            {
                TimeSpan = timeSpan
            };

            var result = await _mediator.Send(query);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid time span for performance metrics");
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while retrieving performance metrics");
            return StatusCode(500, new { message = "An error occurred while processing your request" });
        }
    }

    /// <summary>
    /// Get system alerts and notifications for administrative attention
    /// </summary>
    /// <param name="severity">Filter by alert severity (Low, Medium, High, Critical)</param>
    /// <param name="isResolved">Filter by resolution status</param>
    /// <param name="pageNumber">Page number (default: 1)</param>
    /// <param name="pageSize">Items per page (default: 20, max: 50)</param>
    /// <returns>Paginated system alerts</returns>
    [HttpGet("alerts")]
    [ProducesResponseType(typeof(PagedResult<SystemAlertDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<PagedResult<SystemAlertDto>>> GetSystemAlerts(
        [FromQuery] AlertSeverity? severity = null,
        [FromQuery] bool? isResolved = null,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20)
    {
        try
        {
            if (pageSize > 50)
            {
                pageSize = 50;
            }

            var query = new GetSystemAlertsQuery
            {
                Severity = severity,
                IsResolved = isResolved,
                PageNumber = pageNumber,
                PageSize = pageSize
            };

            var result = await _mediator.Send(query);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid parameters for system alerts query");
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while retrieving system alerts");
            return StatusCode(500, new { message = "An error occurred while processing your request" });
        }
    }

    /// <summary>
    /// Resolve a system alert
    /// </summary>
    /// <param name="alertId">Alert identifier</param>
    /// <param name="resolution">Resolution details</param>
    /// <returns>Success confirmation</returns>
    [HttpPost("alerts/{alertId:guid}/resolve")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> ResolveAlert(Guid alertId, [FromBody] AlertResolutionDto resolution)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var command = new ResolveAlertCommand
            {
                AlertId = alertId,
                ResolutionNotes = resolution.ResolutionNotes,
                ResolvedBy = resolution.ResolvedBy
            };

            var result = await _mediator.Send(command);

            if (!result)
            {
                return NotFound(new { message = $"Alert with ID {alertId} not found" });
            }

            _logger.LogInformation("Alert {AlertId} resolved by admin user", alertId);
            
            return NoContent();
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid data provided for alert resolution");
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while resolving alert {AlertId}", alertId);
            return StatusCode(500, new { message = "An error occurred while processing your request" });
        }
    }

    /// <summary>
    /// Get data export options and status
    /// </summary>
    /// <returns>Available export options and recent export status</returns>
    [HttpGet("exports")]
    [ProducesResponseType(typeof(ExportOptionsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ExportOptionsDto>> GetExportOptions()
    {
        try
        {
            var query = new GetExportOptionsQuery();
            var result = await _mediator.Send(query);
            
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while retrieving export options");
            return StatusCode(500, new { message = "An error occurred while processing your request" });
        }
    }

    /// <summary>
    /// Initiate system data export
    /// </summary>
    /// <param name="request">Export configuration</param>
    /// <returns>Export job information</returns>
    [HttpPost("exports")]
    [ProducesResponseType(typeof(ExportJobDto), StatusCodes.Status202Accepted)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ExportJobDto>> InitiateExport([FromBody] ExportRequestDto request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var command = new InitiateExportCommand
            {
                ExportType = request.ExportType,
                DateRange = request.DateRange,
                IncludeArchived = request.IncludeArchived,
                Format = request.Format,
                NotificationEmail = request.NotificationEmail
            };

            var result = await _mediator.Send(command);
            
            _logger.LogInformation("Export job {JobId} initiated by admin user", result.JobId);
            
            return Accepted(result);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid export request parameters");
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while initiating export");
            return StatusCode(500, new { message = "An error occurred while processing your request" });
        }
    }

    /// <summary>
    /// Get chart data for dashboard visualizations
    /// </summary>
    /// <param name="chartType">Type of chart data to retrieve</param>
    /// <param name="dateRange">Time range for chart data</param>
    /// <returns>Chart data for visualizations</returns>
    [HttpGet("charts/{chartType}")]
    [ProducesResponseType(typeof(ChartDataDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ChartDataDto>> GetChartData(
        string chartType,
        [FromQuery] DateRangeType dateRange = DateRangeType.Last30Days)
    {
        try
        {
            var validChartTypes = new[] { "clubs", "connections", "users", "activities", "performance" };
            
            if (!validChartTypes.Contains(chartType.ToLowerInvariant()))
            {
                return BadRequest(new { message = "Invalid chart type. Valid types: " + string.Join(", ", validChartTypes) });
            }

            var query = new GetChartDataQuery
            {
                ChartType = chartType,
                DateRange = dateRange
            };

            var result = await _mediator.Send(query);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid chart data request");
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while retrieving chart data for {ChartType}", chartType);
            return StatusCode(500, new { message = "An error occurred while processing your request" });
        }
    }

    /// <summary>
    /// Get system configuration summary
    /// </summary>
    /// <returns>Current system configuration and settings</returns>
    [HttpGet("configuration")]
    [ProducesResponseType(typeof(SystemConfigurationDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<SystemConfigurationDto>> GetSystemConfiguration()
    {
        try
        {
            var query = new GetSystemConfigurationQuery();
            var result = await _mediator.Send(query);
            
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while retrieving system configuration");
            return StatusCode(500, new { message = "An error occurred while processing your request" });
        }
    }
}

// Placeholder command and query classes - these would be implemented in the Application layer
public record GetDashboardOverviewQuery;

public record GetSystemHealthQuery;

public record GetRecentActivitiesQuery
{
    public int PageNumber { get; init; } = 1;
    public int PageSize { get; init; } = 20;
    public ActivityType? ActivityType { get; init; }
    public DateTime? DateFrom { get; init; }
    public DateTime? DateTo { get; init; }
    public Guid? UserId { get; init; }
    public string? EntityType { get; init; }
}

public record GetSystemStatisticsQuery
{
    public DateRangeType DateRange { get; init; } = DateRangeType.Last30Days;
    public DateTime? DateFrom { get; init; }
    public DateTime? DateTo { get; init; }
}

public record GetUserStatisticsQuery
{
    public bool IncludeInactive { get; init; }
    public string? RoleFilter { get; init; }
}

public record GetModerationStatisticsQuery;

public record GetPerformanceMetricsQuery
{
    public PerformanceTimeSpan TimeSpan { get; init; } = PerformanceTimeSpan.Day;
}

public record GetSystemAlertsQuery
{
    public AlertSeverity? Severity { get; init; }
    public bool? IsResolved { get; init; }
    public int PageNumber { get; init; } = 1;
    public int PageSize { get; init; } = 20;
}

public record ResolveAlertCommand
{
    public Guid AlertId { get; init; }
    public string? ResolutionNotes { get; init; }
    public string? ResolvedBy { get; init; }
}

public record GetExportOptionsQuery;

public record InitiateExportCommand
{
    public string ExportType { get; init; } = string.Empty;
    public DateRangeType DateRange { get; init; }
    public bool IncludeArchived { get; init; }
    public string Format { get; init; } = "CSV";
    public string? NotificationEmail { get; init; }
}

public record GetChartDataQuery
{
    public string ChartType { get; init; } = string.Empty;
    public DateRangeType DateRange { get; init; } = DateRangeType.Last30Days;
}

public record GetSystemConfigurationQuery;

// Enums for dashboard functionality
public enum DateRangeType
{
    Last7Days,
    Last30Days,
    Last90Days,
    LastYear,
    Custom
}

public enum PerformanceTimeSpan
{
    Hour,
    Day,
    Week,
    Month
}

public enum AlertSeverity
{
    Low,
    Medium,
    High,
    Critical
}

public enum ActivityType
{
    UserRegistration,
    UserLogin,
    ClubCreated,
    ClubModified,
    ConnectionCreated,
    ConnectionModified,
    AdminAction,
    SystemEvent
}

// Sample DTOs for dashboard responses
public record AlertResolutionDto
{
    public string? ResolutionNotes { get; init; }
    public string? ResolvedBy { get; init; }
}

public record ExportRequestDto
{
    public string ExportType { get; init; } = string.Empty;
    public DateRangeType DateRange { get; init; }
    public bool IncludeArchived { get; init; }
    public string Format { get; init; } = "CSV";
    public string? NotificationEmail { get; init; }
}

public record ExportJobDto
{
    public Guid JobId { get; init; }
    public string Status { get; init; } = string.Empty;
    public DateTime CreatedAt { get; init; }
    public string? DownloadUrl { get; init; }
}

public record ChartDataDto
{
    public string ChartType { get; init; } = string.Empty;
    public List<ChartDataPoint> DataPoints { get; init; } = new();
    public Dictionary<string, object> Metadata { get; init; } = new();
}

public record ChartDataPoint
{
    public string Label { get; init; } = string.Empty;
    public decimal Value { get; init; }
    public DateTime? Timestamp { get; init; }
    public Dictionary<string, object> AdditionalData { get; init; } = new();
}