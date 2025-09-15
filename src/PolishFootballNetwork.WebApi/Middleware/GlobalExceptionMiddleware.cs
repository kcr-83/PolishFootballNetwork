using Microsoft.AspNetCore.Diagnostics;
using PolishFootballNetwork.Application.Common.Models;
using System.Net;
using System.Text.Json;

namespace PolishFootballNetwork.WebApi.Middleware;

/// <summary>
/// Global exception handling middleware for the application.
/// </summary>
public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="GlobalExceptionMiddleware"/> class.
    /// </summary>
    /// <param name="next">The next middleware in the pipeline.</param>
    /// <param name="logger">Logger instance.</param>
    public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    /// <summary>
    /// Invokes the middleware to handle exceptions.
    /// </summary>
    /// <param name="context">HTTP context.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An unhandled exception occurred");
            await HandleExceptionAsync(context, ex);
        }
    }

    /// <summary>
    /// Handles the exception and writes the appropriate response.
    /// </summary>
    /// <param name="context">HTTP context.</param>
    /// <param name="exception">The exception that occurred.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    private static async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/json";

        var response = new ErrorResult
        {
            IsSuccess = false,
            Message = GetUserFriendlyMessage(exception),
            Errors = new List<string> { "An error occurred while processing your request." }
        };

        context.Response.StatusCode = GetStatusCode(exception);

        // Don't expose sensitive information in production
        if (context.RequestServices.GetRequiredService<IWebHostEnvironment>().IsDevelopment())
        {
            response.Errors = new List<string> { exception.Message };
            if (exception.InnerException != null)
            {
                response.Errors.Add($"Inner Exception: {exception.InnerException.Message}");
            }
        }

        var jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = true
        };

        var jsonResponse = JsonSerializer.Serialize(response, jsonOptions);
        await context.Response.WriteAsync(jsonResponse);
    }

    /// <summary>
    /// Gets the appropriate HTTP status code for the exception.
    /// </summary>
    /// <param name="exception">The exception.</param>
    /// <returns>HTTP status code.</returns>
    private static int GetStatusCode(Exception exception)
    {
        return exception switch
        {
            ArgumentException => (int)HttpStatusCode.BadRequest,
            UnauthorizedAccessException => (int)HttpStatusCode.Unauthorized,
            KeyNotFoundException => (int)HttpStatusCode.NotFound,
            InvalidOperationException => (int)HttpStatusCode.BadRequest,
            TimeoutException => (int)HttpStatusCode.RequestTimeout,
            _ => (int)HttpStatusCode.InternalServerError
        };
    }

    /// <summary>
    /// Gets a user-friendly error message.
    /// </summary>
    /// <param name="exception">The exception.</param>
    /// <returns>User-friendly error message.</returns>
    private static string GetUserFriendlyMessage(Exception exception)
    {
        return exception switch
        {
            ArgumentException => "Invalid request parameters.",
            UnauthorizedAccessException => "Access denied. Please check your credentials.",
            KeyNotFoundException => "The requested resource was not found.",
            InvalidOperationException => "The requested operation is not valid.",
            TimeoutException => "The request timed out. Please try again.",
            _ => "An unexpected error occurred. Please try again later."
        };
    }
}