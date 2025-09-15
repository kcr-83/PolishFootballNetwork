namespace PolishFootballNetwork.Infrastructure.Configuration;

/// <summary>
/// Configuration options for cache service.
/// </summary>
public class CacheOptions
{
    /// <summary>
    /// Configuration section name in appsettings.json.
    /// </summary>
    public const string SectionName = "Cache";

    /// <summary>
    /// Gets or sets the default expiration time for cached items.
    /// </summary>
    public TimeSpan DefaultExpiration { get; set; } = TimeSpan.FromMinutes(30);

    /// <summary>
    /// Gets or sets the maximum memory size for the cache in MB.
    /// </summary>
    public int MaxMemorySizeMB { get; set; } = 100;

    /// <summary>
    /// Gets or sets the compaction percentage when memory pressure is high.
    /// </summary>
    public double CompactionPercentage { get; set; } = 0.25;

    /// <summary>
    /// Gets or sets a value indicating whether to enable cache statistics.
    /// </summary>
    public bool EnableStatistics { get; set; } = false;

    /// <summary>
    /// Gets or sets the cache key prefix for the application.
    /// </summary>
    public string KeyPrefix { get; set; } = "PFN";

    /// <summary>
    /// Gets or sets specific expiration times for different cache categories.
    /// </summary>
    public Dictionary<string, TimeSpan> CategoryExpirations { get; set; } = new()
    {
        ["user"] = TimeSpan.FromMinutes(15),
        ["club"] = TimeSpan.FromHours(1),
        ["connection"] = TimeSpan.FromMinutes(30),
        ["file"] = TimeSpan.FromHours(2)
    };
}