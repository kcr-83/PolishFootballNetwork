using System.Diagnostics;
using System.Diagnostics.Metrics;

namespace PolishFootballNetwork.WebApi.Middleware;

/// <summary>
/// Middleware for monitoring and recording performance metrics of HTTP requests.
/// Provides comprehensive performance monitoring with metrics collection, timing analysis, and alerting.
/// </summary>
public class PerformanceMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<PerformanceMiddleware> _logger;
    private readonly PerformanceOptions _options;
    private readonly Meter _meter;
    private readonly Counter<long> _requestCounter;
    private readonly Histogram<double> _requestDuration;
    private readonly Counter<long> _slowRequestCounter;
    private readonly Histogram<long> _requestSize;
    private readonly Histogram<long> _responseSize;

    public PerformanceMiddleware(
        RequestDelegate next,
        ILogger<PerformanceMiddleware> logger,
        IOptions<PerformanceOptions> options,
        IMeterFactory meterFactory)
    {
        _next = next;
        _logger = logger;
        _options = options.Value;
        
        // Initialize metrics
        _meter = meterFactory.Create("PolishFootballNetwork.WebApi");
        
        _requestCounter = _meter.CreateCounter<long>(
            "http_requests_total",
            "requests",
            "Total number of HTTP requests");
            
        _requestDuration = _meter.CreateHistogram<double>(
            "http_request_duration_ms",
            "milliseconds",
            "Duration of HTTP requests in milliseconds");
            
        _slowRequestCounter = _meter.CreateCounter<long>(
            "http_slow_requests_total",
            "requests",
            "Total number of slow HTTP requests");
            
        _requestSize = _meter.CreateHistogram<long>(
            "http_request_size_bytes",
            "bytes",
            "Size of HTTP request bodies in bytes");
            
        _responseSize = _meter.CreateHistogram<long>(
            "http_response_size_bytes",
            "bytes",
            "Size of HTTP response bodies in bytes");
    }

    /// <summary>
    /// Processes the HTTP request and records performance metrics.
    /// </summary>
    /// <param name="context">The HTTP context for the current request</param>
    public async Task InvokeAsync(HttpContext context)
    {
        // Skip performance monitoring for health check endpoints if configured
        if (_options.SkipHealthChecks && IsHealthCheckPath(context.Request.Path))
        {
            await _next(context);
            return;
        }

        var correlationId = GetCorrelationId(context);
        var stopwatch = Stopwatch.StartNew();
        var memoryBefore = GC.GetTotalMemory(false);
        
        // Capture request metrics
        var requestSize = context.Request.ContentLength ?? 0;
        var startTime = DateTime.UtcNow;

        // Store original response body stream to measure response size
        var originalResponseBody = context.Response.Body;
        using var responseBodyStream = new MemoryStream();
        context.Response.Body = responseBodyStream;

        Exception? exception = null;
        
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            exception = ex;
            throw;
        }
        finally
        {
            stopwatch.Stop();
            var memoryAfter = GC.GetTotalMemory(false);
            var memoryUsed = memoryAfter - memoryBefore;

            // Copy response back to original stream and measure size
            responseBodyStream.Seek(0, SeekOrigin.Begin);
            await responseBodyStream.CopyToAsync(originalResponseBody);
            var responseSize = responseBodyStream.Length;
            context.Response.Body = originalResponseBody;

            // Record performance metrics
            await RecordPerformanceMetricsAsync(
                context, 
                correlationId, 
                stopwatch.ElapsedMilliseconds, 
                requestSize, 
                responseSize, 
                memoryUsed,
                startTime,
                exception);
        }
    }

    /// <summary>
    /// Records comprehensive performance metrics for the request.
    /// </summary>
    /// <param name="context">The HTTP context</param>
    /// <param name="correlationId">The correlation ID</param>
    /// <param name="elapsedMilliseconds">The elapsed time in milliseconds</param>
    /// <param name="requestSize">The size of the request body</param>
    /// <param name="responseSize">The size of the response body</param>
    /// <param name="memoryUsed">The memory used during request processing</param>
    /// <param name="startTime">The request start time</param>
    /// <param name="exception">Any exception that occurred</param>
    private async Task RecordPerformanceMetricsAsync(
        HttpContext context,
        string correlationId,
        long elapsedMilliseconds,
        long requestSize,
        long responseSize,
        long memoryUsed,
        DateTime startTime,
        Exception? exception)
    {
        var request = context.Request;
        var response = context.Response;
        var userId = context.User?.Identity?.Name ?? "Anonymous";
        
        // Create tags for metrics
        var tags = new KeyValuePair<string, object?>[]
        {
            new("method", request.Method),
            new("endpoint", GetEndpointName(request.Path)),
            new("status_code", response.StatusCode),
            new("status_class", GetStatusClass(response.StatusCode)),
            new("user_authenticated", context.User?.Identity?.IsAuthenticated ?? false),
            new("has_exception", exception != null)
        };

        // Record basic metrics
        _requestCounter.Add(1, tags);
        _requestDuration.Record(elapsedMilliseconds, tags);
        _requestSize.Record(requestSize, tags);
        _responseSize.Record(responseSize, tags);

        // Record slow requests
        if (elapsedMilliseconds > _options.SlowRequestThresholdMs)
        {
            _slowRequestCounter.Add(1, tags);
        }

        // Create performance summary
        var performanceSummary = new PerformanceSummary
        {
            CorrelationId = correlationId,
            Method = request.Method,
            Path = request.Path.Value ?? "Unknown",
            StatusCode = response.StatusCode,
            ElapsedMilliseconds = elapsedMilliseconds,
            RequestSize = requestSize,
            ResponseSize = responseSize,
            MemoryUsed = memoryUsed,
            StartTime = startTime,
            EndTime = DateTime.UtcNow,
            UserId = userId,
            UserAgent = request.Headers["User-Agent"].FirstOrDefault(),
            RemoteIpAddress = context.Connection.RemoteIpAddress?.ToString(),
            HasException = exception != null,
            ExceptionType = exception?.GetType().Name
        };

        // Log performance information
        await LogPerformanceAsync(performanceSummary);

        // Check for performance alerts
        await CheckPerformanceAlertsAsync(performanceSummary);
    }

    /// <summary>
    /// Logs performance information with appropriate severity.
    /// </summary>
    /// <param name="summary">The performance summary</param>
    private async Task LogPerformanceAsync(PerformanceSummary summary)
    {
        var logLevel = GetPerformanceLogLevel(summary);

        using var scope = _logger.BeginScope(new Dictionary<string, object>
        {
            ["CorrelationId"] = summary.CorrelationId,
            ["RequestPath"] = summary.Path,
            ["RequestMethod"] = summary.Method,
            ["StatusCode"] = summary.StatusCode,
            ["ElapsedMilliseconds"] = summary.ElapsedMilliseconds,
            ["UserId"] = summary.UserId
        });

        if (_options.EnableDetailedLogging || summary.ElapsedMilliseconds > _options.SlowRequestThresholdMs)
        {
            _logger.Log(logLevel,
                "Performance metrics: {Method} {Path} completed in {ElapsedMs}ms " +
                "(Status: {StatusCode}, RequestSize: {RequestSize}B, ResponseSize: {ResponseSize}B, " +
                "Memory: {MemoryUsed}B, User: {UserId})",
                summary.Method,
                summary.Path,
                summary.ElapsedMilliseconds,
                summary.StatusCode,
                summary.RequestSize,
                summary.ResponseSize,
                summary.MemoryUsed,
                summary.UserId);
        }

        // Store metrics for analysis if configured
        if (_options.StoreMetrics)
        {
            await StoreMetricsAsync(summary);
        }
    }

    /// <summary>
    /// Checks for performance alerts and logs warnings if thresholds are exceeded.
    /// </summary>
    /// <param name="summary">The performance summary</param>
    private async Task CheckPerformanceAlertsAsync(PerformanceSummary summary)
    {
        var alerts = new List<string>();

        // Check slow request threshold
        if (summary.ElapsedMilliseconds > _options.SlowRequestThresholdMs)
        {
            alerts.Add($"Slow request: {summary.ElapsedMilliseconds}ms (threshold: {_options.SlowRequestThresholdMs}ms)");
        }

        // Check very slow request threshold
        if (summary.ElapsedMilliseconds > _options.VerySlowRequestThresholdMs)
        {
            alerts.Add($"Very slow request: {summary.ElapsedMilliseconds}ms (threshold: {_options.VerySlowRequestThresholdMs}ms)");
        }

        // Check large response threshold
        if (summary.ResponseSize > _options.LargeResponseThresholdBytes)
        {
            alerts.Add($"Large response: {summary.ResponseSize} bytes (threshold: {_options.LargeResponseThresholdBytes} bytes)");
        }

        // Check high memory usage
        if (summary.MemoryUsed > _options.HighMemoryUsageThresholdBytes)
        {
            alerts.Add($"High memory usage: {summary.MemoryUsed} bytes (threshold: {_options.HighMemoryUsageThresholdBytes} bytes)");
        }

        // Log alerts if any
        if (alerts.Any())
        {
            _logger.LogWarning(
                "Performance alerts for {Method} {Path} (CorrelationId: {CorrelationId}): {Alerts}",
                summary.Method,
                summary.Path,
                summary.CorrelationId,
                string.Join("; ", alerts));

            // Send notifications if configured
            if (_options.EnableNotifications)
            {
                await SendPerformanceNotificationAsync(summary, alerts);
            }
        }
    }

    /// <summary>
    /// Stores performance metrics for later analysis.
    /// </summary>
    /// <param name="summary">The performance summary</param>
    private async Task StoreMetricsAsync(PerformanceSummary summary)
    {
        try
        {
            // Here you would implement storage to database, cache, or external service
            // For now, we'll just log that metrics would be stored
            _logger.LogDebug("Storing performance metrics for {CorrelationId}", summary.CorrelationId);
            
            // Placeholder for actual storage implementation
            await Task.CompletedTask;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to store performance metrics for {CorrelationId}", summary.CorrelationId);
        }
    }

    /// <summary>
    /// Sends performance notifications for critical issues.
    /// </summary>
    /// <param name="summary">The performance summary</param>
    /// <param name="alerts">The list of alerts</param>
    private async Task SendPerformanceNotificationAsync(PerformanceSummary summary, List<string> alerts)
    {
        try
        {
            // Here you would implement notification sending (email, Slack, etc.)
            _logger.LogInformation("Would send performance notification for {CorrelationId}: {Alerts}",
                summary.CorrelationId, string.Join("; ", alerts));
                
            // Placeholder for actual notification implementation
            await Task.CompletedTask;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send performance notification for {CorrelationId}", summary.CorrelationId);
        }
    }

    /// <summary>
    /// Gets the appropriate log level based on performance metrics.
    /// </summary>
    /// <param name="summary">The performance summary</param>
    /// <returns>The appropriate log level</returns>
    private LogLevel GetPerformanceLogLevel(PerformanceSummary summary)
    {
        if (summary.HasException)
            return LogLevel.Error;

        if (summary.ElapsedMilliseconds > _options.VerySlowRequestThresholdMs)
            return LogLevel.Error;

        if (summary.ElapsedMilliseconds > _options.SlowRequestThresholdMs)
            return LogLevel.Warning;

        if (summary.StatusCode >= 500)
            return LogLevel.Error;

        if (summary.StatusCode >= 400)
            return LogLevel.Warning;

        return LogLevel.Information;
    }

    /// <summary>
    /// Gets a simplified endpoint name for metrics.
    /// </summary>
    /// <param name="path">The request path</param>
    /// <returns>The endpoint name</returns>
    private static string GetEndpointName(PathString path)
    {
        var pathValue = path.Value?.ToLowerInvariant() ?? "unknown";
        
        // Normalize paths with IDs to generic patterns
        if (pathValue.Contains("/api/"))
        {
            var segments = pathValue.Split('/');
            for (int i = 0; i < segments.Length; i++)
            {
                // Replace GUIDs and numbers with placeholders
                if (Guid.TryParse(segments[i], out _))
                {
                    segments[i] = "{id}";
                }
                else if (int.TryParse(segments[i], out _))
                {
                    segments[i] = "{id}";
                }
            }
            return string.Join("/", segments);
        }

        return pathValue;
    }

    /// <summary>
    /// Gets the status class (1xx, 2xx, 3xx, 4xx, 5xx) for the status code.
    /// </summary>
    /// <param name="statusCode">The HTTP status code</param>
    /// <returns>The status class</returns>
    private static string GetStatusClass(int statusCode)
    {
        return statusCode switch
        {
            >= 100 and < 200 => "1xx",
            >= 200 and < 300 => "2xx",
            >= 300 and < 400 => "3xx",
            >= 400 and < 500 => "4xx",
            >= 500 and < 600 => "5xx",
            _ => "unknown"
        };
    }

    /// <summary>
    /// Checks if the request path is a health check endpoint.
    /// </summary>
    /// <param name="path">The request path</param>
    /// <returns>True if the path is a health check endpoint</returns>
    private static bool IsHealthCheckPath(PathString path)
    {
        var healthPaths = new[] { "/health", "/health/ready", "/health/live", "/healthz" };
        return healthPaths.Any(healthPath => 
            path.StartsWithSegments(healthPath, StringComparison.OrdinalIgnoreCase));
    }

    /// <summary>
    /// Gets the correlation ID from the HTTP context.
    /// </summary>
    /// <param name="context">The HTTP context</param>
    /// <returns>The correlation ID</returns>
    private static string GetCorrelationId(HttpContext context)
    {
        return context.Request.Headers["X-Correlation-ID"].FirstOrDefault() 
               ?? context.TraceIdentifier 
               ?? Guid.NewGuid().ToString();
    }
}

/// <summary>
/// Performance summary containing all relevant metrics for a request.
/// </summary>
public class PerformanceSummary
{
    public string CorrelationId { get; set; } = string.Empty;
    public string Method { get; set; } = string.Empty;
    public string Path { get; set; } = string.Empty;
    public int StatusCode { get; set; }
    public long ElapsedMilliseconds { get; set; }
    public long RequestSize { get; set; }
    public long ResponseSize { get; set; }
    public long MemoryUsed { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string? UserAgent { get; set; }
    public string? RemoteIpAddress { get; set; }
    public bool HasException { get; set; }
    public string? ExceptionType { get; set; }
}

/// <summary>
/// Configuration options for performance monitoring middleware.
/// </summary>
public class PerformanceOptions
{
    /// <summary>
    /// Threshold in milliseconds for considering a request as slow. Default is 2000ms.
    /// </summary>
    public int SlowRequestThresholdMs { get; set; } = 2000;

    /// <summary>
    /// Threshold in milliseconds for considering a request as very slow. Default is 5000ms.
    /// </summary>
    public int VerySlowRequestThresholdMs { get; set; } = 5000;

    /// <summary>
    /// Threshold in bytes for considering a response as large. Default is 1MB.
    /// </summary>
    public long LargeResponseThresholdBytes { get; set; } = 1024 * 1024;

    /// <summary>
    /// Threshold in bytes for considering memory usage as high. Default is 50MB.
    /// </summary>
    public long HighMemoryUsageThresholdBytes { get; set; } = 50 * 1024 * 1024;

    /// <summary>
    /// Whether to skip performance monitoring for health check endpoints. Default is true.
    /// </summary>
    public bool SkipHealthChecks { get; set; } = true;

    /// <summary>
    /// Whether to enable detailed performance logging. Default is false.
    /// </summary>
    public bool EnableDetailedLogging { get; set; } = false;

    /// <summary>
    /// Whether to store performance metrics for analysis. Default is true.
    /// </summary>
    public bool StoreMetrics { get; set; } = true;

    /// <summary>
    /// Whether to enable performance notifications. Default is false.
    /// </summary>
    public bool EnableNotifications { get; set; } = false;
}

/// <summary>
/// Extension methods for registering the performance monitoring middleware.
/// </summary>
public static class PerformanceMiddlewareExtensions
{
    /// <summary>
    /// Adds the performance monitoring middleware to the application pipeline.
    /// </summary>
    /// <param name="builder">The application builder</param>
    /// <returns>The application builder for method chaining</returns>
    public static IApplicationBuilder UsePerformanceMonitoring(this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<PerformanceMiddleware>();
    }

    /// <summary>
    /// Adds the performance monitoring middleware to the application pipeline with custom options.
    /// </summary>
    /// <param name="builder">The application builder</param>
    /// <param name="configure">Configuration action for performance options</param>
    /// <returns>The application builder for method chaining</returns>
    public static IApplicationBuilder UsePerformanceMonitoring(
        this IApplicationBuilder builder,
        Action<PerformanceOptions> configure)
    {
        var options = new PerformanceOptions();
        configure(options);
        
        return builder.UseMiddleware<PerformanceMiddleware>(
            Microsoft.Extensions.Options.Options.Create(options));
    }
}