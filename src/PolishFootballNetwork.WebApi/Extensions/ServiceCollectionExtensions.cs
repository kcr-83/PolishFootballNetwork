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
    /// <param name="configuration">Configuration instance.</param>
    /// <returns>The service collection for chaining.</returns>
    public static IServiceCollection AddWebApiServices(this IServiceCollection services, IConfiguration configuration)
    {
        // Add audit logging
        services.AddScoped<IAuditLogger, AuditLogger>();

        // Add middleware configuration options
        services.Configure<RequestLoggingOptions>(configuration.GetSection("RequestLogging"));
        services.Configure<PerformanceOptions>(configuration.GetSection("Performance"));
        services.Configure<SecurityHeadersOptions>(options =>
        {
            var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT");
            if (environment == "Development")
            {
                var devOptions = SecurityHeadersOptions.ForDevelopment();
                configuration.GetSection("SecurityHeaders:Development").Bind(devOptions);
                options = devOptions;
            }
            else
            {
                var prodOptions = SecurityHeadersOptions.ForProduction();
                configuration.GetSection("SecurityHeaders:Production").Bind(prodOptions);
                options = prodOptions;
            }
        });

        // Add custom middleware (they are added to DI for dependency injection if needed)
        services.AddTransient<GlobalExceptionMiddleware>();
        services.AddTransient<AuthenticationRateLimitMiddleware>();
        services.AddTransient<ExceptionHandlingMiddleware>();
        services.AddTransient<RequestLoggingMiddleware>();
        services.AddTransient<PerformanceMiddleware>();
        services.AddTransient<SecurityHeadersMiddleware>();

        // Add health checks with custom checks
        services.AddHealthChecks()
            .AddCheck<DatabaseHealthCheck>("database")
            .AddCheck<FileSystemHealthCheck>("filesystem")
            .AddCheck<ExternalApiHealthCheck>("external-api");

        // Add performance monitoring
        services.AddSingleton<IMeterFactory>(sp => 
            new System.Diagnostics.Metrics.MeterFactory());

        return services;
    }
}

/// <summary>
/// Extension methods for configuring the Web API application pipeline.
/// </summary>
public static class ApplicationBuilderExtensions
{
    /// <summary>
    /// Adds custom middleware to the application pipeline in the correct order.
    /// </summary>
    /// <param name="app">Application builder.</param>
    /// <returns>The application builder for chaining.</returns>
    public static IApplicationBuilder UseCustomMiddleware(this IApplicationBuilder app)
    {
        var environment = app.ApplicationServices.GetRequiredService<IWebHostEnvironment>();

        // 1. Security headers should be first to ensure they're always applied
        if (environment.IsDevelopment())
        {
            app.UseSecurityHeadersForDevelopment();
        }
        else
        {
            app.UseSecurityHeadersForProduction();
        }

        // 2. Exception handling should be early to catch all errors
        app.UseMiddleware<ExceptionHandlingMiddleware>();

        // 3. Request logging to capture all requests
        app.UseMiddleware<RequestLoggingMiddleware>();

        // 4. Performance monitoring
        app.UseMiddleware<PerformanceMiddleware>();

        // 5. Legacy middleware (for backwards compatibility)
        app.UseMiddleware<GlobalExceptionMiddleware>();
        app.UseMiddleware<AuthenticationRateLimitMiddleware>();

        return app;
    }

    /// <summary>
    /// Adds development-specific middleware configuration.
    /// </summary>
    /// <param name="app">Application builder.</param>
    /// <returns>The application builder for chaining.</returns>
    public static IApplicationBuilder UseDevelopmentMiddleware(this IApplicationBuilder app)
    {
        app.UseDeveloperExceptionPage();
        app.UseSwagger();
        app.UseSwaggerUI(c =>
        {
            c.SwaggerEndpoint("/swagger/v1/swagger.json", "Polish Football Network API v1");
            c.RoutePrefix = "swagger";
            c.EnableDeepLinking();
            c.EnableFilter();
            c.ShowExtensions();
        });
        return app;
    }

    /// <summary>
    /// Adds production-specific middleware configuration.
    /// </summary>
    /// <param name="app">Application builder.</param>
    /// <returns>The application builder for chaining.</returns>
    public static IApplicationBuilder UseProductionMiddleware(this IApplicationBuilder app)
    {
        app.UseExceptionHandler("/error");
        app.UseHsts();
        return app;
    }
}