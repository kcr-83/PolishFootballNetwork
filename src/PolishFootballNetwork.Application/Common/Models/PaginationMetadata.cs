namespace PolishFootballNetwork.Application.Common.Models;

/// <summary>
/// Pagination metadata for paginated responses
/// </summary>
public sealed class PaginationMetadata
{
    /// <summary>
    /// Current page number (1-based)
    /// </summary>
    public int CurrentPage { get; init; }

    /// <summary>
    /// Number of items per page
    /// </summary>
    public int PageSize { get; init; }

    /// <summary>
    /// Total number of items
    /// </summary>
    public int TotalItems { get; init; }

    /// <summary>
    /// Total number of pages
    /// </summary>
    public int TotalPages { get; init; }

    /// <summary>
    /// True if there is a previous page
    /// </summary>
    public bool HasPrevious { get; init; }

    /// <summary>
    /// True if there is a next page
    /// </summary>
    public bool HasNext { get; init; }

    /// <summary>
    /// Creates pagination metadata
    /// </summary>
    /// <param name="currentPage">Current page number</param>
    /// <param name="pageSize">Page size</param>
    /// <param name="totalItems">Total number of items</param>
    /// <returns>PaginationMetadata instance</returns>
    public static PaginationMetadata Create(int currentPage, int pageSize, int totalItems)
    {
        var totalPages = (int)Math.Ceiling((double)totalItems / pageSize);
        
        return new PaginationMetadata
        {
            CurrentPage = currentPage,
            PageSize = pageSize,
            TotalItems = totalItems,
            TotalPages = totalPages,
            HasPrevious = currentPage > 1,
            HasNext = currentPage < totalPages
        };
    }
}

/// <summary>
/// Performance metrics for API responses
/// </summary>
public sealed class PerformanceMetrics
{
    /// <summary>
    /// Request duration in milliseconds
    /// </summary>
    public long DurationMs { get; init; }

    /// <summary>
    /// Database query count
    /// </summary>
    public int QueryCount { get; init; }

    /// <summary>
    /// Cache hit indicator
    /// </summary>
    public bool CacheHit { get; init; }

    /// <summary>
    /// Response was compressed
    /// </summary>
    public bool Compressed { get; init; }

    /// <summary>
    /// Creates performance metrics
    /// </summary>
    /// <param name="durationMs">Duration in milliseconds</param>
    /// <param name="queryCount">Number of database queries</param>
    /// <param name="cacheHit">Whether response was served from cache</param>
    /// <param name="compressed">Whether response was compressed</param>
    /// <returns>PerformanceMetrics instance</returns>
    public static PerformanceMetrics Create(long durationMs, int queryCount = 0, bool cacheHit = false, bool compressed = false)
    {
        return new PerformanceMetrics
        {
            DurationMs = durationMs,
            QueryCount = queryCount,
            CacheHit = cacheHit,
            Compressed = compressed
        };
    }
}

/// <summary>
/// Extension methods for ApiResponse to support pagination and performance
/// </summary>
public static class ApiResponseExtensions
{
    /// <summary>
    /// Creates a successful paginated API response
    /// </summary>
    /// <typeparam name="T">The type of data being returned</typeparam>
    /// <param name="data">The response data</param>
    /// <param name="pagination">Pagination metadata</param>
    /// <param name="performance">Optional performance metrics</param>
    /// <param name="message">Optional success message</param>
    /// <returns>Successful ApiResponse with pagination</returns>
    public static ApiResponse<T> CreatePaginatedSuccess<T>(T data, PaginationMetadata pagination, PerformanceMetrics? performance = null, string? message = null)
    {
        var metadata = new Dictionary<string, object>
        {
            ["pagination"] = pagination
        };

        if (performance != null)
        {
            metadata["performance"] = performance;
        }

        return ApiResponse<T>.SuccessResponse(data, message, metadata);
    }

    /// <summary>
    /// Creates a successful API response with performance metrics
    /// </summary>
    /// <typeparam name="T">The type of data being returned</typeparam>
    /// <param name="data">The response data</param>
    /// <param name="performance">Performance metrics</param>
    /// <param name="message">Optional success message</param>
    /// <returns>Successful ApiResponse with performance metrics</returns>
    public static ApiResponse<T> CreateSuccessWithPerformance<T>(T data, PerformanceMetrics performance, string? message = null)
    {
        var metadata = new Dictionary<string, object>
        {
            ["performance"] = performance
        };

        return ApiResponse<T>.SuccessResponse(data, message, metadata);
    }
}