namespace PolishFootballNetwork.Infrastructure;

using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using PolishFootballNetwork.Application.Common.Interfaces;
using PolishFootballNetwork.Domain.Repositories;
using PolishFootballNetwork.Infrastructure.Authorization;
using PolishFootballNetwork.Infrastructure.Configuration;
using PolishFootballNetwork.Infrastructure.Services;
using PolishFootballNetwork.Persistence;
using PolishFootballNetwork.Persistence.Repositories;

/// <summary>
/// Extension methods for registering Infrastructure layer services.
/// </summary>
public static class DependencyInjection
{
    /// <summary>
    /// Adds Infrastructure layer services to the dependency injection container.
    /// </summary>
    /// <param name="services">Service collection.</param>
    /// <param name="configuration">Configuration instance.</param>
    /// <returns>The service collection for chaining.</returns>
    public static IServiceCollection AddInfrastructureServices(this IServiceCollection services, IConfiguration configuration)
    {
        // Register configuration options
        services.Configure<DatabaseOptions>(configuration.GetSection(DatabaseOptions.SectionName));
        services.Configure<JwtOptions>(configuration.GetSection(JwtOptions.SectionName));
        services.Configure<FileStorageOptions>(configuration.GetSection(FileStorageOptions.SectionName));
        services.Configure<CacheOptions>(configuration.GetSection(CacheOptions.SectionName));

        // Register database context and related services
        services.AddDatabaseServices(configuration);

        // Register application services
        services.AddApplicationServices();

        // Register infrastructure services
        services.AddExternalServices();

        // Register JWT authentication
        services.AddJwtAuthentication(configuration);

        // Register hosted services
        services.AddHostedServices();

        return services;
    }

    /// <summary>
    /// Adds JWT authentication services to the dependency injection container.
    /// </summary>
    /// <param name="services">Service collection.</param>
    /// <param name="configuration">Configuration instance.</param>
    /// <returns>The service collection for chaining.</returns>
    public static IServiceCollection AddJwtAuthentication(this IServiceCollection services, IConfiguration configuration)
    {
        var jwtOptions = configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>()
            ?? throw new InvalidOperationException("JWT configuration is missing");

        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = jwtOptions.Issuer,
                ValidAudience = jwtOptions.Audience,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.SecretKey)),
                ClockSkew = TimeSpan.Zero,
            };

            options.SaveToken = jwtOptions.SaveToken;
            options.RequireHttpsMetadata = jwtOptions.RequireHttps;
        });

        services.AddAuthorization(AuthorizationPolicies.ConfigurePolicies);

        // Register authorization services
        services.AddScoped<IAuthorizationHandler, RoleAuthorizationHandler>();
        services.AddScoped<Infrastructure.Authorization.IAuthorizationService, Infrastructure.Authorization.AuthorizationService>();

        return services;
    }

    /// <summary>
    /// Adds health checks for Infrastructure services.
    /// </summary>
    /// <param name="services">Service collection.</param>
    /// <param name="configuration">Configuration instance.</param>
    /// <returns>The service collection for chaining.</returns>
    public static IServiceCollection AddInfrastructureHealthChecks(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddHealthChecks()
            .AddDbContextCheck<FootballNetworkDbContext>("database")
            .AddCheck("file-storage", () =>
            {
                var fileStorageOptions = configuration.GetSection(FileStorageOptions.SectionName).Get<FileStorageOptions>();
                
                if (fileStorageOptions == null || string.IsNullOrEmpty(fileStorageOptions.UploadPath))
                {
                    return Microsoft.Extensions.Diagnostics.HealthChecks.HealthCheckResult.Unhealthy("File storage configuration is missing");
                }

                if (!Directory.Exists(fileStorageOptions.UploadPath))
                {
                    try
                    {
                        Directory.CreateDirectory(fileStorageOptions.UploadPath);
                    }
                    catch (Exception ex)
                    {
                        return Microsoft.Extensions.Diagnostics.HealthChecks.HealthCheckResult.Unhealthy($"Cannot create upload directory: {ex.Message}");
                    }
                }

                return Microsoft.Extensions.Diagnostics.HealthChecks.HealthCheckResult.Healthy("File storage is available");
            });

        return services;
    }

    /// <summary>
    /// Adds database-related services to the dependency injection container.
    /// </summary>
    /// <param name="services">Service collection.</param>
    /// <param name="configuration">Configuration instance.</param>
    /// <returns>The service collection for chaining.</returns>
    private static IServiceCollection AddDatabaseServices(this IServiceCollection services, IConfiguration configuration)
    {
        var databaseOptions = configuration.GetSection(DatabaseOptions.SectionName).Get<DatabaseOptions>()
            ?? throw new InvalidOperationException("Database configuration is missing");

        // Register DbContext
        services.AddDbContext<FootballNetworkDbContext>(options =>
        {
            options.UseNpgsql(databaseOptions.ConnectionString, npgsqlOptions =>
            {
                npgsqlOptions.MigrationsAssembly(typeof(FootballNetworkDbContext).Assembly.FullName);
                npgsqlOptions.EnableRetryOnFailure(
                    maxRetryCount: databaseOptions.MaxRetryCount,
                    maxRetryDelay: TimeSpan.FromSeconds(databaseOptions.MaxRetryDelaySeconds),
                    errorCodesToAdd: null);
            });

            options.EnableSensitiveDataLogging(databaseOptions.EnableSensitiveDataLogging);
            options.EnableDetailedErrors(databaseOptions.EnableDetailedErrors);
        });

        // Register repositories
        services.AddScoped<IClubRepository, ClubRepository>();
        services.AddScoped<IConnectionRepository, ConnectionRepository>();
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IFileRepository, FileRepository>();

        return services;
    }

    /// <summary>
    /// Adds application-level services to the dependency injection container.
    /// </summary>
    /// <param name="services">Service collection.</param>
    /// <returns>The service collection for chaining.</returns>
    private static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        // Register caching
        services.AddMemoryCache();
        services.AddScoped<ICacheService, CacheService>();

        return services;
    }

    /// <summary>
    /// Adds external services to the dependency injection container.
    /// </summary>
    /// <param name="services">Service collection.</param>
    /// <returns>The service collection for chaining.</returns>
    private static IServiceCollection AddExternalServices(this IServiceCollection services)
    {
        // Register external services
        services.AddScoped<IFileService, FileStorageService>();
        services.AddScoped<IAuthenticationService, AuthenticationService>();

        return services;
    }

    /// <summary>
    /// Adds hosted services to the dependency injection container.
    /// </summary>
    /// <param name="services">Service collection.</param>
    /// <returns>The service collection for chaining.</returns>
    private static IServiceCollection AddHostedServices(this IServiceCollection services)
    {
        // Register hosted services
        services.AddHostedService<DatabaseService>();

        return services;
    }
}