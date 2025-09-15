using System.Net;
using System.Text.Json;
using PolishFootballNetwork.Application.Common.Models;
using PolishFootballNetwork.Domain.Exceptions;

namespace PolishFootballNetwork.WebApi.Middleware;

/// <summary>
/// Middleware for global exception handling and standardized error responses.
/// Provides comprehensive error handling with proper logging, security considerations, and user-friendly error messages.
/// </summary>
public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;
    private readonly IWebHostEnvironment _environment;
    private readonly JsonSerializerOptions _jsonOptions;

    public ExceptionHandlingMiddleware(
        RequestDelegate next,
        ILogger<ExceptionHandlingMiddleware> logger,
        IWebHostEnvironment environment)
    {
        _next = next;
        _logger = logger;
        _environment = environment;
        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = false
        };
    }

    /// <summary>
    /// Processes the HTTP request and handles any exceptions that occur during processing.
    /// </summary>
    /// <param name="context">The HTTP context for the current request</param>
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception exception)
        {
            await HandleExceptionAsync(context, exception);
        }
    }

    /// <summary>
    /// Handles exceptions by determining the appropriate HTTP status code and error response.
    /// </summary>
    /// <param name="context">The HTTP context</param>
    /// <param name="exception">The exception that occurred</param>
    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var correlationId = GetOrGenerateCorrelationId(context);
        var (statusCode, error) = GetErrorResponse(exception, correlationId);

        // Log the exception with context
        LogException(exception, context, correlationId, statusCode);

        // Set response headers
        context.Response.ContentType = "application/json";
        context.Response.StatusCode = (int)statusCode;

        // Add correlation ID to response headers for tracking
        context.Response.Headers.Add("X-Correlation-ID", correlationId);

        // Serialize and write the error response
        var jsonResponse = JsonSerializer.Serialize(error, _jsonOptions);
        await context.Response.WriteAsync(jsonResponse);
    }

    /// <summary>
    /// Determines the appropriate HTTP status code and error response based on the exception type.
    /// </summary>
    /// <param name="exception">The exception to process</param>
    /// <param name="correlationId">The correlation ID for request tracking</param>
    /// <returns>A tuple containing the HTTP status code and error response</returns>
    private (HttpStatusCode statusCode, ErrorResponse error) GetErrorResponse(Exception exception, string correlationId)
    {
        return exception switch
        {
            // Domain-specific exceptions
            NotFoundException ex => (
                HttpStatusCode.NotFound,
                new ErrorResponse
                {
                    Title = "Resource Not Found",
                    Status = 404,
                    Detail = ex.Message,
                    Instance = correlationId,
                    Timestamp = DateTime.UtcNow
                }
            ),

            ValidationException ex => (
                HttpStatusCode.BadRequest,
                new ErrorResponse
                {
                    Title = "Validation Failed",
                    Status = 400,
                    Detail = ex.Message,
                    Instance = correlationId,
                    Timestamp = DateTime.UtcNow,
                    Errors = ex.Errors?.ToDictionary(
                        kvp => kvp.Key,
                        kvp => kvp.Value.ToArray()
                    )
                }
            ),

            UnauthorizedAccessException => (
                HttpStatusCode.Unauthorized,
                new ErrorResponse
                {
                    Title = "Unauthorized",
                    Status = 401,
                    Detail = "Authentication required to access this resource",
                    Instance = correlationId,
                    Timestamp = DateTime.UtcNow
                }
            ),

            ForbiddenException ex => (
                HttpStatusCode.Forbidden,
                new ErrorResponse
                {
                    Title = "Forbidden",
                    Status = 403,
                    Detail = ex.Message,
                    Instance = correlationId,
                    Timestamp = DateTime.UtcNow
                }
            ),

            ConflictException ex => (
                HttpStatusCode.Conflict,
                new ErrorResponse
                {
                    Title = "Conflict",
                    Status = 409,
                    Detail = ex.Message,
                    Instance = correlationId,
                    Timestamp = DateTime.UtcNow
                }
            ),

            ArgumentNullException ex => (
                HttpStatusCode.BadRequest,
                new ErrorResponse
                {
                    Title = "Invalid Request",
                    Status = 400,
                    Detail = $"Required parameter '{ex.ParamName}' is missing",
                    Instance = correlationId,
                    Timestamp = DateTime.UtcNow
                }
            ),

            ArgumentException ex => (
                HttpStatusCode.BadRequest,
                new ErrorResponse
                {
                    Title = "Invalid Request",
                    Status = 400,
                    Detail = ex.Message,
                    Instance = correlationId,
                    Timestamp = DateTime.UtcNow
                }
            ),

            TimeoutException => (
                HttpStatusCode.RequestTimeout,
                new ErrorResponse
                {
                    Title = "Request Timeout",
                    Status = 408,
                    Detail = "The request timed out. Please try again later.",
                    Instance = correlationId,
                    Timestamp = DateTime.UtcNow
                }
            ),

            // Default case for unhandled exceptions
            _ => (
                HttpStatusCode.InternalServerError,
                new ErrorResponse
                {
                    Title = "Internal Server Error",
                    Status = 500,
                    Detail = _environment.IsDevelopment() 
                        ? exception.Message 
                        : "An unexpected error occurred. Please contact support if the problem persists.",
                    Instance = correlationId,
                    Timestamp = DateTime.UtcNow,
                    // Include stack trace only in development
                    StackTrace = _environment.IsDevelopment() ? exception.StackTrace : null
                }
            )
        };
    }

    /// <summary>
    /// Logs the exception with appropriate context and severity level.
    /// </summary>
    /// <param name="exception">The exception to log</param>
    /// <param name="context">The HTTP context</param>
    /// <param name="correlationId">The correlation ID</param>
    /// <param name="statusCode">The HTTP status code</param>
    private void LogException(Exception exception, HttpContext context, string correlationId, HttpStatusCode statusCode)
    {
        var logLevel = GetLogLevel(statusCode);
        var requestPath = context.Request.Path.Value ?? "Unknown";
        var requestMethod = context.Request.Method;
        var userAgent = context.Request.Headers["User-Agent"].FirstOrDefault() ?? "Unknown";
        var remoteIpAddress = context.Connection.RemoteIpAddress?.ToString() ?? "Unknown";
        var userId = context.User?.Identity?.Name ?? "Anonymous";

        using var scope = _logger.BeginScope(new Dictionary<string, object>
        {
            ["CorrelationId"] = correlationId,
            ["RequestPath"] = requestPath,
            ["RequestMethod"] = requestMethod,
            ["StatusCode"] = (int)statusCode,
            ["UserId"] = userId,
            ["UserAgent"] = userAgent,
            ["RemoteIpAddress"] = remoteIpAddress
        });

        _logger.Log(logLevel, exception, 
            "Unhandled exception occurred during request processing. " +
            "Method: {RequestMethod}, Path: {RequestPath}, StatusCode: {StatusCode}, " +
            "User: {UserId}, IP: {RemoteIpAddress}",
            requestMethod, requestPath, (int)statusCode, userId, remoteIpAddress);
    }

    /// <summary>
    /// Determines the appropriate log level based on the HTTP status code.
    /// </summary>
    /// <param name="statusCode">The HTTP status code</param>
    /// <returns>The appropriate log level</returns>
    private static LogLevel GetLogLevel(HttpStatusCode statusCode)
    {
        return statusCode switch
        {
            HttpStatusCode.BadRequest => LogLevel.Warning,
            HttpStatusCode.Unauthorized => LogLevel.Warning,
            HttpStatusCode.Forbidden => LogLevel.Warning,
            HttpStatusCode.NotFound => LogLevel.Information,
            HttpStatusCode.Conflict => LogLevel.Warning,
            HttpStatusCode.RequestTimeout => LogLevel.Warning,
            HttpStatusCode.InternalServerError => LogLevel.Error,
            _ when ((int)statusCode >= 400 && (int)statusCode < 500) => LogLevel.Warning,
            _ when ((int)statusCode >= 500) => LogLevel.Error,
            _ => LogLevel.Information
        };
    }

    /// <summary>
    /// Gets or generates a correlation ID for request tracking.
    /// </summary>
    /// <param name="context">The HTTP context</param>
    /// <returns>The correlation ID</returns>
    private static string GetOrGenerateCorrelationId(HttpContext context)
    {
        // Try to get correlation ID from request headers
        if (context.Request.Headers.TryGetValue("X-Correlation-ID", out var correlationId) &&
            !string.IsNullOrWhiteSpace(correlationId))
        {
            return correlationId!;
        }

        // Try to get from TraceIdentifier
        if (!string.IsNullOrWhiteSpace(context.TraceIdentifier))
        {
            return context.TraceIdentifier;
        }

        // Generate a new correlation ID
        return Guid.NewGuid().ToString();
    }
}

/// <summary>
/// Standardized error response model following RFC 7807 Problem Details for HTTP APIs.
/// </summary>
public class ErrorResponse
{
    /// <summary>
    /// A short, human-readable summary of the problem type.
    /// </summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// The HTTP status code for this occurrence of the problem.
    /// </summary>
    public int Status { get; set; }

    /// <summary>
    /// A human-readable explanation specific to this occurrence of the problem.
    /// </summary>
    public string Detail { get; set; } = string.Empty;

    /// <summary>
    /// A URI reference that identifies the specific occurrence of the problem.
    /// </summary>
    public string Instance { get; set; } = string.Empty;

    /// <summary>
    /// The timestamp when the error occurred.
    /// </summary>
    public DateTime Timestamp { get; set; }

    /// <summary>
    /// Additional validation errors, if applicable.
    /// </summary>
    public Dictionary<string, string[]>? Errors { get; set; }

    /// <summary>
    /// Stack trace information (only included in development environment).
    /// </summary>
    public string? StackTrace { get; set; }
}

/// <summary>
/// Extension methods for registering the exception handling middleware.
/// </summary>
public static class ExceptionHandlingMiddlewareExtensions
{
    /// <summary>
    /// Adds the exception handling middleware to the application pipeline.
    /// </summary>
    /// <param name="builder">The application builder</param>
    /// <returns>The application builder for method chaining</returns>
    public static IApplicationBuilder UseExceptionHandling(this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<ExceptionHandlingMiddleware>();
    }
}