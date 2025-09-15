using System.Collections.Concurrent;
using System.Net;

namespace PolishFootballNetwork.WebApi.Middleware;

/// <summary>
/// Rate limiting middleware for authentication endpoints.
/// </summary>
public class AuthenticationRateLimitMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<AuthenticationRateLimitMiddleware> _logger;
    private readonly ConcurrentDictionary<string, List<DateTime>> _requests = new();
    private readonly TimeSpan _timeWindow = TimeSpan.FromMinutes(15);
    private readonly int _maxRequests = 5; // Max 5 failed auth attempts per 15 minutes

    /// <summary>
    /// Initializes a new instance of the <see cref="AuthenticationRateLimitMiddleware"/> class.
    /// </summary>
    /// <param name="next">The next middleware in the pipeline.</param>
    /// <param name="logger">Logger instance.</param>
    public AuthenticationRateLimitMiddleware(RequestDelegate next, ILogger<AuthenticationRateLimitMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    /// <summary>
    /// Invokes the middleware to check rate limits for authentication endpoints.
    /// </summary>
    /// <param name="context">HTTP context.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    public async Task InvokeAsync(HttpContext context)
    {
        // Only apply rate limiting to authentication endpoints
        if (!IsAuthenticationEndpoint(context.Request.Path))
        {
            await _next(context);
            return;
        }

        var clientIdentifier = GetClientIdentifier(context);
        var now = DateTime.UtcNow;

        // Clean old requests
        CleanOldRequests(clientIdentifier, now);

        // Check if client has exceeded rate limit
        if (HasExceededRateLimit(clientIdentifier, now))
        {
            _logger.LogWarning("Rate limit exceeded for client {ClientIdentifier} on endpoint {Path}", 
                clientIdentifier, context.Request.Path);

            context.Response.StatusCode = (int)HttpStatusCode.TooManyRequests;
            context.Response.ContentType = "application/json";

            var response = new
            {
                error = "Too many authentication attempts",
                message = "Rate limit exceeded. Please try again later.",
                retryAfter = _timeWindow.TotalSeconds
            };

            await context.Response.WriteAsync(System.Text.Json.JsonSerializer.Serialize(response));
            return;
        }

        // Store the original response stream
        var originalBodyStream = context.Response.Body;
        using var responseBody = new MemoryStream();
        context.Response.Body = responseBody;

        await _next(context);

        // Check if authentication failed (4xx status codes)
        if (context.Response.StatusCode >= 400 && context.Response.StatusCode < 500)
        {
            RecordFailedAttempt(clientIdentifier, now);
        }

        // Copy the response back to the original stream
        context.Response.Body = originalBodyStream;
        responseBody.Seek(0, SeekOrigin.Begin);
        await responseBody.CopyToAsync(originalBodyStream);
    }

    /// <summary>
    /// Determines if the current request is to an authentication endpoint.
    /// </summary>
    /// <param name="path">Request path.</param>
    /// <returns>True if it's an authentication endpoint.</returns>
    private static bool IsAuthenticationEndpoint(PathString path)
    {
        return path.StartsWithSegments("/api/auth");
    }

    /// <summary>
    /// Gets a client identifier for rate limiting.
    /// </summary>
    /// <param name="context">HTTP context.</param>
    /// <returns>Client identifier.</returns>
    private static string GetClientIdentifier(HttpContext context)
    {
        // Try to get real IP address
        var clientIp = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (string.IsNullOrEmpty(clientIp))
        {
            clientIp = context.Request.Headers["X-Real-IP"].FirstOrDefault();
        }
        if (string.IsNullOrEmpty(clientIp))
        {
            clientIp = context.Connection.RemoteIpAddress?.ToString();
        }

        return clientIp ?? "unknown";
    }

    /// <summary>
    /// Cleans old requests from the tracking dictionary.
    /// </summary>
    /// <param name="clientIdentifier">Client identifier.</param>
    /// <param name="now">Current time.</param>
    private void CleanOldRequests(string clientIdentifier, DateTime now)
    {
        if (_requests.TryGetValue(clientIdentifier, out var requests))
        {
            requests.RemoveAll(requestTime => now - requestTime > _timeWindow);
            
            if (!requests.Any())
            {
                _requests.TryRemove(clientIdentifier, out _);
            }
        }
    }

    /// <summary>
    /// Checks if the client has exceeded the rate limit.
    /// </summary>
    /// <param name="clientIdentifier">Client identifier.</param>
    /// <param name="now">Current time.</param>
    /// <returns>True if rate limit is exceeded.</returns>
    private bool HasExceededRateLimit(string clientIdentifier, DateTime now)
    {
        if (!_requests.TryGetValue(clientIdentifier, out var requests))
        {
            return false;
        }

        return requests.Count >= _maxRequests;
    }

    /// <summary>
    /// Records a failed authentication attempt.
    /// </summary>
    /// <param name="clientIdentifier">Client identifier.</param>
    /// <param name="now">Current time.</param>
    private void RecordFailedAttempt(string clientIdentifier, DateTime now)
    {
        _requests.AddOrUpdate(
            clientIdentifier,
            new List<DateTime> { now },
            (key, existingRequests) =>
            {
                existingRequests.Add(now);
                return existingRequests;
            });

        _logger.LogInformation("Recorded failed authentication attempt for client {ClientIdentifier}", clientIdentifier);
    }
}