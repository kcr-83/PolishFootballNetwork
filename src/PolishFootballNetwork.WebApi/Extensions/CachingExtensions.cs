namespace PolishFootballNetwork.WebApi.Extensions;

using Microsoft.AspNetCore.ResponseCompression;
using System.IO.Compression;

/// <summary>
/// Extension methods for configuring caching and performance optimization.
/// </summary>
public static class CachingExtensions
{
    /// <summary>
    /// Adds caching and compression services and configuration.
    /// </summary>
    /// <param name="services">Service collection.</param>
    /// <returns>Service collection for chaining.</returns>
    public static IServiceCollection AddCachingAndCompression(this IServiceCollection services)
    {
        // Add memory cache
        services.AddMemoryCache(options =>
        {
            options.SizeLimit = 100; // Limit cache entries
        });

        // Add output caching with policies
        services.AddOutputCache(options =>
        {
            // Default policy for most endpoints
            options.AddBasePolicy(builder => builder
                .Expire(TimeSpan.FromMinutes(1))
                .SetVaryByQuery("page", "pageSize", "league", "country", "city", "type", "strength"));

            // Clubs list caching policy
            options.AddPolicy("clubs-list", builder => builder
                .Expire(TimeSpan.FromMinutes(2))
                .SetVaryByQuery("page", "pageSize", "league", "country", "city")
                .Tag("clubs"));

            // Club detail caching policy
            options.AddPolicy("club-detail", builder => builder
                .Expire(TimeSpan.FromMinutes(5))
                .SetVaryByRouteValue("id")
                .Tag("clubs", "club-detail"));

            // Club search caching policy
            options.AddPolicy("club-search", builder => builder
                .Expire(TimeSpan.FromMinutes(1))
                .SetVaryByQuery("q", "limit")
                .Tag("clubs", "search"));

            // Connections list caching policy
            options.AddPolicy("connections-list", builder => builder
                .Expire(TimeSpan.FromMinutes(2))
                .SetVaryByQuery("page", "pageSize", "type", "strength")
                .Tag("connections"));

            // Club connections caching policy
            options.AddPolicy("club-connections", builder => builder
                .Expire(TimeSpan.FromMinutes(5))
                .SetVaryByRouteValue("clubId")
                .SetVaryByQuery("type", "strength")
                .Tag("connections", "club-connections"));

            // Graph data caching policy (most aggressive)
            options.AddPolicy("graph-data", builder => builder
                .Expire(TimeSpan.FromMinutes(5))
                .SetVaryByQuery("includeInactive")
                .Tag("graph", "graph-data"));
        });

        // Add response compression
        services.AddResponseCompression(options =>
        {
            options.EnableForHttps = true;
            options.Providers.Add<BrotliCompressionProvider>();
            options.Providers.Add<GzipCompressionProvider>();
            
            options.MimeTypes = ResponseCompressionDefaults.MimeTypes.Concat(new[]
            {
                "application/json",
                "application/javascript",
                "text/css",
                "text/html",
                "text/json",
                "text/plain",
                "application/xml",
                "text/xml"
            });
        });

        // Configure compression levels
        services.Configure<BrotliCompressionProviderOptions>(options =>
        {
            options.Level = CompressionLevel.Optimal;
        });

        services.Configure<GzipCompressionProviderOptions>(options =>
        {
            options.Level = CompressionLevel.Optimal;
        });

        return services;
    }

    /// <summary>
    /// Configures the HTTP request pipeline for caching and compression.
    /// </summary>
    /// <param name="app">Web application builder.</param>
    /// <returns>Web application for chaining.</returns>
    public static WebApplication UseCachingAndCompression(this WebApplication app)
    {
        // Add response compression (should be early in pipeline)
        app.UseResponseCompression();

        // Add output caching
        app.UseOutputCache();

        // Add custom cache headers middleware
        app.UseMiddleware<CacheHeadersMiddleware>();

        return app;
    }
}

/// <summary>
/// Middleware for adding custom cache headers and ETags.
/// </summary>
public sealed class CacheHeadersMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<CacheHeadersMiddleware> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="CacheHeadersMiddleware"/> class.
    /// </summary>
    /// <param name="next">Next request delegate.</param>
    /// <param name="logger">Logger instance.</param>
    public CacheHeadersMiddleware(RequestDelegate next, ILogger<CacheHeadersMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    /// <summary>
    /// Invokes the middleware.
    /// </summary>
    /// <param name="context">HTTP context.</param>
    /// <returns>Task representing the async operation.</returns>
    public async Task InvokeAsync(HttpContext context)
    {
        // Add common cache headers for API responses
        if (context.Request.Path.StartsWithSegments("/api"))
        {
            context.Response.Headers.Append("Cache-Control", "public, max-age=60");
            context.Response.Headers.Append("Vary", "Accept-Encoding");
        }

        // Add performance timing headers
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        
        await _next(context);
        
        stopwatch.Stop();
        
        // Add timing header
        context.Response.Headers.Append("X-Response-Time", $"{stopwatch.ElapsedMilliseconds}ms");
        
        // Add cache status headers if present in metadata
        if (context.Response.StatusCode == 200)
        {
            // Check if response contains performance metadata
            if (context.Items.ContainsKey("CacheHit"))
            {
                context.Response.Headers.Append("X-Cache", 
                    context.Items["CacheHit"]?.ToString() == "True" ? "HIT" : "MISS");
            }

            if (context.Items.ContainsKey("QueryCount"))
            {
                context.Response.Headers.Append("X-Query-Count", 
                    context.Items["QueryCount"]?.ToString() ?? "0");
            }
        }

        // Add security headers for API responses
        if (context.Request.Path.StartsWithSegments("/api"))
        {
            context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
            context.Response.Headers.Append("X-Frame-Options", "DENY");
            context.Response.Headers.Append("X-XSS-Protection", "1; mode=block");
        }
    }
}