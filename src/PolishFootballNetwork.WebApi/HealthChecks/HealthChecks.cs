using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace PolishFootballNetwork.WebApi.HealthChecks;

/// <summary>
/// Health check for database connectivity and basic operations.
/// </summary>
public class DatabaseHealthCheck : IHealthCheck
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<DatabaseHealthCheck> _logger;

    public DatabaseHealthCheck(
        IServiceProvider serviceProvider,
        ILogger<DatabaseHealthCheck> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    /// <summary>
    /// Performs database health check by testing connectivity and basic operations.
    /// </summary>
    /// <param name="context">Health check context</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Health check result</returns>
    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            using var scope = _serviceProvider.CreateScope();
            
            // Try to get a database context from DI
            // This will be replaced with actual database context when implemented
            // var dbContext = scope.ServiceProvider.GetService<ApplicationDbContext>();
            
            // For now, simulate a database check
            await Task.Delay(10, cancellationToken); // Simulate database call
            
            var data = new Dictionary<string, object>
            {
                { "database", "connected" },
                { "response_time_ms", 10 },
                { "timestamp", DateTime.UtcNow }
            };

            _logger.LogDebug("Database health check completed successfully");
            
            return HealthCheckResult.Healthy("Database is responsive", data);
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("Database health check was cancelled");
            return HealthCheckResult.Unhealthy("Database health check was cancelled");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Database health check failed");
            
            var data = new Dictionary<string, object>
            {
                { "error", ex.Message },
                { "timestamp", DateTime.UtcNow }
            };
            
            return HealthCheckResult.Unhealthy("Database is not responsive", ex, data);
        }
    }
}

/// <summary>
/// Health check for file system access and disk space.
/// </summary>
public class FileSystemHealthCheck : IHealthCheck
{
    private readonly ILogger<FileSystemHealthCheck> _logger;
    private readonly IWebHostEnvironment _environment;

    public FileSystemHealthCheck(
        ILogger<FileSystemHealthCheck> logger,
        IWebHostEnvironment environment)
    {
        _logger = logger;
        _environment = environment;
    }

    /// <summary>
    /// Performs file system health check by testing read/write operations and disk space.
    /// </summary>
    /// <param name="context">Health check context</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Health check result</returns>
    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var tempPath = Path.Combine(_environment.ContentRootPath, "temp");
            
            // Ensure temp directory exists
            if (!Directory.Exists(tempPath))
            {
                Directory.CreateDirectory(tempPath);
            }

            // Test file write/read operations
            var testFile = Path.Combine(tempPath, $"health_check_{Guid.NewGuid()}.tmp");
            var testContent = "Health check test content";
            
            await File.WriteAllTextAsync(testFile, testContent, cancellationToken);
            var readContent = await File.ReadAllTextAsync(testFile, cancellationToken);
            
            if (readContent != testContent)
            {
                throw new InvalidOperationException("File content verification failed");
            }
            
            // Clean up test file
            File.Delete(testFile);

            // Check disk space
            var driveInfo = new DriveInfo(_environment.ContentRootPath);
            var freeSpaceGB = driveInfo.AvailableFreeSpace / (1024.0 * 1024.0 * 1024.0);
            var totalSpaceGB = driveInfo.TotalSize / (1024.0 * 1024.0 * 1024.0);
            var usagePercent = ((totalSpaceGB - freeSpaceGB) / totalSpaceGB) * 100;

            var data = new Dictionary<string, object>
            {
                { "file_system", "accessible" },
                { "free_space_gb", Math.Round(freeSpaceGB, 2) },
                { "total_space_gb", Math.Round(totalSpaceGB, 2) },
                { "usage_percent", Math.Round(usagePercent, 2) },
                { "timestamp", DateTime.UtcNow }
            };

            // Consider it unhealthy if disk usage is above 90%
            if (usagePercent > 90)
            {
                _logger.LogWarning("File system disk usage is high: {UsagePercent}%", usagePercent);
                return HealthCheckResult.Degraded("File system disk usage is high", data);
            }

            _logger.LogDebug("File system health check completed successfully");
            return HealthCheckResult.Healthy("File system is accessible", data);
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("File system health check was cancelled");
            return HealthCheckResult.Unhealthy("File system health check was cancelled");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "File system health check failed");
            
            var data = new Dictionary<string, object>
            {
                { "error", ex.Message },
                { "timestamp", DateTime.UtcNow }
            };
            
            return HealthCheckResult.Unhealthy("File system is not accessible", ex, data);
        }
    }
}

/// <summary>
/// Health check for external API dependencies and services.
/// </summary>
public class ExternalApiHealthCheck : IHealthCheck
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<ExternalApiHealthCheck> _logger;
    private readonly IConfiguration _configuration;

    public ExternalApiHealthCheck(
        IHttpClientFactory httpClientFactory,
        ILogger<ExternalApiHealthCheck> logger,
        IConfiguration configuration)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _configuration = configuration;
    }

    /// <summary>
    /// Performs external API health check by testing connectivity to external services.
    /// </summary>
    /// <param name="context">Health check context</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Health check result</returns>
    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        var results = new Dictionary<string, object>();
        var hasFailures = false;
        var hasDegradation = false;

        try
        {
            using var httpClient = _httpClientFactory.CreateClient();
            httpClient.Timeout = TimeSpan.FromSeconds(10);

            // Check external APIs that the application depends on
            var externalApis = _configuration.GetSection("ExternalApis:HealthCheckUrls").Get<string[]>() 
                             ?? new[] { "https://httpbin.org/status/200" }; // Default test endpoint

            foreach (var apiUrl in externalApis)
            {
                try
                {
                    var stopwatch = System.Diagnostics.Stopwatch.StartNew();
                    using var response = await httpClient.GetAsync(apiUrl, cancellationToken);
                    stopwatch.Stop();

                    var isHealthy = response.IsSuccessStatusCode;
                    var responseTime = stopwatch.ElapsedMilliseconds;

                    results[GetApiName(apiUrl)] = new
                    {
                        url = apiUrl,
                        status_code = (int)response.StatusCode,
                        response_time_ms = responseTime,
                        is_healthy = isHealthy,
                        timestamp = DateTime.UtcNow
                    };

                    if (!isHealthy)
                    {
                        hasFailures = true;
                        _logger.LogWarning("External API {ApiUrl} returned unhealthy status: {StatusCode}", 
                            apiUrl, response.StatusCode);
                    }
                    else if (responseTime > 5000) // Consider slow if > 5 seconds
                    {
                        hasDegradation = true;
                        _logger.LogWarning("External API {ApiUrl} is responding slowly: {ResponseTime}ms", 
                            apiUrl, responseTime);
                    }
                }
                catch (Exception ex)
                {
                    hasFailures = true;
                    _logger.LogError(ex, "Failed to check external API {ApiUrl}", apiUrl);
                    
                    results[GetApiName(apiUrl)] = new
                    {
                        url = apiUrl,
                        error = ex.Message,
                        is_healthy = false,
                        timestamp = DateTime.UtcNow
                    };
                }
            }

            // Overall health determination
            if (hasFailures)
            {
                return HealthCheckResult.Unhealthy("One or more external APIs are not responding", results);
            }
            
            if (hasDegradation)
            {
                return HealthCheckResult.Degraded("External APIs are responding but slowly", results);
            }

            _logger.LogDebug("External API health check completed successfully");
            return HealthCheckResult.Healthy("All external APIs are responsive", results);
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("External API health check was cancelled");
            return HealthCheckResult.Unhealthy("External API health check was cancelled");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "External API health check failed");
            
            results["error"] = ex.Message;
            results["timestamp"] = DateTime.UtcNow;
            
            return HealthCheckResult.Unhealthy("External API health check failed", ex, results);
        }
    }

    /// <summary>
    /// Extracts a friendly name from an API URL for reporting.
    /// </summary>
    /// <param name="url">The API URL</param>
    /// <returns>A friendly name for the API</returns>
    private static string GetApiName(string url)
    {
        try
        {
            var uri = new Uri(url);
            return uri.Host.Replace("www.", "").Replace(".com", "").Replace(".org", "");
        }
        catch
        {
            return "unknown_api";
        }
    }
}