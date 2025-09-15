using PolishFootballNetwork.WebApi.Middleware;
using PolishFootballNetwork.WebApi.Services;

namespace PolishFootballNetwork.WebApi.Extensions;

/// <summary>
/// Extension methods for configuring Web API services.
/// </summary>
public static class ServiceCollectionExtensions
{
    /// <summary>
    /// Adds Web API specific services to the dependency injection container.
    /// </summary>
    /// <param name="services">Service collection.</param>
    /// <returns>The service collection for chaining.</returns>
    public static IServiceCollection AddWebApiServices(this IServiceCollection services)
    {
        // Add audit logging
        services.AddScoped<IAuditLogger, AuditLogger>();

        // Add custom middleware (they are added to DI for dependency injection if needed)
        services.AddTransient<GlobalExceptionMiddleware>();
        services.AddTransient<AuthenticationRateLimitMiddleware>();

        return services;
    }
}

/// <summary>
/// Extension methods for configuring the Web API application pipeline.
/// </summary>
public static class ApplicationBuilderExtensions
{
    /// <summary>
    /// Adds custom middleware to the application pipeline.
    /// </summary>
    /// <param name="app">Application builder.</param>
    /// <returns>The application builder for chaining.</returns>
    public static IApplicationBuilder UseCustomMiddleware(this IApplicationBuilder app)
    {
        // Global exception handling should be early in the pipeline
        app.UseMiddleware<GlobalExceptionMiddleware>();

        // Rate limiting for authentication endpoints
        app.UseMiddleware<AuthenticationRateLimitMiddleware>();

        return app;
    }
}