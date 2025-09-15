namespace PolishFootballNetwork.Application.Common.Models;

/// <summary>
/// Standardized API response wrapper.
/// </summary>
/// <typeparam name="T">The type of data in the response.</typeparam>
public class ApiResponse<T>
{
    /// <summary>
    /// Gets a value indicating whether the request was successful.
    /// </summary>
    public bool Success { get; init; }

    /// <summary>
    /// Gets the data payload of the response.
    /// </summary>
    public T? Data { get; init; }

    /// <summary>
    /// Gets the error message if the request failed.
    /// </summary>
    public string? Message { get; init; }

    /// <summary>
    /// Gets the list of errors if the request failed.
    /// </summary>
    public IReadOnlyList<string> Errors { get; init; } = Array.Empty<string>();

    /// <summary>
    /// Gets the timestamp of the response.
    /// </summary>
    public DateTime Timestamp { get; init; } = DateTime.UtcNow;

    /// <summary>
    /// Gets additional metadata for the response.
    /// </summary>
    public Dictionary<string, object>? Metadata { get; init; }

    /// <summary>
    /// Creates a successful API response.
    /// </summary>
    /// <param name="data">The data to include in the response.</param>
    /// <param name="message">Optional success message.</param>
    /// <param name="metadata">Optional metadata.</param>
    /// <returns>A successful API response.</returns>
    public static ApiResponse<T> SuccessResponse(T data, string? message = null, Dictionary<string, object>? metadata = null)
        => new()
        {
            Success = true,
            Data = data,
            Message = message,
            Metadata = metadata
        };

    /// <summary>
    /// Creates a failed API response.
    /// </summary>
    /// <param name="message">The error message.</param>
    /// <param name="errors">Optional list of detailed errors.</param>
    /// <returns>A failed API response.</returns>
    public static ApiResponse<T> ErrorResponse(string message, IReadOnlyList<string>? errors = null)
        => new()
        {
            Success = false,
            Message = message,
            Errors = errors ?? Array.Empty<string>()
        };

    /// <summary>
    /// Creates an API response from a Result.
    /// </summary>
    /// <param name="result">The result to convert.</param>
    /// <param name="successMessage">Optional success message.</param>
    /// <returns>An API response.</returns>
    public static ApiResponse<T> FromResult(Result<T> result, string? successMessage = null)
    {
        if (result.IsSuccess)
        {
            return SuccessResponse(result.Value!, successMessage);
        }

        return ErrorResponse(result.Error ?? "Operation failed", result.Errors);
    }
}

/// <summary>
/// Standardized API response wrapper for operations without data.
/// </summary>
public class ApiResponse : ApiResponse<object?>
{
    /// <summary>
    /// Creates a successful API response without data.
    /// </summary>
    /// <param name="message">Optional success message.</param>
    /// <returns>A successful API response.</returns>
    public static ApiResponse SuccessResponse(string? message = null)
        => new()
        {
            Success = true,
            Message = message
        };

    /// <summary>
    /// Creates a failed API response without data.
    /// </summary>
    /// <param name="message">The error message.</param>
    /// <param name="errors">Optional list of detailed errors.</param>
    /// <returns>A failed API response.</returns>
    public static new ApiResponse ErrorResponse(string message, IReadOnlyList<string>? errors = null)
        => new()
        {
            Success = false,
            Message = message,
            Errors = errors ?? Array.Empty<string>()
        };

    /// <summary>
    /// Creates an API response from a Result.
    /// </summary>
    /// <param name="result">The result to convert.</param>
    /// <param name="successMessage">Optional success message.</param>
    /// <returns>An API response.</returns>
    public static ApiResponse FromResult(Result result, string? successMessage = null)
    {
        if (result.IsSuccess)
        {
            return SuccessResponse(successMessage);
        }

        return ErrorResponse(result.Error ?? "Operation failed", result.Errors);
    }
}
