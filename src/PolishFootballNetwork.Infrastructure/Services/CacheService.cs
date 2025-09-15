using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using PolishFootballNetwork.Application.Common.Interfaces;
using PolishFootballNetwork.Infrastructure.Configuration;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace PolishFootballNetwork.Infrastructure.Services;

/// <summary>
/// In-memory cache service implementation with pattern-based operations.
/// </summary>
public class CacheService : ICacheService
{
    private readonly IMemoryCache memoryCache;
    private readonly ILogger<CacheService> logger;
    private readonly CacheOptions cacheOptions;
    private readonly HashSet<string> cacheKeys;
    private readonly object lockObject = new();

    /// <summary>
    /// Initializes a new instance of the <see cref="CacheService"/> class.
    /// </summary>
    /// <param name="memoryCache">Memory cache instance.</param>
    /// <param name="options">Cache configuration options.</param>
    /// <param name="logger">Logger instance.</param>
    public CacheService(IMemoryCache memoryCache, IOptions<CacheOptions> options, ILogger<CacheService> logger)
    {
        this.memoryCache = memoryCache;
        this.cacheOptions = options.Value;
        this.logger = logger;
        this.cacheKeys = new HashSet<string>();
    }

    /// <summary>
    /// Gets a value from the cache.
    /// </summary>
    /// <typeparam name="T">The type of the cached value.</typeparam>
    /// <param name="key">The cache key.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The cached value or default if not found.</returns>
    public async Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default)
    {
        await Task.CompletedTask; // Make async for future extensibility
        
        ArgumentException.ThrowIfNullOrWhiteSpace(key);

        try
        {
            if (this.memoryCache.TryGetValue(key, out var cachedValue))
            {
                this.logger.LogDebug("Cache hit for key: {Key}", key);
                
                if (cachedValue is string jsonString && typeof(T) != typeof(string))
                {
                    return JsonSerializer.Deserialize<T>(jsonString);
                }
                
                return (T?)cachedValue;
            }

            this.logger.LogDebug("Cache miss for key: {Key}", key);
            return default;
        }
        catch (Exception ex)
        {
            this.logger.LogError(ex, "Error retrieving value from cache for key: {Key}", key);
            return default;
        }
    }

    /// <summary>
    /// Sets a value in the cache.
    /// </summary>
    /// <typeparam name="T">The type of the value to cache.</typeparam>
    /// <param name="key">The cache key.</param>
    /// <param name="value">The value to cache.</param>
    /// <param name="expiration">The cache expiration time.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>A task representing the set operation.</returns>
    public async Task SetAsync<T>(string key, T value, TimeSpan? expiration = null, CancellationToken cancellationToken = default)
    {
        await Task.CompletedTask; // Make async for future extensibility
        
        ArgumentException.ThrowIfNullOrWhiteSpace(key);
        ArgumentNullException.ThrowIfNull(value);

        try
        {
            var options = new MemoryCacheEntryOptions();
            
            var expirationTime = expiration ?? this.cacheOptions.DefaultExpiration;
            options.SetAbsoluteExpiration(expirationTime);
            
            // Set priority based on expiration time
            options.Priority = expirationTime > TimeSpan.FromHours(1) 
                ? CacheItemPriority.Normal 
                : CacheItemPriority.High;

            // Register removal callback to clean up from key tracking
            options.RegisterPostEvictionCallback((evictedKey, evictedValue, reason, state) =>
            {
                lock (this.lockObject)
                {
                    this.cacheKeys.Remove(evictedKey.ToString() ?? string.Empty);
                }
                
                this.logger.LogDebug("Cache entry evicted: {Key}, Reason: {Reason}", evictedKey, reason);
            });

            object valueToCache;
            
            // Serialize complex objects to JSON for consistent storage
            if (typeof(T) == typeof(string) || typeof(T).IsPrimitive || typeof(T) == typeof(DateTime) || typeof(T) == typeof(DateTimeOffset))
            {
                valueToCache = value;
            }
            else
            {
                valueToCache = JsonSerializer.Serialize(value);
            }

            this.memoryCache.Set(key, valueToCache, options);
            
            // Track the key for pattern-based operations
            lock (this.lockObject)
            {
                this.cacheKeys.Add(key);
            }

            this.logger.LogDebug("Value cached for key: {Key} with expiration: {Expiration}", key, expirationTime);
        }
        catch (Exception ex)
        {
            this.logger.LogError(ex, "Error setting value in cache for key: {Key}", key);
            throw;
        }
    }

    /// <summary>
    /// Removes a value from the cache.
    /// </summary>
    /// <param name="key">The cache key.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>A task representing the remove operation.</returns>
    public async Task RemoveAsync(string key, CancellationToken cancellationToken = default)
    {
        await Task.CompletedTask; // Make async for future extensibility
        
        ArgumentException.ThrowIfNullOrWhiteSpace(key);

        try
        {
            this.memoryCache.Remove(key);
            
            lock (this.lockObject)
            {
                this.cacheKeys.Remove(key);
            }

            this.logger.LogDebug("Value removed from cache for key: {Key}", key);
        }
        catch (Exception ex)
        {
            this.logger.LogError(ex, "Error removing value from cache for key: {Key}", key);
            throw;
        }
    }

    /// <summary>
    /// Removes all values with keys matching the pattern.
    /// </summary>
    /// <param name="pattern">The pattern to match cache keys.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>A task representing the remove operation.</returns>
    public async Task RemoveByPatternAsync(string pattern, CancellationToken cancellationToken = default)
    {
        await Task.CompletedTask; // Make async for future extensibility
        
        ArgumentException.ThrowIfNullOrWhiteSpace(pattern);

        try
        {
            var regex = new Regex(pattern, RegexOptions.Compiled | RegexOptions.IgnoreCase);
            var keysToRemove = new List<string>();

            lock (this.lockObject)
            {
                keysToRemove.AddRange(this.cacheKeys.Where(key => regex.IsMatch(key)));
            }

            foreach (var key in keysToRemove)
            {
                this.memoryCache.Remove(key);
                
                lock (this.lockObject)
                {
                    this.cacheKeys.Remove(key);
                }
            }

            this.logger.LogInformation("Removed {Count} cache entries matching pattern: {Pattern}", 
                keysToRemove.Count, pattern);
        }
        catch (Exception ex)
        {
            this.logger.LogError(ex, "Error removing values from cache by pattern: {Pattern}", pattern);
            throw;
        }
    }

    /// <summary>
    /// Checks if a key exists in the cache.
    /// </summary>
    /// <param name="key">The cache key.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>True if the key exists.</returns>
    public async Task<bool> ExistsAsync(string key, CancellationToken cancellationToken = default)
    {
        await Task.CompletedTask; // Make async for future extensibility
        
        ArgumentException.ThrowIfNullOrWhiteSpace(key);

        try
        {
            var exists = this.memoryCache.TryGetValue(key, out _);
            this.logger.LogDebug("Cache key existence check for {Key}: {Exists}", key, exists);
            return exists;
        }
        catch (Exception ex)
        {
            this.logger.LogError(ex, "Error checking cache key existence: {Key}", key);
            return false;
        }
    }
}