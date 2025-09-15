namespace PolishFootballNetwork.Infrastructure.Configuration;

/// <summary>
/// Configuration options for database connection and settings.
/// </summary>
public class DatabaseOptions
{
    /// <summary>
    /// Configuration section name in appsettings.json.
    /// </summary>
    public const string SectionName = "Database";

    /// <summary>
    /// Gets or sets the database connection string.
    /// </summary>
    public string ConnectionString { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the database provider (e.g., PostgreSQL, SqlServer).
    /// </summary>
    public string Provider { get; set; } = "PostgreSQL";

    /// <summary>
    /// Gets or sets the command timeout in seconds.
    /// </summary>
    public int CommandTimeout { get; set; } = 30;

    /// <summary>
    /// Gets or sets a value indicating whether to enable sensitive data logging.
    /// </summary>
    public bool EnableSensitiveDataLogging { get; set; } = false;

    /// <summary>
    /// Gets or sets a value indicating whether to enable detailed errors.
    /// </summary>
    public bool EnableDetailedErrors { get; set; } = false;

    /// <summary>
    /// Gets or sets a value indicating whether to automatically migrate the database on startup.
    /// </summary>
    public bool AutoMigrate { get; set; } = false;

    /// <summary>
    /// Gets or sets a value indicating whether to seed initial data.
    /// </summary>
    public bool SeedData { get; set; } = false;

    /// <summary>
    /// Gets or sets the maximum retry count for database operations.
    /// </summary>
    public int MaxRetryCount { get; set; } = 3;

    /// <summary>
    /// Gets or sets the maximum retry delay in seconds.
    /// </summary>
    public int MaxRetryDelaySeconds { get; set; } = 30;

    /// <summary>
    /// Gets or sets the database connection pool settings.
    /// </summary>
    public ConnectionPoolOptions ConnectionPool { get; set; } = new();
}

/// <summary>
/// Configuration options for database connection pooling.
/// </summary>
public class ConnectionPoolOptions
{
    /// <summary>
    /// Gets or sets the maximum pool size.
    /// </summary>
    public int MaxPoolSize { get; set; } = 100;

    /// <summary>
    /// Gets or sets the minimum pool size.
    /// </summary>
    public int MinPoolSize { get; set; } = 5;

    /// <summary>
    /// Gets or sets the connection idle timeout in seconds.
    /// </summary>
    public int IdleTimeoutSeconds { get; set; } = 300;

    /// <summary>
    /// Gets or sets the connection lifetime in seconds.
    /// </summary>
    public int ConnectionLifetimeSeconds { get; set; } = 3600;
}