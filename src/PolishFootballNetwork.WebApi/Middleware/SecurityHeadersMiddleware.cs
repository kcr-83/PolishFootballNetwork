namespace PolishFootballNetwork.WebApi.Middleware;

/// <summary>
/// Middleware for adding security headers to HTTP responses.
/// Provides comprehensive security headers to protect against common web vulnerabilities.
/// </summary>
public class SecurityHeadersMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<SecurityHeadersMiddleware> _logger;
    private readonly SecurityHeadersOptions _options;

    public SecurityHeadersMiddleware(
        RequestDelegate next,
        ILogger<SecurityHeadersMiddleware> logger,
        IOptions<SecurityHeadersOptions> options)
    {
        _next = next;
        _logger = logger;
        _options = options.Value;
    }

    /// <summary>
    /// Processes the HTTP request and adds security headers to the response.
    /// </summary>
    /// <param name="context">The HTTP context for the current request</param>
    public async Task InvokeAsync(HttpContext context)
    {
        // Add security headers before processing the request
        AddSecurityHeaders(context.Response);

        await _next(context);

        // Log security header information if requested
        if (_options.LogSecurityHeaders)
        {
            LogSecurityHeaders(context);
        }
    }

    /// <summary>
    /// Adds comprehensive security headers to the HTTP response.
    /// </summary>
    /// <param name="response">The HTTP response</param>
    private void AddSecurityHeaders(HttpResponse response)
    {
        var headers = response.Headers;

        // X-Content-Type-Options: Prevent MIME type sniffing
        if (_options.AddXContentTypeOptions)
        {
            headers.TryAdd("X-Content-Type-Options", "nosniff");
        }

        // X-Frame-Options: Protect against clickjacking
        if (_options.AddXFrameOptions)
        {
            headers.TryAdd("X-Frame-Options", _options.XFrameOptionsValue);
        }

        // X-XSS-Protection: Enable XSS filtering (legacy browsers)
        if (_options.AddXXssProtection)
        {
            headers.TryAdd("X-XSS-Protection", _options.XXssProtectionValue);
        }

        // Strict-Transport-Security: Enforce HTTPS
        if (_options.AddStrictTransportSecurity && _options.RequireHttps)
        {
            var hstsValue = $"max-age={_options.HstsMaxAge}";
            if (_options.HstsIncludeSubdomains)
            {
                hstsValue += "; includeSubDomains";
            }
            if (_options.HstsPreload)
            {
                hstsValue += "; preload";
            }
            headers.TryAdd("Strict-Transport-Security", hstsValue);
        }

        // Content-Security-Policy: Comprehensive CSP
        if (_options.AddContentSecurityPolicy && !string.IsNullOrWhiteSpace(_options.ContentSecurityPolicy))
        {
            headers.TryAdd("Content-Security-Policy", _options.ContentSecurityPolicy);
        }

        // Referrer-Policy: Control referrer information
        if (_options.AddReferrerPolicy)
        {
            headers.TryAdd("Referrer-Policy", _options.ReferrerPolicyValue);
        }

        // Permissions-Policy: Control browser features
        if (_options.AddPermissionsPolicy && !string.IsNullOrWhiteSpace(_options.PermissionsPolicy))
        {
            headers.TryAdd("Permissions-Policy", _options.PermissionsPolicy);
        }

        // Cross-Origin-Opener-Policy: Isolate browsing context
        if (_options.AddCrossOriginOpenerPolicy)
        {
            headers.TryAdd("Cross-Origin-Opener-Policy", _options.CrossOriginOpenerPolicyValue);
        }

        // Cross-Origin-Embedder-Policy: Require explicit permission for cross-origin loading
        if (_options.AddCrossOriginEmbedderPolicy)
        {
            headers.TryAdd("Cross-Origin-Embedder-Policy", _options.CrossOriginEmbedderPolicyValue);
        }

        // Cross-Origin-Resource-Policy: Control cross-origin resource sharing
        if (_options.AddCrossOriginResourcePolicy)
        {
            headers.TryAdd("Cross-Origin-Resource-Policy", _options.CrossOriginResourcePolicyValue);
        }

        // Server: Remove or customize server header
        if (_options.RemoveServerHeader)
        {
            headers.Remove("Server");
        }
        else if (!string.IsNullOrWhiteSpace(_options.CustomServerHeader))
        {
            headers["Server"] = _options.CustomServerHeader;
        }

        // X-Powered-By: Remove for security
        if (_options.RemoveXPoweredByHeader)
        {
            headers.Remove("X-Powered-By");
        }

        // Cache-Control: Security-focused caching
        if (_options.AddSecureCacheControl)
        {
            headers.TryAdd("Cache-Control", _options.CacheControlValue);
        }

        // Custom security headers
        foreach (var customHeader in _options.CustomHeaders)
        {
            headers.TryAdd(customHeader.Key, customHeader.Value);
        }
    }

    /// <summary>
    /// Logs information about applied security headers.
    /// </summary>
    /// <param name="context">The HTTP context</param>
    private void LogSecurityHeaders(HttpContext context)
    {
        var appliedHeaders = context.Response.Headers
            .Where(h => IsSecurityHeader(h.Key))
            .ToDictionary(h => h.Key, h => string.Join(", ", h.Value!));

        if (appliedHeaders.Any())
        {
            _logger.LogDebug(
                "Applied security headers for {Method} {Path}: {Headers}",
                context.Request.Method,
                context.Request.Path,
                string.Join(", ", appliedHeaders.Select(h => $"{h.Key}: {h.Value}")));
        }
    }

    /// <summary>
    /// Determines if a header is considered a security header.
    /// </summary>
    /// <param name="headerName">The header name</param>
    /// <returns>True if the header is a security header</returns>
    private static bool IsSecurityHeader(string headerName)
    {
        var securityHeaders = new[]
        {
            "X-Content-Type-Options",
            "X-Frame-Options",
            "X-XSS-Protection",
            "Strict-Transport-Security",
            "Content-Security-Policy",
            "Referrer-Policy",
            "Permissions-Policy",
            "Cross-Origin-Opener-Policy",
            "Cross-Origin-Embedder-Policy",
            "Cross-Origin-Resource-Policy"
        };

        return securityHeaders.Contains(headerName, StringComparer.OrdinalIgnoreCase);
    }
}

/// <summary>
/// Configuration options for security headers middleware.
/// </summary>
public class SecurityHeadersOptions
{
    /// <summary>
    /// Whether to add X-Content-Type-Options header. Default is true.
    /// </summary>
    public bool AddXContentTypeOptions { get; set; } = true;

    /// <summary>
    /// Whether to add X-Frame-Options header. Default is true.
    /// </summary>
    public bool AddXFrameOptions { get; set; } = true;

    /// <summary>
    /// Value for X-Frame-Options header. Default is "DENY".
    /// </summary>
    public string XFrameOptionsValue { get; set; } = "DENY";

    /// <summary>
    /// Whether to add X-XSS-Protection header. Default is true.
    /// </summary>
    public bool AddXXssProtection { get; set; } = true;

    /// <summary>
    /// Value for X-XSS-Protection header. Default is "1; mode=block".
    /// </summary>
    public string XXssProtectionValue { get; set; } = "1; mode=block";

    /// <summary>
    /// Whether to add Strict-Transport-Security header. Default is true.
    /// </summary>
    public bool AddStrictTransportSecurity { get; set; } = true;

    /// <summary>
    /// Whether HTTPS is required. Default is true.
    /// </summary>
    public bool RequireHttps { get; set; } = true;

    /// <summary>
    /// HSTS max age in seconds. Default is 31536000 (1 year).
    /// </summary>
    public int HstsMaxAge { get; set; } = 31536000;

    /// <summary>
    /// Whether to include subdomains in HSTS. Default is true.
    /// </summary>
    public bool HstsIncludeSubdomains { get; set; } = true;

    /// <summary>
    /// Whether to include preload in HSTS. Default is false.
    /// </summary>
    public bool HstsPreload { get; set; } = false;

    /// <summary>
    /// Whether to add Content-Security-Policy header. Default is true.
    /// </summary>
    public bool AddContentSecurityPolicy { get; set; } = true;

    /// <summary>
    /// Content Security Policy value. Default provides a secure baseline.
    /// </summary>
    public string ContentSecurityPolicy { get; set; } = 
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "font-src 'self' https://fonts.gstatic.com; " +
        "img-src 'self' data: https:; " +
        "connect-src 'self'; " +
        "frame-ancestors 'none'; " +
        "form-action 'self'; " +
        "base-uri 'self'";

    /// <summary>
    /// Whether to add Referrer-Policy header. Default is true.
    /// </summary>
    public bool AddReferrerPolicy { get; set; } = true;

    /// <summary>
    /// Referrer Policy value. Default is "strict-origin-when-cross-origin".
    /// </summary>
    public string ReferrerPolicyValue { get; set; } = "strict-origin-when-cross-origin";

    /// <summary>
    /// Whether to add Permissions-Policy header. Default is true.
    /// </summary>
    public bool AddPermissionsPolicy { get; set; } = true;

    /// <summary>
    /// Permissions Policy value. Default restricts sensitive features.
    /// </summary>
    public string PermissionsPolicy { get; set; } = 
        "camera=(), " +
        "microphone=(), " +
        "geolocation=(), " +
        "payment=(), " +
        "usb=(), " +
        "magnetometer=(), " +
        "gyroscope=(), " +
        "accelerometer=()";

    /// <summary>
    /// Whether to add Cross-Origin-Opener-Policy header. Default is true.
    /// </summary>
    public bool AddCrossOriginOpenerPolicy { get; set; } = true;

    /// <summary>
    /// Cross-Origin-Opener-Policy value. Default is "same-origin".
    /// </summary>
    public string CrossOriginOpenerPolicyValue { get; set; } = "same-origin";

    /// <summary>
    /// Whether to add Cross-Origin-Embedder-Policy header. Default is false.
    /// </summary>
    public bool AddCrossOriginEmbedderPolicy { get; set; } = false;

    /// <summary>
    /// Cross-Origin-Embedder-Policy value. Default is "require-corp".
    /// </summary>
    public string CrossOriginEmbedderPolicyValue { get; set; } = "require-corp";

    /// <summary>
    /// Whether to add Cross-Origin-Resource-Policy header. Default is true.
    /// </summary>
    public bool AddCrossOriginResourcePolicy { get; set; } = true;

    /// <summary>
    /// Cross-Origin-Resource-Policy value. Default is "same-origin".
    /// </summary>
    public string CrossOriginResourcePolicyValue { get; set; } = "same-origin";

    /// <summary>
    /// Whether to remove the Server header. Default is true.
    /// </summary>
    public bool RemoveServerHeader { get; set; } = true;

    /// <summary>
    /// Custom Server header value. Only used if RemoveServerHeader is false.
    /// </summary>
    public string? CustomServerHeader { get; set; }

    /// <summary>
    /// Whether to remove the X-Powered-By header. Default is true.
    /// </summary>
    public bool RemoveXPoweredByHeader { get; set; } = true;

    /// <summary>
    /// Whether to add secure Cache-Control header. Default is true.
    /// </summary>
    public bool AddSecureCacheControl { get; set; } = true;

    /// <summary>
    /// Cache-Control value for security. Default prevents caching of sensitive content.
    /// </summary>
    public string CacheControlValue { get; set; } = "no-cache, no-store, must-revalidate";

    /// <summary>
    /// Whether to log applied security headers. Default is false.
    /// </summary>
    public bool LogSecurityHeaders { get; set; } = false;

    /// <summary>
    /// Custom security headers to add.
    /// </summary>
    public Dictionary<string, string> CustomHeaders { get; set; } = new();

    /// <summary>
    /// Configures security headers for development environment.
    /// </summary>
    /// <returns>Security headers options for development</returns>
    public static SecurityHeadersOptions ForDevelopment()
    {
        return new SecurityHeadersOptions
        {
            RequireHttps = false,
            AddStrictTransportSecurity = false,
            XFrameOptionsValue = "SAMEORIGIN", // Allow framing for development tools
            ContentSecurityPolicy = 
                "default-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; " +
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
                "font-src 'self' https://fonts.gstatic.com; " +
                "img-src 'self' data: https: blob:; " +
                "connect-src 'self' ws: wss:; " + // Allow WebSocket for hot reload
                "frame-ancestors 'self'; " +
                "form-action 'self'",
            CrossOriginResourcePolicyValue = "cross-origin", // Allow cross-origin for development
            LogSecurityHeaders = true,
            AddSecureCacheControl = false // Allow caching in development
        };
    }

    /// <summary>
    /// Configures security headers for production environment.
    /// </summary>
    /// <returns>Security headers options for production</returns>
    public static SecurityHeadersOptions ForProduction()
    {
        return new SecurityHeadersOptions
        {
            RequireHttps = true,
            AddStrictTransportSecurity = true,
            HstsMaxAge = 31536000, // 1 year
            HstsIncludeSubdomains = true,
            HstsPreload = true,
            XFrameOptionsValue = "DENY",
            ContentSecurityPolicy = 
                "default-src 'self'; " +
                "script-src 'self' https://cdn.jsdelivr.net; " +
                "style-src 'self' https://fonts.googleapis.com; " +
                "font-src 'self' https://fonts.gstatic.com; " +
                "img-src 'self' data: https:; " +
                "connect-src 'self'; " +
                "frame-ancestors 'none'; " +
                "form-action 'self'; " +
                "base-uri 'self'",
            CrossOriginResourcePolicyValue = "same-origin",
            LogSecurityHeaders = false,
            AddSecureCacheControl = true
        };
    }
}

/// <summary>
/// Extension methods for registering the security headers middleware.
/// </summary>
public static class SecurityHeadersMiddlewareExtensions
{
    /// <summary>
    /// Adds the security headers middleware to the application pipeline.
    /// </summary>
    /// <param name="builder">The application builder</param>
    /// <returns>The application builder for method chaining</returns>
    public static IApplicationBuilder UseSecurityHeaders(this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<SecurityHeadersMiddleware>();
    }

    /// <summary>
    /// Adds the security headers middleware to the application pipeline with custom options.
    /// </summary>
    /// <param name="builder">The application builder</param>
    /// <param name="configure">Configuration action for security headers options</param>
    /// <returns>The application builder for method chaining</returns>
    public static IApplicationBuilder UseSecurityHeaders(
        this IApplicationBuilder builder,
        Action<SecurityHeadersOptions> configure)
    {
        var options = new SecurityHeadersOptions();
        configure(options);
        
        return builder.UseMiddleware<SecurityHeadersMiddleware>(
            Microsoft.Extensions.Options.Options.Create(options));
    }

    /// <summary>
    /// Adds security headers middleware with development-friendly configuration.
    /// </summary>
    /// <param name="builder">The application builder</param>
    /// <returns>The application builder for method chaining</returns>
    public static IApplicationBuilder UseSecurityHeadersForDevelopment(this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<SecurityHeadersMiddleware>(
            Microsoft.Extensions.Options.Options.Create(SecurityHeadersOptions.ForDevelopment()));
    }

    /// <summary>
    /// Adds security headers middleware with production-ready configuration.
    /// </summary>
    /// <param name="builder">The application builder</param>
    /// <returns>The application builder for method chaining</returns>
    public static IApplicationBuilder UseSecurityHeadersForProduction(this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<SecurityHeadersMiddleware>(
            Microsoft.Extensions.Options.Options.Create(SecurityHeadersOptions.ForProduction()));
    }
}