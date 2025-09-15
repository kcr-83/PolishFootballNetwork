namespace PolishFootballNetwork.WebApi.Extensions;

using Microsoft.AspNetCore.HttpLogging;
using PolishFootballNetwork.WebApi.HealthChecks;

/// <summary>
/// Extension methods for configuring WebApi core services.
/// </summary>
public static class WebApiDependencyInjection
{
    /// <summary>
    /// Adds WebApi-specific core services to the container.
    /// </summary>
    /// <param name="services">The service collection.</param>
    /// <param name="configuration">Configuration instance.</param>
    /// <returns>The service collection for chaining.</returns>
    public static IServiceCollection AddWebApiCoreServices(this IServiceCollection services, IConfiguration configuration)
    {
        // Add HTTP client factory for external API calls
        services.AddHttpClient();

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

        // Add enhanced health checks with custom checks
        services.AddHealthChecks()
            .AddCheck<DatabaseHealthCheck>("database")
            .AddCheck<FileSystemHealthCheck>("filesystem")
            .AddCheck<ExternalApiHealthCheck>("external-api");

        // Add memory cache for endpoint caching
        services.AddMemoryCache();

        // Add response compression
        services.AddResponseCompression(options =>
        {
            options.EnableForHttps = true;
        });

        return services;
    }
}