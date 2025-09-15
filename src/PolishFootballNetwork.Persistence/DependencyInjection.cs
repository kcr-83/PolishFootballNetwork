using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using PolishFootballNetwork.Application.Common.Interfaces;
using PolishFootballNetwork.Domain.Repositories;
using PolishFootballNetwork.Persistence.Context;
using PolishFootballNetwork.Persistence.Repositories;

namespace PolishFootballNetwork.Persistence;

/// <summary>
/// Extension methods for configuring persistence services
/// </summary>
public static class DependencyInjection
{
    /// <summary>
    /// Adds persistence services to the dependency injection container
    /// </summary>
    /// <param name="services">The service collection</param>
    /// <param name="configuration">The configuration</param>
    /// <returns>The service collection for chaining</returns>
    public static IServiceCollection AddPersistenceServices(this IServiceCollection services, IConfiguration configuration)
    {
        // Add Entity Framework DbContext
        services.AddDbContext<FootballNetworkDbContext>(options =>
        {
            var connectionString = configuration.GetConnectionString("DefaultConnection");
            options.UseNpgsql(connectionString, npgsqlOptions =>
            {
                npgsqlOptions.EnableRetryOnFailure(
                    maxRetryCount: 3,
                    maxRetryDelay: TimeSpan.FromSeconds(5),
                    errorCodesToAdd: null);
            });
            
            // Enable sensitive data logging in development
            if (configuration.GetValue<bool>("Logging:IncludeScopes"))
            {
                options.EnableSensitiveDataLogging();
                options.EnableDetailedErrors();
            }
        });

        // Register repositories
        services.AddScoped<IClubRepository, ClubRepository>();
        services.AddScoped<IConnectionRepository, ConnectionRepository>();
        services.AddScoped<IUserRepository, UserRepository>();

        // Register Unit of Work
        services.AddScoped<IUnitOfWork, UnitOfWork>();

        return services;
    }
}