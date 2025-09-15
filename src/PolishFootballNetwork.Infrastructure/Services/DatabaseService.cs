using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using PolishFootballNetwork.Infrastructure.Configuration;
using PolishFootballNetwork.Persistence.Data;

namespace PolishFootballNetwork.Infrastructure.Services;

/// <summary>
/// Service for managing database operations like migrations and seeding.
/// </summary>
public class DatabaseService : IHostedService
{
    private readonly FootballNetworkDbContext dbContext;
    private readonly DatabaseOptions databaseOptions;
    private readonly ILogger<DatabaseService> logger;
    private readonly IHostEnvironment environment;

    /// <summary>
    /// Initializes a new instance of the <see cref="DatabaseService"/> class.
    /// </summary>
    /// <param name="dbContext">Database context.</param>
    /// <param name="databaseOptions">Database configuration options.</param>
    /// <param name="logger">Logger instance.</param>
    /// <param name="environment">Host environment.</param>
    public DatabaseService(
        FootballNetworkDbContext dbContext,
        IOptions<DatabaseOptions> databaseOptions,
        ILogger<DatabaseService> logger,
        IHostEnvironment environment)
    {
        this.dbContext = dbContext;
        this.databaseOptions = databaseOptions.Value;
        this.logger = logger;
        this.environment = environment;
    }

    /// <summary>
    /// Starts the database service and performs initialization tasks.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>A task representing the start operation.</returns>
    public async Task StartAsync(CancellationToken cancellationToken)
    {
        try
        {
            this.logger.LogInformation("Starting database service initialization");

            // Check database connectivity
            if (!await this.CanConnectToDatabaseAsync(cancellationToken))
            {
                this.logger.LogError("Cannot connect to database");
                return;
            }

            // Run migrations if enabled
            if (this.databaseOptions.AutoMigrate)
            {
                await this.MigrateDatabaseAsync(cancellationToken);
            }

            // Seed data if enabled
            if (this.databaseOptions.SeedData)
            {
                await this.SeedDatabaseAsync(cancellationToken);
            }

            this.logger.LogInformation("Database service initialization completed successfully");
        }
        catch (Exception ex)
        {
            this.logger.LogError(ex, "Error during database service initialization");
            throw;
        }
    }

    /// <summary>
    /// Stops the database service.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>A task representing the stop operation.</returns>
    public async Task StopAsync(CancellationToken cancellationToken)
    {
        await Task.CompletedTask;
        this.logger.LogInformation("Database service stopped");
    }

    /// <summary>
    /// Migrates the database to the latest version.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>A task representing the migration operation.</returns>
    public async Task MigrateDatabaseAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            this.logger.LogInformation("Starting database migration");

            var pendingMigrations = await this.dbContext.Database.GetPendingMigrationsAsync(cancellationToken);
            var pendingMigrationsList = pendingMigrations.ToList();

            if (pendingMigrationsList.Count > 0)
            {
                this.logger.LogInformation("Found {Count} pending migrations: {Migrations}",
                    pendingMigrationsList.Count,
                    string.Join(", ", pendingMigrationsList));

                await this.dbContext.Database.MigrateAsync(cancellationToken);
                this.logger.LogInformation("Database migration completed successfully");
            }
            else
            {
                this.logger.LogInformation("Database is up to date, no migrations needed");
            }
        }
        catch (Exception ex)
        {
            this.logger.LogError(ex, "Error during database migration");
            throw;
        }
    }

    /// <summary>
    /// Seeds the database with initial data.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>A task representing the seeding operation.</returns>
    public async Task SeedDatabaseAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            this.logger.LogInformation("Starting database seeding");

            // Only seed in development environment or when explicitly configured
            if (!this.environment.IsDevelopment() && !this.databaseOptions.SeedData)
            {
                this.logger.LogInformation("Skipping database seeding (not in development environment)");
                return;
            }

            // Check if database already has data
            var hasUsers = await this.dbContext.Users.AnyAsync(cancellationToken);
            if (hasUsers)
            {
                this.logger.LogInformation("Database already contains data, skipping seeding");
                return;
            }

            // Add seed data here
            // Example:
            // var testUser = new User { ... };
            // dbContext.Users.Add(testUser);

            await this.dbContext.SaveChangesAsync(cancellationToken);
            this.logger.LogInformation("Database seeding completed successfully");
        }
        catch (Exception ex)
        {
            this.logger.LogError(ex, "Error during database seeding");
            throw;
        }
    }

    /// <summary>
    /// Checks if the application can connect to the database.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>True if connection is successful, false otherwise.</returns>
    public async Task<bool> CanConnectToDatabaseAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            await this.dbContext.Database.CanConnectAsync(cancellationToken);
            this.logger.LogInformation("Database connectivity check successful");
            return true;
        }
        catch (Exception ex)
        {
            this.logger.LogError(ex, "Database connectivity check failed");
            return false;
        }
    }

    /// <summary>
    /// Gets database health information.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Database health information.</returns>
    public async Task<DatabaseHealthInfo> GetDatabaseHealthAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var canConnect = await this.CanConnectToDatabaseAsync(cancellationToken);
            
            if (!canConnect)
            {
                return new DatabaseHealthInfo
                {
                    IsHealthy = false,
                    Message = "Cannot connect to database"
                };
            }

            var pendingMigrations = await this.dbContext.Database.GetPendingMigrationsAsync(cancellationToken);
            var appliedMigrations = await this.dbContext.Database.GetAppliedMigrationsAsync(cancellationToken);

            return new DatabaseHealthInfo
            {
                IsHealthy = true,
                Message = "Database is healthy",
                AppliedMigrationsCount = appliedMigrations.Count(),
                PendingMigrationsCount = pendingMigrations.Count()
            };
        }
        catch (Exception ex)
        {
            this.logger.LogError(ex, "Error checking database health");
            return new DatabaseHealthInfo
            {
                IsHealthy = false,
                Message = $"Error checking database health: {ex.Message}"
            };
        }
    }
}

/// <summary>
/// Represents database health information.
/// </summary>
public class DatabaseHealthInfo
{
    /// <summary>
    /// Gets or sets a value indicating whether the database is healthy.
    /// </summary>
    public bool IsHealthy { get; set; }

    /// <summary>
    /// Gets or sets the health status message.
    /// </summary>
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the number of applied migrations.
    /// </summary>
    public int AppliedMigrationsCount { get; set; }

    /// <summary>
    /// Gets or sets the number of pending migrations.
    /// </summary>
    public int PendingMigrationsCount { get; set; }
}