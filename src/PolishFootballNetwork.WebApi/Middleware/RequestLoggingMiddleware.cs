using System.Diagnostics;
using System.Text;
using System.Text.Json;

namespace PolishFootballNetwork.WebApi.Middleware;

/// <summary>
/// Middleware for structured request and response logging with performance metrics.
/// Provides comprehensive logging of HTTP requests and responses while maintaining security and performance.
/// </summary>
public class RequestLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestLoggingMiddleware> _logger;
    private readonly RequestLoggingOptions _options;

    private static readonly string[] SensitiveHeaders = 
    {
        "authorization", "cookie", "x-api-key", "x-auth-token", "authentication"
    };

    private static readonly string[] HealthCheckPaths = 
    {
        "/health", "/health/ready", "/health/live", "/healthz"
    };

    public RequestLoggingMiddleware(
        RequestDelegate next,
        ILogger<RequestLoggingMiddleware> logger,
        IOptions<RequestLoggingOptions> options)
    {
        _next = next;
        _logger = logger;
        _options = options.Value;
    }

    /// <summary>
    /// Processes the HTTP request and logs request/response information.
    /// </summary>
    /// <param name="context">The HTTP context for the current request</param>
    public async Task InvokeAsync(HttpContext context)
    {
        // Skip logging for health check endpoints if configured
        if (_options.SkipHealthChecks && IsHealthCheckPath(context.Request.Path))
        {
            await _next(context);
            return;
        }

        var correlationId = GetOrGenerateCorrelationId(context);
        var stopwatch = Stopwatch.StartNew();

        // Log request
        await LogRequestAsync(context, correlationId);

        // Capture response for logging
        var originalResponseBody = context.Response.Body;
        using var responseBody = new MemoryStream();
        context.Response.Body = responseBody;

        try
        {
            await _next(context);
        }
        finally
        {
            stopwatch.Stop();

            // Log response
            await LogResponseAsync(context, correlationId, stopwatch.ElapsedMilliseconds);

            // Copy response back to original stream
            responseBody.Seek(0, SeekOrigin.Begin);
            await responseBody.CopyToAsync(originalResponseBody);
            context.Response.Body = originalResponseBody;
        }
    }

    /// <summary>
    /// Logs detailed information about the incoming HTTP request.
    /// </summary>
    /// <param name="context">The HTTP context</param>
    /// <param name="correlationId">The correlation ID for request tracking</param>
    private async Task LogRequestAsync(HttpContext context, string correlationId)
    {
        var request = context.Request;
        var userId = context.User?.Identity?.Name ?? "Anonymous";
        var userRoles = context.User?.Identity?.IsAuthenticated == true 
            ? string.Join(",", context.User.Claims
                .Where(c => c.Type == "role" || c.Type == ClaimTypes.Role)
                .Select(c => c.Value))
            : "None";

        var requestInfo = new
        {
            CorrelationId = correlationId,
            Timestamp = DateTime.UtcNow,
            Method = request.Method,
            Path = request.Path.Value,
            QueryString = request.QueryString.Value,
            ContentType = request.ContentType,
            ContentLength = request.ContentLength,
            Headers = GetSafeHeaders(request.Headers),
            RemoteIpAddress = context.Connection.RemoteIpAddress?.ToString(),
            UserAgent = request.Headers["User-Agent"].FirstOrDefault(),
            UserId = userId,
            UserRoles = userRoles,
            Protocol = request.Protocol,
            Scheme = request.Scheme,
            Host = request.Host.Value
        };

        // Log request body if enabled and appropriate
        string? requestBody = null;
        if (_options.LogRequestBody && ShouldLogRequestBody(request))
        {
            requestBody = await ReadRequestBodyAsync(request);
        }

        using var scope = _logger.BeginScope(new Dictionary<string, object>
        {
            ["CorrelationId"] = correlationId,
            ["RequestPath"] = request.Path.Value ?? "Unknown",
            ["RequestMethod"] = request.Method,
            ["UserId"] = userId
        });

        _logger.LogInformation(
            "HTTP Request started: {Method} {Path} by {UserId} from {RemoteIpAddress}. " +
            "RequestInfo: {RequestInfo}" + (requestBody != null ? ". Body: {RequestBody}" : ""),
            request.Method,
            request.Path.Value,
            userId,
            context.Connection.RemoteIpAddress?.ToString(),
            JsonSerializer.Serialize(requestInfo),
            requestBody);
    }

    /// <summary>
    /// Logs detailed information about the HTTP response.
    /// </summary>
    /// <param name="context">The HTTP context</param>
    /// <param name="correlationId">The correlation ID for request tracking</param>
    /// <param name="elapsedMilliseconds">The elapsed time in milliseconds</param>
    private async Task LogResponseAsync(HttpContext context, string correlationId, long elapsedMilliseconds)
    {
        var request = context.Request;
        var response = context.Response;
        var userId = context.User?.Identity?.Name ?? "Anonymous";

        var responseInfo = new
        {
            CorrelationId = correlationId,
            Timestamp = DateTime.UtcNow,
            StatusCode = response.StatusCode,
            ContentType = response.ContentType,
            ContentLength = response.ContentLength,
            Headers = GetSafeHeaders(response.Headers),
            ElapsedMilliseconds = elapsedMilliseconds
        };

        // Log response body if enabled and appropriate
        string? responseBody = null;
        if (_options.LogResponseBody && ShouldLogResponseBody(response))
        {
            responseBody = await ReadResponseBodyAsync(response);
        }

        // Determine log level based on status code and elapsed time
        var logLevel = GetLogLevel(response.StatusCode, elapsedMilliseconds);

        using var scope = _logger.BeginScope(new Dictionary<string, object>
        {
            ["CorrelationId"] = correlationId,
            ["RequestPath"] = request.Path.Value ?? "Unknown",
            ["RequestMethod"] = request.Method,
            ["StatusCode"] = response.StatusCode,
            ["ElapsedMilliseconds"] = elapsedMilliseconds,
            ["UserId"] = userId
        });

        _logger.Log(logLevel,
            "HTTP Request completed: {Method} {Path} responded {StatusCode} in {ElapsedMilliseconds}ms. " +
            "ResponseInfo: {ResponseInfo}" + (responseBody != null ? ". Body: {ResponseBody}" : ""),
            request.Method,
            request.Path.Value,
            response.StatusCode,
            elapsedMilliseconds,
            JsonSerializer.Serialize(responseInfo),
            responseBody);

        // Log performance warning if request took too long
        if (elapsedMilliseconds > _options.SlowRequestThresholdMs)
        {
            _logger.LogWarning(
                "Slow request detected: {Method} {Path} took {ElapsedMilliseconds}ms (threshold: {ThresholdMs}ms)",
                request.Method,
                request.Path.Value,
                elapsedMilliseconds,
                _options.SlowRequestThresholdMs);
        }
    }

    /// <summary>
    /// Reads the request body while preserving the ability to read it again.
    /// </summary>
    /// <param name="request">The HTTP request</param>
    /// <returns>The request body as a string</returns>
    private static async Task<string?> ReadRequestBodyAsync(HttpRequest request)
    {
        try
        {
            request.EnableBuffering();
            
            using var reader = new StreamReader(request.Body, Encoding.UTF8, leaveOpen: true);
            var body = await reader.ReadToEndAsync();
            request.Body.Position = 0;
            
            return string.IsNullOrWhiteSpace(body) ? null : body;
        }
        catch (Exception)
        {
            return "[Error reading request body]";
        }
    }

    /// <summary>
    /// Reads the response body from the response stream.
    /// </summary>
    /// <param name="response">The HTTP response</param>
    /// <returns>The response body as a string</returns>
    private static async Task<string?> ReadResponseBodyAsync(HttpResponse response)
    {
        try
        {
            response.Body.Seek(0, SeekOrigin.Begin);
            
            using var reader = new StreamReader(response.Body, Encoding.UTF8, leaveOpen: true);
            var body = await reader.ReadToEndAsync();
            response.Body.Seek(0, SeekOrigin.Begin);
            
            return string.IsNullOrWhiteSpace(body) ? null : body;
        }
        catch (Exception)
        {
            return "[Error reading response body]";
        }
    }

    /// <summary>
    /// Filters headers to remove sensitive information.
    /// </summary>
    /// <param name="headers">The HTTP headers</param>
    /// <returns>A dictionary of safe headers</returns>
    private static Dictionary<string, string> GetSafeHeaders(IHeaderDictionary headers)
    {
        return headers
            .Where(h => !SensitiveHeaders.Contains(h.Key.ToLowerInvariant()))
            .ToDictionary(
                h => h.Key,
                h => string.Join(", ", h.Value!),
                StringComparer.OrdinalIgnoreCase);
    }

    /// <summary>
    /// Determines if the request body should be logged.
    /// </summary>
    /// <param name="request">The HTTP request</param>
    /// <returns>True if the request body should be logged</returns>
    private bool ShouldLogRequestBody(HttpRequest request)
    {
        // Don't log large payloads
        if (request.ContentLength > _options.MaxBodyLogSize)
            return false;

        // Only log JSON and form content
        var contentType = request.ContentType?.ToLowerInvariant();
        return contentType != null && (
            contentType.Contains("application/json") ||
            contentType.Contains("application/x-www-form-urlencoded") ||
            contentType.Contains("text/"));
    }

    /// <summary>
    /// Determines if the response body should be logged.
    /// </summary>
    /// <param name="response">The HTTP response</param>
    /// <returns>True if the response body should be logged</returns>
    private bool ShouldLogResponseBody(HttpResponse response)
    {
        // Don't log large payloads
        if (response.ContentLength > _options.MaxBodyLogSize)
            return false;

        // Don't log successful responses unless specifically configured
        if (response.StatusCode >= 200 && response.StatusCode < 300 && !_options.LogSuccessfulResponseBodies)
            return false;

        // Only log JSON and text content
        var contentType = response.ContentType?.ToLowerInvariant();
        return contentType != null && (
            contentType.Contains("application/json") ||
            contentType.Contains("text/"));
    }

    /// <summary>
    /// Determines the appropriate log level based on status code and elapsed time.
    /// </summary>
    /// <param name="statusCode">The HTTP status code</param>
    /// <param name="elapsedMilliseconds">The elapsed time in milliseconds</param>
    /// <returns>The appropriate log level</returns>
    private LogLevel GetLogLevel(int statusCode, long elapsedMilliseconds)
    {
        // Slow requests are warnings
        if (elapsedMilliseconds > _options.SlowRequestThresholdMs)
            return LogLevel.Warning;

        return statusCode switch
        {
            >= 500 => LogLevel.Error,
            >= 400 => LogLevel.Warning,
            _ => LogLevel.Information
        };
    }

    /// <summary>
    /// Checks if the request path is a health check endpoint.
    /// </summary>
    /// <param name="path">The request path</param>
    /// <returns>True if the path is a health check endpoint</returns>
    private static bool IsHealthCheckPath(PathString path)
    {
        return HealthCheckPaths.Any(healthPath => 
            path.StartsWithSegments(healthPath, StringComparison.OrdinalIgnoreCase));
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
        var newCorrelationId = Guid.NewGuid().ToString();
        context.Request.Headers.Add("X-Correlation-ID", newCorrelationId);
        return newCorrelationId;
    }
}

/// <summary>
/// Configuration options for request logging middleware.
/// </summary>
public class RequestLoggingOptions
{
    /// <summary>
    /// Whether to log request bodies. Default is false for security reasons.
    /// </summary>
    public bool LogRequestBody { get; set; } = false;

    /// <summary>
    /// Whether to log response bodies. Default is false for performance reasons.
    /// </summary>
    public bool LogResponseBody { get; set; } = false;

    /// <summary>
    /// Whether to log response bodies for successful requests (2xx status codes).
    /// </summary>
    public bool LogSuccessfulResponseBodies { get; set; } = false;

    /// <summary>
    /// Maximum size of request/response body to log in bytes. Default is 4KB.
    /// </summary>
    public int MaxBodyLogSize { get; set; } = 4096;

    /// <summary>
    /// Threshold in milliseconds for considering a request as slow. Default is 2000ms.
    /// </summary>
    public int SlowRequestThresholdMs { get; set; } = 2000;

    /// <summary>
    /// Whether to skip logging health check endpoints. Default is true.
    /// </summary>
    public bool SkipHealthChecks { get; set; } = true;
}

/// <summary>
/// Extension methods for registering the request logging middleware.
/// </summary>
public static class RequestLoggingMiddlewareExtensions
{
    /// <summary>
    /// Adds the request logging middleware to the application pipeline.
    /// </summary>
    /// <param name="builder">The application builder</param>
    /// <returns>The application builder for method chaining</returns>
    public static IApplicationBuilder UseRequestLogging(this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<RequestLoggingMiddleware>();
    }

    /// <summary>
    /// Adds the request logging middleware to the application pipeline with custom options.
    /// </summary>
    /// <param name="builder">The application builder</param>
    /// <param name="configure">Configuration action for logging options</param>
    /// <returns>The application builder for method chaining</returns>
    public static IApplicationBuilder UseRequestLogging(
        this IApplicationBuilder builder,
        Action<RequestLoggingOptions> configure)
    {
        var options = new RequestLoggingOptions();
        configure(options);
        
        return builder.UseMiddleware<RequestLoggingMiddleware>(
            Microsoft.Extensions.Options.Options.Create(options));
    }
}