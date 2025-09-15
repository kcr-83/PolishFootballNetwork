using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Serilog;
using Serilog.Events;

namespace PolishFootballNetwork.Infrastructure.Logging;

/// <summary>
/// Provides extension methods for registering Serilog logging services
/// </summary>
public static class DependencyInjection
{
    /// <summary>
    /// Adds Serilog configuration with console and file logging
    /// </summary>
    /// <param name="builder">The host builder</param>
    /// <param name="configuration">The configuration</param>
    /// <returns>The host builder</returns>
    public static IHostBuilder AddSerilog(this IHostBuilder builder, IConfiguration configuration)
    {
        return builder.UseSerilog((context, services, loggerConfiguration) =>
        {
            loggerConfiguration
                .ReadFrom.Configuration(configuration)
                .ReadFrom.Services(services)
                .Enrich.FromLogContext()
                .Enrich.WithProperty("Application", "PolishFootballNetwork")
                .Enrich.WithProperty("Version", "1.0.0")
                .WriteTo.Console(
                    outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj} {Properties:j}{NewLine}{Exception}")
                .WriteTo.File(
                    path: "logs/polish-football-network-.log",
                    rollingInterval: RollingInterval.Day,
                    retainedFileCountLimit: 30,
                    outputTemplate: "[{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} {Level:u3}] {Message:lj} {Properties:j}{NewLine}{Exception}")
                .MinimumLevel.Information()
                .MinimumLevel.Override("Microsoft", LogEventLevel.Warning)
                .MinimumLevel.Override("Microsoft.Hosting.Lifetime", LogEventLevel.Information)
                .MinimumLevel.Override("System", LogEventLevel.Warning);
        });
    }

    /// <summary>
    /// Adds Serilog request logging middleware
    /// </summary>
    /// <param name="services">The service collection</param>
    /// <returns>The service collection</returns>
    public static IServiceCollection AddSerilogRequestLogging(this IServiceCollection services)
    {
        return services.AddSingleton(provider =>
        {
            return new Serilog.AspNetCore.RequestLoggingOptions
            {
                MessageTemplate = "HTTP {RequestMethod} {RequestPath} responded {StatusCode} in {Elapsed:0.0000} ms",
                GetLevel = (httpContext, elapsed, ex) => ex != null
                    ? LogEventLevel.Error
                    : httpContext.Response.StatusCode > 499
                        ? LogEventLevel.Error
                        : LogEventLevel.Information,
                EnrichDiagnosticContext = (diagnosticContext, httpContext) =>
                {
                    diagnosticContext.Set("RequestHost", httpContext.Request.Host.Value);
                    diagnosticContext.Set("RequestScheme", httpContext.Request.Scheme);
                    diagnosticContext.Set("UserAgent", httpContext.Request.Headers["User-Agent"].FirstOrDefault());
                    diagnosticContext.Set("RemoteIP", httpContext.Connection.RemoteIpAddress);
                }
            };
        });
    }
}