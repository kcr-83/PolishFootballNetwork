using Microsoft.AspNetCore.HttpLogging;

namespace PolishFootballNetwork.WebApi.Extensions;

/// <summary>
/// Extension methods for configuring WebApi services
/// </summary>
public static class DependencyInjection
{
    /// <summary>
    /// Adds WebApi-specific services to the container
    /// </summary>
    /// <param name="services">The service collection</param>
    /// <returns>The service collection for chaining</returns>
    public static IServiceCollection AddWebApiServices(this IServiceCollection services)
    {
        // Add HTTP logging
        services.AddHttpLogging(logging =>
        {
            logging.LoggingFields = HttpLoggingFields.All;
            logging.RequestHeaders.Add("X-Forwarded-For");
            logging.RequestHeaders.Add("X-Real-IP");
            logging.MediaTypeOptions.AddText("application/json");
            logging.RequestBodyLogLimit = 4096;
            logging.ResponseBodyLogLimit = 4096;
        });

        // Add problem details
        services.AddProblemDetails();

        // Add health checks
        services.AddHealthChecks();

        // Add memory cache for endpoint caching
        services.AddMemoryCache();

        return services;
    }

    /// <summary>
    /// Adds request logging services
    /// </summary>
    /// <param name="services">The service collection</param>
    /// <returns>The service collection for chaining</returns>
    public static IServiceCollection AddSerilogRequestLogging(this IServiceCollection services)
    {
        // Serilog request logging is configured in the middleware pipeline
        return services;
    }
}